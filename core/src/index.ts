import {
  ensureProvider,
  ensureUploadProvider,
  getProvider,
  getUploadProvider,
  listProviders,
  listUploadProviders,
  registerProvider as registerProviderInternal,
  registerUploadProvider as registerUploadProviderInternal,
  unregisterProvider,
} from './provider-registry.ts';
import {
  replicateProviderDefinition,
  replicateUploadProviderDefinition,
} from './providers/replicate/index.ts';
import {
  runninghubProviderDefinition,
  runninghubUploadProviderDefinition,
} from './providers/runninghub/index.ts';
import {
  grsaiProviderDefinition,
} from './providers/grsai/index.ts';
import {
  geminiProviderDefinition,
} from './providers/gemini/index.ts';
import {
  openaiProviderDefinition,
} from './providers/openai/index.ts';
import { normalizeScheme, parseLocator } from './resource.ts';
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
} from './types.ts';

export * from './providers/replicate/index.ts';
export * from './providers/runninghub/index.ts';
export * from './providers/grsai/index.ts';
export * from './providers/gemini/index.ts';
export * from './providers/openai/index.ts';
export * from './resource.ts';
export * from './types.ts';
export { getProvider, getUploadProvider, listProviders, listUploadProviders, unregisterProvider };

function ensureDefaultProvidersRegistered(): void {
  if (!getProvider('replicate')) {
    registerProviderInternal('replicate', replicateProviderDefinition);
  }
  if (!getUploadProvider('replicate')) {
    registerUploadProviderInternal('replicate', replicateUploadProviderDefinition);
  }
  if (!getProvider('runninghub')) {
    registerProviderInternal('runninghub', runninghubProviderDefinition);
  }
  if (!getUploadProvider('runninghub')) {
    registerUploadProviderInternal('runninghub', runninghubUploadProviderDefinition);
  }
  if (!getProvider('grsai')) {
    registerProviderInternal('grsai', grsaiProviderDefinition);
  }
  if (!getProvider('gemini')) {
    registerProviderInternal('gemini', geminiProviderDefinition);
  }
  if (!getProvider('openai')) {
    registerProviderInternal('openai', openaiProviderDefinition);
  }
}

ensureDefaultProvidersRegistered();

export function registerProvider(scheme: string, definition: ProviderDefinition) {
  registerProviderInternal(scheme, definition);
}

export function registerUploadProvider(scheme: string, definition: UploadProviderDefinition) {
  registerUploadProviderInternal(scheme, definition);
}

export async function describeResource(params: DescribeParams): Promise<DescribeResult> {
  const provider = resolveProvider(params.locator);
  return provider.describeResource(params);
}

export async function createTask(params: TaskCreateParams): Promise<TaskCreateResult> {
  const provider = resolveProvider(params.locator);
  
  // Prioritize sync execution, but createTask expects async result
  if (provider.createTaskSync) {
    // Sync provider: execute and return as a completed task
    const result = await provider.createTaskSync(params);
    return {
      provider: result.provider,
      taskId: result.taskId,
      status: result.status,
      raw: result.raw,
      metadata: { syncCompleted: true, outputs: result.outputs },
    };
  } else if (provider.createTaskAsync) {
    return provider.createTaskAsync(params);
  } else {
    throw new Error(`Provider has no task creation method: ${params.locator}`);
  }
}

export async function checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
  const provider = resolveProvider(params.locator);
  if (!provider.checkStatus) {
    throw new Error(`Provider does not support checkStatus: ${params.locator}`);
  }
  return provider.checkStatus(params);
}

export async function getResult(params: TaskResultParams): Promise<TaskResult> {
  const provider = resolveProvider(params.locator);
  if (!provider.getResult) {
    throw new Error(`Provider does not support getResult: ${params.locator}`);
  }
  return provider.getResult(params);
}

export async function cancelTask(params: TaskCheckParams): Promise<void> {
  const provider = resolveProvider(params.locator);
  if (!provider.cancelTask) {
    throw new Error(`Provider does not support cancelTask: ${params.locator}`);
  }
  await provider.cancelTask(params);
}

export async function upload(params: UploadParams): Promise<UploadResult> {
  const uploadProviderName = resolveUploadProviderName(params);
  const provider = ensureUploadProvider(uploadProviderName);
  return provider.upload(params);
}

function resolveProvider(locator: string) {
  const { scheme } = parseLocator(locator);
  return ensureProvider(scheme);
}

function resolveUploadProviderName(params: UploadParams): string {
  if (params.uploadProvider) {
    return normalizeScheme(params.uploadProvider);
  }
  throw new Error('upload requires uploadProvider');
}
