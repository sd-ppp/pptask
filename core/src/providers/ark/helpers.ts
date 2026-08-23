import type { PlatformConfig, TaskOutput } from '../../types.ts';

export const ARK_DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
export const ARK_SEEDREAM_5_PRO_MODEL = 'doubao-seedream-5-0-pro-260628';

export const ARK_SUPPORTED_MODELS = [
  ARK_SEEDREAM_5_PRO_MODEL,
] as const;

export type ArkConfig = {
  apiKey: string;
  baseURL: string;
};

export function ensureArkConfig(platformConfig?: PlatformConfig): ArkConfig {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey) {
    throw new Error('ark provider requires apiKey in platformConfig');
  }

  const baseURL = String(
    platformConfig?.baseURL ?? platformConfig?.baseUrl ?? ARK_DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
  if (!baseURL) {
    throw new Error('ark provider requires a non-empty baseURL');
  }

  return { apiKey, baseURL };
}

export function parseArkModel(url: URL): string {
  const model = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!model && url.hostname) {
    throw new Error(
      `Invalid ark locator format. Found 'ark://${url.hostname}' (two slashes). ` +
      `Please use 'ark:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }
  if (!model) {
    throw new Error(
      'ark locator must contain a model name in the pathname ' +
      `(e.g., ark:///${ARK_SEEDREAM_5_PRO_MODEL})`
    );
  }
  if (!(ARK_SUPPORTED_MODELS as readonly string[]).includes(model)) {
    throw new Error(
      `Unsupported Ark model: ${model}. Supported models: ${ARK_SUPPORTED_MODELS.join(', ')}`
    );
  }
  return model;
}

export function buildArkImagesEndpoint(config: ArkConfig): string {
  return `${config.baseURL}/images/generations`;
}

export function normalizeArkImageOutputs(response: any): TaskOutput[] {
  const outputs: TaskOutput[] = [];
  for (const item of response?.data ?? []) {
    const outputFormat = String(item?.output_format || 'png').toLowerCase();
    const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const common = {
      rawData: item,
      type: 'image',
      mimeType,
      size: item?.size,
      zIndex: item?.z_index,
      name: item?.name,
      description: item?.description,
      boundingBox: item?.bounding_box,
    };

    if (typeof item?.url === 'string' && item.url) {
      outputs.push({ url: item.url, ...common });
    } else if (typeof item?.b64_json === 'string' && item.b64_json) {
      outputs.push({ url: `data:${mimeType};base64,${item.b64_json}`, ...common });
    }
  }
  return outputs;
}
