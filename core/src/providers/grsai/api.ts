import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import {
  createAbortError,
  ensureGrsaiConfig,
  isRequestAborted,
  mapGrsaiStatus,
  normalizeGrsaiOutputs,
  parseGrsaiModel,
} from './helpers.ts';

const GRSAI_DRAW_NANO_BANANA = '/v1/draw/nano-banana';
const GRSAI_DRAW_COMPLETIONS = '/v1/draw/completions';

/** gpt-image-2（非 VIP）文档给出的像素规格 */
const GPT_IMAGE_2_PIXEL_BY_RATIO: Record<string, string> = {
  auto: '1024x1024',
  '1:1': '1024x1024',
  '16:9': '1536x1024',
  '9:16': '1024x1536',
  '4:3': '1024x1024',
  '3:4': '1024x1536',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
  '5:4': '1024x1024',
  '4:5': '1024x1536',
  '21:9': '1774x887',
};

/** gpt-image-2-vip：按档位选用文档中的较大分辨率（未列出的比例回退 auto） */
const GPT_IMAGE_VIP_PIXEL_BY_RATIO: Record<string, { k1: string; k2: string; k4: string }> = {
  auto: { k1: '1024x1024', k2: '2048x2048', k4: '2880x2880' },
  '1:1': { k1: '1024x1024', k2: '2048x2048', k4: '2880x2880' },
  '16:9': { k1: '1536x1024', k2: '2048x1152', k4: '3840x2160' },
  '9:16': { k1: '1024x1536', k2: '1152x2048', k4: '2160x3840' },
  '4:3': { k1: '1024x1024', k2: '2048x1360', k4: '3504x2336' },
  '3:4': { k1: '1024x1536', k2: '1360x2048', k4: '2336x3504' },
  '3:2': { k1: '1536x1024', k2: '2048x1152', k4: '3840x2160' },
  '2:3': { k1: '1024x1536', k2: '1152x2048', k4: '2160x3840' },
  '5:4': { k1: '1024x1024', k2: '2048x1360', k4: '2880x2880' },
  '4:5': { k1: '1024x1536', k2: '1360x2048', k4: '2880x2880' },
  '21:9': { k1: '1774x887', k2: '2048x880', k4: '3840x1648' },
};

function normalizeImageTier(imageSize: string): 'k1' | 'k2' | 'k4' {
  const s = String(imageSize || '').toLowerCase();
  if (s.includes('4')) {
    return 'k4';
  }
  if (s.includes('2')) {
    return 'k2';
  }
  return 'k1';
}

function mapAspectRatioToGptPixels(
  aspectRatio: unknown,
  imageSize: string,
  model: string
): string {
  const key =
    typeof aspectRatio === 'string' && aspectRatio.trim() ? aspectRatio.trim() : 'auto';
  const tier = normalizeImageTier(imageSize);
  const isVip = model.toLowerCase().includes('vip');

  if (isVip) {
    const row = GPT_IMAGE_VIP_PIXEL_BY_RATIO[key] ?? GPT_IMAGE_VIP_PIXEL_BY_RATIO.auto;
    return row[tier];
  }

  const standard = GPT_IMAGE_2_PIXEL_BY_RATIO[key] ?? GPT_IMAGE_2_PIXEL_BY_RATIO.auto;
  return standard;
}

function normalizeGrsaiUrlList(urls: unknown): string[] {
  if (!Array.isArray(urls)) {
    return [];
  }
  return urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
}

function buildGptCompletionsBody(model: string, payload: Record<string, any>): Record<string, any> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
  const aspectRaw = payload.aspectRatio;
  const imageSize = typeof payload.imageSize === 'string' ? payload.imageSize : '1K';

  let aspectRatio: string;
  if (typeof aspectRaw === 'string' && /^\d+x\d+$/i.test(aspectRaw.trim())) {
    aspectRatio = aspectRaw.trim();
  } else {
    aspectRatio = mapAspectRatioToGptPixels(aspectRaw, imageSize, model);
  }

  const body: Record<string, any> = {
    model,
    prompt,
    aspectRatio,
  };

  const urls = normalizeGrsaiUrlList(payload.urls);
  if (urls.length > 0) {
    body.urls = urls;
  }
  if (typeof payload.webHook === 'string' && payload.webHook.trim()) {
    body.webHook = payload.webHook.trim();
  }
  if (typeof payload.shutProgress === 'boolean') {
    body.shutProgress = payload.shutProgress;
  }
  if (payload.quality !== undefined && payload.quality !== null && String(payload.quality).length > 0) {
    body.quality = payload.quality;
  }

  return body;
}

/** Debug log for completions API — avoids dumping huge prompts/URLs. */
function logGrsaiCompletionsRequest(
  baseURL: string,
  path: string,
  body: Record<string, any>,
): void {
  const prompt =
    typeof body.prompt === 'string' ? body.prompt : '';
  const urls = Array.isArray(body.urls) ? body.urls : [];
  console.log('[Grsai] draw/completions request', {
    url: `${baseURL.replace(/\/$/, '')}${path}`,
    model: body.model,
    aspectRatio: body.aspectRatio,
    promptChars: prompt.length,
    promptPreview: prompt.length <= 160 ? prompt : `${prompt.slice(0, 160)}…`,
    urlsCount: urls.length,
    urlPreviews: urls.map((u: unknown) =>
      typeof u === 'string'
        ? u.length > 120
          ? `${u.slice(0, 120)}…`
          : u
        : u,
    ),
    bodyKeys: Object.keys(body),
    bodyJson: JSON.stringify(body, (_k, v) =>
      typeof v === 'string' && v.length > 200 ? `${v.slice(0, 200)}…(${v.length} chars)` : v,
    ),
  });
}

/**
 * Parse response that might be either JSON or SSE format
 */
async function parseResponse(response: Response, readFirstEventOnly: boolean = false): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const debugPrefix = '[Grsai] Invalid SSE format';
  const toApiError = (raw: string): Error | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const data = JSON.parse(trimmed);
      const msg = data?.msg || data?.error || data?.message;
      if (msg) {
        const codeInfo = data?.code != null ? ` (code=${data.code})` : '';
        return new Error(`Grsai API error: ${msg}${codeInfo}`);
      }
    } catch {
      // Not JSON, ignore
    }
    return null;
  };

  const logInvalidSSE = (raw: string) => {
    const maxLen = 2000;
    const snippet = raw.length > maxLen ? `${raw.slice(0, maxLen)}... [truncated ${raw.length - maxLen} chars]` : raw;
    console.error(`${debugPrefix}. content-type=${contentType}, raw=`, snippet);
  };
  
  if (contentType.includes('text/event-stream')) {
    // Parse SSE format: "data: {...}\n\n"
    if (readFirstEventOnly) {
      // For streaming responses, read only the first event and return immediately
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Look for the first complete SSE event
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6); // Remove "data: " prefix
              // Close the reader to stop receiving further data
              reader.cancel();
              return JSON.parse(jsonStr);
            }
          }
        }
        logInvalidSSE(buffer);
        const apiError = toApiError(buffer);
        if (apiError) throw apiError;
        throw new Error('Grsai API returned invalid SSE format');
      } finally {
        reader.releaseLock();
      }
    } else {
      // For non-streaming responses, read the entire response
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.startsWith('data: '));
      if (lines.length > 0) {
        const jsonStr = lines[0].substring(6); // Remove "data: " prefix
        return JSON.parse(jsonStr);
      } else {
        logInvalidSSE(text);
        const apiError = toApiError(text);
        if (apiError) throw apiError;
        throw new Error('Grsai API returned invalid SSE format');
      }
    }
  } else {
    // Standard JSON response
    return await response.json();
  }
}

export async function describeGrsai(
  url: URL,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parseGrsaiModel(url);
  const apiEndpoint = model.startsWith('gpt') ? GRSAI_DRAW_COMPLETIONS : GRSAI_DRAW_NANO_BANANA;

  return {
    provider: 'grsai',
    metadata: {
      scheme: 'grsai',
      model,
      apiEndpoint,
    },
    formSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          title: '提示词',
          required: true,
          'x-decorator': 'FormItem',
          'x-component': 'Input.TextArea',
          'x-component-props': {
            placeholder: '请输入提示词描述您想要生成的图像',
          },
        },
        urls: {
          type: 'array',
          title: '参考图',
          'x-decorator': 'FormItem',
          'x-component': 'Upload',
          'x-component-props': {
            multiple: true,
          },
          items: {
            type: 'string',
          },
        },
        aspectRatio: {
          type: 'string',
          title: '图像比例',
          default: 'auto',
          enum: [
            { label: '自动', value: 'auto' },
            { label: '1:1', value: '1:1' },
            { label: '16:9', value: '16:9' },
            { label: '9:16', value: '9:16' },
            { label: '4:3', value: '4:3' },
            { label: '3:4', value: '3:4' },
            { label: '3:2', value: '3:2' },
            { label: '2:3', value: '2:3' },
            { label: '5:4', value: '5:4' },
            { label: '4:5', value: '4:5' },
            { label: '21:9', value: '21:9' },
          ],
          'x-decorator': 'FormItem',
          'x-component': 'Select',
        },
        imageSize: {
          type: 'string',
          title: '图像大小',
          default: '1K',
          enum: [
            { label: '1K', value: '1K' },
            { label: '2K', value: '2K' },
            { label: '4K', value: '4K' },
          ],
          'x-decorator': 'FormItem',
          'x-component': 'Select',
        },
      },
    },
    formValues: {
      model,
      aspectRatio: 'auto',
      imageSize: '1K',
    },
    recommendUploadProvider: 'grsai',
    cancelable: false,
  };
}

export async function createGrsaiTask(
  url: URL,
  payload: Record<string, any> = {},
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  const { apiKey, baseURL } = ensureGrsaiConfig(platformConfig);
  const model = parseGrsaiModel(url);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Task creation aborted');
  }

  let response: Response;
  if (model.startsWith('nano-banana')) {
    const nanoUrl = `${baseURL}${GRSAI_DRAW_NANO_BANANA}`;
    console.log('[Grsai] draw/nano-banana request', {
      url: nanoUrl,
      model,
      payloadKeys: Object.keys(payload || {}),
    });
    response = await fetch(nanoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...payload,
      }),
      signal: signal as AbortSignal,
    });
  } else if (model.startsWith('gpt')) {
    const body = buildGptCompletionsBody(model, payload);
    logGrsaiCompletionsRequest(baseURL, GRSAI_DRAW_COMPLETIONS, body);
    response = await fetch(`${baseURL}${GRSAI_DRAW_COMPLETIONS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: signal as AbortSignal,
    });
  } else {
    throw new Error(
      `Grsai draw routing: unsupported model "${model}". Use nano-banana-* (/${GRSAI_DRAW_NANO_BANANA}) or gpt* (/${GRSAI_DRAW_COMPLETIONS}).`
    );
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[Grsai] create HTTP error', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      bodyPreview: errBody.length > 1500 ? `${errBody.slice(0, 1500)}…` : errBody,
    });
    throw new Error(`Grsai API error: ${response.status} ${response.statusText}`);
  }

  // For create task, only read the first SSE event (contains task ID) and return immediately
  const data = await parseResponse(response, true);

  // Handle possible response formats
  // Format 1: { id: "xxx", status: "pending", ... }
  // Format 2: { code: 0, data: { id: "xxx", status: "pending", ... }, msg: "" }
  const resultData = data.data || data;

  console.log('[Grsai] create first response', {
    taskId: resultData.id,
    status: resultData.status,
    code: data.code,
    msg: data.msg,
    modelEcho: resultData.model ?? resultData.model_name,
  });

  if (!resultData.id) {
    console.error('[Grsai] create missing task id, raw:', JSON.stringify(data).slice(0, 2000));
    throw new Error('Grsai API did not return a task id');
  }

  return {
    provider: 'grsai',
    taskId: resultData.id,
    status: resultData.status ? mapGrsaiStatus(resultData.status) : 'pending',
    raw: data,
  };
}

export async function checkGrsaiStatus(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  const { apiKey, baseURL } = ensureGrsaiConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Status check aborted');
  }

  const response = await fetch(`${baseURL}/v1/draw/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ id: taskId }),
    signal: signal as AbortSignal,
  });

  if (!response.ok) {
    throw new Error(`Grsai API error: ${response.status} ${response.statusText}`);
  }

  const result = await parseResponse(response);

  // Check API response code
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(`Grsai API error: ${result.msg || 'Unknown error'}`);
  }

  const data = result.data || result;
  
  // Log failed tasks for debugging
  if (data.status === 'failed') {
    console.error(`[Grsai] Task ${taskId} failed. Response:`, JSON.stringify(data, null, 2));
  }

  return {
    provider: 'grsai',
    taskId,
    status: mapGrsaiStatus(data.status),
    progress: data.progress,
    raw: data,
  };
}

export async function getGrsaiResult(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const { apiKey, baseURL } = ensureGrsaiConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Result fetch aborted');
  }

  const response = await fetch(`${baseURL}/v1/draw/result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ id: taskId }),
    signal: signal as AbortSignal,
  });

  if (!response.ok) {
    throw new Error(`Grsai API error: ${response.status} ${response.statusText}`);
  }

  const result = await parseResponse(response);

  // Check API response code
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(`Grsai API error: ${result.msg || 'Unknown error'}`);
  }

  const data = result.data || result;
  const status = mapGrsaiStatus(data.status);

  if (status !== 'succeeded') {
    const errorMsg = data.error || data.failure_reason || 'Unknown error';
    throw new Error(
      `Grsai task ${taskId} is not completed (status=${data.status}, error=${errorMsg})`
    );
  }

  return {
    provider: 'grsai',
    taskId,
    status: 'succeeded',
    outputs: normalizeGrsaiOutputs(data),
    raw: data,
  };
}

export async function cancelGrsaiTask(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<void> {
  // Grsai API does not provide cancel endpoint, empty implementation
  return;
}
