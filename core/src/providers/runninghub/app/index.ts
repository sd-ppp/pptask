import type {
  DescribeParams,
  DescribeResult,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
  UploadParams,
  UploadResult,
  UploadProviderDefinition,
} from '../../../types.ts';
import {
  cancelRunninghubTask,
  checkRunninghubStatus,
  createRunninghubTask,
  describeRunninghub,
  getRunninghubResult,
} from './api.ts';
import { uploadRunninghubFile } from '../../../upload-providers/runninghub.ts';

// ========== 旧 API (runninghub://app/) 的 Provider 实现 ==========

export async function describeResource(params: DescribeParams): Promise<DescribeResult> {
  const url = new URL(params.locator);
  return describeRunninghub(url, params.platformConfig, params.options);
}

export async function createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
  const url = new URL(params.locator);
  return createRunninghubTask(
    url,
    params.payload ?? {},
    params.platformConfig,
    params.options
  );
}

export async function checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
  const url = new URL(params.locator);
  return checkRunninghubStatus(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}

export async function getResult(params: TaskResultParams): Promise<TaskResult> {
  const url = new URL(params.locator);
  return getRunninghubResult(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}

export async function cancelTask(params: TaskCheckParams): Promise<void> {
  const url = new URL(params.locator);
  return cancelRunninghubTask(
    url,
    params.taskId,
    params.platformConfig,
    params.options
  );
}

// 上传 provider
export const runninghubUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadRunninghubFile(
      params.formData,
      params.platformConfig,
      params.options
    );
  },
};
