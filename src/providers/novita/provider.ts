import type { FilesV4 } from '@ai-sdk/provider';
import type { PptaskDescription, PptaskModelType, PptaskProvider } from '../../core/types.ts';
import { createHttpProvider } from '../shared/provider.ts';
import { jsonRequest, mergeHeaders, normalizeProviderConfig, request, requestJson, uploadBlob } from '../shared/http.ts';
import { isRecord, normalizeLanguagePrompt } from '../shared/input.ts';
import type { CommonProviderOptions, HttpProviderProtocol, HttpStatus } from '../shared/types.ts';
import {
  buildNovitaGpt56ChatBody,
  buildNovitaGpt56ResponsesBody,
  buildNovitaGptImageGenerationBody,
  buildNovitaGptImageEditFormData,
  buildNovitaKlingV3RequestBody,
  buildNovitaRequestBody,
  buildNovitaSeedanceOverseaRequestBody,
  buildNovitaVeo31RequestBody,
  describeNovita,
} from './legacy-api.ts';
import {
  NOVITA_SUPPORTED_MODELS,
  isNovitaAsyncModel,
  isNovitaGpt56Model,
  isNovitaGptImageModel,
  isNovitaKlingV3Model,
  isNovitaSeedanceOverseaModel,
  isNovitaVeo31Model,
} from './legacy-helpers.ts';

export type NovitaProviderOptions = CommonProviderOptions & {
  apiKey: string;
  apiVersion?: 'v1' | 'v1beta';
  openaiBaseURL?: string;
  asyncBaseURL?: string;
  veo31BaseURL?: string;
  seedanceBaseURL?: string;
};

export function createNovitaProvider(options: NovitaProviderOptions): PptaskProvider {
  const config = normalizeProviderConfig('novita', options, 'https://api.novita.ai/gemini');
  const auth = { ...config.headers, authorization: `Bearer ${config.apiKey}` };
  const bases = {
    openai: options.openaiBaseURL ?? 'https://api.novita.ai/openai',
    async: options.asyncBaseURL ?? 'https://api.novita.ai/v3/async',
    veo: options.veo31BaseURL ?? 'https://api.novita.ai/v3/veo-3.1',
    seedance: options.seedanceBaseURL ?? 'https://api.novita.ai/v3/bytedance/metered',
  };
  const protocol: HttpProviderProtocol = {
    providerId: 'novita', fetch: config.fetch,
    validateModel(modelId, modelType) {
      if (!(NOVITA_SUPPORTED_MODELS as readonly string[]).includes(modelId)) {
        throw new Error(`Unsupported Novita model: ${modelId}. Supported models: ${NOVITA_SUPPORTED_MODELS.join(', ')}`);
      }
      const expected = isNovitaGpt56Model(modelId) ? 'language' : isNovitaAsyncModel(modelId) ? 'video' : 'image';
      if (modelType !== expected) throw new Error(`Novita model ${modelId} must be used as a ${expected} model`);
    },
    mode: modelId => isNovitaAsyncModel(modelId) ? 'async' : 'sync',
    async execute(context) {
      if (isNovitaAsyncModel(context.modelId)) throw new Error(`novita ${context.modelId} uses asynchronous execution`);
      if (isNovitaGpt56Model(context.modelId)) {
        const payload = normalizeLanguagePayload(context.input);
        const apiMode = normalizeApiMode(payload.apiMode ?? payload.api_mode ?? 'responses');
        const body = apiMode === 'responses'
          ? buildNovitaGpt56ResponsesBody(context.modelId, payload)
          : buildNovitaGpt56ChatBody(context.modelId, payload);
        const endpoint = `${bases.openai}/v1/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`;
        return requestJsonOrSse(config.fetch, 'novita', jsonRequest(endpoint, body, mergeHeaders(auth, context.headers)), context.signal, Boolean(body.stream));
      }
      if (isNovitaGptImageModel(context.modelId)) {
        const payload = normalizeImagePayload(context.input);
        const images = asArray(payload.urls ?? payload.images ?? payload.image);
        const outputFormat = String(payload.output_format ?? payload.outputFormat ?? 'png').toLowerCase() as 'png' | 'jpeg' | 'webp';
        const edit = images.length > 0 || payload.mask != null;
        if (edit) {
          const form = await buildNovitaGptImageEditFormDataWithFetch(
            config.fetch, context.modelId, payload, images, firstValue(payload.mask), outputFormat,
          );
          return requestJsonOrSse(config.fetch, 'novita', {
            url: `${bases.openai}/v1/images/edits`,
            headers: mergeHeaders(auth, context.headers),
            body: form,
          }, context.signal);
        }
        return requestJsonOrSse(config.fetch, 'novita', jsonRequest(
          `${bases.openai}/v1/images/generations`,
          buildNovitaGptImageGenerationBody(context.modelId, payload, outputFormat),
          mergeHeaders(auth, context.headers),
        ), context.signal);
      }
      const payload = normalizeImagePayload(context.input);
      return requestJsonOrSse(config.fetch, 'novita', jsonRequest(
        `${config.baseURL}/${options.apiVersion ?? 'v1'}/models/${encodeURIComponent(context.modelId)}:generateContent`,
        buildNovitaRequestBody(payload), mergeHeaders(auth, context.headers),
      ), context.signal);
    },
    async start(context) {
      const payload = normalizeVideoPayload(context.input);
      let url: string;
      let body: Record<string, unknown>;
      let kind: 'veo' | 'kling' | 'seedance';
      if (isNovitaVeo31Model(context.modelId)) {
        kind = 'veo';
        const apiVersion = String(payload.veo31ApiVersion ?? payload.veo31_api_version ?? 'v1').replace(/^\/+|\/+$/g, '');
        if (apiVersion !== 'v1' && apiVersion !== 'v1beta1') throw new Error('novita Veo 3.1 API version must be v1 or v1beta1');
        url = `${bases.veo}/${apiVersion}/models/${encodeURIComponent(context.modelId)}:predictLongRunning`;
        body = buildNovitaVeo31RequestBody(context.modelId, payload);
      } else if (isNovitaKlingV3Model(context.modelId)) {
        kind = 'kling';
        url = `${bases.async}/${encodeURIComponent(context.modelId)}`;
        body = buildNovitaKlingV3RequestBody(context.modelId, payload);
      } else {
        kind = 'seedance';
        url = `${bases.seedance}/contents/generations/tasks`;
        body = buildNovitaSeedanceOverseaRequestBody(context.modelId, payload);
      }
      const raw = await requestJson<any>(config.fetch, 'novita', jsonRequest(url, body, mergeHeaders(auth, context.headers)), context.signal);
      const data = raw.data ?? raw;
      const taskId = kind === 'veo' ? data.name : kind === 'kling' ? data.task_id : data.id;
      if (typeof taskId !== 'string' || !taskId) throw new Error(`novita ${context.modelId} did not return a task id`);
      const queryURL = kind === 'seedance'
        ? `${bases.seedance}/contents/generations/tasks/${encodeURIComponent(taskId)}`
        : `${bases.async}/task-result?task_id=${encodeURIComponent(taskId)}`;
      return { operation: { taskId, queryURL, kind }, metadata: { taskId, kind, model: context.modelId } };
    },
    async status(context) {
      const operation = taskOperation(context.operation);
      const raw = await requestJson<any>(config.fetch, 'novita', { url: operation.queryURL, headers: mergeHeaders(auth, context.headers) }, context.signal);
      const data = raw.data ?? raw;
      return mapNovitaStatus(data, operation.taskId, operation.kind);
    },
    async cancel(context) {
      const operation = taskOperation(context.operation);
      if (operation.kind !== 'seedance') throw new Error(`Novita ${operation.kind} tasks do not expose a cancellation endpoint`);
      await request(config.fetch, 'novita', { url: operation.queryURL, method: 'DELETE', headers: mergeHeaders(auth, context.headers) }, context.signal);
    },
    describe: async (modelId, modelType) => describeModel(modelId, modelType),
  };
  return createHttpProvider(protocol, options);
}

function normalizeImagePayload(input: Record<string, unknown>): Record<string, any> {
  const payload: Record<string, any> = { ...input };
  if (payload.images !== undefined && payload.urls === undefined) payload.urls = payload.images;
  return payload;
}

function normalizeVideoPayload(input: Record<string, unknown>): Record<string, any> {
  const payload: Record<string, any> = { ...input };
  if (payload.image !== undefined && payload.imageUrl === undefined && payload.imgUrls === undefined) payload.imageUrl = payload.image;
  if (payload.inputReferences !== undefined && payload.referenceImages === undefined) payload.referenceImages = payload.inputReferences;
  return payload;
}

function normalizeLanguagePayload(input: Record<string, unknown>): Record<string, any> {
  return normalizeLanguagePrompt(input);
}

function normalizeApiMode(value: unknown): 'responses' | 'chat_completions' {
  const mode = String(value ?? 'responses').trim().toLowerCase().replace(/[/-]/g, '_');
  if (mode === 'response' || mode === 'responses') return 'responses';
  if (mode === 'chat' || mode === 'chat_completion' || mode === 'chat_completions') return 'chat_completions';
  throw new Error('novita GPT-5.6 apiMode must be responses or chat_completions');
}

async function describeModel(modelId: string, modelType: PptaskModelType): Promise<PptaskDescription> {
  const legacy = await describeNovita(new URL(`novita:///${encodeURIComponent(modelId)}`));
  return {
    providerId: 'novita', modelId, modelType, title: modelId,
    inputSchema: legacy.formSchema,
    defaultInput: legacy.formValues,
    capabilities: { ...(legacy.metadata ?? {}), cancel: legacy.cancelable ?? false },
  };
}

type NovitaOperation = { taskId: string; queryURL: string; kind: 'veo' | 'kling' | 'seedance' };
function taskOperation(value: unknown): NovitaOperation {
  if (isRecord(value) && typeof value.taskId === 'string' && typeof value.queryURL === 'string' && (value.kind === 'veo' || value.kind === 'kling' || value.kind === 'seedance')) return value as NovitaOperation;
  throw new Error('Invalid Novita operation reference');
}

function mapNovitaStatus(data: any, taskId: string, kind: NovitaOperation['kind']): HttpStatus {
  const task = kind === 'seedance' ? data : data.task ?? data;
  const raw = String(kind === 'seedance' ? task.status : task.status ?? task.state ?? '').toUpperCase();
  const metadata = { taskId, kind, status: raw, raw: data } as any;
  if (kind === 'seedance' ? ['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'DONE'].includes(raw) : raw === 'TASK_STATUS_SUCCEED') return { state: 'completed', output: data, metadata };
  if (kind === 'seedance' ? ['FAILED', 'CANCELLED', 'EXPIRED', 'ERROR'].includes(raw) : raw === 'TASK_STATUS_FAILED') return { state: 'failed', error: String(task.reason ?? task.error?.message ?? `Novita task ${raw}`), metadata };
  return { state: 'pending', phase: /PROCESS|RUNNING/.test(raw) ? 'running' : 'queued', progress: number(task.progress_percent ?? task.progress), metadata };
}

function firstValue(value: unknown): any { return Array.isArray(value) ? value[0] : value == null || value === '' ? undefined : value; }
function asArray(value: unknown): any[] { return value == null || value === '' ? [] : Array.isArray(value) ? value : [value]; }
function number(value: unknown): number | undefined { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }

async function buildNovitaGptImageEditFormDataWithFetch(
  fetchImpl: typeof globalThis.fetch,
  model: string,
  payload: Record<string, any>,
  images: any[],
  mask: any,
  outputFormat: 'png' | 'jpeg' | 'webp',
): Promise<FormData> {
  return buildNovitaGptImageEditFormData(model, payload, images, mask, outputFormat, fetchImpl);
}

async function requestJsonOrSse(fetchImpl: typeof globalThis.fetch, providerId: string, descriptor: { url: string; method?: string; headers?: Record<string, string | undefined>; body?: BodyInit | null }, signal?: AbortSignal, stream = false): Promise<unknown> {
  const response = await request(fetchImpl, providerId, descriptor, signal);
  const text = await response.text();
  if (!text) return {};
  const contentType = response.headers.get('content-type') ?? '';
  if (stream || contentType.includes('text/event-stream')) return parseSse(text);
  try { return JSON.parse(text); } catch { throw new Error(`${providerId} returned invalid JSON (${response.status})`); }
}

function parseSse(text: string): unknown {
  const events = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(line => line && line !== '[DONE]').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const failed = [...events].reverse().find((event: any) => event?.type === 'response.failed' || event?.error);
  if (failed) throw new Error(failed?.response?.error?.message ?? failed?.error?.message ?? 'Novita stream failed');
  const completed = [...events].reverse().find((event: any) => event?.type === 'response.completed');
  if (completed?.response) return completed.response;
  const textOutput = events.filter((event: any) => typeof event?.delta === 'string' || typeof event?.text === 'string').map((event: any) => event.delta ?? event.text).join('');
  return textOutput ? { output_text: textOutput, choices: [{ message: { content: textOutput } }] } : events[events.length - 1] ?? {};
}

export const NOVITA_DEFAULT_BASE_URL = 'https://api.novita.ai/gemini';
