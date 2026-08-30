import type {
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import {
  assertApiframeHttpOk,
  buildApiframeCreateBody,
  createAbortError,
  createApiframeResultError,
  ensureApiframeConfig,
  ensureApiframeWhitelistedLocator,
  formatApiframeApiError,
  isRequestAborted,
  mapApiframeStatus,
  parseApiframeResultOutputs,
  readApiframeJsonResponse,
} from './helpers.ts';

type ApiframeJob = {
  id?: string;
  status?: string;
  model?: string;
  progress?: number | null;
  error?: string | null;
  creditCost?: number | null;
  result?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export async function createApiframeTask(
  locator: string,
  payload: Record<string, unknown> = {},
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskCreateResult> {
  const { model, entry } = ensureApiframeWhitelistedLocator(locator);
  const { apiKey, baseURL, webhookUrl, webhookEvents } = ensureApiframeConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Task creation aborted');
  }

  const body = buildApiframeCreateBody(entry, model, payload, { webhookUrl, webhookEvents });

  const response = await fetch(`${baseURL}${entry.endpoint.path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: signal as AbortSignal,
  });

  await assertApiframeHttpOk(response, 'createTask');
  const result = await readApiframeJsonResponse(response);

  const taskId = result?.jobId;
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Apiframe createTask API did not return jobId');
  }

  return {
    provider: 'apiframe',
    taskId,
    status: 'pending',
    raw: result,
  };
}

export async function checkApiframeStatus(
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskStatusResult> {
  ensureApiframeWhitelistedLocator(locator);
  const job = await fetchApiframeJob(taskId, platformConfig, options);
  const status = mapApiframeStatus(job.status ?? '');

  return {
    provider: 'apiframe',
    taskId,
    status,
    progress: typeof job.progress === 'number' ? job.progress : undefined,
    raw: job,
  };
}

export async function getApiframeResult(
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskResult> {
  const { entry } = ensureApiframeWhitelistedLocator(locator);
  const job = await fetchApiframeJob(taskId, platformConfig, options);
  const status = mapApiframeStatus(job.status ?? '');

  if (status === 'failed') {
    const errorMessage = job.error ?? 'Unknown error';
    throw createApiframeResultError(
      `Apiframe task ${taskId} failed (error=${errorMessage})`,
      taskId,
      job,
      'failed',
      typeof job.progress === 'number' ? job.progress : undefined,
    );
  }

  if (status === 'cancelled') {
    throw createApiframeResultError(
      `Apiframe task ${taskId} was cancelled`,
      taskId,
      job,
      'cancelled',
      typeof job.progress === 'number' ? job.progress : undefined,
    );
  }

  if (status !== 'succeeded') {
    throw createApiframeResultError(
      `Apiframe task ${taskId} is not completed (status=${job.status ?? 'unknown'})`,
      taskId,
      job,
      status,
      typeof job.progress === 'number' ? job.progress : undefined,
    );
  }

  if (job.expired === true) {
    throw createApiframeResultError(
      `Apiframe task ${taskId} CDN assets expired (result URLs may 404)`,
      taskId,
      job,
      'succeeded',
      typeof job.progress === 'number' ? job.progress : undefined,
    );
  }

  const outputs = parseApiframeResultOutputs(entry.outputType, job.result);
  if (outputs.length === 0) {
    throw createApiframeResultError(
      `Apiframe task ${taskId} completed but returned no outputs`,
      taskId,
      job,
      'succeeded',
      typeof job.progress === 'number' ? job.progress : undefined,
    );
  }

  return {
    provider: 'apiframe',
    taskId,
    status: 'succeeded',
    outputs,
    costCoins: typeof job.creditCost === 'number' ? job.creditCost : undefined,
    raw: job,
  };
}

async function fetchApiframeJob(
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<ApiframeJob> {
  const { apiKey, baseURL } = ensureApiframeConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Status check aborted');
  }

  const response = await fetch(`${baseURL}/v2/jobs/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
    signal: signal as AbortSignal,
  });

  await assertApiframeHttpOk(response, 'getJob');
  const job = await readApiframeJsonResponse(response);

  if (!job || typeof job !== 'object') {
    throw new Error(`Apiframe getJob API returned empty data for task ${taskId}`);
  }

  if (job.error && typeof job.error === 'string' && !job.status) {
    throw new Error(formatApiframeApiError('Apiframe getJob API error', job));
  }

  return job as ApiframeJob;
}
