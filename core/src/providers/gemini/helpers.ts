import type { PlatformConfig, TaskOutput } from '../../types.ts';

export type GeminiConfig = {
  apiKey: string;
  baseURL?: string;
};

export function ensureGeminiConfig(platformConfig?: PlatformConfig): GeminiConfig {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey) {
    throw new Error('gemini provider requires apiKey in platformConfig');
  }
  return {
    apiKey,
    baseURL: platformConfig?.baseURL,
  };
}

export function parseGeminiModel(url: URL): string {
  // locator format: gemini:///model-name (pathname only, three slashes)
  const model = url.pathname.replace(/^\//, '');
  
  // Check if user used hostname instead of pathname (two slashes instead of three)
  if (!model && url.hostname) {
    throw new Error(
      `Invalid gemini locator format. Found 'gemini://${url.hostname}' (two slashes). ` +
      `Please use 'gemini:///${url.hostname}' (three slashes) to specify the model in the pathname.`
    );
  }
  
  if (!model) {
    throw new Error('gemini locator must contain model name in pathname (e.g., gemini:///nano-banana-pro)');
  }
  
  return model;
}

export function normalizeGeminiOutputs(response: any): TaskOutput[] {
  const outputs: TaskOutput[] = [];
  
  if (response?.candidates) {
    for (const candidate of response.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            outputs.push({
              url: `data:${mimeType};base64,${part.inlineData.data}`,
              rawData: part,
              mimeType,
            });
          }
        }
      }
    }
  }
  
  return outputs;
}

export function isRequestAborted(signal?: any): boolean {
  if (!signal) return false;
  if (signal instanceof AbortSignal) return signal.aborted;
  return Boolean(signal.aborted);
}

export function createAbortError(message: string): DOMException {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    (error as any).name = 'AbortError';
    return error as any;
  }
}
