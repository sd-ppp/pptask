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
  cancelGrsaiTask,
  checkGrsaiStatus,
  createGrsaiTask,
  describeGrsai,
  getGrsaiResult,
} from './api.ts';

const GRSAI_SCHEME = 'grsai';

function ensureGrsaiUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== GRSAI_SCHEME) {
    throw new Error(`grsai provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const grsaiProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureGrsaiUrl(params.locator);
    return describeGrsai(url, params.platformConfig, params.options);
  },
  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    const url = ensureGrsaiUrl(params.locator);
    return createGrsaiTask(url, params.payload ?? {}, params.platformConfig, params.options);
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    const url = ensureGrsaiUrl(params.locator);
    return checkGrsaiStatus(url, params.taskId, params.platformConfig, params.options);
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    const url = ensureGrsaiUrl(params.locator);
    return getGrsaiResult(url, params.taskId, params.platformConfig, params.options);
  },
  async cancelTask(params: TaskCheckParams): Promise<void> {
    const url = ensureGrsaiUrl(params.locator);
    await cancelGrsaiTask(url, params.taskId, params.platformConfig, params.options);
  },
};

export {
  cancelGrsaiTask,
  checkGrsaiStatus,
  createGrsaiTask,
  describeGrsai,
  getGrsaiResult,
} from './api.ts';

export {
  ensureGrsaiConfig,
  parseGrsaiModel,
  type GrsaiConfig,
} from './helpers.ts';
