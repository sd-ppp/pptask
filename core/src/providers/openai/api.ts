import type { TaskResult, DescribeResult, PlatformConfig, TaskRequestOptions } from '../../types.ts';
import { ensureOpenAIConfig, parseOpenAIEndpoint, type OpenAIConfig } from './helpers.ts';
import { buildOpenAIFormSchema } from './formily.ts';

const OPENAI_SCHEME = 'openai';

export async function describeOpenAI(
  url: URL,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<DescribeResult> {
  const endpoint = parseOpenAIEndpoint(url);
  
  return {
    provider: OPENAI_SCHEME,
    metadata: { scheme: OPENAI_SCHEME, endpoint },
    formSchema: buildOpenAIFormSchema(endpoint),
    formValues: getDefaultValues(endpoint),
    cancelable: false,
  };
}

export async function createOpenAITaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const config = ensureOpenAIConfig(platformConfig);
  const endpoint = parseOpenAIEndpoint(url);
  
  // Route to different implementations
  switch (endpoint) {
    case 'edits':
      return createImageEdit(config, payload, options);
    case 'generations':
      return createImageGeneration(config, payload, options);
    case 'variations':
      return createImageVariation(config, payload, options);
    default:
      throw new Error(`Unsupported OpenAI endpoint: ${endpoint}`);
  }
}

// Image edit implementation
async function createImageEdit(
  config: OpenAIConfig,
  payload: Record<string, any>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const { apiKey, baseURL } = config;
  const { 
    image, 
    prompt, 
    mask,
    model = 'dall-e-2', 
    n = 1,
    size = '1024x1024',
    response_format = 'url',
  } = payload;
  
  if (!image) {
    throw new Error('Image is required for OpenAI image edit');
  }
  if (!prompt) {
    throw new Error('Prompt is required for OpenAI image edit');
  }
  
  // Prepare image buffer
  const imageBuffer = parseImageInput(image);
  
  // Prepare FormData
  const formData = new FormData();
  const imageBlob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  formData.append('image', imageBlob, 'image.png');
  formData.append('prompt', prompt);
  formData.append('model', model);
  formData.append('n', String(n));
  formData.append('size', size);
  formData.append('response_format', response_format);
  
  // Add mask if provided
  if (mask) {
    const maskBuffer = parseImageInput(mask);
    const maskBlob = new Blob([new Uint8Array(maskBuffer)], { type: 'image/png' });
    formData.append('mask', maskBlob, 'mask.png');
  }
  
  const url = `${baseURL}/v1/images/edits`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }
  
  const result = await response.json();
  const taskId = `openai-edit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Extract outputs
  const outputs = normalizeOpenAIOutputs(result);
  
  if (outputs.length === 0) {
    throw new Error('No image returned from OpenAI API');
  }
  
  return {
    provider: OPENAI_SCHEME,
    taskId,
    status: 'succeeded',
    outputs,
    raw: result,
  };
}

// Image generation implementation
async function createImageGeneration(
  config: OpenAIConfig,
  payload: Record<string, any>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const { apiKey, baseURL } = config;
  const { 
    prompt, 
    model = 'dall-e-3',
    n = 1,
    quality = 'standard',
    size = '1024x1024',
    style = 'vivid',
    response_format = 'url',
  } = payload;
  
  if (!prompt) {
    throw new Error('Prompt is required for OpenAI image generation');
  }
  
  const url = `${baseURL}/v1/images/generations`;
  
  const requestBody: any = {
    model,
    prompt,
    size,
    response_format,
  };
  
  // DALL-E 3 specific options
  if (model === 'dall-e-3') {
    requestBody.quality = quality;
    requestBody.style = style;
    requestBody.n = 1; // DALL-E 3 only supports n=1
  } else {
    // DALL-E 2 supports multiple images
    requestBody.n = n;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }
  
  const result = await response.json();
  const taskId = `openai-gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Extract outputs
  const outputs = normalizeOpenAIOutputs(result);
  
  if (outputs.length === 0) {
    throw new Error('No image returned from OpenAI API');
  }
  
  return {
    provider: OPENAI_SCHEME,
    taskId,
    status: 'succeeded',
    outputs,
    raw: result,
  };
}

// Image variation implementation
async function createImageVariation(
  config: OpenAIConfig,
  payload: Record<string, any>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const { apiKey, baseURL } = config;
  const { 
    image, 
    model = 'dall-e-2',
    n = 1,
    size = '1024x1024',
    response_format = 'url',
  } = payload;
  
  if (!image) {
    throw new Error('Image is required for OpenAI image variation');
  }
  
  // Prepare image buffer
  const imageBuffer = parseImageInput(image);
  
  // Prepare FormData
  const formData = new FormData();
  const imageBlob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  formData.append('image', imageBlob, 'image.png');
  formData.append('model', model);
  formData.append('n', String(n));
  formData.append('size', size);
  formData.append('response_format', response_format);
  
  const url = `${baseURL}/v1/images/variations`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }
  
  const result = await response.json();
  const taskId = `openai-var-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Extract outputs
  const outputs = normalizeOpenAIOutputs(result);
  
  if (outputs.length === 0) {
    throw new Error('No image returned from OpenAI API');
  }
  
  return {
    provider: OPENAI_SCHEME,
    taskId,
    status: 'succeeded',
    outputs,
    raw: result,
  };
}

// Helper: Parse image input (base64 or data URL)
function parseImageInput(image: string): Buffer {
  if (image.startsWith('data:')) {
    // Data URL format: data:image/png;base64,xxxx
    const base64Data = image.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid data URL format');
    }
    return Buffer.from(base64Data, 'base64');
  } else {
    // Plain base64
    return Buffer.from(image, 'base64');
  }
}

// Helper: Normalize OpenAI API outputs
function normalizeOpenAIOutputs(result: any): Array<{ url?: string; rawData: any }> {
  if (!result.data || !Array.isArray(result.data)) {
    return [];
  }
  
  return result.data.map((item: any) => {
    let url: string | undefined;
    
    if (item.url) {
      url = item.url;
    } else if (item.b64_json) {
      url = `data:image/png;base64,${item.b64_json}`;
    }
    
    return {
      url,
      rawData: item,
      revised_prompt: item.revised_prompt, // DALL-E 3 returns revised prompts
    };
  });
}

// Helper: Get default form values
function getDefaultValues(endpoint: string): Record<string, any> {
  switch (endpoint) {
    case 'edits':
      return { 
        prompt: '', 
        model: 'dall-e-2', 
        n: 1,
        size: '1024x1024',
      };
    case 'generations':
      return { 
        prompt: '', 
        model: 'dall-e-3',
        n: 1,
        quality: 'standard',
        size: '1024x1024',
        style: 'vivid',
      };
    case 'variations':
      return { 
        model: 'dall-e-2',
        n: 1,
        size: '1024x1024',
      };
    default:
      return {};
  }
}
