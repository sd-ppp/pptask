import type { FilesV4 } from '@ai-sdk/provider';
import type { PptaskDescription, PptaskModelType, PptaskProvider } from '../../core/types.ts';
import { createHttpProvider } from '../shared/provider.ts';
import { jsonRequest, mergeHeaders, normalizeProviderConfig, request, requestJson, uploadBlob } from '../shared/http.ts';
import { isRecord } from '../shared/input.ts';
import type { CommonProviderOptions, HttpProviderProtocol, HttpStatus } from '../shared/types.ts';
import {
  buildCrunRequestBody,
  buildCrunGpt56ChatBody,
  buildCrunGpt56ResponsesBody,
  describeCrun,
} from './legacy-api.ts';
import {
  CRUN_SUPPORTED_MODELS,
  isCrunGpt56Model,
  isCrunGptImage2,
  isCrunGeminiOmniModel,
  isCrunGrokImagineVideoModel,
  isCrunHailuo23Model,
  isCrunImageExpandModel,
  isCrunImageUpscaleModel,
  isCrunKlingModel,
  isCrunMinimaxH3Model,
  isCrunPixverseV6Model,
  isCrunSeedanceModel,
  isCrunSeedreamModel,
  isCrunVeo31Model,
  isCrunWatermarkRemoveModel,
  isCrunHappyHorse11Model,
} from './legacy-helpers.ts';

export type CrunProviderOptions = CommonProviderOptions & { apiKey: string };

export function createCrunProvider(options: CrunProviderOptions): PptaskProvider {
  const config = normalizeProviderConfig('crun', options, 'https://api.crun.ai/api/v1');
  const auth = { ...config.headers, 'x-api-key': config.apiKey! };
  const protocol: HttpProviderProtocol = {
    providerId: 'crun', fetch: config.fetch,
    modelTypes: undefined,
    validateModel(modelId, modelType) {
      if (!(CRUN_SUPPORTED_MODELS as readonly string[]).includes(modelId)) {
        throw new Error(`Unsupported CRUN model: ${modelId}. Supported models: ${CRUN_SUPPORTED_MODELS.join(', ')}`);
      }
      const expected = isCrunGpt56Model(modelId) ? 'language' : isImageModel(modelId) ? 'image' : 'video';
      if (modelType !== expected) throw new Error(`CRUN model ${modelId} must be used as a ${expected} model`);
    },
    mode: modelId => isCrunGpt56Model(modelId) ? 'sync' : 'async',
    files: createFiles(config.fetch, config.baseURL, auth),
    async execute(context) {
      if (!isCrunGpt56Model(context.modelId)) throw new Error(`crun ${context.modelId} uses asynchronous execution`);
      const payload = normalizeLanguagePayload(context.input);
      const apiMode = normalizeApiMode(payload.apiMode ?? payload.api_mode ?? payload.useChatCompletions ? 'chat_completions' : 'responses');
      const body = apiMode === 'responses'
        ? buildCrunGpt56ResponsesBody(context.modelId, payload)
        : buildCrunGpt56ChatBody(context.modelId, payload);
      const endpoint = `${config.baseURL}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`;
      return requestJsonOrSse(config.fetch, 'crun', jsonRequest(endpoint, body, mergeHeaders(auth, context.headers)), context.signal, Boolean(body.stream));
    },
    async start(context) {
      const body = buildCrunRequestBody(context.modelId, normalizeAsyncPayload(context.modelType, context.input));
      const headers = mergeHeaders(auth, context.headers);
      const raw = await requestJson<any>(config.fetch, 'crun', jsonRequest(`${config.baseURL}/client/job/CreateTask`, body, headers), context.signal);
      if (raw.code !== undefined && raw.code !== 200) throw new Error(`crun createTask failed: ${raw.message ?? raw.msg ?? raw.code}`);
      const taskId = raw.data?.task_id ?? raw.data?.taskId ?? raw.task_id ?? raw.taskId;
      if (typeof taskId !== 'string' || !taskId) throw new Error('crun createTask did not return task_id');
      return { operation: { taskId }, metadata: { taskId, model: context.modelId } };
    },
    async status(context) {
      const taskId = operationId(context.operation);
      const raw = await requestJson<any>(config.fetch, 'crun', {
        url: `${config.baseURL}/client/job/TaskInfo?task_id=${encodeURIComponent(taskId)}`,
        headers: mergeHeaders(auth, context.headers),
      }, context.signal);
      if (raw.code !== undefined && raw.code !== 200) throw new Error(`crun TaskInfo failed: ${raw.message ?? raw.msg ?? raw.code}`);
      return mapStatus(raw.data ?? raw, taskId);
    },
    describe: async (modelId, modelType) => describeModel(modelId, modelType),
  };
  return createHttpProvider(protocol, options);
}

function isImageModel(model: string): boolean {
  return isCrunGptImage2(model) || isCrunSeedreamModel(model) || isCrunImageUpscaleModel(model) ||
    isCrunWatermarkRemoveModel(model) && model === 'image-watermark-remove' || isCrunImageExpandModel(model) ||
    model.startsWith('google/nano-banana');
}

function normalizeAsyncPayload(modelType: PptaskModelType, input: Record<string, unknown>): Record<string, any> {
  const payload: Record<string, any> = { ...input };
  if (modelType === 'image' && payload.images !== undefined && payload.imgUrls === undefined && payload.img_urls === undefined) {
    payload.imgUrls = payload.images;
  }
  if (modelType === 'video') {
    if (payload.image !== undefined && payload.imgUrls === undefined && payload.img_urls === undefined) payload.imgUrls = payload.image;
    if (payload.inputReferences !== undefined && payload.referenceImages === undefined && payload.reference_images === undefined) payload.referenceImages = payload.inputReferences;
  }
  return payload;
}

function normalizeLanguagePayload(input: Record<string, unknown>): Record<string, any> {
  const payload: Record<string, any> = { ...input };
  if (Array.isArray(payload.messages)) payload.messages = payload.messages.map(normalizeMessage);
  if (payload.prompt && !Array.isArray(payload.prompt) && typeof payload.prompt !== 'string') payload.prompt = String(payload.prompt);
  if (payload.apiMode === undefined && payload.useChatCompletions !== undefined) payload.apiMode = payload.useChatCompletions ? 'chat_completions' : 'responses';
  return payload;
}

function normalizeMessage(message: any): any {
  if (!message || typeof message !== 'object') return message;
  const content = Array.isArray(message.content)
    ? message.content.map((part: any) => part?.type === 'text' ? { type: 'text', text: part.text } : part)
    : message.content;
  return { ...message, content };
}

function normalizeApiMode(value: unknown): 'responses' | 'chat_completions' {
  const mode = String(value ?? 'responses').trim().toLowerCase().replace(/[/-]/g, '_');
  if (mode === 'responses' || mode === 'response') return 'responses';
  if (mode === 'chat' || mode === 'chat_completion' || mode === 'chat_completions') return 'chat_completions';
  throw new Error('CRUN GPT-5.6 apiMode must be responses or chat_completions');
}

function mapStatus(data: Record<string, any>, taskId: string): HttpStatus {
  const status = String(data.status ?? data.state ?? '').toLowerCase();
  const metadata = { taskId, status, credits: data.credits ?? null, raw: data } as any;
  if (['success', 'succeeded', 'completed', 'complete'].includes(status)) return { state: 'completed', output: data.result ?? data, metadata };
  if (['failed', 'failure', 'error', 'cancelled', 'canceled'].includes(status)) return { state: 'failed', error: String(data.message ?? data.error ?? `CRUN task ${status}`), metadata };
  return { state: 'pending', phase: ['running', 'processing', 'in_progress', 'in-progress'].includes(status) ? 'running' : 'queued', progress: number(data.progress), metadata };
}

async function describeModel(modelId: string, modelType: PptaskModelType): Promise<PptaskDescription> {
  const legacy = await describeCrun(new URL(`crun:///${encodeURIComponent(modelId)}`));
  return {
    providerId: 'crun', modelId, modelType,
    title: modelId,
    inputSchema: legacy.formSchema,
    defaultInput: legacy.formValues,
    capabilities: { ...(legacy.metadata ?? {}), cancel: legacy.cancelable ?? false, upload: true },
  };
}

function operationId(value: unknown): string {
  if (isRecord(value) && typeof value.taskId === 'string') return value.taskId;
  throw new Error('Invalid CRUN operation reference');
}

function number(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createFiles(fetchImpl: typeof globalThis.fetch, baseURL: string, auth: Record<string, string>): FilesV4 {
  return { specificationVersion: 'v4', provider: 'crun', async uploadFile(options) {
    const blob = await uploadBlob(options);
    const extension = `.${options.filename?.split('.').pop() ?? extensionFor(options.mediaType)}`;
    const query = new URLSearchParams({ content_type: options.mediaType, ext: extension });
    const raw = await requestJson<any>(fetchImpl, 'crun', { url: `${baseURL}/client/files/upload-url?${query}`, headers: { ...auth, accept: 'application/json' } }, options.abortSignal);
    if (raw.code !== 200 || !raw.data?.presigned_url || !raw.data?.file_url) throw new Error('crun upload URL response is incomplete');
    await request(fetchImpl, 'crun', { url: raw.data.presigned_url, method: 'PUT', headers: { 'content-type': options.mediaType }, body: blob }, options.abortSignal);
    const url = raw.data.file_url;
    return { providerReference: { crun: url }, mediaType: options.mediaType, filename: options.filename, byteSize: blob.size, providerMetadata: { crun: { url } }, warnings: [] };
  } };
}

function extensionFor(mediaType: string): string {
  return ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3' } as Record<string, string>)[mediaType] ?? 'bin';
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
  if (failed) throw new Error(failed?.response?.error?.message ?? failed?.error?.message ?? 'CRUN stream failed');
  const completed = [...events].reverse().find((event: any) => event?.type === 'response.completed');
  if (completed?.response) return completed.response;
  const outputText = events.filter((event: any) => typeof event?.delta === 'string' || typeof event?.text === 'string').map((event: any) => event.delta ?? event.text).join('');
  if (outputText) return { output_text: outputText, text: outputText, choices: [{ message: { content: outputText } }] };
  return events[events.length - 1] ?? {};
}

export const CRUN_DEFAULT_BASE_URL = 'https://api.crun.ai/api/v1';
