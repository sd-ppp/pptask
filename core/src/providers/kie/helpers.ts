import type { PlatformConfig, SignalLike, TaskOutput, TaskStatus } from '../../types.ts';
import { getKieDescribeEntry } from './describe/registry.ts';
import { canonicalizeKieLocator, parseKieLocator } from './locator.ts';

export const KIE_DEFAULT_BASE_URL = 'https://api.kie.ai';
export const KIE_DEFAULT_UPLOAD_BASE_URL = 'https://kieai.redpandaai.co';
export const KIE_FILE_STREAM_UPLOAD_PATH = '/api/file-stream-upload';

export type KieConfig = {
  apiKey: string;
  baseURL: string;
  uploadBaseURL: string;
  callbackUrl?: string;
  uploadPath?: string;
};

const CALLBACK_FIELDS = new Set([
  'callBackUrl',
  'callbackUrl',
  'callback_url',
]);

const MODEL_FIELDS = new Set(['model']);

export function ensureKieConfig(platformConfig?: PlatformConfig): KieConfig {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('kie provider requires apiKey in platformConfig');
  }

  const baseURL = resolveBaseUrl(platformConfig);
  const uploadBaseURL = resolveUploadBaseUrl(platformConfig);
  const callbackUrl = resolveCallbackUrl(platformConfig);
  const uploadPath = normalizeKieUploadPath(
    typeof platformConfig?.uploadPath === 'string' ? platformConfig.uploadPath : undefined,
  );

  return {
    apiKey,
    baseURL,
    uploadBaseURL,
    callbackUrl,
    uploadPath,
  };
}

function resolveBaseUrl(platformConfig?: PlatformConfig): string {
  const candidate =
    typeof platformConfig?.baseURL === 'string' && platformConfig.baseURL.trim().length > 0
      ? platformConfig.baseURL
      : typeof platformConfig?.baseUrl === 'string' && platformConfig.baseUrl.trim().length > 0
        ? platformConfig.baseUrl
        : KIE_DEFAULT_BASE_URL;
  return trimTrailingSlash(candidate);
}

function resolveUploadBaseUrl(platformConfig?: PlatformConfig): string {
  const candidate =
    typeof platformConfig?.uploadBaseURL === 'string' && platformConfig.uploadBaseURL.trim().length > 0
      ? platformConfig.uploadBaseURL
      : typeof platformConfig?.uploadBaseUrl === 'string' && platformConfig.uploadBaseUrl.trim().length > 0
        ? platformConfig.uploadBaseUrl
        : KIE_DEFAULT_UPLOAD_BASE_URL;
  return trimTrailingSlash(candidate);
}

function resolveCallbackUrl(platformConfig?: PlatformConfig): string | undefined {
  const candidate =
    typeof platformConfig?.callbackUrl === 'string' && platformConfig.callbackUrl.trim().length > 0
      ? platformConfig.callbackUrl
      : typeof platformConfig?.callBackUrl === 'string' && platformConfig.callBackUrl.trim().length > 0
        ? platformConfig.callBackUrl
        : typeof platformConfig?.callback_url === 'string' && platformConfig.callback_url.trim().length > 0
          ? platformConfig.callback_url
          : undefined;
  return candidate;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function ensureKieWhitelistedLocator(locator: string): { model: string } {
  const { model } = parseKieLocator(locator);
  const entry = getKieDescribeEntry(canonicalizeKieLocator(locator));
  if (!entry || entry.modelId !== model) {
    throw new Error(`kie provider received unsupported locator: ${locator}`);
  }
  return { model };
}

export function sanitizeKieCreatePayload(payload: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (MODEL_FIELDS.has(key) || CALLBACK_FIELDS.has(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function mapKieState(state: string): TaskStatus {
  switch (state) {
    case 'waiting':
    case 'queuing':
      return 'pending';
    case 'generating':
      return 'running';
    case 'success':
      return 'succeeded';
    case 'fail':
      return 'failed';
    default:
      throw new Error(`unknown kie task state: ${state}`);
  }
}

export function parseKieResultOutputs(resultJson: string): TaskOutput[] {
  const parsed = JSON.parse(resultJson) as Record<string, unknown>;
  const outputs: TaskOutput[] = [];

  appendUrlOutputs(outputs, parsed.resultUrls, parsed);
  appendUrlValue(outputs, parsed.firstFrameUrl, 'firstFrameUrl', parsed);
  appendUrlValue(outputs, parsed.lastFrameUrl, 'lastFrameUrl', parsed);

  const resultObject = parsed.resultObject;
  if (resultObject && typeof resultObject === 'object' && !Array.isArray(resultObject)) {
    const objectRecord = resultObject as Record<string, unknown>;
    if (Array.isArray(objectRecord.mask_urls)) {
      if (objectRecord.mask_urls.length === 0) {
        outputs.push({ rawData: objectRecord });
      } else {
        appendUrlOutputs(outputs, objectRecord.mask_urls, objectRecord);
      }
    } else {
      outputs.push({ rawData: objectRecord });
    }
  }

  return outputs;
}

function appendUrlOutputs(
  outputs: TaskOutput[],
  urls: unknown,
  rawData: unknown,
): void {
  if (!Array.isArray(urls)) {
    return;
  }
  for (const url of urls) {
    if (typeof url === 'string' && url.length > 0) {
      outputs.push({ url, rawData });
    }
  }
}

function appendUrlValue(
  outputs: TaskOutput[],
  value: unknown,
  field: string,
  rawData: unknown,
): void {
  if (typeof value === 'string' && value.length > 0) {
    outputs.push({ url: value, rawData: { ...(rawData as object), [field]: value } });
    return;
  }
  if (Array.isArray(value)) {
    appendUrlOutputs(outputs, value, rawData);
  }
}

export function defaultKieUploadPath(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `pptask/${year}-${month}-${day}`;
}

export function normalizeKieUploadPath(uploadPath?: string): string | undefined {
  if (typeof uploadPath !== 'string') {
    return undefined;
  }
  const normalized = uploadPath.trim().replace(/^\/+|\/+$/g, '');
  return normalized.length > 0 ? normalized : undefined;
}

export function isRequestAborted(signal?: SignalLike): boolean {
  return signal?.aborted === true;
}

export function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export function createKieResultError(
  message: string,
  taskId: string,
  record: Record<string, unknown>,
  status: TaskStatus,
  progress?: number,
): Error {
  const error = new Error(message);
  (error as KieResultError).statusResult = {
    provider: 'kie',
    taskId,
    status,
    progress,
    raw: record,
  };
  return error;
}

export type KieResultError = Error & {
  statusResult: {
    provider: 'kie';
    taskId: string;
    status: TaskStatus;
    progress?: number;
    raw: Record<string, unknown>;
  };
};

export function isKieApiSuccessCode(code: unknown): boolean {
  return code === 200;
}

export function formatKieApiError(prefix: string, payload: { code?: unknown; msg?: unknown }): string {
  const code = payload.code ?? 'unknown';
  const msg = typeof payload.msg === 'string' && payload.msg.length > 0 ? payload.msg : 'Unknown error';
  return `${prefix}: ${code} ${msg}`;
}

export async function readKieJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Kie API returned invalid JSON (HTTP ${response.status} ${response.statusText})`);
  }
}

export async function assertKieHttpOk(response: Response, action: string): Promise<void> {
  if (response.ok) {
    return;
  }
  let detail = `${response.status} ${response.statusText}`;
  try {
    const payload = await readKieJsonResponse(response.clone());
    if (payload?.msg) {
      detail = `${detail} - ${payload.msg}`;
    }
  } catch {
    // keep HTTP detail only
  }
  throw new Error(`Kie ${action} HTTP error: ${detail}`);
}
