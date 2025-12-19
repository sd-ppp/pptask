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
} from '../../types.ts';
import {
  cancelRunninghubTask,
  checkRunninghubStatus,
  createRunninghubTask,
  describeRunninghub,
  getRunninghubResult,
  uploadRunninghubFile,
} from './api.ts';
import { parseRunninghubWebappId } from './helpers.ts';

const RUNNINGHUB_SCHEME = 'runninghub';

function ensureRunninghubUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== RUNNINGHUB_SCHEME) {
    throw new Error(`runninghub provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const runninghubProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureRunninghubUrl(params.locator);
    return describeRunninghub(url, params.platformConfig, params.options);
  },
  async createTask(params: TaskCreateParams): Promise<TaskCreateResult> {
    const url = ensureRunninghubUrl(params.locator);
    return createRunninghubTask(url, params.payload ?? {}, params.platformConfig, params.options);
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    const url = ensureRunninghubUrl(params.locator);
    return checkRunninghubStatus(url, params.taskId, params.platformConfig, params.options);
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    const url = ensureRunninghubUrl(params.locator);
    return getRunninghubResult(url, params.taskId, params.platformConfig, params.options);
  },
  async cancelTask(params: TaskCheckParams): Promise<void> {
    const url = ensureRunninghubUrl(params.locator);
    await cancelRunninghubTask(url, params.taskId, params.platformConfig, params.options);
  },
  async upload(params: UploadParams): Promise<UploadResult> {
    const url = ensureRunninghubUrl(params.locator);
    return uploadRunninghubFile(url, params.formData, params.platformConfig, params.options);
  },
};

export {
  cancelRunninghubTask,
  checkRunninghubStatus,
  createRunninghubTask,
  describeRunninghub,
  getRunninghubResult,
  uploadRunninghubFile,
} from './api.ts';

export {
  parseRunninghubWebappId,
  ensureRunninghubConfig,
  fetchRunninghubTemplate,
  buildRunninghubPayload,
  createRunningHubError,
  type RunningHubConfig,
} from './helpers.ts';
