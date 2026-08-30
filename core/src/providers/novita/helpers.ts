import type { PlatformConfig, TaskOutput } from '../../types.ts';

export const NOVITA_DEFAULT_BASE_URL = 'https://api.novita.ai/gemini';
export const NOVITA_DEFAULT_API_VERSION = 'v1';
export const NOVITA_DEFAULT_OPENAI_BASE_URL = 'https://api.novita.ai/openai';
export const NOVITA_DEFAULT_ASYNC_BASE_URL = 'https://api.novita.ai/v3/async';
export const NOVITA_DEFAULT_VEO31_BASE_URL = 'https://api.novita.ai/v3/veo-3.1';
export const NOVITA_DEFAULT_SEEDANCE_OVERSEA_METERED_BASE_URL =
  'https://api.novita.ai/v3/bytedance/metered';

export const NOVITA_GPT_IMAGE_MODELS = [
  'gpt-image-2',
  'gpt-image-2-oai',
] as const;

export const NOVITA_GPT56_MODELS = [
  'pa/gpt-5.6-terra',
  'pa/gpt-5.6-luna',
  'pa/gpt-5.6-sol',
] as const;

export const NOVITA_SEEDANCE_OVERSEA_MODELS = [
  'doubao-seedance-2-0-260128',
  'doubao-seedance-2-0-fast-260128',
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-5-260628',
  'dreamina-seedance-2-0-260128',
  'dreamina-seedance-2-0-fast-260128',
  'dreamina-seedance-2-0-mini-260615',
  'dreamina-seedance-2-5-260628',
] as const;

export const NOVITA_KLING_V3_MODELS = [
  'kling-v3.0-std-t2v',
  'kling-v3.0-std-i2v',
  'kling-v3.0-pro-t2v',
  'kling-v3.0-pro-i2v',
  'kling-v3.0-4k-t2v',
  'kling-v3.0-4k-i2v',
  'kling-v3.0-motion-control',
] as const;

export const NOVITA_VEO31_MODELS = [
  'veo-3.1-generate-001',
  'veo-3.1-fast-generate-001',
  'veo-3.1-lite-generate-001',
] as const;

export const NOVITA_SUPPORTED_MODELS = [
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-lite-image-as',
  'gemini-3.1-flash-image-as',
  'gemini-3-pro-image-as',
  'gemini-2.5-flash-image-as',
  ...NOVITA_GPT_IMAGE_MODELS,
  ...NOVITA_GPT56_MODELS,
  ...NOVITA_SEEDANCE_OVERSEA_MODELS,
  ...NOVITA_KLING_V3_MODELS,
  ...NOVITA_VEO31_MODELS,
] as const;

export type NovitaConfig = {
  apiKey: string;
  baseURL: string;
  apiVersion: 'v1' | 'v1beta';
  openaiBaseURL: string;
  asyncBaseURL: string;
  veo31BaseURL: string;
  seedanceOverseaMeteredBaseURL: string;
};

export function ensureNovitaConfig(platformConfig?: PlatformConfig): NovitaConfig {
  const apiKey = String(platformConfig?.apiKey ?? '').trim();
  if (!apiKey) {
    throw new Error('novita provider requires apiKey in platformConfig');
  }

  const baseURL = String(
    platformConfig?.baseURL ?? platformConfig?.baseUrl ?? NOVITA_DEFAULT_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!baseURL) {
    throw new Error('novita provider requires a non-empty baseURL');
  }

  const apiVersion = String(
    platformConfig?.apiVersion ?? NOVITA_DEFAULT_API_VERSION
  ).trim().replace(/^\/+|\/+$/g, '');
  if (apiVersion !== 'v1' && apiVersion !== 'v1beta') {
    throw new Error('novita provider apiVersion must be v1 or v1beta');
  }

  const openaiBaseURL = String(
    platformConfig?.openaiBaseURL ??
    platformConfig?.openaiBaseUrl ??
    NOVITA_DEFAULT_OPENAI_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!openaiBaseURL) {
    throw new Error('novita provider requires a non-empty openaiBaseURL');
  }

  const asyncBaseURL = String(
    platformConfig?.asyncBaseURL ??
    platformConfig?.asyncBaseUrl ??
    NOVITA_DEFAULT_ASYNC_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!asyncBaseURL) {
    throw new Error('novita provider requires a non-empty asyncBaseURL');
  }

  const veo31BaseURL = String(
    platformConfig?.veo31BaseURL ??
    platformConfig?.veo31BaseUrl ??
    NOVITA_DEFAULT_VEO31_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!veo31BaseURL) {
    throw new Error('novita provider requires a non-empty veo31BaseURL');
  }

  const seedanceOverseaMeteredBaseURL = String(
    platformConfig?.seedanceOverseaMeteredBaseURL ??
    platformConfig?.seedanceOverseaMeteredBaseUrl ??
    NOVITA_DEFAULT_SEEDANCE_OVERSEA_METERED_BASE_URL
  ).trim().replace(/\/+$/, '');
  if (!seedanceOverseaMeteredBaseURL) {
    throw new Error('novita provider requires a non-empty seedanceOverseaMeteredBaseURL');
  }

  return {
    apiKey, baseURL, apiVersion, openaiBaseURL, asyncBaseURL, veo31BaseURL,
    seedanceOverseaMeteredBaseURL,
  };
}

export function parseNovitaModel(url: URL): string {
  const model = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!model && url.hostname) {
    throw new Error(
      `Invalid novita locator format. Found 'novita://${url.hostname}' (two slashes). ` +
      `Please use 'novita:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }
  if (!model) {
    throw new Error(
      'novita locator must contain a model name in the pathname ' +
      "(e.g., novita:///gemini-3.1-flash-image)"
    );
  }
  if (!(NOVITA_SUPPORTED_MODELS as readonly string[]).includes(model) &&
      !isNovitaSeedanceOverseaModel(model)) {
    throw new Error(
      `Unsupported Novita model: ${model}. Supported models: ${NOVITA_SUPPORTED_MODELS.join(', ')}`
    );
  }
  return model;
}

export function buildNovitaEndpoint(config: NovitaConfig, model: string): string {
  return `${config.baseURL}/${config.apiVersion}/models/${encodeURIComponent(model)}:generateContent`;
}

export function buildNovitaOpenAIImagesEndpoint(config: NovitaConfig, edit: boolean): string {
  return `${config.openaiBaseURL}/v1/images/${edit ? 'edits' : 'generations'}`;
}

export function buildNovitaResponsesEndpoint(config: NovitaConfig): string {
  return `${config.openaiBaseURL}/v1/responses`;
}

export function buildNovitaChatCompletionsEndpoint(config: NovitaConfig): string {
  return `${config.openaiBaseURL}/v1/chat/completions`;
}

export function buildNovitaAsyncCreateEndpoint(config: NovitaConfig, model: string): string {
  return `${config.asyncBaseURL}/${encodeURIComponent(model)}`;
}

export function buildNovitaAsyncTaskResultEndpoint(
  config: NovitaConfig,
  taskId: string
): string {
  return `${config.asyncBaseURL}/task-result?task_id=${encodeURIComponent(taskId)}`;
}

export function buildNovitaVeo31CreateEndpoint(
  config: NovitaConfig,
  model: string,
  apiVersion: 'v1' | 'v1beta1' = 'v1'
): string {
  return `${config.veo31BaseURL}/${apiVersion}/models/${encodeURIComponent(model)}:predictLongRunning`;
}

export function buildNovitaSeedanceOverseaCreateEndpoint(config: NovitaConfig): string {
  return `${config.seedanceOverseaMeteredBaseURL}/contents/generations/tasks`;
}

export function buildNovitaSeedanceOverseaTaskEndpoint(
  config: NovitaConfig,
  taskId: string
): string {
  return `${config.seedanceOverseaMeteredBaseURL}/contents/generations/tasks/${encodeURIComponent(taskId)}`;
}

export function isNovitaGptImageModel(model: string): boolean {
  return (NOVITA_GPT_IMAGE_MODELS as readonly string[]).includes(model);
}

export function isNovitaGpt56Model(model: string): boolean {
  return (NOVITA_GPT56_MODELS as readonly string[]).includes(model);
}

export function isNovitaSeedanceOverseaModel(model: string): boolean {
  return /^(?:doubao|dreamina)-seedance-2-(?:0(?:-(?:fast|mini))?|5)-\d{6}$/.test(model);
}

export function isNovitaKlingV3Model(model: string): boolean {
  return (NOVITA_KLING_V3_MODELS as readonly string[]).includes(model);
}

export function isNovitaVeo31Model(model: string): boolean {
  return (NOVITA_VEO31_MODELS as readonly string[]).includes(model);
}

export function isNovitaAsyncModel(model: string): boolean {
  return isNovitaSeedanceOverseaModel(model) || isNovitaKlingV3Model(model) ||
    isNovitaVeo31Model(model);
}

export function normalizeNovitaOutputs(response: any): TaskOutput[] {
  const outputs: TaskOutput[] = [];
  for (const candidate of response?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      const inlineData = part?.inlineData ?? part?.inline_data;
      if (typeof inlineData?.data === 'string' && inlineData.data) {
        const mimeType = inlineData.mimeType ?? inlineData.mime_type ?? 'image/png';
        outputs.push({
          url: `data:${mimeType};base64,${inlineData.data}`,
          rawData: part,
          type: 'image',
          mimeType,
        });
      } else if (typeof part?.text === 'string' && part.text) {
        outputs.push({ rawData: part, type: 'text', text: part.text });
      }
    }
  }
  return outputs;
}

export function normalizeNovitaGptImageOutputs(
  response: any,
  requestedOutputFormat: string = 'png'
): TaskOutput[] {
  const outputs: TaskOutput[] = [];
  for (const item of response?.data ?? []) {
    const outputFormat = String(
      item?.output_format ?? response?.output_format ?? requestedOutputFormat ?? 'png'
    ).toLowerCase();
    const mimeType = outputFormat === 'jpeg' || outputFormat === 'jpg'
      ? 'image/jpeg'
      : outputFormat === 'webp' ? 'image/webp' : 'image/png';
    const common = {
      rawData: item,
      type: 'image',
      mimeType,
      size: item?.size ?? response?.size,
      quality: item?.quality ?? response?.quality,
    };
    if (typeof item?.b64_json === 'string' && item.b64_json) {
      outputs.push({ url: `data:${mimeType};base64,${item.b64_json}`, ...common });
    } else if (typeof item?.url === 'string' && item.url) {
      outputs.push({ url: item.url, ...common });
    }
  }
  return outputs;
}
