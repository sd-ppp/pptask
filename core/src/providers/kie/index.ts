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
  checkKieStatus,
  createKieTask,
  getKieResult,
} from './api.ts';
import { describeKieResource } from './describe.ts';

const KIE_SCHEME = 'kie';

function ensureKieLocator(locator: string): void {
  const { scheme } = parseLocator(locator);
  if (scheme !== KIE_SCHEME) {
    throw new Error(`kie provider received unsupported locator: ${locator}`);
  }
}

export const kieProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    ensureKieLocator(params.locator);
    return describeKieResource(params);
  },
  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    ensureKieLocator(params.locator);
    return createKieTask(
      params.locator,
      params.payload ?? {},
      params.platformConfig,
      params.options,
    );
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    ensureKieLocator(params.locator);
    return checkKieStatus(
      params.locator,
      params.taskId,
      params.platformConfig,
      params.options,
    );
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    ensureKieLocator(params.locator);
    return getKieResult(
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
  checkKieStatus,
  createKieTask,
  getKieResult,
} from './api.ts';
export { describeKieResource } from './describe.ts';
export { canonicalizeKieLocator, parseKieLocator } from './locator.ts';
export { listKieLocatorOptions } from './model-catalog.ts';
export {
  ensureKieConfig,
  ensureKieWhitelistedLocator,
  mapKieState,
  parseKieResultOutputs,
  type KieConfig,
} from './helpers.ts';
