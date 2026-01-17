import type { PlatformConfig, SignalLike, TaskStatus } from '../../types.ts';

export type GrsaiConfig = {
  apiKey: string;
  baseUrl: string;
};

export function ensureGrsaiConfig(platformConfig?: PlatformConfig): GrsaiConfig {
  const apiKey = platformConfig?.apiKey;
  const baseUrl = platformConfig?.baseUrl;
  
  if (!apiKey) {
    throw new Error('grsai provider requires apiKey in platformConfig');
  }
  if (!baseUrl) {
    throw new Error('grsai provider requires baseUrl in platformConfig');
  }
  
  return {
    apiKey,
    baseUrl,
  };
}

export function parseGrsaiModel(url: URL): string {
  // locator format: grsai:///model-name (pathname only, three slashes)
  const model = url.pathname.replace(/^\//, '');
  
  // Check if user used hostname instead of pathname (two slashes instead of three)
  if (!model && url.hostname) {
    throw new Error(
      `Invalid grsai locator format. Found 'grsai://${url.hostname}' (two slashes). ` +
      `Please use 'grsai:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }
  
  if (!model) {
    throw new Error('grsai locator must contain model name in pathname (e.g., grsai:///nano-banana-fast)');
  }
  
  return model;
}

export function mapGrsaiStatus(status: string): TaskStatus {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    case 'running':
    default:
      return 'running';
  }
}

export function isRequestAborted(signal?: SignalLike): boolean {
  return signal?.aborted === true;
}

export function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export function normalizeGrsaiOutputs(data: any): Array<{ url?: string; rawData: any; [key: string]: any }> {
  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }
  return data.results.map((item: any) => ({
    url: item.url,
    rawData: item,
    content: item.content,
  }));
}
