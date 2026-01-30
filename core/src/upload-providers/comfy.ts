import type { TaskRequestOptions, UploadResult } from '../types.ts';
import { buildComfyBaseUrl } from '../providers/comfy/helpers.ts';

function isRequestAborted(signal?: TaskRequestOptions['signal']): boolean {
  if (!signal) return false;
  if (signal instanceof AbortSignal) return signal.aborted;
  return Boolean(signal.aborted);
}

function createAbortError(message: string): Error {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    (error as any).name = 'AbortError';
    return error;
  }
}

function buildViewUrl(baseUrl: string, entry: any, fallbackType: string): string | undefined {
  if (!entry) return undefined;
  if (typeof entry.url === 'string' && entry.url) return entry.url;
  const filename = entry.filename || entry.name;
  if (!filename) return undefined;
  const url = new URL(`${baseUrl}/view`);
  url.searchParams.set('filename', filename);
  if (entry.subfolder) url.searchParams.set('subfolder', entry.subfolder);
  url.searchParams.set('type', entry.type || fallbackType);
  return url.toString();
}

export async function uploadToComfy(
  serverUrl: string,
  formData: FormData,
  https: boolean,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Upload aborted');
  }
  const baseUrl = buildComfyBaseUrl(serverUrl, https);
  const response = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    body: formData,
    signal: options?.signal as AbortSignal,
  });
  if (!response.ok) {
    throw new Error(`comfy upload HTTP ${response.status}`);
  }
  const payload = await response.json();
  const url = buildViewUrl(baseUrl, payload, 'input') || '';
  return {
    provider: https ? 'comfy-https' : 'comfy-http',
    url,
    raw: payload,
  };
}
