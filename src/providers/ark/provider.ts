import type { PptaskDescription, PptaskProvider } from '../../core/types.ts';
import { createHttpProvider } from '../shared/provider.ts';
import { jsonRequest, mergeHeaders, normalizeProviderConfig, requestJson } from '../shared/http.ts';
import type { CommonProviderOptions, HttpProviderProtocol } from '../shared/types.ts';

export type ArkProviderOptions = CommonProviderOptions & { apiKey: string };

export const ARK_DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
export const ARK_SEEDREAM_5_PRO_MODEL = 'doubao-seedream-5-0-pro-260628';
export const ARK_SUPPORTED_MODELS = [ARK_SEEDREAM_5_PRO_MODEL] as const;

export function createArkProvider(options: ArkProviderOptions): PptaskProvider {
  const config = normalizeProviderConfig('ark', options, ARK_DEFAULT_BASE_URL);
  const auth = { ...config.headers, authorization: `Bearer ${config.apiKey}` };
  const protocol: HttpProviderProtocol = {
    providerId: 'ark', fetch: config.fetch, modelTypes: ['image'], mode: () => 'sync',
    validateModel: assertSupportedModel,
    async execute(context) {
      const body = buildArkSeedreamRequestBody(context.modelId, context.input);
      return requestJson(
        config.fetch,
        'ark',
        jsonRequest(`${config.baseURL}/images/generations`, body, mergeHeaders(auth, context.headers)),
        context.signal,
      );
    },
    status: async () => { throw new Error('Ark image generation is synchronous'); },
    describe: async modelId => description(modelId),
  };
  return createHttpProvider(protocol, options);
}
function description(modelId: string): PptaskDescription {
  assertSupportedModel(modelId);
  return {
    providerId: 'ark',
    modelId,
    modelType: 'image',
    title: 'Seedream 5.0 Pro',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        image: { type: 'array', maxItems: 10, items: { type: 'string' } },
        layerDecomposition: { type: 'boolean', default: false },
        size: { type: 'string', default: '2K' },
        optimizePromptMode: { type: 'string', enum: ['standard', 'fast'], default: 'standard' },
        outputFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'jpeg' },
        background: { type: 'string', enum: ['opaque', 'transparent'], default: 'opaque' },
        responseFormat: { type: 'string', enum: ['url', 'b64_json'], default: 'url' },
        watermark: { type: 'boolean', default: true },
      },
    },
    defaultInput: {
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
    capabilities: {
      operation: 'images',
      cancel: false,
      layerDecomposition: true,
      maxReferenceImages: 10,
    },
  };
}

export function buildArkSeedreamRequestBody(
  model: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  assertSupportedModel(model);
  const layerDecomposition = Boolean(input.layer_decomposition ?? input.layerDecomposition);
  const images = normalizeImages(input.image ?? input.images ?? input.urls);
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';

  if (layerDecomposition && images.length !== 1) {
    throw new Error('ark Seedream 5.0 Pro layer decomposition requires exactly one source image');
  }
  if (!layerDecomposition && !prompt) {
    throw new Error('ark Seedream 5.0 Pro image generation requires a non-empty prompt');
  }
  if (images.length > 10) {
    throw new Error('ark Seedream 5.0 Pro supports at most 10 reference images');
  }

  const size = normalizeSize(input.size, layerDecomposition);
  const outputFormat = normalizeEnum(
    input.output_format ?? input.outputFormat ?? 'jpeg',
    ['png', 'jpeg'] as const,
    'output_format',
  );
  const responseFormat = normalizeEnum(
    input.response_format ?? input.responseFormat ?? 'url',
    ['url', 'b64_json'] as const,
    'response_format',
  );
  const background = normalizeEnum(
    input.background ?? 'opaque',
    ['transparent', 'opaque'] as const,
    'background',
  );
  if (background === 'transparent') {
    if (images.length !== 1 || layerDecomposition) {
      throw new Error('ark Seedream 5.0 Pro transparent background requires single-image editing mode');
    }
    if (outputFormat !== 'png') {
      throw new Error('ark Seedream 5.0 Pro transparent background requires output_format=png');
    }
  }
  if (input.sequential_image_generation != null || input.sequentialImageGeneration != null) {
    throw new Error('ark Seedream 5.0 Pro does not support sequential_image_generation');
  }
  if (input.stream === true) throw new Error('ark Seedream 5.0 Pro does not support streaming output');
  if (input.tools != null) throw new Error('ark Seedream 5.0 Pro does not support tools');

  const body: Record<string, unknown> = {
    model,
    layer_decomposition: layerDecomposition,
    size,
    output_format: outputFormat,
    response_format: responseFormat,
    watermark: input.watermark == null ? true : Boolean(input.watermark),
  };
  if (prompt) body.prompt = prompt;
  if (images.length) body.image = images.length === 1 ? images[0] : images;
  if (!layerDecomposition) body.background = background;
  const optimizeMode = (input.optimize_prompt_options as Record<string, unknown> | undefined)?.mode
    ?? input.optimizePromptMode;
  if (optimizeMode != null && optimizeMode !== '') {
    body.optimize_prompt_options = {
      mode: normalizeEnum(optimizeMode, ['standard', 'fast'] as const, 'optimize_prompt_options.mode'),
    };
  }
  return body;
}

function assertSupportedModel(modelId: string): void {
  if (!(ARK_SUPPORTED_MODELS as readonly string[]).includes(modelId)) {
    throw new Error(
      `Unsupported Ark model: ${modelId}. Supported models: ${ARK_SUPPORTED_MODELS.join(', ')}`,
    );
  }
}

function normalizeImages(value: unknown): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    const record = item && typeof item === 'object' ? item as Record<string, any> : undefined;
    const candidate = typeof item === 'string'
      ? item.trim()
      : typeof record?.url === 'string'
        ? record.url.trim()
        : record?.inlineData?.data
          ? `data:${record.inlineData.mimeType || 'image/png'};base64,${record.inlineData.data}`
          : '';
    if (!candidate) throw new Error(`ark Seedream 5.0 Pro image[${index}] is empty or invalid`);
    if (!/^https?:\/\//i.test(candidate) && !/^data:image\/[a-z0-9.+-]+;base64,/i.test(candidate)) {
      throw new Error(`ark Seedream 5.0 Pro image[${index}] must be an HTTP(S) URL or image data URL`);
    }
    return candidate;
  });
}

function normalizeSize(value: unknown, layerDecomposition: boolean): string {
  const size = String(value || (layerDecomposition ? 'auto' : '2K')).trim();
  const preset = size.toUpperCase();
  if (['1K', '1.5K', '2K'].includes(preset)) return preset;
  if (layerDecomposition) {
    if (size.toLowerCase() === 'auto') return 'auto';
    throw new Error('ark Seedream 5.0 Pro layer decomposition size must be one of: auto, 1K, 1.5K, 2K');
  }
  const match = /^(\d+)x(\d+)$/i.exec(size);
  if (!match) throw new Error('ark Seedream 5.0 Pro generation size must be 1K, 1.5K, 2K, or WIDTHxHEIGHT');
  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;
  const ratio = width / height;
  if (pixels < 921600 || pixels > 4624220 || ratio < 1 / 16 || ratio > 16) {
    throw new Error('ark Seedream 5.0 Pro custom size must have 921600-4624220 pixels and an aspect ratio between 1:16 and 16:1');
  }
  return `${width}x${height}`;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const normalized = String(value).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ark Seedream 5.0 Pro ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}
