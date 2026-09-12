import type { PlatformConfig, TaskOutput, TaskStatus } from '../../types.ts';

export const CRUN_DEFAULT_BASE_URL = 'https://api.crun.ai/api/v1';

export const CRUN_NANO_BANANA_MODELS = [
  'google/nano-banana-2',
  'google/nano-banana-2-v2',
  'google/nano-banana-2-lite',
  'google/nano-banana-pro',
  'google/nano-banana-pro-v2',
  'google/nano-banana',
  'google/nano-banana-v2',
] as const;

export const CRUN_GPT_IMAGE_MODELS = [
  'openai/gpt-image-2',
  'openai/gpt-image-2-stable',
  'openai/gpt-image-2-premium',
] as const;

export const CRUN_SEEDREAM_MODELS = [
  'bytedance/seedream-5-pro',
] as const;

export const CRUN_SEEDANCE_MODELS = [
  'bytedance/seedance2-5-t2v',
  'bytedance/seedance2-5-i2v',
  'bytedance/seedance2-5-r2v',
  'bytedance/seedance2-0-t2v',
  'bytedance/seedance2-0-i2v',
  'bytedance/seedance2-0-r2v',
  'bytedance/seedance2-0-mini-t2v',
  'bytedance/seedance2-0-mini-i2v',
  'bytedance/seedance2-0-mini-r2v',
  'bytedance/seedance2-0-fast-t2v',
  'bytedance/seedance2-0-fast-i2v',
  'bytedance/seedance2-0-fast-r2v',
  'bytedance/seedance1-5-pro-t2v',
  'bytedance/seedance1-5-pro-i2v',
] as const;

export const CRUN_KLING_MODELS = [
  'kling/v3',
  'kling/v3-turbo',
  'kling/v3-motion-control',
  'kling/v2-6',
  'kling/v2-6-motion-control',
  'kling/avatar',
] as const;

export const CRUN_MINIMAX_H3_MODELS = [
  'minimax/h3-t2v',
  'minimax/h3-i2v',
  'minimax/h3-r2v',
  'minimax/h3-regeneration',
] as const;

export const CRUN_PIXVERSE_V6_MODELS = [
  'pixverse/v6-t2v',
  'pixverse/v6-i2v',
  'pixverse/v6-r2v',
] as const;

export const CRUN_HAPPYHORSE_11_MODELS = [
  'happyhorse-1-1-t2v',
  'happyhorse-1-1-i2v',
  'happyhorse-1-1-r2v',
] as const;

export const CRUN_HAILUO_23_MODELS = [
  'minimax/hailuo-2-3',
] as const;

export const CRUN_IMAGE_UPSCALE_MODELS = [
  'image-upscale',
  'image-upscale-pro',
] as const;

export const CRUN_WATERMARK_REMOVE_MODELS = [
  'image-watermark-remove',
  'video-watermark-remove',
] as const;

export const CRUN_IMAGE_EXPAND_MODELS = ['image-expand'] as const;

export const CRUN_GPT56_MODELS = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
] as const;

export const CRUN_GROK_IMAGINE_VIDEO_MODELS = [
  'grok-imagine-video-1.5-preview',
] as const;

export const CRUN_GEMINI_OMNI_MODELS = [
  'google/gemini-omni',
] as const;

export const CRUN_VEO_31_MODELS = [
  'google/veo3-1-t2v',
  'google/veo3-1-i2v',
  'google/veo3-1-fast-t2v',
  'google/veo3-1-fast-i2v',
  'google/veo3-1-fast-r2v',
  'google/veo3-1-lite-t2v',
  'google/veo3-1-lite-i2v',
  'google/veo3-1-lite-r2v',
] as const;

export const CRUN_SUPPORTED_MODELS = [
  ...CRUN_NANO_BANANA_MODELS,
  ...CRUN_GPT_IMAGE_MODELS,
  ...CRUN_SEEDREAM_MODELS,
  ...CRUN_SEEDANCE_MODELS,
  ...CRUN_KLING_MODELS,
  ...CRUN_MINIMAX_H3_MODELS,
  ...CRUN_PIXVERSE_V6_MODELS,
  ...CRUN_HAPPYHORSE_11_MODELS,
  ...CRUN_HAILUO_23_MODELS,
  ...CRUN_IMAGE_UPSCALE_MODELS,
  ...CRUN_WATERMARK_REMOVE_MODELS,
  ...CRUN_IMAGE_EXPAND_MODELS,
  ...CRUN_GPT56_MODELS,
  ...CRUN_GROK_IMAGINE_VIDEO_MODELS,
  ...CRUN_GEMINI_OMNI_MODELS,
  ...CRUN_VEO_31_MODELS,
] as const;

export type CrunVeo31Operation = 'text-to-video' | 'image-to-video' | 'reference-to-video';

export type CrunVeo31Profile = {
  model: string;
  channel: 'standard' | 'fast' | 'lite';
  operation: CrunVeo31Operation;
  minImages: number;
  maxImages: number;
  durations: number[];
};

export type CrunSeedanceOperation = 'text-to-video' | 'image-to-video' | 'reference-to-video';

export type CrunSeedanceProfile = {
  model: string;
  series: '2.5' | '2.0' | '2.0-mini' | '2.0-fast' | '1.5-pro';
  operation: CrunSeedanceOperation;
  resolutions: string[];
  maxDuration: number;
  supportsAudio: boolean;
  supportsByteplusFallback: boolean;
  supportsReturnLastFrame: boolean;
  supportsCameraFixed: boolean;
};

export type CrunKlingProfile = {
  model: string;
  channel: 'v3' | 'v3-turbo' | 'v3-motion-control' |
    'v2.6' | 'v2.6-motion-control' | 'avatar';
  operation: 'video-generation' | 'motion-control' | 'talking-avatar';
  requiresImage: boolean;
  requiresVideo: boolean;
  requiresAudio: boolean;
};

export type CrunMinimaxH3Operation =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'video-regeneration';

export type CrunMinimaxH3Profile = {
  model: string;
  operation: CrunMinimaxH3Operation;
  requiresPrompt: boolean;
  supportsImageReferences: boolean;
  supportsVideoReferences: boolean;
  supportsAudioReferences: boolean;
};

export type CrunPixverseV6Operation =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video';

export type CrunPixverseV6Profile = {
  model: string;
  operation: CrunPixverseV6Operation;
  supportsAspectRatio: boolean;
  supportsMultiClip: boolean;
  requiresImage: boolean;
  supportsReferenceImages: boolean;
};

export type CrunHappyHorse11Operation =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video';

export type CrunHappyHorse11Profile = {
  model: string;
  operation: CrunHappyHorse11Operation;
  requiresImage: boolean;
  supportsMultipleReferences: boolean;
  supportsAspectRatio: boolean;
};

export type CrunHailuo23Profile = {
  model: string;
  operation: 'text-or-image-to-video';
  maxImages: 1;
  modes: ['std', 'pro'];
  resolutions: ['768P', '1080P'];
  durations: [6, 10];
};

export type CrunImageUpscaleProfile = {
  model: string;
  channel: 'basic' | 'pro';
  scaleFactors: number[];
  modes: string[];
  clarityLevels: string[];
  outputFormats: string[];
};

export type CrunConfig = {
  apiKey: string;
  baseURL: string;
};

export function ensureCrunConfig(platformConfig?: PlatformConfig): CrunConfig {
  const apiKey = String(platformConfig?.apiKey ?? '').trim();
  if (!apiKey) throw new Error('crun provider requires apiKey in platformConfig');

  const baseURL = String(
    platformConfig?.baseURL ?? platformConfig?.baseUrl ?? CRUN_DEFAULT_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!baseURL) throw new Error('crun provider requires a non-empty baseURL');
  return { apiKey, baseURL };
}

export function parseCrunModel(url: URL): string {
  const model = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!model && url.hostname) {
    throw new Error(
      `Invalid crun locator format. Found 'crun://${url.hostname}' (two slashes). ` +
      `Please use 'crun:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }
  if (!model) {
    throw new Error(
      'crun locator must contain a model name in the pathname ' +
      '(e.g., crun:///google/nano-banana-2)'
    );
  }
  if (!(CRUN_SUPPORTED_MODELS as readonly string[]).includes(model)) {
    throw new Error(
      `Unsupported CRUN model: ${model}. Supported models: ${CRUN_SUPPORTED_MODELS.join(', ')}`
    );
  }
  return model;
}

export function isCrunNanoBananaModel(model: string): boolean {
  return (CRUN_NANO_BANANA_MODELS as readonly string[]).includes(model);
}

export function isCrunGptImage2(model: string): boolean {
  return (CRUN_GPT_IMAGE_MODELS as readonly string[]).includes(model);
}

export function isCrunGptImage2Stable(model: string): boolean {
  return model === 'openai/gpt-image-2-stable';
}

export function isCrunGptImage2Premium(model: string): boolean {
  return model === 'openai/gpt-image-2-premium';
}

export function isCrunSeedreamModel(model: string): boolean {
  return (CRUN_SEEDREAM_MODELS as readonly string[]).includes(model);
}

export function isCrunSeedanceModel(model: string): boolean {
  return (CRUN_SEEDANCE_MODELS as readonly string[]).includes(model);
}

export function isCrunKlingModel(model: string): boolean {
  return (CRUN_KLING_MODELS as readonly string[]).includes(model);
}

export function isCrunMinimaxH3Model(model: string): boolean {
  return (CRUN_MINIMAX_H3_MODELS as readonly string[]).includes(model);
}

export function isCrunPixverseV6Model(model: string): boolean {
  return (CRUN_PIXVERSE_V6_MODELS as readonly string[]).includes(model);
}

export function isCrunHappyHorse11Model(model: string): boolean {
  return (CRUN_HAPPYHORSE_11_MODELS as readonly string[]).includes(model);
}

export function isCrunHailuo23Model(model: string): boolean {
  return (CRUN_HAILUO_23_MODELS as readonly string[]).includes(model);
}

export function isCrunImageUpscaleModel(model: string): boolean {
  return (CRUN_IMAGE_UPSCALE_MODELS as readonly string[]).includes(model);
}

export function isCrunWatermarkRemoveModel(model: string): boolean {
  return (CRUN_WATERMARK_REMOVE_MODELS as readonly string[]).includes(model);
}

export function isCrunImageExpandModel(model: string): boolean {
  return (CRUN_IMAGE_EXPAND_MODELS as readonly string[]).includes(model);
}

export function isCrunGpt56Model(model: string): boolean {
  return (CRUN_GPT56_MODELS as readonly string[]).includes(model);
}

export function isCrunGrokImagineVideoModel(model: string): boolean {
  return (CRUN_GROK_IMAGINE_VIDEO_MODELS as readonly string[]).includes(model);
}

export function isCrunGeminiOmniModel(model: string): boolean {
  return (CRUN_GEMINI_OMNI_MODELS as readonly string[]).includes(model);
}

export function isCrunVeo31Model(model: string): boolean {
  return (CRUN_VEO_31_MODELS as readonly string[]).includes(model);
}

export function getCrunVeo31Profile(model: string): CrunVeo31Profile {
  if (!isCrunVeo31Model(model)) {
    throw new Error(`Unsupported CRUN Veo 3.1 model: ${model}`);
  }
  const channel: CrunVeo31Profile['channel'] = model.includes('-fast-')
    ? 'fast' : model.includes('-lite-') ? 'lite' : 'standard';
  const operation: CrunVeo31Operation = model.endsWith('-t2v')
    ? 'text-to-video' : model.endsWith('-i2v') ? 'image-to-video' : 'reference-to-video';
  return {
    model,
    channel,
    operation,
    minImages: operation === 'text-to-video' ? 0 : 1,
    maxImages: operation === 'image-to-video' ? 2 : operation === 'reference-to-video' ? 3 : 0,
    durations: operation === 'reference-to-video' ? [8] : [4, 6, 8],
  };
}

export function getCrunHappyHorse11Profile(model: string): CrunHappyHorse11Profile {
  if (!isCrunHappyHorse11Model(model)) {
    throw new Error(`Unsupported CRUN HappyHorse 1.1 model: ${model}`);
  }
  if (model === 'happyhorse-1-1-i2v') {
    return {
      model, operation: 'image-to-video', requiresImage: true,
      supportsMultipleReferences: false, supportsAspectRatio: false,
    };
  }
  if (model === 'happyhorse-1-1-r2v') {
    return {
      model, operation: 'reference-to-video', requiresImage: true,
      supportsMultipleReferences: true, supportsAspectRatio: true,
    };
  }
  return {
    model, operation: 'text-to-video', requiresImage: false,
    supportsMultipleReferences: false, supportsAspectRatio: true,
  };
}

export function getCrunHailuo23Profile(model: string): CrunHailuo23Profile {
  if (!isCrunHailuo23Model(model)) {
    throw new Error(`Unsupported CRUN Hailuo 2.3 model: ${model}`);
  }
  return {
    model,
    operation: 'text-or-image-to-video',
    maxImages: 1,
    modes: ['std', 'pro'],
    resolutions: ['768P', '1080P'],
    durations: [6, 10],
  };
}

export function getCrunImageUpscaleProfile(model: string): CrunImageUpscaleProfile {
  if (!isCrunImageUpscaleModel(model)) {
    throw new Error(`Unsupported CRUN Image Upscale model: ${model}`);
  }
  return model === 'image-upscale-pro'
    ? {
      model, channel: 'pro', scaleFactors: [], modes: [],
      clarityLevels: ['high', 'ultra'], outputFormats: [],
    }
    : {
      model, channel: 'basic', scaleFactors: [1, 2, 4], modes: ['clean', 'face'],
      clarityLevels: [], outputFormats: ['png', 'jpg'],
    };
}

export function getCrunPixverseV6Profile(model: string): CrunPixverseV6Profile {
  if (!isCrunPixverseV6Model(model)) {
    throw new Error(`Unsupported CRUN PixVerse V6 model: ${model}`);
  }
  if (model === 'pixverse/v6-i2v') {
    return {
      model, operation: 'image-to-video', supportsAspectRatio: false,
      supportsMultiClip: true, requiresImage: true, supportsReferenceImages: false,
    };
  }
  if (model === 'pixverse/v6-r2v') {
    return {
      model, operation: 'reference-to-video', supportsAspectRatio: true,
      supportsMultiClip: false, requiresImage: false, supportsReferenceImages: true,
    };
  }
  return {
    model, operation: 'text-to-video', supportsAspectRatio: true,
    supportsMultiClip: true, requiresImage: false, supportsReferenceImages: false,
  };
}

export function getCrunMinimaxH3Profile(model: string): CrunMinimaxH3Profile {
  if (!isCrunMinimaxH3Model(model)) {
    throw new Error(`Unsupported CRUN MiniMax H3 model: ${model}`);
  }
  if (model === 'minimax/h3-regeneration') {
    return {
      model, operation: 'video-regeneration', requiresPrompt: false,
      supportsImageReferences: false, supportsVideoReferences: false,
      supportsAudioReferences: false,
    };
  }
  if (model === 'minimax/h3-r2v') {
    return {
      model, operation: 'reference-to-video', requiresPrompt: true,
      supportsImageReferences: true, supportsVideoReferences: true,
      supportsAudioReferences: true,
    };
  }
  if (model === 'minimax/h3-i2v') {
    return {
      model, operation: 'image-to-video', requiresPrompt: true,
      supportsImageReferences: true, supportsVideoReferences: false,
      supportsAudioReferences: false,
    };
  }
  return {
    model, operation: 'text-to-video', requiresPrompt: true,
    supportsImageReferences: false, supportsVideoReferences: false,
    supportsAudioReferences: false,
  };
}

export function getCrunKlingProfile(model: string): CrunKlingProfile {
  if (!isCrunKlingModel(model)) {
    throw new Error(`Unsupported CRUN Kling model: ${model}`);
  }
  if (model === 'kling/v3-motion-control') {
    return {
      model, channel: 'v3-motion-control', operation: 'motion-control',
      requiresImage: true, requiresVideo: true, requiresAudio: false,
    };
  }
  if (model === 'kling/v2-6-motion-control') {
    return {
      model, channel: 'v2.6-motion-control', operation: 'motion-control',
      requiresImage: true, requiresVideo: true, requiresAudio: false,
    };
  }
  if (model === 'kling/v2-6') {
    return {
      model, channel: 'v2.6', operation: 'video-generation',
      requiresImage: false, requiresVideo: false, requiresAudio: false,
    };
  }
  if (model === 'kling/avatar') {
    return {
      model, channel: 'avatar', operation: 'talking-avatar',
      requiresImage: true, requiresVideo: false, requiresAudio: true,
    };
  }
  return {
    model,
    channel: model === 'kling/v3-turbo' ? 'v3-turbo' : 'v3',
    operation: 'video-generation',
    requiresImage: false,
    requiresVideo: false,
    requiresAudio: false,
  };
}

export function getCrunSeedanceProfile(model: string): CrunSeedanceProfile {
  if (!isCrunSeedanceModel(model)) {
    throw new Error(`Unsupported CRUN Seedance model: ${model}`);
  }
  const operation: CrunSeedanceOperation = model.endsWith('-t2v')
    ? 'text-to-video'
    : model.endsWith('-i2v') ? 'image-to-video' : 'reference-to-video';
  const series: CrunSeedanceProfile['series'] = model.includes('seedance2-5-')
    ? '2.5'
    : model.includes('seedance2-0-mini-') ? '2.0-mini'
      : model.includes('seedance2-0-fast-') ? '2.0-fast'
        : model.includes('seedance2-0-') ? '2.0' : '1.5-pro';
  const resolutions = series === '2.0-mini' || series === '2.0-fast'
    ? ['480p', '720p']
    : series === '2.5' && operation !== 'reference-to-video'
      ? ['480p', '720p']
      : ['480p', '720p', '1080p'];
  return {
    model,
    series,
    operation,
    resolutions,
    maxDuration: series === '2.5' ? 30 : series === '1.5-pro' ? 12 : 15,
    supportsAudio: series !== '1.5-pro',
    supportsByteplusFallback: series === '2.5' || series === '2.0-mini',
    supportsReturnLastFrame: series !== '1.5-pro' || operation === 'text-to-video',
    supportsCameraFixed: series === '1.5-pro',
  };
}

export function isCrunV2Channel(model: string): boolean {
  return model.endsWith('-v2');
}

export function isCrunNanoBanana2(model: string): boolean {
  return model === 'google/nano-banana-2' || model === 'google/nano-banana-2-v2';
}

export function isCrunNanoBananaPro(model: string): boolean {
  return model === 'google/nano-banana-pro' || model === 'google/nano-banana-pro-v2';
}

export function isCrunNanoBanana2Lite(model: string): boolean {
  return model === 'google/nano-banana-2-lite';
}

export function buildCrunCreateTaskEndpoint(config: CrunConfig): string {
  return `${config.baseURL}/client/job/CreateTask`;
}

export function buildCrunTaskInfoEndpoint(config: CrunConfig, taskId: string): string {
  return `${config.baseURL}/client/job/TaskInfo?task_id=${encodeURIComponent(taskId)}`;
}

export function buildCrunResponsesEndpoint(config: CrunConfig): string {
  return `${config.baseURL}/responses`;
}

export function buildCrunChatCompletionsEndpoint(config: CrunConfig): string {
  return `${config.baseURL}/chat/completions`;
}

export function mapCrunTaskStatus(value: unknown): TaskStatus {
  const status = String(value ?? '').trim().toLowerCase();
  if (['success', 'succeeded', 'completed', 'complete'].includes(status)) return 'succeeded';
  if (['failed', 'failure', 'error'].includes(status)) return 'failed';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (['running', 'processing', 'in_progress', 'in-progress'].includes(status)) return 'running';
  return 'pending';
}

export function normalizeCrunMediaOutputs(
  data: any,
  preferredType?: 'image' | 'video'
): TaskOutput[] {
  const result = data?.result ?? data?.data?.result ?? {};
  const candidates = [
    ...(Array.isArray(result?.media_urls) ? result.media_urls : []),
    ...(Array.isArray(result?.urls) ? result.urls : []),
    ...(Array.isArray(result?.images) ? result.images : []),
    ...(Array.isArray(result?.videos) ? result.videos : []),
    ...(Array.isArray(result?.video_urls) ? result.video_urls : []),
    ...(Array.isArray(result?.image_urls) ? result.image_urls : []),
  ];
  if (typeof result?.url === 'string') candidates.push(result.url);
  if (typeof result?.media_url === 'string') candidates.push(result.media_url);
  if (typeof result?.video_url === 'string') candidates.push(result.video_url);
  if (typeof result?.image_url === 'string') candidates.push(result.image_url);

  const seen = new Set<string>();
  const outputs: TaskOutput[] = [];
  for (const item of candidates) {
    const url = typeof item === 'string'
      ? item.trim()
      : typeof item?.url === 'string'
        ? item.url.trim()
        : typeof item?.media_url === 'string'
          ? item.media_url.trim()
          : typeof item?.video_url === 'string'
            ? item.video_url.trim()
          : typeof item?.image_url === 'string'
            ? item.image_url.trim()
          : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isVideo = preferredType === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(cleanUrl);
    const mimeType = isVideo
      ? cleanUrl.endsWith('.webm') ? 'video/webm'
        : cleanUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'
      : cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')
        ? 'image/jpeg'
        : cleanUrl.endsWith('.webp') ? 'image/webp' : 'image/png';
    outputs.push({ url, rawData: item, type: isVideo ? 'video' : 'image', mimeType });
  }
  return outputs;
}
