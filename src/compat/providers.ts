import type { PptaskModel, PptaskModelType, PptaskProvider } from '../core/types.ts';
import { createGrsaiProvider } from '../providers/grsai/index.ts';
import { createReplicateProvider } from '../providers/replicate/index.ts';
import { createRunninghubProvider } from '../providers/runninghub/index.ts';
import type { PlatformConfig, UploadParams, UploadResult } from './legacy.ts';

export type ParsedLocator = {
  scheme: string;
  modelId: string;
};

export function parseLocator(locator: string): ParsedLocator {
  const match = /^([a-z0-9_-]+):\/\/(.*)$/i.exec(locator.trim());
  if (!match) throw new Error(`Invalid locator format: ${locator}`);
  const scheme = match[1].toLowerCase();
  const remainder = match[2];
  let modelId: string;
  if (scheme === 'runninghub') {
    modelId = remainder.replace(/^\/+/, '');
  } else {
    modelId = remainder.replace(/^\/+/, '');
  }
  if (!modelId) throw new Error(`Locator does not contain a model: ${locator}`);
  return { scheme, modelId };
}

export function createBuiltinProvider(
  scheme: string,
  platformConfig: PlatformConfig = {},
): PptaskProvider {
  const apiKey = String(platformConfig.apiKey ?? platformConfig.api_key ?? '');
  const baseURL = platformConfig.baseURL ?? platformConfig.baseUrl ?? platformConfig.endpoint;
  const common = {
    ...platformConfig,
    apiKey,
    baseURL,
  };
  if (scheme === 'runninghub') return createRunninghubProvider(common);
  if (scheme === 'grsai') {
    return createGrsaiProvider({
      ...common,
      baseURL: baseURL ?? 'https://grsaiapi.com',
    });
  }
  if (scheme === 'replicate') return createReplicateProvider(common);
  throw new Error(`No built-in compatibility provider for scheme: ${scheme}`);
}

export function inferModelType(locator: string, payload: Record<string, any> = {}): PptaskModelType {
  const configured = payload.modelType ?? payload.model_type;
  if (configured === 'language' || configured === 'image' || configured === 'video') {
    return configured;
  }
  const value = locator.toLowerCase();
  if (/video|i2v|t2v|veo|kling|seedance|hailuo|minimax|wan-|pixverse/.test(value)) {
    return 'video';
  }
  return 'image';
}

export function resolveModel(
  provider: PptaskProvider,
  modelId: string,
  modelType: PptaskModelType,
): PptaskModel {
  if (modelType === 'language') return provider.languageModel(modelId) as PptaskModel;
  if (modelType === 'video') return provider.videoModel(modelId) as PptaskModel;
  return provider.imageModel(modelId) as PptaskModel;
}

export function toModelInput(
  scheme: string,
  modelType: PptaskModelType,
  payload: Record<string, any>,
  signal?: AbortSignal,
): Record<string, unknown> {
  const providerOptions = { [scheme]: { input: payload } };
  if (modelType === 'language') {
    const prompt = String(payload.prompt ?? payload.text ?? payload.input_text ?? '');
    return {
      prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      maxOutputTokens: finiteNumber(payload.maxOutputTokens ?? payload.max_tokens),
      temperature: finiteNumber(payload.temperature),
      providerOptions,
      abortSignal: signal,
    };
  }
  return {
    ...payload,
    prompt: String(payload.prompt ?? ''),
    n: finiteNumber(payload.n),
    duration: finiteNumber(payload.duration),
    providerOptions,
    abortSignal: signal,
  };
}

export async function uploadWithBuiltinProvider(
  scheme: string,
  params: UploadParams,
): Promise<UploadResult> {
  const provider = createBuiltinProvider(scheme, params.platformConfig);
  const file = firstFile(params.formData);
  if (!file) throw new Error(`Upload form data does not contain a file for ${scheme}`);
  const result = await provider.upload({
    data: { type: 'data', data: new Uint8Array(await file.arrayBuffer()) },
    filename: 'name' in file && typeof file.name === 'string' ? file.name : undefined,
    mediaType: file.type || 'application/octet-stream',
    abortSignal: toAbortSignal(params.options?.signal),
  });
  const url = providerResultUrl(scheme, result);
  if (!url) throw new Error(`${scheme} upload did not return a usable URL or provider reference`);
  return { provider: scheme, url };
}

function firstFile(formData: FormData): Blob | undefined {
  for (const value of formData.values()) {
    if (value instanceof Blob) return value;
  }
  return undefined;
}

function providerResultUrl(scheme: string, result: any): string | undefined {
  const metadata = result?.providerMetadata?.[scheme];
  if (typeof metadata?.url === 'string') return metadata.url;
  const reference = result?.providerReference?.[scheme];
  return typeof reference === 'string' ? reference : undefined;
}

export function toAbortSignal(signal: unknown): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal ? signal : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
