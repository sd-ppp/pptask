import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskExecutionResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
  UploadProviderDefinition,
} from '../../types.ts';

// 导入两套实现
import * as appImpl from './app/index.ts';
import * as apiImpl from './api/index.ts';

const RUNNINGHUB_SCHEME = 'runninghub';

/**
 * 根据 locator 的 hostname 获取对应的实现
 * - runninghub://app/ -> 旧 API 实现
 * - runninghub://api/ -> 新 API 实现
 */
function getImplementation(locator: string) {
  const { scheme, url } = parseLocator(locator);
  
  if (scheme !== RUNNINGHUB_SCHEME) {
    throw new Error(`runninghub provider received unsupported locator: ${locator}`);
  }
  
  if (url.hostname === 'app') {
    return appImpl;
  } else if (url.hostname === 'api') {
    return apiImpl;
  }
  
  throw new Error(
    `Invalid runninghub hostname: ${url.hostname}. ` +
    `Expected 'app' or 'api'. ` +
    `Format: runninghub://app/webapp-id or runninghub://api/model-path`
  );
}

// ========== Provider 定义 (路由层) ==========

export const runninghubProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const impl = getImplementation(params.locator);
    return impl.describeResource(params);
  },

  async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
    const impl = getImplementation(params.locator);
    const task = await impl.createTaskAsync(params);
    return { mode: 'async', task };
  },

  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    const impl = getImplementation(params.locator);
    return impl.createTaskAsync(params);
  },

  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    const impl = getImplementation(params.locator);
    return impl.checkStatus(params);
  },

  async getResult(params: TaskResultParams): Promise<TaskResult> {
    const impl = getImplementation(params.locator);
    return impl.getResult(params);
  },

  async cancelTask(params: TaskCheckParams): Promise<void> {
    const impl = getImplementation(params.locator);
    return impl.cancelTask(params);
  },

  // The legacy `runninghub://app/` API supports a real remote cancel
  // endpoint; the newer `runninghub://api/` API does not (see
  // api/api.ts:cancelRunninghubApiTask, which always throws "not yet
  // implemented"). Report capability per-locator instead of hardcoding a
  // single true/false for the whole `runninghub` scheme.
  canCancelTask(params: { locator: string }): boolean {
    const { url } = parseLocator(params.locator);
    return url.hostname === 'app';
  },
};

// 上传 provider (使用旧 API 的实现)
export const runninghubUploadProviderDefinition: UploadProviderDefinition = appImpl.runninghubUploadProviderDefinition;

// 导出旧 API 的函数和类型 (保持向后兼容)
export {
  cancelRunninghubTask,
  checkRunninghubStatus,
  createRunninghubTask,
  describeRunninghub,
  getRunninghubResult,
} from './app/api.ts';
export { uploadRunninghubFile } from '../../upload-providers/runninghub.ts';

export {
  parseRunninghubWebappId,
  ensureRunninghubConfig,
  fetchRunninghubTemplate,
  buildRunninghubPayload,
  createRunningHubError,
  type RunningHubConfig,
} from './app/helpers.ts';
