import type { PlatformConfig, TaskStatus } from '../../../types.ts';

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
  const errorCode = response?.errorCode || 'UNKNOWN';
  const errorMessage = response?.errorMessage || response?.message || 'Unknown error';
  
  const error = new Error(`RunningHub API ${context} failed: [${errorCode}] ${errorMessage}`);
  (error as any).response = response;
  return error;
}

/**
 * 获取模型的 schema 配置
 * TODO: 后续可以从配置文件或 API 获取
 */
export function getModelSchema(modelPath: string): {
  schema: any;
  defaults: Record<string, any>;
} {
  // rhart-image-v1/text-to-image: 只有 prompt 和 aspectRatio
  if (modelPath === 'rhart-image-v1/text-to-image') {
    return {
      schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            title: 'Prompt',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              placeholder: 'Enter your prompt here',
              rows: 4,
            },
            required: true,
          },
          aspectRatio: {
            type: 'string',
            title: 'Aspect Ratio',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1:1', '3:4', '4:3', '16:9', '9:16'],
            default: '3:4',
          },
        },
      },
      defaults: {
        aspectRatio: '3:4',
      },
    };
  }
  
  // rhart-image-n-pro/text-to-image: 有 prompt, aspectRatio, resolution
  if (modelPath === 'rhart-image-n-pro/text-to-image') {
    return {
      schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            title: 'Prompt',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              placeholder: 'Enter your prompt here',
              rows: 4,
            },
            required: true,
          },
          aspectRatio: {
            type: 'string',
            title: 'Aspect Ratio',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1:1', '4:3', '3:4', '16:9', '9:16'],
            default: '9:16',
          },
          resolution: {
            type: 'string',
            title: 'Resolution',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1k', '2k', '4k'],
            default: '1k',
          },
        },
      },
      defaults: {
        aspectRatio: '9:16',
        resolution: '1k',
      },
    };
  }

  // rhart-image-n-pro-official/edit: 有 imageUrls, prompt, resolution, aspectRatio
  if (modelPath === 'rhart-image-n-pro-official/edit') {
    return {
      schema: {
        type: 'object',
        properties: {
          imageUrls: {
            type: 'array',
            title: '上传参考图像',
            'x-decorator': 'FormItem',
            'x-component': 'Upload',
            required: true,
            description: '最多 10 张图片，每张不超过 10 MB',
            'x-component-props': {
              variant: 'nomask',
              maxCount: 10,
              listType: 'picture-card',
              accept: 'image/*',
            },
            'x-runninghub': {
              outputType: 'images',
              componentProps: {
                maxCount: 10,
              },
            },
          },
          prompt: {
            type: 'string',
            title: 'Prompt',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              placeholder: 'Enter your prompt here',
              rows: 4,
            },
            required: true,
            description: '文本长度 5-4000',
          },
          resolution: {
            type: 'string',
            title: 'Resolution',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1k', '2k', '4k'],
            default: '1k',
            required: true,
          },
          aspectRatio: {
            type: 'string',
            title: 'Aspect Ratio',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
          },
        },
      },
      defaults: {
        resolution: '1k',
      },
    };
  }

  // rhart-image-n-pro/edit: 有 imageUrls, prompt, aspectRatio, resolution
  if (modelPath === 'rhart-image-n-pro/edit') {
    return {
      schema: {
        type: 'object',
        properties: {
          imageUrls: {
            type: 'array',
            title: '上传参考图像',
            'x-decorator': 'FormItem',
            'x-component': 'Upload',
            required: true,
            description: '最多 10 张图片，每张不超过 10 MB',
            'x-component-props': {
              variant: 'nomask',
              maxCount: 10,
              listType: 'picture-card',
              accept: 'image/*',
            },
            'x-runninghub': {
              outputType: 'images',
              componentProps: {
                maxCount: 10,
              },
            },
          },
          prompt: {
            type: 'string',
            title: 'Prompt',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              placeholder: 'Enter your prompt here',
              rows: 4,
            },
            required: true,
            description: '文本长度 5-4000',
          },
          aspectRatio: {
            type: 'string',
            title: 'Aspect Ratio',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9'],
          },
          resolution: {
            type: 'string',
            title: 'Resolution',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['1k', '2k', '4k', '1K', '2K', '4K'],
            default: '1k',
            required: true,
          },
        },
      },
      defaults: {
        resolution: '1k',
      },
    };
  }

  // rhart-image-v1/edit: 有 prompt, aspectRatio, imageUrls
  if (modelPath === 'rhart-image-v1/edit') {
    return {
      schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            title: 'Prompt',
            'x-decorator': 'FormItem',
            'x-component': 'Input.TextArea',
            'x-component-props': {
              placeholder: 'Enter your prompt here',
              rows: 4,
            },
            required: true,
            description: '文本长度 5-4000',
          },
          aspectRatio: {
            type: 'string',
            title: 'Aspect Ratio',
            'x-decorator': 'FormItem',
            'x-component': 'Select',
            enum: ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9'],
            required: true,
          },
          imageUrls: {
            type: 'array',
            title: '上传参考图像',
            'x-decorator': 'FormItem',
            'x-component': 'Upload',
            required: true,
            description: '最多 5 张图片，每张不超过 10 MB',
            'x-component-props': {
              variant: 'nomask',
              maxCount: 5,
              listType: 'picture-card',
              accept: 'image/*',
            },
            'x-runninghub': {
              outputType: 'images',
              componentProps: {
                maxCount: 5,
              },
            },
          },
        },
      },
      defaults: {},
    };
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
