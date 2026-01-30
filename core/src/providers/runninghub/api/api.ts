import {
  createRunninghubApiError,
  ensureRunninghubApiConfig,
  getModelSchema,
  mapRunninghubApiStatus,
  parseRunninghubApiPath,
} from './helpers.ts';
import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../../types.ts';

const BASE_URL = 'https://www.runninghub.cn/openapi/v2';

// ========== describe: 返回模型 schema ==========
export async function describeRunninghubApi(
  url: URL,
  platformConfig: PlatformConfig | undefined,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  const modelPath = parseRunninghubApiPath(url);
  
  // 新 API 没有模板接口，返回预定义的 schema
  const { schema, defaults } = getModelSchema(modelPath);
  
  return {
    provider: 'runninghub-api',
    metadata: {
      scheme: 'runninghub',
      modelPath,
    },
    formSchema: schema,
    formValues: defaults,
    recommendUploadProvider: 'runninghub',
  };
}

// ========== createTask: 创建任务 ==========
export async function createRunninghubApiTask(
  url: URL,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  _options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  const config = ensureRunninghubApiConfig(platformConfig);
  const modelPath = parseRunninghubApiPath(url);
  
  // 调用新 API
  const apiUrl = `${BASE_URL}/${modelPath}`;
  
  console.debug(
    '[pptask][runninghub-api] create request',
    JSON.stringify(
      {
        url: apiUrl,
        payload,
      },
      null,
      2
    )
  );
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    console.error(
      '[pptask][runninghub-api] create HTTP error',
      JSON.stringify(
        {
          url: apiUrl,
          status: response.status,
          statusText: response.statusText,
        },
        null,
        2
      )
    );
    throw new Error(`runninghub-api create HTTP ${response.status}`);
  }
  
  const result = await response.json();
  
  // 检查响应格式
  const taskId = result.taskId || result.data?.taskId;
  
  if (!taskId) {
    console.error(
      '[pptask][runninghub-api] create response missing taskId',
      JSON.stringify(result, null, 2)
    );
    throw new Error('runninghub-api: missing taskId in response');
  }
  
  console.debug('[pptask][runninghub-api] created task:', taskId);
  
  return {
    provider: 'runninghub-api',
    taskId,
    status: 'pending',
    raw: result,
    metadata: { modelPath },
  };
}

// ========== checkStatus: 查询任务状态 ==========
export async function checkRunninghubApiStatus(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  _options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  const config = ensureRunninghubApiConfig(platformConfig);
  
  const queryUrl = `${BASE_URL}/query`;
  
  console.debug(
    '[pptask][runninghub-api] status request',
    JSON.stringify(
      {
        url: queryUrl,
        taskId,
      },
      null,
      2
    )
  );
  
  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ taskId }),
  });
  
  if (!response.ok) {
    console.error(
      '[pptask][runninghub-api] status HTTP error',
      JSON.stringify(
        {
          url: queryUrl,
          status: response.status,
          statusText: response.statusText,
        },
        null,
        2
      )
    );
    throw new Error(`runninghub-api query HTTP ${response.status}`);
  }
  
  const result = await response.json();
  
  // 检查错误
  if (result.errorCode) {
    throw createRunninghubApiError('query', result);
  }
  
  const status = mapRunninghubApiStatus(result.status);
  
  return {
    provider: 'runninghub-api',
    taskId,
    status,
    raw: result,
  };
}

// ========== getResult: 获取任务结果 ==========
export async function getRunninghubApiResult(
  url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  // 新 API 的查询接口已经包含结果
  const statusResult = await checkRunninghubApiStatus(
    url,
    taskId,
    platformConfig,
    options
  );
  
  if (statusResult.status !== 'succeeded') {
    throw new Error(
      `runninghub-api task ${taskId} is not completed (status=${statusResult.status})`
    );
  }
  
  const raw = statusResult.raw as any;
  
  // 提取结果
  const outputs = (raw.results || []).map((r: any) => ({
    url: r.url,
    rawData: r,
  }));
  
  if (outputs.length === 0) {
    console.warn('[pptask][runninghub-api] task succeeded but no outputs found');
  }
  
  return {
    provider: 'runninghub-api',
    taskId,
    status: 'succeeded',
    outputs,
    raw,
  };
}

// ========== cancelTask: 取消任务 ==========
export async function cancelRunninghubApiTask(
  _url: URL,
  taskId: string,
  _platformConfig: PlatformConfig | undefined,
  _options?: TaskRequestOptions
): Promise<void> {
  // TODO: 确认新 API 是否有取消接口
  console.warn(`[pptask][runninghub-api] cancel not implemented for task ${taskId}`);
  throw new Error('runninghub-api: cancel not yet implemented');
}
