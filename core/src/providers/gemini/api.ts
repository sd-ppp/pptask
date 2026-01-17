import { GoogleGenAI } from '@google/genai';
import type { DescribeResult, PlatformConfig, TaskRequestOptions, TaskResult } from '../../types.ts';
import { buildGeminiFormSchema } from './formily.ts';
import {
  createAbortError,
  ensureGeminiConfig,
  isRequestAborted,
  normalizeGeminiOutputs,
  parseGeminiModel,
} from './helpers.ts';

const GEMINI_SCHEME = 'gemini';

export async function describeGemini(
  url: URL,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parseGeminiModel(url);
  
  return {
    provider: GEMINI_SCHEME,
    metadata: { scheme: GEMINI_SCHEME, model },
    formSchema: buildGeminiFormSchema(),
    formValues: {
      prompt: '',
      aspectRatio: '16:9',
      imageSize: '2K',
    },
    cancelable: false,
  };
}

export async function createGeminiTaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Task aborted before execution');
  }
  
  const config = ensureGeminiConfig(platformConfig);
  const model = parseGeminiModel(url);
  
  // Initialize Gemini client
  const clientOptions: any = { apiKey: config.apiKey };
  if (config.baseUrl) {
    clientOptions.httpOptions = { baseUrl: config.baseUrl };
  }
  const genAI = new GoogleGenAI(clientOptions);
  
  // Prepare input parts
  const parts: any[] = [];
  
  // Add reference images (if provided)
  if (payload.urls && Array.isArray(payload.urls)) {
    for (const imageData of payload.urls) {
      // Handle both base64 strings and data URLs
      let base64Data = imageData;
      let mimeType = 'image/png';
      
      // If it's a data URL, extract the base64 part
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }
  }
  
  // Add text prompt
  if (payload.prompt) {
    parts.push({ text: payload.prompt });
  }
  
  if (parts.length === 0) {
    throw new Error('gemini provider requires at least a prompt or reference image');
  }
  
  // Call Gemini API
  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        imageConfig: {
          aspectRatio: payload.aspectRatio || '16:9',
          imageSize: payload.imageSize || '2K',
        },
      },
    });
    
    if (isRequestAborted(options?.signal)) {
      throw createAbortError('Task aborted during execution');
    }
    
    // Parse outputs
    const outputs = normalizeGeminiOutputs(response);
    const taskId = `gemini-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Extract cost information if available
    const costCoins = response.usageMetadata?.totalTokenCount;

    return {
      provider: GEMINI_SCHEME,
      taskId,
      status: 'succeeded',
      outputs,
      costCoins,
      raw: response,
    };
  } catch (error: any) {
    // Re-throw abort errors as-is
    if (error.name === 'AbortError') {
      throw error;
    }
    
    // Wrap other errors with context
    const wrappedError = new Error(`Gemini API error: ${error.message}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}
