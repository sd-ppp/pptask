import type { PptaskDescription, PptaskModelType, PptaskProvider } from '../../core/types.ts';
import { createHttpProvider } from '../shared/provider.ts';
import { jsonRequest, mergeHeaders, normalizeProviderConfig, requestJson } from '../shared/http.ts';
import { isRecord } from '../shared/input.ts';
import { normalizeLanguagePrompt } from '../shared/input.ts';
import type { CommonProviderOptions, HttpProviderProtocol, HttpStatus } from '../shared/types.ts';
import {
  buildPpioChatRequestBody,
  buildPpioGptImageRequestBody,
  buildPpioHailuo23RequestBody,
  buildPpioKlingV3RequestBody,
  buildPpioMinimaxH3RequestBody,
  buildPpioResponseRequestBody,
  buildPpioSeedanceCnMeteredRequestBody,
  buildPpioSeedanceRequestBody,
  buildPpioVeoRequestBody,
  describePpio,
} from './legacy-api.ts';
import {
  PPIO_FUSION_MODEL,
  PPIO_GPT_IMAGE_MODEL,
  PPIO_HAILUO_23_MODELS,
  PPIO_KLING_V3_MODELS,
  PPIO_MINIMAX_H3_MODEL,
  PPIO_RESPONSE_MODELS,
  PPIO_SEEDANCE_MODEL,
  PPIO_SEEDANCE_CN_METERED_MODELS,
  PPIO_SUPPORTED_MODELS,
  PPIO_VEO_MODELS,
  isPpioSeedanceCnMeteredModel,
} from './legacy-helpers.ts';

export type PpioProviderOptions = CommonProviderOptions & {
  apiKey: string; apiVersion?: string; gptImageBaseURL?: string; responseBaseURL?: string;
  chatBaseURL?: string; asyncBaseURL?: string; veoBaseURL?: string; minimaxBaseURL?: string;
  seedanceCnMeteredBaseURL?: string; gptImageBaseUrl?: string; responseBaseUrl?: string;
  chatBaseUrl?: string; asyncBaseUrl?: string; veoBaseUrl?: string; minimaxBaseUrl?: string;
  seedanceCnMeteredBaseUrl?: string; veoApiVersion?: string;
};

export function createPpioProvider(options: PpioProviderOptions): PptaskProvider {
  const config = normalizeProviderConfig('ppio', options, 'https://api.ppio.com/v3/gemini-image');
  const auth = { ...config.headers, authorization: `Bearer ${config.apiKey}` };
  const bases = {
    gpt: options.gptImageBaseURL ?? options.gptImageBaseUrl ?? 'https://api.ppio.com/v3',
    responses: options.responseBaseURL ?? options.responseBaseUrl ?? 'https://api.ppio.com/openai/v1',
    chat: options.chatBaseURL ?? options.chatBaseUrl ?? 'https://api.ppio.com/openai/v1',
    async: options.asyncBaseURL ?? options.asyncBaseUrl ?? 'https://api.ppio.com/v3/async',
    veo: options.veoBaseURL ?? options.veoBaseUrl ?? 'https://api.ppio.com/v3/veo-3.1',
    minimax: options.minimaxBaseURL ?? options.minimaxBaseUrl ?? 'https://api.ppio.com/v3/minimax/v2',
    seedance: options.seedanceCnMeteredBaseURL ?? options.seedanceCnMeteredBaseUrl ?? 'https://api.ppio.com/v3/bytedance-cn/metered',
  };
  const veoApiVersion = options.veoApiVersion ?? 'v1';
  const protocol: HttpProviderProtocol = {
    providerId: 'ppio', fetch: config.fetch, mode: modelId => isAsync(modelId) ? 'async' : 'sync',
    validateModel(modelId, modelType) {
      if (!isSupported(modelId)) {
        throw new Error(`Unsupported PPIO model: ${modelId}. Supported models: ${PPIO_SUPPORTED_MODELS.join(', ')}`);
      }
      const expected = isAsync(modelId) || isResponse(modelId) || modelId === PPIO_FUSION_MODEL ?
        (isAsync(modelId) ? 'video' : 'language') : 'image';
      if (modelType !== expected) throw new Error(`PPIO model ${modelId} must be used as a ${expected} model`);
    },
    async execute(context) {
      if (isResponse(context.modelId)) {
        return requestPpioJson(
          config.fetch, 'ppio', `${bases.responses}/responses`,
          buildPpioResponseRequestBody(context.modelId, normalizeLanguagePayload(context.input)),
          mergeHeaders(auth, context.headers), context.signal,
        );
      }
      if (context.modelId === PPIO_FUSION_MODEL) {
        return requestPpioJson(
          config.fetch, 'ppio', `${bases.chat}/chat/completions`,
          buildPpioChatRequestBody(context.modelId, normalizeLanguagePayload(context.input)),
          mergeHeaders(auth, context.headers), context.signal,
        );
      }
      if (context.modelId === PPIO_GPT_IMAGE_MODEL) {
        const payload = normalizeImagePayload(context.input);
        const images = asArray(payload.images ?? payload.urls);
        if (payload.mask != null && images.length === 0) throw new Error('ppio gpt-image-2 mask requires at least one input image');
        const body = buildPpioGptImageRequestBody(
          { ...payload, image: images }, String(payload.prompt ?? '').trim(), images as string[],
          firstValue(payload.mask), images.length > 0,
        );
        const edit = images.length > 0;
        return requestPpioJson(config.fetch, 'ppio', `${bases.gpt}/gpt-image-2-${edit ? 'edit' : 'text-to-image'}`, body, mergeHeaders(auth, context.headers), context.signal);
      }
      const body = buildGeminiBody(context.input);
      return requestJson(
        config.fetch, 'ppio',
        jsonRequest(`${config.baseURL}/${options.apiVersion ?? 'v1beta1'}/models/${encodeURIComponent(context.modelId)}:generateContent`, body, mergeHeaders(auth, context.headers)),
        context.signal,
      );
    },
    async start(context) {
      const spec = asyncSpec(context.modelId, bases, veoApiVersion);
      const body = buildAsyncBody(context.modelId, context.input);
      const raw = await requestJson<any>(config.fetch, 'ppio', jsonRequest(spec.createURL, body, mergeHeaders(auth, context.headers)), context.signal);
      const data = raw.data ?? raw;
      const taskId = firstString(data, spec.idFields);
      if (!taskId) throw new Error(`ppio ${context.modelId} did not return a task id`);
      return { operation: { taskId, queryURL: spec.queryURL(taskId) }, metadata: { taskId } };
    },
    async status(context) {
      const operation = taskOperation(context.operation);
      const raw = await requestJson<any>(config.fetch, 'ppio', { url: operation.queryURL, headers: mergeHeaders(auth, context.headers) }, context.signal);
      return genericStatus(raw.data ?? raw, operation.taskId);
    },
    describe: async (modelId, modelType) => describeModel(modelId, modelType),
  };
  return createHttpProvider(protocol, options);
}

function asyncSpec(model: string, bases: Record<string, string>, veoApiVersion: string) {
  if (PPIO_VEO_MODELS.includes(model as never)) return { createURL: `${bases.veo}/${veoApiVersion}/models/${encodeURIComponent(model)}:predictLongRunning`, idFields: ['name'], queryURL: (id: string) => `${bases.async}/task-result?task_id=${encodeURIComponent(id)}` };
  if (model === PPIO_MINIMAX_H3_MODEL) return { createURL: `${bases.minimax}/video_generation`, idFields: ['task_id', 'id'], queryURL: (id: string) => `${bases.minimax}/query/video_generation/${encodeURIComponent(id)}` };
  if (isPpioSeedanceCnMeteredModel(model)) return { createURL: `${bases.seedance}/contents/generations/tasks`, idFields: ['id'], queryURL: (id: string) => `${bases.seedance}/contents/generations/tasks/${encodeURIComponent(id)}` };
  return { createURL: `${bases.async}/${encodeURIComponent(model)}`, idFields: ['task_id', 'id', 'name'], queryURL: (id: string) => `${bases.async}/task-result?task_id=${encodeURIComponent(id)}` };
}

function buildAsyncBody(model: string, input: Record<string, unknown>): Record<string, unknown> {
  if (model === PPIO_SEEDANCE_MODEL) return buildPpioSeedanceRequestBody(input);
  if (isPpioSeedanceCnMeteredModel(model)) return buildPpioSeedanceCnMeteredRequestBody(model, input);
  if (PPIO_VEO_MODELS.includes(model as never)) return buildPpioVeoRequestBody(input);
  if (PPIO_KLING_V3_MODELS.includes(model as never)) return buildPpioKlingV3RequestBody(model, input);
  if (PPIO_HAILUO_23_MODELS.includes(model as never)) return buildPpioHailuo23RequestBody(model, input);
  if (model === PPIO_MINIMAX_H3_MODEL) return buildPpioMinimaxH3RequestBody(input);
  return input;
}

function genericStatus(data: any, taskId: string): HttpStatus {
  const task = data.task ?? data; const raw = String(task.status ?? task.state ?? '').toUpperCase();
  const metadata = { taskId, status: raw, raw: data } as any;
  if (/SUCCEED|SUCCESS|COMPLETED|DONE/.test(raw)) return { state: 'completed', output: data, metadata };
  if (/FAIL|ERROR|CANCEL/.test(raw)) return { state: 'failed', error: String(task.reason ?? task.error?.message ?? `PPIO task ${raw}`), metadata };
  return { state: 'pending', phase: /PROCESS|RUNNING|GENERAT/.test(raw) ? 'running' : 'queued', progress: number(task.progress_percent ?? task.progress), metadata };
}

function buildGeminiBody(input: Record<string, unknown>) { const parts = [typeof input.prompt === 'string' && input.prompt.trim() ? { text: input.prompt } : undefined, ...asArray(input.images ?? input.urls).map(inlinePart)].filter(Boolean); if (!parts.length) throw new Error('ppio provider requires at least a prompt or reference image'); return { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: input.responseModalities ?? ['IMAGE'], imageConfig: compact({ aspectRatio: input.aspectRatio ?? input.aspect_ratio, imageSize: input.imageSize ?? input.image_size }) } }; }
function inlinePart(value: unknown) { const text = typeof value === 'string' ? value : isRecord(value) && typeof value.data === 'string' ? value.data : ''; const match = /^data:([^;]+);base64,(.+)$/.exec(text); if (!match) throw new Error('ppio reference images must be base64 data URLs'); return { inlineData: { mimeType: match[1], data: match[2] } }; }
function asArray(value: unknown): unknown[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function isResponse(model: string) { return (PPIO_RESPONSE_MODELS as readonly string[]).includes(model); }
function isSupported(model: string) { return (PPIO_SUPPORTED_MODELS as readonly string[]).includes(model) || isPpioSeedanceCnMeteredModel(model); }
function isAsync(model: string) { return model === PPIO_SEEDANCE_MODEL || model === PPIO_MINIMAX_H3_MODEL || (PPIO_VEO_MODELS as readonly string[]).includes(model) || (PPIO_KLING_V3_MODELS as readonly string[]).includes(model) || (PPIO_HAILUO_23_MODELS as readonly string[]).includes(model) || isPpioSeedanceCnMeteredModel(model); }
function firstString(value: any, fields: string[]): string | undefined { for (const field of fields) if (typeof value?.[field] === 'string') return value[field]; return undefined; }
function taskOperation(value: unknown): { taskId: string; queryURL: string } { if (isRecord(value) && typeof value.taskId === 'string' && typeof value.queryURL === 'string') return value as any; throw new Error('Invalid PPIO operation reference'); }
function number(value: unknown): number | undefined { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
async function describeModel(modelId: string, modelType: PptaskModelType): Promise<PptaskDescription> {
  const legacy = await describePpio(new URL(`ppio:///${encodeURIComponent(modelId)}`));
  return {
    providerId: 'ppio', modelId, modelType, title: modelId,
    inputSchema: legacy.formSchema,
    defaultInput: legacy.formValues,
    capabilities: { ...(legacy.metadata ?? {}), cancel: legacy.cancelable ?? false },
  };
}

function normalizeLanguagePayload(input: Record<string, unknown>): Record<string, unknown> {
  return normalizeLanguagePrompt(input);
}

function normalizeImagePayload(input: Record<string, unknown>): Record<string, any> {
  return { ...input, images: input.images ?? input.image, image: input.image ?? input.images, urls: input.urls ?? input.images ?? input.image };
}

function firstValue(value: unknown): any { return Array.isArray(value) ? value[0] : value == null || value === '' ? undefined : value; }

function compact(value: Record<string, unknown>) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)); }

async function requestPpioJson(
  fetchImpl: typeof globalThis.fetch,
  providerId: string,
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  if (!response.ok) throw new Error(`${providerId} request failed (${response.status}): ${await response.text()}`);
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (contentType.includes('text/event-stream') || body.stream === true) return parseSse(text);
  return text ? JSON.parse(text) : {};
}
function parseSse(text: string): unknown {
  const events = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(line => line && line !== '[DONE]').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const response = events.find((event: any) => event?.type === 'response.completed')?.response;
  if (response) return response;
  const delta = events.filter((event: any) => typeof event?.delta === 'string').map((event: any) => event.delta).join('');
  return delta ? { output: [{ type: 'message', content: [{ type: 'output_text', text: delta }] }] } : events[events.length - 1] ?? {};
}
