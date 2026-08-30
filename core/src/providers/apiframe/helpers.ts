import type { PlatformConfig, SignalLike, TaskOutput, TaskStatus } from '../../types.ts';
import { getApiframeDescribeEntry, type ApiframeDescribeEntry } from './describe/registry.ts';
import { canonicalizeApiframeLocator, parseApiframeLocator } from './locator.ts';

export const APIFRAME_DEFAULT_BASE_URL = 'https://api.apiframe.ai';
export const APIFRAME_IMAGE_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const APIFRAME_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const APIFRAME_UPLOAD_ABSOLUTE_MAX_BYTES = APIFRAME_VIDEO_MAX_BYTES;

export type ApiframeConfig = {
  apiKey: string;
  baseURL: string;
  webhookUrl?: string;
  webhookEvents?: string[];
};

const MODEL_FIELDS = new Set(['model']);
const WEBHOOK_FIELDS = new Set(['webhookUrl', 'webhookEvents']);

export function ensureApiframeConfig(platformConfig?: PlatformConfig): ApiframeConfig {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('apiframe provider requires apiKey in platformConfig');
  }

  const baseURL = resolveBaseUrl(platformConfig);
  const webhookUrl = resolveWebhookUrl(platformConfig);
  const webhookEvents = resolveWebhookEvents(platformConfig);

  return {
    apiKey,
    baseURL,
    webhookUrl,
    webhookEvents,
  };
}

function resolveBaseUrl(platformConfig?: PlatformConfig): string {
  const candidate =
    typeof platformConfig?.baseURL === 'string' && platformConfig.baseURL.trim().length > 0
      ? platformConfig.baseURL
      : typeof platformConfig?.baseUrl === 'string' && platformConfig.baseUrl.trim().length > 0
        ? platformConfig.baseUrl
        : APIFRAME_DEFAULT_BASE_URL;
  return trimTrailingSlash(candidate);
}

function resolveWebhookUrl(platformConfig?: PlatformConfig): string | undefined {
  const candidate =
    typeof platformConfig?.webhookUrl === 'string' && platformConfig.webhookUrl.trim().length > 0
      ? platformConfig.webhookUrl
      : undefined;
  return candidate;
}

function resolveWebhookEvents(platformConfig?: PlatformConfig): string[] | undefined {
  const candidate = platformConfig?.webhookEvents;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return undefined;
  }
  return candidate.filter((event): event is string => typeof event === 'string' && event.length > 0);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function ensureApiframeWhitelistedLocator(locator: string): {
  model: string;
  entry: ApiframeDescribeEntry;
} {
  const canonicalLocator = canonicalizeApiframeLocator(locator);
  const { model } = parseApiframeLocator(locator);
  const entry = getApiframeDescribeEntry(canonicalLocator);
  if (!entry || entry.modelId !== model) {
    throw new Error(`apiframe provider received unsupported locator: ${locator}`);
  }
  return { model, entry };
}

export function buildApiframeCreateBody(
  entry: ApiframeDescribeEntry,
  model: string,
  payload: Record<string, unknown> = {},
  webhookConfig: Pick<ApiframeConfig, 'webhookUrl' | 'webhookEvents'> = {},
): Record<string, unknown> {
  const { modelField, paramsField } = entry.wireMetadata;
  const schema = entry.requestSchema;
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const ignoredTopLevel = new Set(
    [modelField, 'webhookUrl', 'webhookEvents', paramsField].filter(Boolean) as string[],
  );
  const paramsPropertyNames = paramsField
    ? new Set(Object.keys((properties[paramsField]?.properties ?? {}) as Record<string, unknown>))
    : new Set<string>();

  const body: Record<string, unknown> = {
    [modelField]: model,
  };
  const nestedParams: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (MODEL_FIELDS.has(key) || WEBHOOK_FIELDS.has(key)) {
      continue;
    }
    if (paramsPropertyNames.has(key)) {
      nestedParams[key] = value;
      continue;
    }
    if (!ignoredTopLevel.has(key) && key in properties) {
      body[key] = value;
    }
  }

  if (paramsField && Object.keys(nestedParams).length > 0) {
    body[paramsField] = nestedParams;
  }

  if (webhookConfig.webhookUrl) {
    body.webhookUrl = webhookConfig.webhookUrl;
  }
  if (webhookConfig.webhookEvents) {
    body.webhookEvents = webhookConfig.webhookEvents;
  }

  return body;
}

export function mapApiframeStatus(status: string): TaskStatus {
  switch (status) {
    case 'QUEUED':
      return 'pending';
    case 'PROCESSING':
      return 'running';
    case 'COMPLETED':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      throw new Error(`unknown apiframe job status: ${status}`);
  }
}

/**
 * Normalizes completed job payloads per the official Apiframe docs contract:
 * - Images: https://apiframe.ai/docs (images) — result.images[] and result.gridUrl
 * - Videos: https://apiframe.ai/docs (videos) — result.videoUrl or result.videos[]
 * - Music: https://apiframe.ai/docs (music) — result.tracks[].audioUrl
 *
 * The OpenAPI Job.result field is untyped {}; these shapes come from the product docs.
 */
export function parseApiframeResultOutputs(
  outputType: string,
  result: Record<string, unknown> | null | undefined,
): TaskOutput[] {
  if (!result || typeof result !== 'object') {
    return [];
  }

  const outputs: TaskOutput[] = [];

  if (outputType === 'image') {
    appendUrlOutputs(outputs, result.images, result);
    appendUrlValue(outputs, result.gridUrl, result);
    return outputs;
  }

  if (outputType === 'video') {
    appendUrlValue(outputs, result.videoUrl, result);
    appendUrlOutputs(outputs, result.videos, result);
    return outputs;
  }

  if (outputType === 'music') {
    const tracks = result.tracks;
    if (Array.isArray(tracks)) {
      for (const track of tracks) {
        if (!track || typeof track !== 'object') {
          continue;
        }
        const trackRecord = track as Record<string, unknown>;
        const audioUrl = trackRecord.audioUrl;
        if (typeof audioUrl === 'string' && audioUrl.length > 0) {
          outputs.push({ url: audioUrl, rawData: trackRecord });
        }
      }
    }
    return outputs;
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
  rawData: unknown,
): void {
  if (typeof value === 'string' && value.length > 0) {
    outputs.push({ url: value, rawData });
  }
}

export function resolveApiframeUploadMaxBytes(fileType: string): number {
  if (fileType.startsWith('video/')) {
    return APIFRAME_VIDEO_MAX_BYTES;
  }
  if (fileType.startsWith('image/') || fileType.startsWith('audio/')) {
    return APIFRAME_IMAGE_AUDIO_MAX_BYTES;
  }
  // Unknown/empty MIME: defer modality to server magic-byte sniff; only enforce absolute cap.
  return APIFRAME_UPLOAD_ABSOLUTE_MAX_BYTES;
}

export function formatApiframeUploadSizeLimit(maxBytes: number): string {
  const megabytes = maxBytes / (1024 * 1024);
  return `${megabytes} MB`;
}

export function isRequestAborted(signal?: SignalLike): boolean {
  return signal?.aborted === true;
}

export function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export function createApiframeResultError(
  message: string,
  taskId: string,
  record: Record<string, unknown>,
  status: TaskStatus,
  progress?: number,
): Error {
  const error = new Error(message);
  (error as ApiframeResultError).statusResult = {
    provider: 'apiframe',
    taskId,
    status,
    progress,
    raw: record,
  };
  return error;
}

export type ApiframeResultError = Error & {
  statusResult: {
    provider: 'apiframe';
    taskId: string;
    status: TaskStatus;
    progress?: number;
    raw: Record<string, unknown>;
  };
};

export type ApiframeApiError = Error & {
  response: {
    status: number;
    statusText: string;
  };
  body: Record<string, unknown>;
};

export function createApiframeApiError(
  message: string,
  response: Response,
  body: Record<string, unknown>,
): ApiframeApiError {
  const error = new Error(message) as ApiframeApiError;
  error.response = {
    status: response.status,
    statusText: response.statusText,
  };
  error.body = body;
  return error;
}

export function formatApiframeApiError(prefix: string, payload: Record<string, unknown>): string {
  const parts: string[] = [];

  if (typeof payload.error === 'string' && payload.error.length > 0) {
    parts.push(payload.error);
  } else if (typeof payload.message === 'string' && payload.message.length > 0) {
    parts.push(payload.message);
  }

  const details = payload.details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const detailMessages = Object.entries(details as Record<string, unknown>)
      .flatMap(([field, messages]) => {
        if (!Array.isArray(messages)) {
          return [];
        }
        return messages
          .filter((message): message is string => typeof message === 'string' && message.length > 0)
          .map(message => `${field}: ${message}`);
      });
    if (detailMessages.length > 0) {
      parts.push(detailMessages.join('; '));
    }
  }

  if (typeof payload.creditsRequired === 'number') {
    parts.push(`creditsRequired=${payload.creditsRequired}`);
  }
  if (typeof payload.creditsAvailable === 'number') {
    parts.push(`creditsAvailable=${payload.creditsAvailable}`);
  }

  const detail = parts.length > 0 ? parts.join(' - ') : 'Unknown error';
  return `${prefix}: ${detail}`;
}

export async function readApiframeJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Apiframe API returned invalid JSON (HTTP ${response.status} ${response.statusText})`);
  }
}

export async function assertApiframeHttpOk(response: Response, action: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body = await readApiframeJsonResponse(response.clone());
  } catch {
    body = {};
  }

  const message = formatApiframeApiError(
    `Apiframe ${action} HTTP error (${response.status} ${response.statusText})`,
    body,
  );
  throw createApiframeApiError(message, response, body);
}
