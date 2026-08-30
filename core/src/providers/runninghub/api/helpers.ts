import type { PlatformConfig, TaskStatus } from '../../../types.ts';

type RunninghubModelParameter = {
  fieldKey: string;
  type: 'STRING' | 'LIST' | 'INT' | 'FLOAT' | 'BOOLEAN' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  required?: boolean;
  label?: string;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{ value: unknown; description?: string; descriptionEn?: string }>;
  min?: number;
  max?: number;
  step?: number;
  accept?: string;
  maxSize?: number;
};

type RunninghubModel = {
  endpoint: string;
  params: RunninghubModelParameter[];
};

export type RunninghubApiConfig = {
  apiKey: string;
};

/**
 * 解析 runninghub://api/ 格式的 locator
 * 格式: runninghub://api/model-path
 * 例如: runninghub://api/rhart-image-n-pro/text-to-image
 */
export function parseRunninghubApiPath(url: URL): string {
  if (url.hostname !== 'api') {
    throw new Error(
      `Invalid runninghub-api locator format. Expected 'runninghub://api/...' ` +
      `but found 'runninghub://${url.hostname}/...'. ` +
      `Please use 'runninghub://api/model-path' format.`
    );
  }
  
  const modelPath = url.pathname.replace(/^\//, '').trim();
  
  if (!modelPath) {
    throw new Error(
      'runninghub-api locator must include a model path. ' +
      'Example: runninghub://api/rhart-image-n-pro/text-to-image'
    );
  }
  
  return modelPath;
}

/**
 * 确保配置中包含 apiKey
 */
export function ensureRunninghubApiConfig(platformConfig: PlatformConfig | undefined): RunninghubApiConfig {
  const config = (platformConfig ?? {}) as RunninghubApiConfig;
  const apiKey = config.apiKey;
  
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('runninghub-api apiKey is required');
  }
  
  return { apiKey };
}

/**
 * 映射新 API 的状态到标准状态
 * 新 API 状态: SUCCESS, FAILED, RUNNING, PENDING 等
 */
export function mapRunninghubApiStatus(apiStatus: string | undefined): TaskStatus {
  const normalized = String(apiStatus || '').toUpperCase();
  
  switch (normalized) {
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'COMPLETED':
      return 'succeeded';
    
    case 'FAILED':
    case 'ERROR':
      return 'failed';
    
    case 'RUNNING':
    case 'PROCESSING':
    case 'EXECUTING':
      return 'running';
    
    case 'PENDING':
    case 'QUEUED':
    case 'WAITING':
      return 'pending';
    
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';
    
    default:
      return 'pending';
  }
}

/**
 * 创建 RunningHub API 错误
 */
export function createRunninghubApiError(context: string, response: any): Error {
  const errorCode = response?.errorCode ?? response?.code ?? response?.data?.errorCode ?? response?.data?.code ?? 'UNKNOWN';
  const errorMessage = response?.errorMessage
    ?? response?.message
    ?? response?.msg
    ?? response?.data?.errorMessage
    ?? response?.data?.message
    ?? response?.data?.msg
    ?? (response ? JSON.stringify(response) : 'Unknown error');
  
  const error = new Error(`RunningHub API ${context} failed: [${errorCode}] ${errorMessage}`);
  (error as any).response = response;
  return error;
}

/** Returns the Formily schema declared for a RunningHub OpenAPI endpoint. */
export async function getModelSchema(modelPath: string): Promise<{
  schema: any;
  defaults: Record<string, any>;
}> {
  const { getRunningHubCatalogModel } = await import('./model-catalog.ts');
  const model = getRunningHubCatalogModel(modelPath) as RunninghubModel | undefined;
  if (model) {
    const properties: Record<string, any> = {};
    const defaults: Record<string, unknown> = {};

    for (const parameter of model.params) {
      properties[parameter.fieldKey] = buildRunninghubParameterSchema(parameter);
      // The registry's text defaults are example prompts. Keep the Canvas blank
      // while retaining meaningful defaults such as aspect ratio and resolution.
      if (parameter.defaultValue !== undefined && parameter.defaultValue !== null && parameter.fieldKey !== 'prompt') {
        defaults[parameter.fieldKey] = parameter.defaultValue;
      }
    }

    return { schema: { type: 'object', properties }, defaults };
  }
  
  // 未知模型，返回通用 schema
  return {
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          title: 'Prompt',
          'x-decorator': 'FormItem',
          'x-component': 'Input.TextArea',
          required: true,
        },
      },
    },
    defaults: {},
  };
}

function buildRunninghubParameterSchema(parameter: RunninghubModelParameter): Record<string, unknown> {
  const component = getRunninghubComponent(parameter);
  const defaultValue = parameter.defaultValue === null ? undefined : parameter.defaultValue;
  const componentProps: Record<string, unknown> = {};

  if (parameter.type === 'STRING' && isPromptLike(parameter)) {
    componentProps.placeholder = 'Enter your prompt here';
    componentProps.rows = 4;
  }
  if (typeof parameter.min === 'number') componentProps.min = parameter.min;
  if (typeof parameter.max === 'number') componentProps.max = parameter.max;
  if (typeof parameter.step === 'number') componentProps.step = parameter.step;
  if (parameter.accept) componentProps.accept = parameter.accept;

  return {
    type: getRunninghubJsonType(parameter.type),
    title: parameter.label || parameter.fieldKey,
    description: parameter.description,
    'x-decorator': 'FormItem',
    'x-component': component,
    'x-component-props': componentProps,
    ...(parameter.options?.length ? {
      enum: parameter.options.map(option => ({
        label: option.description || option.descriptionEn || String(option.value),
        value: option.value,
      })),
    } : {}),
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(parameter.required ? { required: true } : {}),
    'x-runninghub': {
      type: parameter.type,
      accept: parameter.accept,
      maxSize: parameter.maxSize,
    },
  };
}

function getRunninghubJsonType(type: RunninghubModelParameter['type']): 'string' | 'number' | 'boolean' {
  if (type === 'INT' || type === 'FLOAT') return 'number';
  if (type === 'BOOLEAN') return 'boolean';
  return 'string';
}

function getRunninghubComponent(parameter: RunninghubModelParameter): string {
  if (parameter.type === 'LIST') return 'Select';
  if (parameter.type === 'BOOLEAN') return 'Switch';
  if (parameter.type === 'INT' || parameter.type === 'FLOAT') return 'NumberPicker';
  return parameter.type === 'STRING' && isPromptLike(parameter) ? 'Input.TextArea' : 'Input';
}

function isPromptLike(parameter: RunninghubModelParameter): boolean {
  return /prompt|text|description|提示词|文本|描述/i.test(`${parameter.fieldKey} ${parameter.label ?? ''}`);
}
