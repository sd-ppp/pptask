import {
  defaultProviderRegistry,
  createProviderRegistry,
  type ProviderRegistry,
} from './provider-registry.ts';
import { normalizeScheme, parseLocator } from './resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskExecutionResult,
  TaskRequestOptions,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from './types.ts';

export * from './resource.ts';
export * from './types.ts';
export { createProviderRegistry, defaultProviderRegistry } from './provider-registry.ts';
export type { ProviderRegistry } from './provider-registry.ts';

export type Pptask = ProviderRegistry & {
  describeResource(params: DescribeParams): Promise<DescribeResult>;
  createTask(params: TaskCreateParams): Promise<TaskCreateResult>;
  checkStatus(params: TaskCheckParams): Promise<TaskStatusResult>;
  getResult(params: TaskResultParams): Promise<TaskResult>;
  cancelTask(params: TaskCheckParams): Promise<void>;
  upload(params: UploadParams): Promise<UploadResult>;
};

export function createPptask(registry: ProviderRegistry = createProviderRegistry()): Pptask {
  return {
    ...registry,
    describeResource: (params) => describeResourceWith(registry, params),
    createTask: (params) => createTaskWith(registry, params),
    checkStatus: (params) => checkStatusWith(registry, params),
    getResult: (params) => getResultWith(registry, params),
    cancelTask: (params) => cancelTaskWith(registry, params),
    upload: (params) => uploadWith(registry, params),
  };
}

const defaultPptask = createPptask(defaultProviderRegistry);

export const registerProvider = defaultPptask.registerProvider;
export const unregisterProvider = defaultPptask.unregisterProvider;
export const getProvider = defaultPptask.getProvider;
export const listProviders = defaultPptask.listProviders;
export const registerUploadProvider = defaultPptask.registerUploadProvider;
export const getUploadProvider = defaultPptask.getUploadProvider;
export const listUploadProviders = defaultPptask.listUploadProviders;

export function describeResource(params: DescribeParams): Promise<DescribeResult> {
  return defaultPptask.describeResource(params);
}

export function createTask(params: TaskCreateParams): Promise<TaskCreateResult> {
  return defaultPptask.createTask(params);
}

export function checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
  return defaultPptask.checkStatus(params);
}

export function getResult(params: TaskResultParams): Promise<TaskResult> {
  return defaultPptask.getResult(params);
}

export function cancelTask(params: TaskCheckParams): Promise<void> {
  return defaultPptask.cancelTask(params);
}

export function upload(params: UploadParams): Promise<UploadResult> {
  return defaultPptask.upload(params);
}

async function describeResourceWith(registry: ProviderRegistry, params: DescribeParams): Promise<DescribeResult> {
  const provider = resolveProvider(registry, params.locator);
  return normalizeDescribeResult(params, await provider.describeResource(params));
}

async function createTaskWith(registry: ProviderRegistry, params: TaskCreateParams): Promise<TaskCreateResult> {
  const provider = resolveProvider(registry, params.locator);
  const execution = await createProviderTask(provider, params);
  if (execution.mode === 'async') return sanitizeTaskCreateResult(execution.task);

  const result = sanitizeTaskResult(execution.result);
  return {
    provider: result.provider,
    taskId: result.taskId,
    status: 'succeeded',
    result,
    metadata: { syncCompleted: true },
  };
}

async function checkStatusWith(registry: ProviderRegistry, params: TaskCheckParams): Promise<TaskStatusResult> {
  const provider = resolveProvider(registry, params.locator);
  if (!provider.checkStatus) throw new Error(`Provider does not support checkStatus: ${params.locator}`);
  return sanitizeTaskStatusResult(await provider.checkStatus(params));
}

async function getResultWith(registry: ProviderRegistry, params: TaskResultParams): Promise<TaskResult> {
  const provider = resolveProvider(registry, params.locator);
  if (!provider.getResult) throw new Error(`Provider does not support getResult: ${params.locator}`);
  return sanitizeTaskResult(await provider.getResult(params));
}

async function cancelTaskWith(registry: ProviderRegistry, params: TaskCheckParams): Promise<void> {
  const provider = resolveProvider(registry, params.locator);
  if (!provider.cancelTask) throw new Error(`Provider does not support cancelTask: ${params.locator}`);
  await provider.cancelTask(params);
}

async function uploadWith(registry: ProviderRegistry, params: UploadParams): Promise<UploadResult> {
  const provider = registry.ensureUploadProvider(normalizeScheme(params.uploadProvider));
  const result = await provider.upload(params);
  const { raw: _raw, ...safe } = result;
  return safe;
}

async function createProviderTask(provider: ProviderDefinition, params: TaskCreateParams): Promise<TaskExecutionResult> {
  if (provider.createTask) return provider.createTask(params);
  if (provider.createTaskSync) return { mode: 'sync', result: await provider.createTaskSync(params) };
  if (provider.createTaskAsync) return { mode: 'async', task: await provider.createTaskAsync(params) };
  throw new Error(`Provider has no task creation method: ${params.locator}`);
}

function sanitizeTaskCreateResult(result: TaskCreateResult): TaskCreateResult {
  const { raw: _raw, ...safe } = result;
  return safe;
}

function sanitizeTaskStatusResult(result: TaskStatusResult): TaskStatusResult {
  const { raw: _raw, ...safe } = result;
  return safe;
}

function sanitizeTaskResult(result: TaskResult): TaskResult {
  const { raw: _raw, ...safe } = result;
  return {
    ...safe,
    outputs: result.outputs.map(({ rawData: _rawData, ...output }) => output),
  };
}

function resolveProvider(registry: ProviderRegistry, locator: string): ProviderDefinition {
  return registry.ensureProvider(parseLocator(locator).scheme);
}

function normalizeDescribeResult(params: DescribeParams, result: DescribeResult): DescribeResult {
  const parsed = parseLocator(params.locator);
  const resourceId = result.resource?.id || result.metadata.resourceId || stableResourceId(params.locator);
  const resource = {
    id: resourceId,
    locator: result.resource?.locator || params.locator,
    title: result.resource?.title || result.metadata.title || result.metadata.model || resourceId,
    ...(result.resource?.description || result.metadata.description
      ? { description: result.resource?.description || result.metadata.description }
      : {}),
    ...(result.resource?.mediaKind || result.metadata.mediaKind
      ? { mediaKind: result.resource?.mediaKind || result.metadata.mediaKind }
      : {}),
    ...(result.resource?.operations || result.metadata.operations
      ? { operations: result.resource?.operations || result.metadata.operations }
      : {}),
    ...(result.resource?.revision || result.metadata.revision
      ? { revision: result.resource?.revision || result.metadata.revision }
      : {}),
  };
  return {
    ...result,
    protocolVersion: result.protocolVersion || 'pptask.describe/v1',
    schemaVersion: result.schemaVersion || '1',
    resource,
    bindings: result.bindings?.length ? result.bindings : inferBindings(result.formSchema),
    metadata: {
      ...result.metadata,
      scheme: result.metadata.scheme || parsed.scheme,
      resourceId,
      locator: params.locator,
    },
  };
}

function stableResourceId(locator: string): string {
  return locator.trim();
}

function inferBindings(schema: DescribeResult['formSchema']): DescribeResult['bindings'] {
  return Object.entries(schema.properties).flatMap(([field, definition]) => {
    const semantic = definition['x-pptask-semantic'] || definition['x-task-role'];
    if (semantic === 'prompt' || semantic === 'reference-image' || semantic === 'reference-video' || semantic === 'reference-audio') {
      return [{ field, semantic }];
    }
    const lower = field.toLowerCase();
    if (lower === 'prompt' || lower === 'text' || lower === 'input') return [{ field, semantic: 'prompt' as const }];
    if (lower.includes('video')) return [{ field, semantic: 'reference-video' as const }];
    if (lower.includes('image') || lower === 'urls' || lower === 'images') return [{ field, semantic: 'reference-image' as const }];
    return [];
  });
}
