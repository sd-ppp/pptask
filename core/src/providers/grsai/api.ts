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

/**
 * Parse response that might be either JSON or SSE format
 */
async function parseResponse(response: Response, readFirstEventOnly: boolean = false): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
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

  return {
    provider: 'grsai',
    metadata: {
      scheme: 'grsai',
      model,
      apiEndpoint: '/v1/draw/nano-banana',
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
    recommendUploadProvider: 'runninghub',
    cancelable: false,
  };
}

export async function createGrsaiTask(
  url: URL,
  payload: Record<string, any> = {},
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  const { apiKey, baseUrl } = ensureGrsaiConfig(platformConfig);
  const model = parseGrsaiModel(url);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Task creation aborted');
  }

  const response = await fetch(`${baseUrl}/v1/draw/nano-banana`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...payload,
    }),
    signal: signal as AbortSignal,
  });

  if (!response.ok) {
    throw new Error(`Grsai API error: ${response.status} ${response.statusText}`);
  }

  // For create task, only read the first SSE event (contains task ID) and return immediately
  const data = await parseResponse(response, true);

  // Handle possible response formats
  // Format 1: { id: "xxx", status: "pending", ... }
  // Format 2: { code: 0, data: { id: "xxx", status: "pending", ... }, msg: "" }
  const resultData = data.data || data;
  
  if (!resultData.id) {
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
  const { apiKey, baseUrl } = ensureGrsaiConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Status check aborted');
  }

  const response = await fetch(`${baseUrl}/v1/draw/result`, {
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
  const { apiKey, baseUrl } = ensureGrsaiConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Result fetch aborted');
  }

  const response = await fetch(`${baseUrl}/v1/draw/result`, {
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
