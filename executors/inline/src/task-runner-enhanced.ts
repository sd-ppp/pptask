// Enhanced task-runner with async generator support
// Allows consumers to receive intermediate status updates

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
import type { RunOptions } from './types.ts';

const DEFAULT_POLL_INTERVAL = 1000;

/**
 * Task event types for async generator
 */
export type TaskEvent =
  | { type: 'created'; taskId: string; metadata?: any }
  | { type: 'progress'; taskId: string; progress?: number; status: string; metadata?: any }
  | { type: 'completed'; taskId: string; result: TaskResult }
  | { type: 'failed'; taskId: string; error: string }
  | { type: 'cancelled'; taskId: string };

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
    // Compatibility with providers registered against the pre-unified interface.
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

/**
 * Create task handle with async generator support
 */
export async function* createTaskHandleStream(
  locator: string,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  runOptions: RunOptions | undefined = undefined,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL,
  client: TaskClient = localClient
): AsyncGenerator<TaskEvent, TaskResult | void, void> {
  const taskOptions = toTaskRequestOptions(runOptions);
  const context = runOptions?.context;

  const created = await client.createTask({
    locator,
    payload,
    platformConfig,
    options: taskOptions,
    context,
  });

  if (created.mode === 'sync') {
    yield* createSyncTaskStream(created.result, taskOptions);
  } else {
    yield* createAsyncTaskStream(
      locator,
      created.task,
      platformConfig,
      taskOptions,
      pollIntervalMs,
      client,
      context
    );
  }
  return;
}

function toTaskRequestOptions(options?: RunOptions): TaskRequestOptions | undefined {
  if (!options) return undefined;
  if (!options.signal) return undefined;
  return {
    signal: options.signal,
  };
}

// Synchronous task execution stream
async function* createSyncTaskStream(
  result: TaskResult,
  taskOptions: TaskRequestOptions | undefined
): AsyncGenerator<TaskEvent, TaskResult, void> {
  const syncTaskId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    throwIfAborted(taskOptions?.signal);

    yield { type: 'created', taskId: syncTaskId, metadata: { mode: 'sync' } };

    yield { type: 'completed', taskId: syncTaskId, result };

    return result; // Return full TaskResult
  } catch (err: any) {
    if (isAbortError(err)) {
      yield { type: 'cancelled', taskId: syncTaskId };
    } else {
      yield { type: 'failed', taskId: syncTaskId, error: err?.message || 'Unknown error' };
    }
    throw err;
  }
}

// Asynchronous task execution stream
async function* createAsyncTaskStream(
  locator: string,
  created: TaskCreateResult,
  platformConfig: PlatformConfig | undefined,
  taskOptions: TaskRequestOptions | undefined,
  pollIntervalMs: number,
  client: TaskClient,
  context: Record<string, any> | undefined
): AsyncGenerator<TaskEvent, TaskResult, void> {
  const taskId = created.taskId;

  // Emit created event
  yield { type: 'created', taskId, metadata: created.metadata };

  // 2. Poll until done, yielding progress events
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
          yield { type: 'cancelled', taskId };
          throw error;
        }
        consecutiveStatusFailures += 1;
        if (consecutiveStatusFailures >= 3) {
          const pollingError = new Error(
            `Task status polling failed ${consecutiveStatusFailures} times consecutively`
          );
          (pollingError as any).cause = error;
          yield { type: 'failed', taskId, error: pollingError.message };
          throw pollingError;
        }
        iteration += 1;
        continue;
      }

      // Emit progress event
      yield {
        type: 'progress',
        taskId,
        progress: typeof status.progress === 'number' ? status.progress : undefined,
        status: status.status,
        metadata: status.raw,
      };

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
          yield { type: 'completed', taskId, result };
          return result; // Return full TaskResult
        } catch (error) {
          if (isResultPendingError(error)) {
            iteration += 1;
            continue;
          }
          const errorMsg = (error as any)?.message || 'Failed to get result';
          yield { type: 'failed', taskId, error: errorMsg };
          throw error;
        }
      }

      if (normalizedStatus === 'failed') {
        const errorMsg = buildTaskErrorMessage(taskId, status, 'Task failed');
        yield { type: 'failed', taskId, error: errorMsg };
        throw new Error(errorMsg);
      }

      if (normalizedStatus === 'cancelled') {
        yield { type: 'cancelled', taskId };
        throw new Error(`Task cancelled (taskId=${taskId})`);
      }

      iteration += 1;
    }
  } catch (err: any) {
    if (isAbortError(err)) {
      // Already yielded cancelled event
    } else if (!err.message?.includes('Task failed') && !err.message?.includes('Task cancelled')) {
      // Only yield if we haven't already
      yield { type: 'failed', taskId, error: err?.message || 'Task terminated' };
    }
    throw err;
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

function buildTaskErrorMessage(taskId: string, status: TaskStatusResult, message: string): string {
  return `${message} (taskId=${taskId}, status=${status.status})`;
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
