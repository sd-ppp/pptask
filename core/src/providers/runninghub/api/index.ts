import type {
  DescribeParams,
  DescribeResult,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
} from '../../../types.ts';
import {
  cancelRunninghubApiTask,
  checkRunninghubApiStatus,
  createRunninghubApiTask,
  describeRunninghubApi,
  getRunninghubApiResult,
} from './api.ts';

// ========== 新 API (runninghub://api/) 的 Provider 实现 ==========

export async function describeResource(params: DescribeParams): Promise<DescribeResult> {
  const url = new URL(params.locator);
  return describeRunninghubApi(url, params.platformConfig, params.options);
}

export async function createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
  const url = new URL(params.locator);
  return createRunninghubApiTask(
    url,
    params.payload ?? {},
    params.platformConfig,
    params.options
  );
}

export async function checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
  const url = new URL(params.locator);
  return checkRunninghubApiStatus(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}

export async function getResult(params: TaskResultParams): Promise<TaskResult> {
  const url = new URL(params.locator);
  return getRunninghubApiResult(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}

export async function cancelTask(params: TaskCheckParams): Promise<void> {
  const url = new URL(params.locator);
  return cancelRunninghubApiTask(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}
