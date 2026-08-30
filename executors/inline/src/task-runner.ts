import {
  checkStatus as coreCheckStatus,
  getResult as coreGetResult,
  cancelTask as coreCancelTask,
  getProvider,
} from '../../../core/src/index.ts';
import { parseLocator } from '../../../core/src/resource.ts';
import type {
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskExecutionResult,
  TaskRequestOptions,
  TaskResultParams,
  TaskResult,
  TaskStatusResult,
  PlatformConfig,
} from '../../../core/src/types.ts';
import type { RunOptions, TaskHandle } from './types.ts';

const DEFAULT_POLL_INTERVAL = 1000;

export type TaskClient = {
  createTask: (params: TaskCreateParams & { context?: Record<string, any> }) => Promise<TaskExecutionResult>;
  checkStatus: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<TaskStatusResult>;
  getResult: (params: TaskResultParams & { context?: Record<string, any> }) => Promise<TaskResult>;
  cancelTask: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<void>;
};

const localClient: TaskClient = {
  createTask: async ({ context: _ctx, ...params }) => {
    const provider = getProvider(parseLocator(params.locator).scheme);
    if (!provider) {
      throw new Error(`Provider not found for locator: ${params.locator}`);
    }
    if (provider.createTask) {
      return provider.createTask(params);
    }
    if (provider.createTaskAsync) {
      return { mode: 'async', task: await provider.createTaskAsync(params) };
    }
    if (provider.createTaskSync) {
      return { mode: 'sync', result: await provider.createTaskSync(params) };
    }
    throw new Error(`Provider does not support task creation: ${params.locator}`);
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
  
  const created = await client.createTask({ locator, payload, platformConfig, options: taskOptions, context });
  if (created.mode === 'sync') {
    return createSyncTaskHandle(created.result, runOptions);
  }
  return createAsyncTaskHandle(
    locator, created.task, platformConfig, taskOptions, runOptions, pollIntervalMs, client, context
  );
}

function toTaskRequestOptions(options?: RunOptions): TaskRequestOptions | undefined {
  if (!options) return undefined;
  if (!options.signal) return undefined;
  return {
    signal: options.signal,
  };
}

function formatPollingError(error: unknown): Record<string, unknown> {
  const err = error as any;
  const formatted: Record<string, unknown> = {
    name: err?.name,
    message: err?.message ?? String(error),
  };
  if (err?.stack) formatted.stack = err.stack;
  if (err?.cause) {
    formatted.cause = (err.cause as any)?.message ?? err.cause;
  }
  if (err?.response) formatted.response = err.response;
  if (err?.raw) formatted.raw = err.raw;
  return formatted;
}

// Synchronous task execution
async function createSyncTaskHandle(
  result: TaskResult,
  runOptions: RunOptions | undefined
): Promise<TaskHandle<TaskResult>> {
  const syncTaskId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  runOptions?.reporter?.onStart?.(syncTaskId, { mode: 'sync' });
  
  const promise = (async () => {
    try {
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

// Asynchronous task execution (original logic)
async function createAsyncTaskHandle(
  locator: string,
  created: TaskCreateResult,
  platformConfig: PlatformConfig | undefined,
  taskOptions: TaskRequestOptions | undefined,
  runOptions: RunOptions | undefined,
  pollIntervalMs: number,
  client: TaskClient,
  context: Record<string, any> | undefined
): Promise<TaskHandle<TaskResult>> {
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

  return {
    taskId,
    promise,
    cancelable: true,
    cancel: async () => {
      try {
        await client.cancelTask({ locator, taskId, platformConfig, options: taskOptions, context });
      } catch {
        // suppress cancellation failures to keep cancel idempotent for callers
      }
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
    const statusFailureErrors: Array<Record<string, unknown>> = [];
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
        statusFailureErrors.push(formatPollingError(error));
        if (statusFailureErrors.length > 3) {
          statusFailureErrors.shift();
        }
        if (consecutiveStatusFailures >= 3) {
          const recentErrorsJson = JSON.stringify(statusFailureErrors, null, 2);
          const pollingError = new Error(
            `Task status polling failed ${consecutiveStatusFailures} times consecutively. Recent errors: ${recentErrorsJson}`
          );
          (pollingError as any).cause = error;
          (pollingError as any).details = statusFailureErrors;
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
        const error = buildTaskError(taskId, status, 'Task cancelled');
        runOptions?.reporter?.onFinish?.(taskId, 'cancelled', error.message);
        throw error;
      }
      iteration += 1;
    }
  } catch (err: any) {
    if (isAbortError(err)) {
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
  // Extract detailed error message from provider's raw response
  // Priority: error > failure_reason > message from raw data
  const rawData = status.raw || {};
  const detailedError = rawData.error || rawData.failure_reason || rawData.message;
  
  // Use detailed error if available, otherwise use generic message
  const errorMessage = detailedError 
    ? `${detailedError} (taskId=${taskId}, status=${status.status})`
    : `${message} (taskId=${taskId}, status=${status.status})`;
  
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
