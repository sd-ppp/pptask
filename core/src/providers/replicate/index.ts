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
  UploadResult,
  UploadProviderDefinition,
} from '../../types.ts';
import {
  cancelReplicateTask,
  checkReplicateStatus,
  createReplicateTask,
  describeReplicate,
  getReplicateResult,
} from './api.ts';
import { uploadReplicateFile } from '../../upload-providers/replicate.ts';

const REPLICATE_SCHEME = 'replicate';

function ensureReplicateUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== REPLICATE_SCHEME) {
    throw new Error(`replicate provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const replicateProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureReplicateUrl(params.locator);
    return describeReplicate(url, params.platformConfig, params.options);
  },
  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    const url = ensureReplicateUrl(params.locator);
    return createReplicateTask(url, params.payload ?? {}, params.platformConfig, params.options);
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    const url = ensureReplicateUrl(params.locator);
    return checkReplicateStatus(url, params.taskId, params.platformConfig, params.options);
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    const url = ensureReplicateUrl(params.locator);
    return getReplicateResult(url, params.taskId, params.platformConfig, params.options);
  },
  async cancelTask(params: TaskCheckParams): Promise<void> {
    const url = ensureReplicateUrl(params.locator);
    await cancelReplicateTask(url, params.taskId, params.platformConfig, params.options);
  },
};

export const replicateUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadReplicateFile(params.formData, params.platformConfig, params.options);
  },
};

export {
  cancelReplicateTask,
  checkReplicateStatus,
  createReplicateTask,
  describeReplicate,
  getReplicateResult,
} from './api.ts';
export { uploadReplicateFile } from '../../upload-providers/replicate.ts';

export {
  createAbortError as createReplicateAbortError,
  ensureReplicateConfig,
  parseReplicateModel,
  type ReplicateConfig,
} from './helpers.ts';
