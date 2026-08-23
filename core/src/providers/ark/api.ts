import type {
  DescribeResult,
  PlatformConfig,
  TaskRequestOptions,
  TaskResult,
} from '../../types.ts';
import { buildArkFormSchema } from './formily.ts';
import {
  ARK_SEEDREAM_5_PRO_MODEL,
  buildArkImagesEndpoint,
  ensureArkConfig,
  normalizeArkImageOutputs,
  parseArkModel,
} from './helpers.ts';

const ARK_SCHEME = 'ark';

export async function describeArk(
  url: URL,
  _platformConfig?: PlatformConfig,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parseArkModel(url);
  return {
    provider: ARK_SCHEME,
    metadata: {
      scheme: ARK_SCHEME,
      model,
      apiEndpoint: '/api/v3/images/generations',
      protocol: 'volcengine-ark-images-generations',
      supportsLayerDecomposition: model === ARK_SEEDREAM_5_PRO_MODEL,
    },
    formSchema: buildArkFormSchema(),
    formValues: {
      prompt: '',
      image: [],
      layerDecomposition: false,
      size: '2K',
      optimizePromptMode: 'standard',
      outputFormat: 'jpeg',
      background: 'opaque',
      responseFormat: 'url',
      watermark: true,
    },
    cancelable: false,
  };
}

export async function createArkTaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (options?.signal?.aborted) throw createAbortError('Ark task aborted before execution');

  const model = parseArkModel(url);
  const config = ensureArkConfig(platformConfig);
  const requestBody = buildArkSeedreamRequestBody(model, payload);

  try {
    const response = await fetch(buildArkImagesEndpoint(config), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: toAbortSignal(options?.signal),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ark API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }

    const result = await response.json();
    const outputs = normalizeArkImageOutputs(result);
    if (outputs.length === 0) {
      const detail = result?.error?.message || result?.error?.code || 'response data is empty';
      throw new Error(`Ark API returned no image output: ${detail}`);
    }

    return {
      provider: ARK_SCHEME,
      taskId: `ark-${result?.created ?? Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: result?.usage?.total_tokens,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('Ark API')) throw error;
    const wrappedError = new Error(`Ark API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

export function buildArkSeedreamRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (model !== ARK_SEEDREAM_5_PRO_MODEL) {
    throw new Error(`Unsupported Ark Seedream model: ${model}`);
  }

  const layerDecomposition = Boolean(payload.layer_decomposition ?? payload.layerDecomposition);
  const images = normalizeArkImages(payload.image ?? payload.images ?? payload.urls);
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';

  if (layerDecomposition) {
    if (images.length !== 1) {
      throw new Error('ark Seedream 5.0 Pro layer decomposition requires exactly one source image');
    }
  } else if (!prompt) {
    throw new Error('ark Seedream 5.0 Pro image generation requires a non-empty prompt');
  }
  if (images.length > 10) {
    throw new Error('ark Seedream 5.0 Pro supports at most 10 reference images');
  }

  const size = normalizeArkSize(payload.size, layerDecomposition);
  const outputFormat = normalizeEnum(
    payload.output_format ?? payload.outputFormat ?? 'jpeg',
    ['png', 'jpeg'] as const,
    'output_format'
  );
  const responseFormat = normalizeEnum(
    payload.response_format ?? payload.responseFormat ?? 'url',
    ['url', 'b64_json'] as const,
    'response_format'
  );
  const background = normalizeEnum(
    payload.background ?? 'opaque',
    ['transparent', 'opaque'] as const,
    'background'
  );
  if (background === 'transparent') {
    if (images.length !== 1 || layerDecomposition) {
      throw new Error('ark Seedream 5.0 Pro transparent background requires single-image editing mode');
    }
    if (outputFormat !== 'png') {
      throw new Error('ark Seedream 5.0 Pro transparent background requires output_format=png');
    }
  }

  if (payload.sequential_image_generation != null || payload.sequentialImageGeneration != null) {
    throw new Error('ark Seedream 5.0 Pro does not support sequential_image_generation');
  }
  if (payload.stream === true) {
    throw new Error('ark Seedream 5.0 Pro does not support streaming output');
  }
  if (payload.tools != null) {
    throw new Error('ark Seedream 5.0 Pro does not support tools');
  }

  const body: Record<string, any> = {
    model,
    layer_decomposition: layerDecomposition,
    size,
    output_format: outputFormat,
    response_format: responseFormat,
    watermark: payload.watermark == null ? true : Boolean(payload.watermark),
  };
  if (prompt) body.prompt = prompt;
  if (images.length > 0) body.image = images.length === 1 ? images[0] : images;
  if (!layerDecomposition) body.background = background;

  const optimizeMode = payload.optimize_prompt_options?.mode ?? payload.optimizePromptMode;
  if (optimizeMode != null && optimizeMode !== '') {
    body.optimize_prompt_options = {
      mode: normalizeEnum(optimizeMode, ['standard', 'fast'] as const, 'optimize_prompt_options.mode'),
    };
  }
  return body;
}

function normalizeArkImages(value: unknown): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  return values.map((item, index) => normalizeArkImage(item, index));
}

function normalizeArkImage(value: any, index: number): string {
  const candidate = typeof value === 'string'
    ? value.trim()
    : typeof value?.url === 'string'
      ? value.url.trim()
      : value?.inlineData?.data
        ? `data:${value.inlineData.mimeType || 'image/png'};base64,${value.inlineData.data}`
        : '';
  if (!candidate) throw new Error(`ark Seedream 5.0 Pro image[${index}] is empty or invalid`);
  if (/^https?:\/\//i.test(candidate) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(candidate)) {
    return candidate;
  }
  throw new Error(`ark Seedream 5.0 Pro image[${index}] must be an HTTP(S) URL or image data URL`);
}

function normalizeArkSize(value: unknown, layerDecomposition: boolean): string {
  const size = String(value || (layerDecomposition ? 'auto' : '2K')).trim();
  const preset = size.toUpperCase();
  if (['1K', '1.5K', '2K'].includes(preset)) return preset;
  if (layerDecomposition) {
    if (size.toLowerCase() === 'auto') return 'auto';
    throw new Error('ark Seedream 5.0 Pro layer decomposition size must be one of: auto, 1K, 1.5K, 2K');
  }

  const match = /^(\d+)x(\d+)$/i.exec(size);
  if (!match) {
    throw new Error('ark Seedream 5.0 Pro generation size must be 1K, 1.5K, 2K, or WIDTHxHEIGHT');
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;
  const ratio = width / height;
  if (pixels < 921600 || pixels > 4624220 || ratio < 1 / 16 || ratio > 16) {
    throw new Error(
      'ark Seedream 5.0 Pro custom size must have 921600-4624220 pixels and an aspect ratio between 1:16 and 16:1'
    );
  }
  return `${width}x${height}`;
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  const normalized = String(value).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ark Seedream 5.0 Pro ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function toAbortSignal(signal: TaskRequestOptions['signal']): AbortSignal | undefined {
  if (!signal) return undefined;
  if (typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal) return signal;
  return undefined;
}
