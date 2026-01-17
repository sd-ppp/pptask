import type { PlatformConfig } from '../../types.ts';

export type OpenAIConfig = {
  apiKey: string;
  baseURL: string;
};

export function ensureOpenAIConfig(platformConfig?: PlatformConfig): OpenAIConfig {
  const apiKey = platformConfig?.apiKey;
  const baseURL = platformConfig?.baseURL || 'https://api.openai.com';
  
  if (!apiKey) {
    throw new Error('openai provider requires apiKey in platformConfig');
  }
  
  return { apiKey, baseURL };
}

export function parseOpenAIEndpoint(url: URL): string {
  let endpoint = url.pathname.replace(/^\//, '');
  if (!endpoint) {
    endpoint = url.hostname;
  }
  
  // Normalize endpoint names
  const normalized = endpoint.toLowerCase();
  if (normalized === 'edit' || normalized === 'edits' || normalized === 'image-edit') {
    return 'edits';
  }
  if (normalized === 'generate' || normalized === 'generations' || normalized === 'image-generate') {
    return 'generations';
  }
  if (normalized === 'variation' || normalized === 'variations' || normalized === 'image-variation') {
    return 'variations';
  }
  
  throw new Error(`Unsupported OpenAI endpoint: ${endpoint}`);
}
