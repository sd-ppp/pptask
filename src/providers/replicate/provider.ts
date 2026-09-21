import type {
  Experimental_VideoModelV4CallOptions,
  Experimental_VideoModelV4Result,
  FilesV4,
  FilesV4UploadFileCallOptions,
  FilesV4UploadFileResult,
  ImageModelV4CallOptions,
  ImageModelV4Result,
  JSONValue,
} from '@ai-sdk/provider';
import { createPptaskProvider } from '../../core/provider.ts';
import type {
  PptaskDescription,
  PptaskImageModelImplementation,
  PptaskJobRepository,
  PptaskOperationContext,
  PptaskOperationStatusResult,
  PptaskProvider,
  PptaskVideoModelImplementation,
} from '../../core/types.ts';

const DEFAULT_BASE_URL = 'https://api.replicate.com/v1';

export type ReplicateProviderOptions = {
  apiKey: string;
  baseURL?: string;
  version?: string;
  fetch?: typeof globalThis.fetch;
  jobRepository?: PptaskJobRepository;
  pollIntervalMs?: number;
};

type ReplicateConfig = {
  apiKey: string;
  baseURL: string;
  version?: string;
  fetch: typeof globalThis.fetch;
};

type ReplicatePrediction = {
  id: string;
  status?: string;
  output?: unknown;
  error?: unknown;
  logs?: string;
  metrics?: Record<string, unknown>;
  urls?: Record<string, string>;
  version?: string;
};

export function createReplicateProvider(options: ReplicateProviderOptions): PptaskProvider {
  const config = normalizeConfig(options);
  const files = createReplicateFiles(config);
  return createPptaskProvider({
    providerId: 'replicate',
    imageModel: modelId => createReplicateImageModel(modelId, config),
    videoModel: modelId => createReplicateVideoModel(modelId, config),
    files,
    jobRepository: options.jobRepository,
    pollIntervalMs: options.pollIntervalMs,
  });
}

function createReplicateImageModel(
  modelId: string,
  config: ReplicateConfig,
): PptaskImageModelImplementation {
  validateModelId(modelId);
  return {
    maxImagesPerCall: undefined,
    async doStart(options, context) {
      return startPrediction(
        config,
        modelId,
        imageInput(options),
        context,
        options.headers,
        options.abortSignal,
      );
    },
    async doStatus({ operation, abortSignal, headers }) {
      const prediction = await getPrediction(config, operationId(operation), abortSignal, headers);
      return imageStatus(config, modelId, prediction, abortSignal);
    },
    async doCancel({ operation, abortSignal, headers }) {
      await cancelPrediction(config, operationId(operation), abortSignal, headers);
    },
    async doDescribe() {
      return describeReplicateModel(config, modelId, 'image');
    },
  };
}

function createReplicateVideoModel(
  modelId: string,
  config: ReplicateConfig,
): PptaskVideoModelImplementation {
  validateModelId(modelId);
  return {
    maxVideosPerCall: 1,
    async doStart(options, context) {
      const started = await startPrediction(
        config,
        modelId,
        videoInput(options),
        context,
        options.headers,
        options.abortSignal,
      );
      return {
        operation: started.operation,
        warnings: [],
        providerMetadata: started.providerMetadata,
        response: {
          timestamp: new Date(),
          modelId,
          headers: undefined,
        },
      };
    },
    async doStatus({ operation, abortSignal, headers }) {
      const prediction = await getPrediction(config, operationId(operation), abortSignal, headers);
      const state = normalizePredictionStatus(prediction);
      const response = { timestamp: new Date(), modelId, headers: undefined };
      if (state === 'pending') {
        return {
          status: 'pending' as const,
          providerMetadata: predictionMetadata(prediction),
          response,
        };
      }
      if (state === 'error') {
        return {
          status: 'error' as const,
          error: predictionError(prediction),
          providerMetadata: predictionMetadata(prediction),
          response,
        };
      }
      return {
        status: 'completed' as const,
        videos: outputUrls(prediction.output).map(url => ({
          type: 'url' as const,
          url,
          mediaType: inferVideoMediaType(url),
        })),
        warnings: [],
        providerMetadata: predictionMetadata(prediction),
        response,
      };
    },
    async doCancel({ operation, abortSignal, headers }) {
      await cancelPrediction(config, operationId(operation), abortSignal, headers);
    },
    async doDescribe() {
      return describeReplicateModel(config, modelId, 'video');
    },
  };
}

async function imageStatus(
  config: ReplicateConfig,
  modelId: string,
  prediction: ReplicatePrediction,
  signal?: AbortSignal,
): Promise<PptaskOperationStatusResult<ImageModelV4Result>> {
  const state = normalizePredictionStatus(prediction);
  if (state === 'pending') {
    return {
      status: 'pending',
      phase: prediction.status === 'processing' ? 'running' : 'queued',
      progress: predictionProgress(prediction),
      providerMetadata: predictionMetadata(prediction),
    };
  }
  if (state === 'error') {
    return {
      status: 'error',
      error: predictionError(prediction),
      providerMetadata: predictionMetadata(prediction),
    };
  }

  const urls = outputUrls(prediction.output);
  const images = await Promise.all(urls.map(url => downloadBytes(config.fetch, url, signal)));
  return {
    status: 'completed',
    images,
    warnings: [],
    providerMetadata: {
      replicate: {
        images: urls.map(url => ({ url })),
        predictionId: prediction.id,
      },
    },
    response: {
      timestamp: new Date(),
      modelId,
      headers: undefined,
    },
  };
}

async function startPrediction(
  config: ReplicateConfig,
  modelId: string,
  input: Record<string, unknown>,
  context?: PptaskOperationContext,
  requestHeaders?: Record<string, string | undefined>,
  signal?: AbortSignal,
) {
  const endpoint = config.version
    ? `${config.baseURL}/predictions`
    : `${config.baseURL}/models/${encodeModelPath(modelId)}/predictions`;
  const prediction = await requestJson<ReplicatePrediction>(config, endpoint, {
    method: 'POST',
    headers: {
      ...definedHeaders(requestHeaders),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      input,
      ...(config.version ? { version: config.version } : {}),
    }),
    signal,
  });
  if (!prediction.id) throw new Error('Replicate did not return a prediction id');
  return {
    operation: { predictionId: prediction.id },
    warnings: [],
    providerMetadata: predictionMetadata(prediction),
  };
}

async function getPrediction(
  config: ReplicateConfig,
  predictionId: string,
  signal?: AbortSignal,
  headers?: Record<string, string | undefined>,
): Promise<ReplicatePrediction> {
  return requestJson(config, `${config.baseURL}/predictions/${encodeURIComponent(predictionId)}`, {
    signal,
    headers: definedHeaders(headers),
  });
}

async function cancelPrediction(
  config: ReplicateConfig,
  predictionId: string,
  signal?: AbortSignal,
  headers?: Record<string, string | undefined>,
): Promise<void> {
  await requestJson(config, `${config.baseURL}/predictions/${encodeURIComponent(predictionId)}/cancel`, {
    method: 'POST',
    signal,
    headers: definedHeaders(headers),
  });
}

async function describeReplicateModel(
  config: ReplicateConfig,
  modelId: string,
  modelType: 'image' | 'video',
): Promise<PptaskDescription> {
  const model = await requestJson<Record<string, any>>(
    config,
    `${config.baseURL}/models/${encodeModelPath(modelId)}`,
  );
  const inputSchema = model.latest_version?.openapi_schema?.components?.schemas?.Input;
  return {
    providerId: 'replicate',
    modelId,
    modelType,
    title: String(model.name ?? modelId),
    description: typeof model.description === 'string' ? model.description : undefined,
    inputSchema: isRecord(inputSchema) ? inputSchema : undefined,
    defaultInput: isRecord(model.default_example?.input) ? model.default_example.input : undefined,
    capabilities: {
      cancel: true,
      operation: 'prediction',
    },
    providerMetadata: {
      replicate: {
        owner: model.owner ?? modelId.split('/')[0],
        visibility: model.visibility ?? null,
      },
    },
  };
}

function createReplicateFiles(config: ReplicateConfig): FilesV4 {
  return {
    specificationVersion: 'v4',
    provider: 'replicate',
    async uploadFile(options): Promise<FilesV4UploadFileResult> {
      const blob = await uploadDataToBlob(options);
      const form = new FormData();
      form.append('content', blob, options.filename ?? `upload-${Date.now()}`);
      form.append('metadata', new Blob(['{}'], { type: 'application/json' }));
      const uploaded = await requestJson<Record<string, any>>(config, `${config.baseURL}/files`, {
        method: 'POST',
        body: form,
        signal: options.abortSignal,
      });
      const id = String(uploaded.id ?? '');
      if (!id) throw new Error('Replicate did not return a file id');
      return {
        providerReference: { replicate: id },
        mediaType: options.mediaType,
        filename: options.filename,
        byteSize: blob.size,
        createdAt: toDate(uploaded.created_at),
        expiresAt: toDate(uploaded.expires_at),
        providerMetadata: {
          replicate: {
            url: uploaded.urls?.get ?? null,
          },
        },
        warnings: [],
      };
    },
    async getFileMetadata({ file: providerReference, abortSignal }) {
      const id = providerReference.replicate;
      if (!id) throw new Error('Missing Replicate file reference');
      const file = await requestJson<Record<string, any>>(
        config,
        `${config.baseURL}/files/${encodeURIComponent(id)}`,
        { signal: abortSignal },
      );
      return {
        providerReference: { replicate: id },
        filename: file.name,
        mediaType: file.content_type,
        byteSize: file.size,
        createdAt: toDate(file.created_at),
        expiresAt: toDate(file.expires_at),
        providerMetadata: { replicate: { url: file.urls?.get ?? null } },
        warnings: [],
      };
    },
    async deleteFile({ file: providerReference, abortSignal }) {
      const id = providerReference.replicate;
      if (!id) throw new Error('Missing Replicate file reference');
      await request(config, `${config.baseURL}/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: abortSignal,
      });
      return {
        providerReference: { replicate: id },
        deleted: true,
        providerMetadata: { replicate: { fileId: id } },
        warnings: [],
      };
    },
  };
}

function imageInput(options: ImageModelV4CallOptions): Record<string, unknown> {
  const custom = providerInput(options.providerOptions);
  const dimensions = parseSize(options.size);
  return compact({
    ...custom,
    prompt: options.prompt,
    num_outputs: options.n,
    ...dimensions,
    aspect_ratio: options.aspectRatio,
    seed: options.seed,
    ...(options.files?.length ? { input_images: options.files.map(fileInput) } : {}),
    ...(options.mask ? { mask: fileInput(options.mask) } : {}),
  });
}

function videoInput(options: Experimental_VideoModelV4CallOptions): Record<string, unknown> {
  const custom = providerInput(options.providerOptions);
  return compact({
    ...custom,
    prompt: options.prompt,
    num_outputs: options.n,
    aspect_ratio: options.aspectRatio,
    resolution: options.resolution,
    duration: options.duration,
    fps: options.fps,
    seed: options.seed,
    generate_audio: options.generateAudio,
    ...(options.image ? { image: fileInput(options.image) } : {}),
    ...(options.inputReferences?.length
      ? { input_references: options.inputReferences.map(fileInput) }
      : {}),
  });
}

function providerInput(providerOptions: Record<string, any>): Record<string, unknown> {
  const input = providerOptions.replicate?.input;
  return isRecord(input) ? input : {};
}

function fileInput(file: { type: 'url'; url: string } | { type: 'file'; data: string | Uint8Array; mediaType: string }): string {
  if (file.type === 'url') return file.url;
  const base64 = typeof file.data === 'string' ? file.data : bytesToBase64(file.data);
  return `data:${file.mediaType};base64,${base64}`;
}

async function uploadDataToBlob(options: FilesV4UploadFileCallOptions): Promise<Blob> {
  if (options.data.type === 'text') return new Blob([options.data.text], { type: options.mediaType });
  if (options.data.type === 'data') {
    const bytes = typeof options.data.data === 'string'
      ? base64ToBytes(options.data.data)
      : options.data.data;
    return new Blob([bytes as BlobPart], { type: options.mediaType });
  }
  const response = new Response(options.data.stream);
  const blob = await response.blob();
  return blob.type ? blob : new Blob([blob], { type: options.mediaType });
}

async function requestJson<T>(config: ReplicateConfig, url: string, init: RequestInit = {}): Promise<T> {
  const response = await request(config, url, init);
  return response.json() as Promise<T>;
}

async function request(config: ReplicateConfig, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${config.apiKey}`);
  const response = await config.fetch(url, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Replicate request failed (${response.status}): ${body || response.statusText}`);
  }
  return response;
}

function normalizeConfig(options: ReplicateProviderOptions): ReplicateConfig {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('Replicate apiKey is required');
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error('Replicate provider requires fetch');
  return {
    apiKey,
    baseURL: (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    version: options.version,
    fetch: fetchImpl,
  };
}

function normalizePredictionStatus(prediction: ReplicatePrediction): 'pending' | 'completed' | 'error' {
  if (prediction.status === 'succeeded') return 'completed';
  if (prediction.status === 'failed' || prediction.status === 'canceled') return 'error';
  return 'pending';
}

function predictionError(prediction: ReplicatePrediction): string {
  if (typeof prediction.error === 'string') return prediction.error;
  if (prediction.error) return JSON.stringify(prediction.error);
  return `Replicate prediction ${prediction.id} ended with status ${prediction.status ?? 'unknown'}`;
}

function predictionProgress(prediction: ReplicatePrediction): number | undefined {
  const progress = prediction.metrics?.progress;
  return typeof progress === 'number' ? progress : undefined;
}

function predictionMetadata(prediction: ReplicatePrediction): any {
  return {
    replicate: {
      predictionId: prediction.id,
      status: prediction.status ?? null,
      version: prediction.version ?? null,
    },
  };
}

function operationId(operation: JSONValue): string {
  if (isRecord(operation)) {
    const predictionId = (operation as Record<string, unknown>).predictionId;
    if (typeof predictionId === 'string') return predictionId;
  }
  if (typeof operation === 'string') return operation;
  throw new Error('Invalid Replicate operation reference');
}

function outputUrls(output: unknown): string[] {
  if (typeof output === 'string') return [output];
  if (Array.isArray(output)) return output.flatMap(outputUrls);
  if (isRecord(output)) {
    for (const key of ['url', 'video', 'image', 'output']) {
      if (key in output) {
        const urls = outputUrls(output[key]);
        if (urls.length) return urls;
      }
    }
  }
  return [];
}

async function downloadBytes(fetchImpl: typeof fetch, url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetchImpl(url, { signal });
  if (!response.ok) throw new Error(`Failed to download Replicate output (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function encodeModelPath(modelId: string): string {
  return modelId.split('/').map(encodeURIComponent).join('/');
}

function validateModelId(modelId: string): void {
  const [owner, name, ...rest] = modelId.split('/');
  if (!owner || !name || rest.length) {
    throw new Error('Replicate modelId must use owner/model format');
  }
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function parseSize(size: `${number}x${number}` | undefined): Record<string, number> {
  if (!size) return {};
  const [width, height] = size.split('x').map(Number);
  return { width, height };
}

function definedHeaders(
  headers?: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function inferVideoMediaType(url: string): string {
  if (/\.webm(?:$|\?)/i.test(url)) return 'video/webm';
  if (/\.mov(?:$|\?)/i.test(url)) return 'video/quicktime';
  return 'video/mp4';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
