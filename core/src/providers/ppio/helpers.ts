import type { PlatformConfig, SignalLike, TaskOutput } from '../../types.ts';

export const PPIO_DEFAULT_BASE_URL = 'https://api.ppio.com/v3/gemini-image';
export const PPIO_DEFAULT_GPT_IMAGE_BASE_URL = 'https://api.ppio.com/v3';
export const PPIO_DEFAULT_RESPONSE_BASE_URL = 'https://api.ppio.com/openai/v1';
export const PPIO_DEFAULT_CHAT_BASE_URL = 'https://api.ppio.com/openai/v1';
export const PPIO_DEFAULT_ASYNC_BASE_URL = 'https://api.ppio.com/v3/async';
export const PPIO_DEFAULT_VEO_BASE_URL = 'https://api.ppio.com/v3/veo-3.1';
export const PPIO_DEFAULT_MINIMAX_BASE_URL = 'https://api.ppio.com/v3/minimax/v2';
export const PPIO_DEFAULT_SEEDANCE_CN_METERED_BASE_URL = 'https://api.ppio.com/v3/bytedance-cn/metered';
export const PPIO_DEFAULT_API_VERSION = 'v1beta1';
export const PPIO_DEFAULT_VEO_API_VERSION = 'v1';
export const PPIO_GPT_IMAGE_MODEL = 'gpt-image-2';
export const PPIO_SEEDANCE_MODEL = 'seedance-2.0';
export const PPIO_FUSION_MODEL = 'pprouter/fusion';
export const PPIO_MINIMAX_H3_MODEL = 'MiniMax-H3';

export const PPIO_RESPONSE_MODELS = [
  'pa/gpt-5.6-terra',
  'pa/gpt-5.6-luna',
  'pa/gpt-5.6-sol',
] as const;

export const PPIO_VEO_MODELS = [
  'veo-3.1-generate-001',
  'veo-3.1-fast-generate-001',
  'veo-3.1-lite-generate-001',
] as const;

export const PPIO_KLING_V3_MODELS = [
  'kling-v3.0-std-i2v',
  'kling-v3.0-std-t2v',
  'kling-v3.0-pro-i2v',
  'kling-v3.0-pro-t2v',
  'kling-v3.0-4k-i2v',
  'kling-v3.0-4k-t2v',
  'kling-v3.0-motion-control',
] as const;

export const PPIO_HAILUO_23_MODELS = [
  'minimax-hailuo-2.3-t2v',
  'minimax-hailuo-2.3-i2v',
  'minimax-hailuo-2.3-fast-i2v',
] as const;

export const PPIO_SEEDANCE_CN_METERED_MODELS = [
  'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-5-260628',
] as const;

export const PPIO_SUPPORTED_MODELS = [
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-2.5-flash-image',
  PPIO_GPT_IMAGE_MODEL,
  PPIO_SEEDANCE_MODEL,
  PPIO_FUSION_MODEL,
  ...PPIO_RESPONSE_MODELS,
  ...PPIO_VEO_MODELS,
  ...PPIO_KLING_V3_MODELS,
  ...PPIO_HAILUO_23_MODELS,
  ...PPIO_SEEDANCE_CN_METERED_MODELS,
  PPIO_MINIMAX_H3_MODEL,
] as const;

export type PpioConfig = {
  apiKey: string;
  baseURL: string;
  gptImageBaseURL: string;
  responseBaseURL: string;
  chatBaseURL: string;
  asyncBaseURL: string;
  veoBaseURL: string;
  minimaxBaseURL: string;
  seedanceCnMeteredBaseURL: string;
  apiVersion: string;
  veoApiVersion: string;
};

export function ensurePpioConfig(platformConfig?: PlatformConfig): PpioConfig {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey) {
    throw new Error('ppio provider requires apiKey in platformConfig');
  }

  const configuredBaseURL = platformConfig?.baseURL ?? platformConfig?.baseUrl;
  const baseURL = String(configuredBaseURL ?? PPIO_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const gptImageBaseURL = String(
    platformConfig?.gptImageBaseURL ??
    platformConfig?.gptImageBaseUrl ??
    (configuredBaseURL
      ? String(configuredBaseURL).replace(/\/+$/, '').replace(/\/gemini-image$/, '')
      : PPIO_DEFAULT_GPT_IMAGE_BASE_URL)
  ).replace(/\/+$/, '');
  const responseBaseURL = String(
    platformConfig?.responseBaseURL ??
    platformConfig?.responseBaseUrl ??
    PPIO_DEFAULT_RESPONSE_BASE_URL
  ).replace(/\/+$/, '');
  const chatBaseURL = String(
    platformConfig?.chatBaseURL ??
    platformConfig?.chatBaseUrl ??
    PPIO_DEFAULT_CHAT_BASE_URL
  ).replace(/\/+$/, '');
  const asyncBaseURL = String(
    platformConfig?.asyncBaseURL ??
    platformConfig?.asyncBaseUrl ??
    PPIO_DEFAULT_ASYNC_BASE_URL
  ).replace(/\/+$/, '');
  const veoBaseURL = String(
    platformConfig?.veoBaseURL ??
    platformConfig?.veoBaseUrl ??
    PPIO_DEFAULT_VEO_BASE_URL
  ).replace(/\/+$/, '');
  const minimaxBaseURL = String(
    platformConfig?.minimaxBaseURL ??
    platformConfig?.minimaxBaseUrl ??
    PPIO_DEFAULT_MINIMAX_BASE_URL
  ).replace(/\/+$/, '');
  const seedanceCnMeteredBaseURL = String(
    platformConfig?.seedanceCnMeteredBaseURL ??
    platformConfig?.seedanceCnMeteredBaseUrl ??
    PPIO_DEFAULT_SEEDANCE_CN_METERED_BASE_URL
  ).replace(/\/+$/, '');
  const apiVersion = String(
    platformConfig?.apiVersion ?? PPIO_DEFAULT_API_VERSION
  ).replace(/^\/+|\/+$/g, '');
  const veoApiVersion = String(
    platformConfig?.veoApiVersion ?? PPIO_DEFAULT_VEO_API_VERSION
  ).replace(/^\/+|\/+$/g, '');

  if (!baseURL) {
    throw new Error('ppio provider requires a non-empty baseURL');
  }
  if (!apiVersion) {
    throw new Error('ppio provider requires a non-empty apiVersion');
  }
  if (!gptImageBaseURL) {
    throw new Error('ppio provider requires a non-empty gptImageBaseURL');
  }
  if (!responseBaseURL) {
    throw new Error('ppio provider requires a non-empty responseBaseURL');
  }
  if (!chatBaseURL) {
    throw new Error('ppio provider requires a non-empty chatBaseURL');
  }
  if (!asyncBaseURL) {
    throw new Error('ppio provider requires a non-empty asyncBaseURL');
  }
  if (!veoBaseURL) {
    throw new Error('ppio provider requires a non-empty veoBaseURL');
  }
  if (!minimaxBaseURL) {
    throw new Error('ppio provider requires a non-empty minimaxBaseURL');
  }
  if (!seedanceCnMeteredBaseURL) {
    throw new Error('ppio provider requires a non-empty seedanceCnMeteredBaseURL');
  }
  if (!veoApiVersion) {
    throw new Error('ppio provider requires a non-empty veoApiVersion');
  }

  return {
    apiKey,
    baseURL,
    gptImageBaseURL,
    responseBaseURL,
    chatBaseURL,
    asyncBaseURL,
    veoBaseURL,
    minimaxBaseURL,
    seedanceCnMeteredBaseURL,
    apiVersion,
    veoApiVersion,
  };
}

export function parsePpioModel(url: URL): string {
  const model = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

  if (!model && url.hostname) {
    throw new Error(
      `Invalid ppio locator format. Found 'ppio://${url.hostname}' (two slashes). ` +
      `Please use 'ppio:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }

  if (!model) {
    throw new Error(
      'ppio locator must contain a model name in the pathname ' +
      "(e.g., ppio:///gemini-2.5-flash-image)"
    );
  }

  if (!(PPIO_SUPPORTED_MODELS as readonly string[]).includes(model) && !isPpioSeedanceCnMeteredModel(model)) {
    throw new Error(
      `Unsupported PPIO model: ${model}. Supported models: ${PPIO_SUPPORTED_MODELS.join(', ')}`
    );
  }

  return model;
}

export function buildPpioEndpoint(config: PpioConfig, model: string): string {
  return `${config.baseURL}/${config.apiVersion}/models/${encodeURIComponent(model)}:generateContent`;
}

export function buildPpioGptImageEndpoint(config: PpioConfig, edit: boolean): string {
  return `${config.gptImageBaseURL}/gpt-image-2-${edit ? 'edit' : 'text-to-image'}`;
}

export function buildPpioResponseEndpoint(config: PpioConfig): string {
  return `${config.responseBaseURL}/responses`;
}

export function buildPpioChatEndpoint(config: PpioConfig): string {
  return `${config.chatBaseURL}/chat/completions`;
}

export function buildPpioSeedanceEndpoint(config: PpioConfig): string {
  return `${config.asyncBaseURL}/${PPIO_SEEDANCE_MODEL}`;
}

export function buildPpioAsyncEndpoint(config: PpioConfig, model: string): string {
  return `${config.asyncBaseURL}/${encodeURIComponent(model)}`;
}

export function buildPpioVeoEndpoint(config: PpioConfig, model: string): string {
  return `${config.veoBaseURL}/${config.veoApiVersion}/models/${encodeURIComponent(model)}:predictLongRunning`;
}

export function buildPpioTaskResultEndpoint(config: PpioConfig, taskId: string): string {
  return `${config.asyncBaseURL}/task-result?task_id=${encodeURIComponent(taskId)}`;
}

export function buildPpioMinimaxH3CreateEndpoint(config: PpioConfig): string {
  return `${config.minimaxBaseURL}/video_generation`;
}

export function buildPpioMinimaxH3QueryEndpoint(config: PpioConfig, taskId: string): string {
  return `${config.minimaxBaseURL}/query/video_generation/${encodeURIComponent(taskId)}`;
}

export function buildPpioSeedanceCnMeteredCreateEndpoint(config: PpioConfig): string {
  return `${config.seedanceCnMeteredBaseURL}/contents/generations/tasks`;
}

export function buildPpioSeedanceCnMeteredQueryEndpoint(config: PpioConfig, taskId: string): string {
  return `${config.seedanceCnMeteredBaseURL}/contents/generations/tasks/${encodeURIComponent(taskId)}`;
}

export function isPpioResponseModel(model: string): boolean {
  return (PPIO_RESPONSE_MODELS as readonly string[]).includes(model);
}

export function isPpioChatModel(model: string): boolean {
  return model === PPIO_FUSION_MODEL;
}

export function isPpioAsyncModel(model: string): boolean {
  return model === PPIO_SEEDANCE_MODEL ||
    isPpioVeoModel(model) ||
    isPpioKlingV3Model(model) ||
    isPpioHailuo23Model(model) ||
    isPpioMinimaxH3Model(model) ||
    isPpioSeedanceCnMeteredModel(model);
}

export function isPpioVeoModel(model: string): boolean {
  return (PPIO_VEO_MODELS as readonly string[]).includes(model);
}

export function isPpioKlingV3Model(model: string): boolean {
  return (PPIO_KLING_V3_MODELS as readonly string[]).includes(model);
}

export function isPpioHailuo23Model(model: string): boolean {
  return (PPIO_HAILUO_23_MODELS as readonly string[]).includes(model);
}

export function isPpioMinimaxH3Model(model: string): boolean {
  return model === PPIO_MINIMAX_H3_MODEL;
}

export function isPpioSeedanceCnMeteredModel(model: string): boolean {
  return /^(?:doubao|dreamina)-seedance-2-(?:0(?:-(?:fast|mini))?|5)-\d{6}$/.test(model);
}

export function mapPpioAsyncStatus(value: unknown): 'pending' | 'running' | 'succeeded' | 'failed' {
  switch (String(value || '').toUpperCase()) {
    case 'TASK_STATUS_QUEUED':
      return 'pending';
    case 'TASK_STATUS_PROCESSING':
      return 'running';
    case 'TASK_STATUS_SUCCEED':
      return 'succeeded';
    case 'TASK_STATUS_FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

export function normalizePpioAsyncOutputs(response: any): TaskOutput[] {
  const outputs: TaskOutput[] = [];
  for (const video of response?.videos ?? []) {
    if (typeof video?.video_url === 'string' && video.video_url) {
      outputs.push({ url: video.video_url, rawData: video, mimeType: 'video/mp4', type: 'video' });
    }
  }
  for (const image of response?.images ?? []) {
    if (typeof image?.image_url === 'string' && image.image_url) {
      outputs.push({ url: image.image_url, rawData: image, mimeType: 'image/png', type: 'image' });
    }
  }
  for (const audio of response?.audios ?? []) {
    if (typeof audio?.audio_url === 'string' && audio.audio_url) {
      outputs.push({ url: audio.audio_url, rawData: audio, mimeType: 'audio/mpeg', type: 'audio' });
    }
  }
  return outputs;
}

export function normalizePpioOutputs(response: any): TaskOutput[] {
  const outputs: TaskOutput[] = [];

  for (const image of response?.images ?? []) {
    if (typeof image === 'string' && image.length > 0) {
      outputs.push({ url: image, rawData: image });
    } else if (typeof image?.url === 'string' && image.url.length > 0) {
      outputs.push({ url: image.url, rawData: image });
    } else if (typeof image?.b64_json === 'string' && image.b64_json.length > 0) {
      const mimeType = image.mimeType || 'image/png';
      outputs.push({
        url: `data:${mimeType};base64,${image.b64_json}`,
        rawData: image,
        mimeType,
      });
    }
  }

  for (const candidate of response?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        outputs.push({
          url: `data:${mimeType};base64,${part.inlineData.data}`,
          rawData: part,
          mimeType,
        });
      } else if (typeof part?.text === 'string' && part.text.length > 0) {
        outputs.push({
          rawData: part,
          text: part.text,
          mimeType: 'text/plain',
        });
      }
    }
  }

  for (const item of response?.output ?? []) {
    if (item?.type === 'message') {
      for (const content of item?.content ?? []) {
        if (typeof content?.text === 'string' && content.text.length > 0) {
          outputs.push({
            rawData: content,
            text: content.text,
            mimeType: content.type === 'output_text' ? 'text/plain' : 'application/json',
          });
        }
      }
    } else if (item?.type === 'function_call' || item?.type === 'custom_tool_call') {
      outputs.push({
        rawData: item,
        type: item.type,
        name: item.name,
        arguments: item.arguments ?? item.input,
        callId: item.call_id,
        mimeType: 'application/json',
      });
    }
  }

  return outputs;
}

export function isRequestAborted(signal?: SignalLike): boolean {
  return Boolean(signal?.aborted);
}

export function toAbortSignal(signal?: SignalLike): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal
    ? signal
    : undefined;
}

export function createAbortError(message: string): Error {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    error.name = 'AbortError';
    return error;
  }
}
