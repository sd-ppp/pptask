import {
  createTask as coreCreateTask,
  checkStatus as coreCheckStatus,
  getResult as coreGetResult,
  cancelTask as coreCancelTask,
} from '../../../core/src/index.ts';
import type {
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResultParams,
  TaskResult,
  TaskStatusResult,
  PlatformConfig,
} from '../../../core/src/types.ts';
import type { RunOptions, TaskHandle } from './types.ts';

const DEFAULT_POLL_INTERVAL = 1000;

export type TaskClient = {
  createTask: (params: TaskCreateParams & { context?: Record<string, any> }) => Promise<TaskCreateResult>;
  checkStatus: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<TaskStatusResult>;
  getResult: (params: TaskResultParams & { context?: Record<string, any> }) => Promise<TaskResult>;
  cancelTask: (params: TaskCheckParams & { context?: Record<string, any> }) => Promise<void>;
};

const localClient: TaskClient = {
  createTask: ({ context: _ctx, ...params }) => coreCreateTask(params),
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
): Promise<TaskHandle<any[]>> {
  const taskOptions = toTaskRequestOptions(runOptions);
  const context = runOptions?.context;
  const created = await client.createTask({
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

function toTaskRequestOptions(options?: RunOptions): TaskRequestOptions | undefined {
  if (!options) return undefined;
  if (!options.signal) return undefined;
  return {
    signal: options.signal,
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
): Promise<any[]> {
  try {
    let iteration = 0;
    while (true) {
      throwIfAborted(taskOptions?.signal);
      if (iteration > 0) {
        await delay(pollIntervalMs);
      }
      const status = await client.checkStatus({
        locator,
        taskId,
        platformConfig,
        options: taskOptions,
        context,
      });
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
          return result.outputs ?? [];
        } catch (error) {
          if (isResultPendingError(error)) {
            iteration += 1;
            continue;
          }
          throw error;
        }
      }
      if (normalizedStatus === 'failed') {
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
  const error = new Error(`${message} (taskId=${taskId}, status=${status.status})`);
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
