import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import {
  cancelComfyTask,
  checkComfyStatus,
  createComfyTask,
  describeComfy,
  getComfyResult,
} from './api.ts';
import { parseComfyLocator } from './helpers.ts';
import { uploadToComfy } from '../../upload-providers/comfy.ts';

const COMFY_SCHEMES = new Set(['comfy-http', 'comfy-https']);

function ensureComfyUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (!COMFY_SCHEMES.has(scheme)) {
    throw new Error(`comfy provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const comfyProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureComfyUrl(params.locator);
    return describeComfy(url, params.platformConfig, params.options);
  },

  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    const url = ensureComfyUrl(params.locator);
    return createComfyTask(url, params.payload ?? {}, params.platformConfig, params.options);
  },

  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    const url = ensureComfyUrl(params.locator);
    return checkComfyStatus(url, params.taskId, params.platformConfig, params.options);
  },

  async getResult(params: TaskResultParams): Promise<TaskResult> {
    const url = ensureComfyUrl(params.locator);
    return getComfyResult(url, params.taskId, params.platformConfig, params.options);
  },

  async cancelTask(params: TaskCheckParams): Promise<void> {
    const url = ensureComfyUrl(params.locator);
    await cancelComfyTask(url, params.taskId, params.platformConfig, params.options);
  },
};

export const comfyUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    // Extract server URL from locator if provided
    let serverUrl = 'localhost:8188'; // default
    let https = params.uploadProvider === 'comfy-https';
    
    if (params.locator) {
      const url = ensureComfyUrl(params.locator);
      const parsed = parseComfyLocator(url);
      serverUrl = parsed.serverUrl;
      https = url.protocol.replace(/:$/, '').toLowerCase() === 'comfy-https';
    }
    
    return uploadToComfy(serverUrl, params.formData, https, params.options);
  },
};

// Re-export API functions
export {
  cancelComfyTask,
  checkComfyStatus,
  createComfyTask,
  describeComfy,
  getComfyResult,
} from './api.ts';
export { uploadToComfy } from '../../upload-providers/comfy.ts';

// Re-export helpers
export {
  buildComfyBaseUrl,
  ensureComfyConfig,
  mapComfyStatus,
  parseComfyLocator,
  type ComfyConfig,
} from './helpers.ts';
