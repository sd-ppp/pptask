import type { FilesV4UploadFileCallOptions } from '@ai-sdk/provider';
import type { CommonProviderOptions, HttpRequest, NormalizedProviderConfig } from './types.ts';

export function normalizeProviderConfig(
  providerId: string,
  options: CommonProviderOptions,
  defaultBaseURL: string,
  requireApiKey = true,
): NormalizedProviderConfig {
  const apiKey = options.apiKey?.trim();
  if (requireApiKey && !apiKey) throw new Error(`${providerId} apiKey is required`);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error(`${providerId} provider requires fetch`);
  return {
    apiKey,
    baseURL: (options.baseURL ?? defaultBaseURL).replace(/\/+$/, ''),
    fetch: fetchImpl,
    headers: { ...options.headers },
  };
}

export async function request(
  fetchImpl: typeof globalThis.fetch,
  providerId: string,
  descriptor: HttpRequest,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(descriptor.url, {
      method: descriptor.method,
      headers: definedHeaders(descriptor.headers),
      body: descriptor.body,
      signal,
    });
  } catch (error) {
    const nested = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : undefined;
    const cause = nested instanceof Error
      ? nested.message
      : error instanceof Error ? error.message : String(error);
    const target = new URL(descriptor.url).origin;
    throw new Error(`${providerId} request could not reach ${target}: ${cause}`);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `${providerId} request failed (${response.status}): ${body || response.statusText}`,
    );
  }
  return response;
}

export async function requestJson<T = any>(
  fetchImpl: typeof globalThis.fetch,
  providerId: string,
  descriptor: HttpRequest,
  signal?: AbortSignal,
): Promise<T> {
  const response = await request(fetchImpl, providerId, descriptor, signal);
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${providerId} returned invalid JSON (${response.status})`);
  }
}

export async function uploadBlob(options: FilesV4UploadFileCallOptions): Promise<Blob> {
  if (options.data.type === 'text') {
    return new Blob([options.data.text], { type: options.mediaType });
  }
  if (options.data.type === 'data') {
    const data = typeof options.data.data === 'string'
      ? base64ToBytes(options.data.data)
      : options.data.data;
    return new Blob([data as BlobPart], { type: options.mediaType });
  }
  const blob = await new Response(options.data.stream).blob();
  return blob.type ? blob : new Blob([blob], { type: options.mediaType });
}

export function definedHeaders(
  headers?: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

export function mergeHeaders(
  ...sources: Array<Record<string, string | undefined> | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
}

export function jsonRequest(
  url: string,
  body: unknown,
  headers?: Record<string, string | undefined>,
  method = 'POST',
): HttpRequest {
  return {
    url,
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function basicAuth(value: string): string {
  return `Basic ${bytesToBase64(new TextEncoder().encode(value))}`;
}
