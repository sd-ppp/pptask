import { parseLocator, normalizeScheme } from './resource.ts';
import {
  registerProvider as registerProviderInternal,
  unregisterProvider,
  listProviders,
  ensureProvider,
  getProvider,
  registerUploadProvider as registerUploadProviderInternal,
  ensureUploadProvider,
  getUploadProvider,
  listUploadProviders,
} from './provider-registry.ts';
import {
  replicateProviderDefinition,
  replicateUploadProviderDefinition,
} from './providers/replicate/index.ts';
import {
  runninghubProviderDefinition,
  runninghubUploadProviderDefinition,
} from './providers/runninghub/index.ts';
import type {
  DescribeParams,
  DescribeResult,
  TaskCreateParams,
  TaskCreateResult,
  TaskCheckParams,
  TaskStatusResult,
  TaskResultParams,
  TaskResult,
  UploadParams,
  UploadResult,
  ProviderDefinition,
  UploadProviderDefinition,
} from './types.ts';

export * from './types.ts';
export * from './providers/replicate/index.ts';
export * from './providers/runninghub/index.ts';
export * from './resource.ts';
export { unregisterProvider, listProviders, getProvider };
export { listUploadProviders, getUploadProvider };

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
  return provider.createTask(params);
}

export async function checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
  const provider = resolveProvider(params.locator);
  return provider.checkStatus(params);
}

export async function getResult(params: TaskResultParams): Promise<TaskResult> {
  const provider = resolveProvider(params.locator);
  return provider.getResult(params);
}

export async function cancelTask(params: TaskCheckParams): Promise<void> {
  const provider = resolveProvider(params.locator);
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
  if (params.locator) {
    const { scheme } = parseLocator(params.locator);
    return normalizeScheme(scheme);
  }
  throw new Error('upload requires uploadProvider or locator');
}
