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
} from '../../types.ts';
import {
  checkApiframeStatus,
  createApiframeTask,
  getApiframeResult,
} from './api.ts';
import { describeApiframeResource } from './describe.ts';

const APIFRAME_SCHEME = 'apiframe';

function ensureApiframeLocator(locator: string): void {
  const { scheme } = parseLocator(locator);
  if (scheme !== APIFRAME_SCHEME) {
    throw new Error(`apiframe provider received unsupported locator: ${locator}`);
  }
}

export const apiframeProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    ensureApiframeLocator(params.locator);
    return describeApiframeResource(params);
  },
  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    ensureApiframeLocator(params.locator);
    return createApiframeTask(
      params.locator,
      params.payload ?? {},
      params.platformConfig,
      params.options,
    );
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    ensureApiframeLocator(params.locator);
    return checkApiframeStatus(
      params.locator,
      params.taskId,
      params.platformConfig,
      params.options,
    );
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    ensureApiframeLocator(params.locator);
    return getApiframeResult(
      params.locator,
      params.taskId,
      params.platformConfig,
      params.options,
    );
  },
  canCancelTask(): boolean {
    return false;
  },
};

export {
  checkApiframeStatus,
  createApiframeTask,
  getApiframeResult,
} from './api.ts';
export { describeApiframeResource } from './describe.ts';
export { canonicalizeApiframeLocator, parseApiframeLocator } from './locator.ts';
export { listApiframeLocatorOptions } from './model-catalog.ts';
export {
  ensureApiframeConfig,
  ensureApiframeWhitelistedLocator,
  mapApiframeStatus,
  parseApiframeResultOutputs,
  type ApiframeConfig,
  APIFRAME_DEFAULT_BASE_URL,
  APIFRAME_IMAGE_AUDIO_MAX_BYTES,
  APIFRAME_VIDEO_MAX_BYTES,
} from './helpers.ts';
