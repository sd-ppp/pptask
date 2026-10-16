import type {
  PptaskDescription,
  PptaskJobHandle,
  PptaskJobRecord,
  PptaskModelType,
  PptaskProvider,
} from '../core/types.ts';
import {
  getProvider,
  upload,
  type DescribeResult,
  type PlatformConfig,
  type ProviderDefinition,
  type Reporter,
  type TaskExecutionResult,
  type TaskResult,
  type TaskStatus,
} from './legacy.ts';
import {
  createBuiltinProvider,
  inferModelType,
  parseLocator,
  resolveModel,
  toAbortSignal,
  toModelInput,
} from './providers.ts';

export type SignalLike = AbortSignal | { aborted?: boolean } | undefined;
export type TaskRunReporter = Reporter;

export type RunOptions = {
  signal?: SignalLike;
  context?: Record<string, any>;
  reporter?: Reporter;
  metadata?: Record<string, unknown>;
};

export type ExecutionOptions = RunOptions;
export type PlatformConfigSource =
  | PlatformConfig
  | ((locator: string) => PlatformConfig | undefined);

export type InlineExecutorConfig = {
  platformConfig?: PlatformConfigSource;
};

export type DescribeParams = { locator: string; options?: RunOptions };
export type RunParams = {
  locator: string;
  payload?: Record<string, any>;
  options?: RunOptions;
};
export type UploadParams = {
  locator?: string;
  uploadProvider: string;
  formData: FormData;
  options?: RunOptions;
};

export interface TaskHandle<T = TaskResult> {
  taskId: string;
  promise: Promise<T>;
  cancelable: boolean;
  cancel: () => Promise<void>;
}

export interface InlineExecutor {
  describe(params: DescribeParams): Promise<DescribeResult>;
  run(params: RunParams): Promise<TaskHandle<TaskResult>>;
  upload(params: UploadParams): Promise<string>;
}

export type TaskEvent =
  | { type: 'created'; taskId: string; cancelable: boolean; metadata?: any }
  | { type: 'progress'; taskId: string; progress?: number; status: string; metadata?: any }
  | { type: 'completed'; taskId: string; result: TaskResult }
  | { type: 'failed'; taskId: string; error: string }
  | { type: 'cancelled'; taskId: string };

export function createInlineExecutor(config: InlineExecutorConfig = {}): InlineExecutor {
  return {
    async describe({ locator, options }) {
      const platformConfig = resolveConfig(config.platformConfig, locator);
      const registered = getProvider(parseLocator(locator).scheme);
      if (registered) return describeRegistered(registered, locator, platformConfig, options);
      return describeBuiltin(locator, platformConfig);
    },
    async run({ locator, payload = {}, options }) {
      const platformConfig = resolveConfig(config.platformConfig, locator);
      const registered = getProvider(parseLocator(locator).scheme);
      if (registered) return runRegistered(registered, locator, payload, platformConfig, options);
      return runBuiltin(locator, payload, platformConfig, options);
    },
    async upload({ locator, uploadProvider, formData, options }) {
      const platformConfig = resolveUploadConfig(
        config.platformConfig,
        locator,
        uploadProvider,
      );
      const result = await upload({
        locator,
        uploadProvider,
        formData,
        platformConfig,
        options: { signal: options?.signal },
      });
      return result.url;
    },
  };
}

async function describeRegistered(
  provider: ProviderDefinition,
  locator: string,
  platformConfig: PlatformConfig | undefined,
  options?: RunOptions,
): Promise<DescribeResult> {
  if (!provider.describeResource) {
    throw new Error(`Provider does not support describeResource: ${locator}`);
  }
  return provider.describeResource({
    locator,
    platformConfig,
    options: { signal: options?.signal },
  });
}

async function describeBuiltin(
  locator: string,
  platformConfig: PlatformConfig | undefined,
): Promise<DescribeResult> {
  const parsed = parseLocator(locator);
  const provider = createBuiltinProvider(parsed.scheme, platformConfig);
  const modelType = inferModelType(locator);
  const model = resolveModel(provider, parsed.modelId, modelType);
  const description = await provider.describe(model);
  return legacyDescription(locator, description);
}

async function runRegistered(
  provider: ProviderDefinition,
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  options?: RunOptions,
): Promise<TaskHandle<TaskResult>> {
  const params = {
    locator,
    payload,
    platformConfig,
    options: {
      signal: options?.signal,
      reporter: options?.reporter,
      metadata: options?.metadata,
    },
  };
  let execution: TaskExecutionResult;
  if (provider.createTask) execution = await provider.createTask(params);
  else if (provider.createTaskSync) {
    execution = { mode: 'sync', result: await provider.createTaskSync(params) };
  } else if (provider.createTaskAsync) {
    execution = { mode: 'async', task: await provider.createTaskAsync(params) };
  } else {
    throw new Error(`Provider does not support task creation: ${locator}`);
  }
  if (execution.mode === 'sync') {
    const taskId = execution.result.taskId || `sync-${Date.now()}`;
    options?.reporter?.onStart?.(taskId, { mode: 'sync' });
    options?.reporter?.onFinish?.(taskId, 'completed');
    return {
      taskId,
      promise: Promise.resolve(execution.result),
      cancelable: false,
      cancel: async () => {},
    };
  }
  return registeredAsyncHandle(
    provider,
    locator,
    execution.task.taskId,
    platformConfig,
    options,
    execution.task.metadata,
  );
}

async function registeredAsyncHandle(
  provider: ProviderDefinition,
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: RunOptions,
  metadata?: Record<string, any>,
): Promise<TaskHandle<TaskResult>> {
  options?.reporter?.onStart?.(taskId, metadata);
  const signal = toAbortSignal(options?.signal);
  const promise = (async () => {
    try {
      while (true) {
        throwIfAborted(options?.signal);
        if (!provider.checkStatus || !provider.getResult) {
          throw new Error(`Provider does not support asynchronous polling: ${locator}`);
        }
        const status = await provider.checkStatus({
          locator,
          taskId,
          platformConfig,
          options: { signal },
        });
        options?.reporter?.onProgress?.(
          taskId,
          status.progress ?? 0,
          status.status,
        );
        if (status.status === 'succeeded') {
          const result = await provider.getResult({
            locator,
            taskId,
            platformConfig,
            options: { signal },
          });
          options?.reporter?.onFinish?.(taskId, 'completed');
          return result;
        }
        if (status.status === 'failed' || status.status === 'cancelled') {
          throw taskError(taskId, status.status, status.raw);
        }
        await delay(1000, signal);
      }
    } catch (error) {
      const cancelled = isAbortError(error) || Boolean(options?.signal?.aborted);
      options?.reporter?.onFinish?.(
        taskId,
        cancelled ? 'cancelled' : 'failed',
        errorMessage(error),
      );
      throw error;
    }
  })();
  return {
    taskId,
    promise,
    cancelable: canCancel(provider, locator),
    cancel: async () => {
      if (!provider.cancelTask) return;
      await provider.cancelTask({ locator, taskId, platformConfig });
    },
  };
}

async function runBuiltin(
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  options?: RunOptions,
): Promise<TaskHandle<TaskResult>> {
  const parsed = parseLocator(locator);
  const provider = createBuiltinProvider(parsed.scheme, platformConfig);
  const modelType = inferModelType(locator, payload);
  const model = resolveModel(provider, parsed.modelId, modelType);
  const signal = toAbortSignal(options?.signal);
  const job = await provider.jobs.start({
    model,
    input: toModelInput(parsed.scheme, modelType, payload, signal),
    metadata: options?.metadata ?? options?.context,
  });
  const taskId = operationTaskId(job.record.operation) ?? job.id;
  const cancelable = Boolean(model.doCancel && job.record.operation);
  const cleanupAbort = bridgeAbortToBuiltinCancel(job, signal, cancelable);
  options?.reporter?.onStart?.(taskId, {
    pptaskJobId: job.id,
    operation: job.record.operation,
  });
  return {
    taskId,
    cancelable,
    cancel: async () => {
      if (!cancelable) return;
      await job.cancel();
    },
    promise: watchBuiltin(provider, job, parsed.scheme, taskId, modelType, options)
      .finally(cleanupAbort),
  };
}

function bridgeAbortToBuiltinCancel(
  job: PptaskJobHandle,
  signal: AbortSignal | undefined,
  cancelable: boolean,
): () => Promise<void> {
  let cancellation: Promise<void> | undefined;
  const cancel = () => {
    if (!cancelable) return;
    cancellation ??= job.cancel().catch(() => undefined);
  };
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  return async () => {
    signal?.removeEventListener('abort', cancel);
    await cancellation;
  };
}

async function watchBuiltin(
  provider: PptaskProvider,
  job: PptaskJobHandle,
  scheme: string,
  taskId: string,
  modelType: PptaskModelType,
  options?: RunOptions,
): Promise<TaskResult> {
  try {
    for await (const event of job.watch({ signal: toAbortSignal(options?.signal) })) {
      const record = event.job;
      if (record.state === 'pending' || record.state === 'running') {
        options?.reporter?.onProgress?.(
          taskId,
          record.progress ?? 0,
          record.state,
        );
        continue;
      }
      if (record.state === 'failed') {
        throw new Error(record.error?.message ?? `Pptask job failed: ${job.id}`);
      }
      if (record.state === 'cancelled') throw abortError(`Pptask job cancelled: ${job.id}`);
      if (record.state === 'succeeded') {
        const result = toLegacyResult(scheme, taskId, modelType, record);
        options?.reporter?.onFinish?.(taskId, 'completed');
        return result;
      }
    }
    throw new Error(`Pptask job ended without a result: ${job.id}`);
  } catch (error) {
    const cancelled = isAbortError(error) || Boolean(options?.signal?.aborted);
    options?.reporter?.onFinish?.(
      taskId,
      cancelled ? 'cancelled' : 'failed',
      errorMessage(error),
    );
    throw error;
  }
}

function toLegacyResult(
  scheme: string,
  taskId: string,
  modelType: PptaskModelType,
  record: PptaskJobRecord,
): TaskResult {
  const result = (record.result ?? {}) as Record<string, any>;
  const outputs = mediaOutputs(scheme, modelType, result);
  return {
    provider: scheme,
    taskId,
    status: 'succeeded',
    outputs,
    usage: normalizeUsage(result.usage ?? result.providerMetadata?.[scheme]?.usage),
  };
}

function mediaOutputs(
  scheme: string,
  modelType: PptaskModelType,
  result: Record<string, any>,
): Array<Record<string, any>> {
  const metadata = result.providerMetadata?.[scheme];
  const urls = metadataUrls(metadata);
  if (urls.length) return urls.map(url => ({ url }));
  if (modelType === 'video' && Array.isArray(result.videos)) {
    return result.videos.flatMap((video: any): Array<Record<string, any>> => {
      if (video?.type === 'url' && typeof video.url === 'string') return [{ url: video.url }];
      if (video?.type === 'base64' && typeof video.data === 'string') {
        return [{ data: video.data, mediaType: video.mediaType }];
      }
      return [];
    });
  }
  if (modelType === 'language') {
    const text = Array.isArray(result.content)
      ? result.content.filter((part: any) => part?.type === 'text').map((part: any) => part.text).join('')
      : result.text;
    return typeof text === 'string' ? [{ text }] : [];
  }
  if (Array.isArray(result.images)) {
    return result.images.flatMap((image: unknown) => {
      if (typeof image === 'string' && !image.startsWith('data:')) return [{ url: image }];
      return [];
    });
  }
  return [];
}

function metadataUrls(metadata: any): string[] {
  const values = [metadata?.images, metadata?.videos, metadata?.outputs, metadata?.result];
  const urls: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      urls.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    for (const key of ['url', 'uri', 'video_url', 'image_url']) visit(record[key]);
  };
  values.forEach(visit);
  return [...new Set(urls)];
}

function legacyDescription(locator: string, description: PptaskDescription): DescribeResult {
  const schema = description.inputSchema ?? { type: 'object', properties: {} };
  const properties =
    schema.properties && typeof schema.properties === 'object'
      ? schema.properties as Record<string, Record<string, any>>
      : {};
  return {
    provider: description.providerId,
    protocolVersion: 'pptask.describe/v1',
    schemaVersion: '1',
    metadata: {
      scheme: description.providerId,
      model: description.modelId,
      title: description.title,
      description: description.description,
      capabilities: description.capabilities,
      providerMetadata: description.providerMetadata,
      locator,
    },
    resource: {
      id: locator,
      locator,
      title: description.title ?? description.modelId,
      description: description.description,
      mediaKind: description.modelType,
    },
    formSchema: {
      ...schema,
      type: 'object',
      properties,
    },
    formValues: description.defaultInput ?? {},
    recommendUploadProvider:
      description.capabilities?.upload === true ? description.providerId : undefined,
    cancelable: description.capabilities?.cancel === true,
  };
}

function resolveConfig(
  source: PlatformConfigSource | undefined,
  locator: string,
): PlatformConfig | undefined {
  const value = typeof source === 'function' ? source(locator) : source;
  return value ? { ...value } : undefined;
}

function resolveUploadConfig(
  source: PlatformConfigSource | undefined,
  locator: string | undefined,
  uploadProvider: string,
): PlatformConfig | undefined {
  return resolveConfig(source, locator ?? `${uploadProvider}://__upload`);
}

function operationTaskId(operation: unknown): string | undefined {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return undefined;
  const value = operation as Record<string, unknown>;
  for (const key of ['taskId', 'task_id', 'predictionId', 'id', 'name']) {
    if (typeof value[key] === 'string' && value[key]) return value[key];
  }
  return undefined;
}

function normalizeUsage(value: unknown): TaskResult['usage'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const entries = Object.entries(source).flatMap(([key, item]) =>
    typeof item === 'number' && Number.isFinite(item) ? [[key, item] as const] : [],
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function canCancel(provider: ProviderDefinition, locator: string): boolean {
  if (provider.canCancelTask) return provider.canCancelTask({ locator });
  return Boolean(provider.cancelTask);
}

function taskError(taskId: string, status: TaskStatus, raw: unknown): Error {
  const detail = raw && typeof raw === 'object'
    ? (raw as any).error ?? (raw as any).failure_reason ?? (raw as any).message
    : undefined;
  return new Error(`${detail ?? `Task ${status}`} (taskId=${taskId}, status=${status})`);
}

function throwIfAborted(signal: SignalLike): void {
  if (signal?.aborted) throw abortError('Task aborted');
}

function abortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(abortError('Task aborted'));
    }, { once: true });
  });
}

export async function* createTaskHandleStream(
  locator: string,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: RunOptions,
): AsyncGenerator<TaskEvent, TaskResult | void, void> {
  const handle = await createInlineExecutor({ platformConfig }).run({ locator, payload, options });
  yield { type: 'created', taskId: handle.taskId, cancelable: handle.cancelable };
  try {
    const result = await handle.promise;
    yield { type: 'completed', taskId: handle.taskId, result };
    return result;
  } catch (error) {
    if (isAbortError(error)) {
      yield { type: 'cancelled', taskId: handle.taskId };
    } else {
      yield { type: 'failed', taskId: handle.taskId, error: errorMessage(error) };
    }
    throw error;
  }
}

export { runBuiltin as createTaskHandle };
