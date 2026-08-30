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
} from './providers/replicate/index.ts';
import {
  replicateUploadProviderDefinition,
} from './upload-providers/replicate/index.ts';
import {
  runninghubProviderDefinition,
} from './providers/runninghub/index.ts';
import {
  runninghubUploadProviderDefinition,
} from './upload-providers/runninghub/index.ts';
import {
  grsaiProviderDefinition,
} from './providers/grsai/index.ts';
import {
  grsaiUploadProviderDefinition,
} from './upload-providers/grsai/index.ts';
import {
  geminiProviderDefinition,
} from './providers/gemini/index.ts';
import {
  openaiProviderDefinition,
} from './providers/openai/index.ts';
import {
  ppioProviderDefinition,
} from './providers/ppio/index.ts';
import {
  arkProviderDefinition,
} from './providers/ark/index.ts';
import {
  novitaProviderDefinition,
} from './providers/novita/index.ts';
import {
  comfyProviderDefinition,
  comfyUploadProviderDefinition,
} from './providers/comfy/index.ts';
import {
  kieProviderDefinition,
} from './providers/kie/index.ts';
import {
  apiframeProviderDefinition,
} from './providers/apiframe/index.ts';
import {
  kieUploadProviderDefinition,
} from './upload-providers/kie/index.ts';
import {
  apiframeUploadProviderDefinition,
} from './upload-providers/apiframe/index.ts';
import { normalizeScheme, parseLocator } from './resource.ts';
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
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from './types.ts';

export * from './providers/replicate/index.ts';
export * from './providers/runninghub/index.ts';
export * from './providers/grsai/index.ts';
export * from './providers/gemini/index.ts';
export * from './providers/openai/index.ts';
export * from './providers/ppio/index.ts';
export * from './providers/ark/index.ts';
export * from './providers/novita/index.ts';
export * from './providers/comfy/index.ts';
export * from './providers/kie/index.ts';
export * from './providers/apiframe/index.ts';
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
  if (!getUploadProvider('grsai')) {
    registerUploadProviderInternal('grsai', grsaiUploadProviderDefinition);
  }
  if (!getProvider('gemini')) {
    registerProviderInternal('gemini', geminiProviderDefinition);
  }
  if (!getProvider('openai')) {
    registerProviderInternal('openai', openaiProviderDefinition);
  }
  if (!getProvider('ppio')) {
    registerProviderInternal('ppio', ppioProviderDefinition);
  }
  if (!getProvider('ark')) {
    registerProviderInternal('ark', arkProviderDefinition);
  }
  if (!getProvider('novita')) {
    registerProviderInternal('novita', novitaProviderDefinition);
  }
  if (!getProvider('comfy-http')) {
    registerProviderInternal('comfy-http', comfyProviderDefinition);
  }
  if (!getProvider('comfy-https')) {
    registerProviderInternal('comfy-https', comfyProviderDefinition);
  }
  if (!getUploadProvider('comfy-http')) {
    registerUploadProviderInternal('comfy-http', comfyUploadProviderDefinition);
  }
  if (!getUploadProvider('comfy-https')) {
    registerUploadProviderInternal('comfy-https', comfyUploadProviderDefinition);
  }
  if (!getProvider('kie')) {
    registerProviderInternal('kie', kieProviderDefinition);
  }
  if (!getUploadProvider('kie')) {
    registerUploadProviderInternal('kie', kieUploadProviderDefinition);
  }
  if (!getProvider('apiframe')) {
    registerProviderInternal('apiframe', apiframeProviderDefinition);
  }
  if (!getUploadProvider('apiframe')) {
    registerUploadProviderInternal('apiframe', apiframeUploadProviderDefinition);
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
  let execution: TaskExecutionResult;
  if (provider.createTask) {
    execution = await provider.createTask(params);
  } else if (provider.createTaskSync) {
    execution = { mode: 'sync', result: await provider.createTaskSync(params) };
  } else if (provider.createTaskAsync) {
    execution = { mode: 'async', task: await provider.createTaskAsync(params) };
  } else {
    throw new Error(`Provider has no task creation method: ${params.locator}`);
  }

  if (execution.mode === 'sync') {
    const result = execution.result;
    return {
      provider: result.provider,
      taskId: result.taskId,
      status: result.status,
      raw: result.raw,
      metadata: { syncCompleted: true, outputs: result.outputs },
    };
  }

  return execution.task;
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
