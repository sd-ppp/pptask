import {
  checkStatus as coreCheckStatus,
  getResult as coreGetResult,
  cancelTask as coreCancelTask,
  getProvider,
} from '../../../core/src/index.ts';
import { parseLocator } from '../../../core/src/index.ts';
import type {
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResultParams,
  TaskResult,
  TaskStatusResult,
  PlatformConfig,
} from '../../../core/src/index.ts';
import type { RunOptions, TaskHandle } from './types.ts';

const DEFAULT_POLL_INTERVAL = 1000;

export type TaskClient = {
  createTaskAsync: (params: TaskCreateParams & { context?: Record<string, any> }) => Promise<TaskCreateResult>;
  checkStatus: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<TaskStatusResult>;
  getResult: (params: TaskResultParams & { context?: Record<string, any> }) => Promise<TaskResult>;
  cancelTask: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<void>;
};

const localClient: TaskClient = {
  createTaskAsync: async ({ context: _ctx, ...params }) => {
    const provider = getProvider(parseLocator(params.locator).scheme);
    if (!provider) {
      throw new Error(`Provider not found for locator: ${params.locator}`);
    }
    if (!provider.createTaskAsync) {
      throw new Error(`Provider does not support async execution: ${params.locator}`);
    }
    return provider.createTaskAsync(params);
  },
  checkStatus: ({ context: _ctx, ...params }) => coreCheckStatus(params),
  getResult: ({ context: _ctx, ...params }) => coreGetResult(params),
  cancelTask: ({ context: _ctx, ...params }) => coreCancelTask(params),
};

export async function createTaskHandle(
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  runOptions: RunOptions | undefined,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL,
  client: TaskClient = localClient
): Promise<TaskHandle<TaskResult>> {
  const taskOptions = toTaskRequestOptions(runOptions);
  const context = runOptions?.context;
  
  // Check if provider supports sync execution (prioritize sync)
  const { scheme } = parseLocator(locator);
  const provider = getProvider(scheme);
  
  if (provider?.createTaskSync) {
    // Synchronous execution path
    return createSyncTaskHandle(
      provider,
      locator,
      payload,
      platformConfig,
      taskOptions,
      runOptions
    );
  } else {
    // Asynchronous execution path (original logic)
    return createAsyncTaskHandle(
      locator,
      payload,
      platformConfig,
      taskOptions,
      runOptions,
      pollIntervalMs,
      client,
      context
    );
  }
}

function toTaskRequestOptions(options?: RunOptions): TaskRequestOptions | undefined {
  if (!options) return undefined;
  if (!options.signal) return undefined;
  return {
    signal: options.signal,
  };
}

// Synchronous task execution
async function createSyncTaskHandle(
  provider: any,
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  taskOptions: TaskRequestOptions | undefined,
  runOptions: RunOptions | undefined
): Promise<TaskHandle<TaskResult>> {
  const syncTaskId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  runOptions?.reporter?.onStart?.(syncTaskId, { mode: 'sync' });
  
  const promise = (async () => {
    try {
      throwIfAborted(taskOptions?.signal);
      
      const result = await provider.createTaskSync({
        locator,
        payload,
        platformConfig,
        options: taskOptions,
      });
      
      runOptions?.reporter?.onFinish?.(syncTaskId, 'completed');
      return result; // Return full TaskResult
    } catch (err: any) {
      if (isAbortError(err)) {
        runOptions?.reporter?.onFinish?.(syncTaskId, 'cancelled', err.message);
      } else {
        // 尝试从 err.statusResult 提取错误信息
        let errorMessage = err?.message || 'Task failed';
        if ((err as any).statusResult?.raw) {
          const raw = (err as any).statusResult.raw;
          // 尝试提取错误详情
          if (typeof raw === 'string') {
            errorMessage = raw;
          } else if (raw?.error) {
            errorMessage = typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error);
          } else if (raw?.message) {
            errorMessage = raw.message;
          }
        }
        runOptions?.reporter?.onFinish?.(syncTaskId, 'failed', errorMessage);
      }
      throw err;
    }
  })();
  
  return {
    taskId: syncTaskId,
    promise,
    cancelable: false,
    cancel: async () => {
      // Sync tasks typically cannot be cancelled
    },
  };
}

function isProviderCancelable(locator: string): boolean {
  const { scheme } = parseLocator(locator);
  const provider = getProvider(scheme);
  if (!provider) return false;
  if (typeof provider.canCancelTask === 'function') {
    return provider.canCancelTask({ locator });
  }
  return typeof provider.cancelTask === 'function';
}

// Asynchronous task execution (original logic)
async function createAsyncTaskHandle(
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  taskOptions: TaskRequestOptions | undefined,
  runOptions: RunOptions | undefined,
  pollIntervalMs: number,
  client: TaskClient,
  context: Record<string, any> | undefined
): Promise<TaskHandle<TaskResult>> {
  const created = await client.createTaskAsync({
    locator,
    payload,
    platformConfig,
    options: taskOptions,
    context,
  });
  const taskId = created.taskId;
  runOptions?.reporter?.onStart?.(taskId, created.metadata);

  const promise = pollUntilDone(
    locator,
    taskId,
    platformConfig,
    taskOptions,
    runOptions,
    pollIntervalMs,
    client,
    context
  );

  const cancelable = isProviderCancelable(locator);

  return {
    taskId,
    promise,
    cancelable,
    cancel: async () => {
      if (!cancelable) return;
      await client.cancelTask({ locator, taskId, platformConfig, options: taskOptions, context });
    },
  };
}

async function pollUntilDone(
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  taskOptions: TaskRequestOptions | undefined,
  runOptions: RunOptions | undefined,
  pollIntervalMs: number,
  client: TaskClient,
  context: Record<string, any> | undefined
): Promise<TaskResult> {
  try {
    let iteration = 0;
    let consecutiveStatusFailures = 0;
    while (true) {
      throwIfAborted(taskOptions?.signal);
      if (iteration > 0) {
        await delay(pollIntervalMs);
      }
      let status: TaskStatusResult;
      try {
        status = await client.checkStatus({
          locator,
          taskId,
          platformConfig,
          options: taskOptions,
          context,
        });
        consecutiveStatusFailures = 0;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        consecutiveStatusFailures += 1;
        console.error('[pptask][poll] status check failed', {
          locator,
          taskId,
          consecutiveStatusFailures,
          error: error instanceof Error ? error.message : String(error),
        });
        if (consecutiveStatusFailures >= 3) {
          const reason = error instanceof Error ? error.message : String(error);
          const pollingError = new Error(
            `Task status polling failed ${consecutiveStatusFailures} times consecutively: ${reason}`
          );
          (pollingError as any).cause = error;
          throw pollingError;
        }
        iteration += 1;
        continue;
      }
      reportProgress(runOptions, status);
      const normalizedStatus = status.status;
      if (normalizedStatus === 'succeeded') {
        try {
          const result = await client.getResult({
            locator,
            taskId,
            platformConfig,
            options: taskOptions,
            context,
          });
          runOptions?.reporter?.onFinish?.(taskId, 'completed');
          return result; // Return full TaskResult
        } catch (error) {
          if (isResultPendingError(error)) {
            iteration += 1;
            continue;
          }
          throw error;
        }
      }
      if (normalizedStatus === 'failed') {
        // Log the raw status response for debugging
        console.error(`[TaskRunner] Task ${taskId} failed. Raw status:`, JSON.stringify(status.raw, null, 2));
        const error = buildTaskError(taskId, status, 'Task failed');
        runOptions?.reporter?.onFinish?.(taskId, 'failed', error.message);
        throw error;
      }
      if (normalizedStatus === 'cancelled') {
        const error = createAbortError('Task cancelled');
        (error as any).taskStatus = status;
        throw error;
      }
      iteration += 1;
    }
  } catch (err: any) {
    if (isCancelledTaskError(err)) {
      runOptions?.reporter?.onFinish?.(taskId, 'cancelled', err.message);
    } else if (runOptions?.reporter) {
      runOptions.reporter.onFinish?.(taskId, 'failed', err?.message ?? 'Task terminated');
    }
    throw err;
  }
}

function reportProgress(options: RunOptions | undefined, status: TaskStatusResult) {
  if (!options?.reporter?.onProgress) return;
  if (typeof status.progress === 'number') {
    options.reporter.onProgress(status.taskId, status.progress, status.status);
  }
}

function throwIfAborted(signal: TaskRequestOptions['signal']) {
  if (!signal) return;
  if (signal instanceof AbortSignal) {
    if (signal.aborted) throw createAbortError('Task aborted');
    return;
  }
  if (signal.aborted) {
    throw createAbortError('Task aborted');
  }
}

function isCancelledTaskError(err: any): boolean {
  if (isAbortError(err)) return true;
  return err?.taskStatus?.status === 'cancelled';
}

function isAbortError(err: any): boolean {
  if (!err) return false;
  if (err instanceof DOMException) return err.name === 'AbortError';
  return err.name === 'AbortError';
}

function createAbortError(message: string): DOMException {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    (error as any).name = 'AbortError';
    return error as any;
  }
}

function buildTaskError(taskId: string, status: TaskStatusResult, message: string): Error {
  const rawData = status.raw && typeof status.raw === 'object' ? status.raw as Record<string, unknown> : {};
  const failedReason = rawData.failedReason ?? rawData.failure_reason;
  const detailedError = rawData.errorMessage
    ?? rawData.error
    ?? rawData.message
    ?? (failedReason && typeof failedReason === 'object' ? JSON.stringify(failedReason) : failedReason);
  const errorCode = rawData.errorCode;
  const detail = [
    errorCode ? `[${String(errorCode)}]` : '',
    detailedError ? String(detailedError) : '',
  ].filter(Boolean).join(' ');
  const errorMessage = `${detail || message} (taskId=${taskId}, status=${status.status})`;
  
  const error = new Error(errorMessage);
  (error as any).taskStatus = status;
  return error;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isResultPendingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as any).status;
  if (status !== 404) return false;
  const body = typeof (error as any).body === 'string' ? (error as any).body : undefined;
  if (!body) return true;
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message === 'task result not ready';
  } catch {
    return false;
  }
}
