import type {
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import {
  assertKieHttpOk,
  createAbortError,
  createKieResultError,
  ensureKieConfig,
  ensureKieWhitelistedLocator,
  formatKieApiError,
  isKieApiSuccessCode,
  isRequestAborted,
  mapKieState,
  parseKieResultOutputs,
  readKieJsonResponse,
  sanitizeKieCreatePayload,
} from './helpers.ts';

type KieRecordInfo = {
  taskId?: string;
  model?: string;
  state?: string;
  resultJson?: string;
  failCode?: string;
  failMsg?: string;
  progress?: number;
  creditsConsumed?: number;
  [key: string]: unknown;
};

export async function createKieTask(
  locator: string,
  payload: Record<string, unknown> = {},
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskCreateResult> {
  const { model } = ensureKieWhitelistedLocator(locator);
  const { apiKey, baseURL, callbackUrl } = ensureKieConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Task creation aborted');
  }

  const body: Record<string, unknown> = {
    model,
    input: sanitizeKieCreatePayload(payload),
  };
  if (callbackUrl) {
    body.callBackUrl = callbackUrl;
  }

  const response = await fetch(`${baseURL}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: signal as AbortSignal,
  });

  await assertKieHttpOk(response, 'createTask');
  const result = await readKieJsonResponse(response);
  if (!isKieApiSuccessCode(result.code)) {
    throw new Error(formatKieApiError('Kie createTask API error', result));
  }

  const taskId = result?.data?.taskId;
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Kie createTask API did not return data.taskId');
  }

  return {
    provider: 'kie',
    taskId,
    status: 'pending',
    raw: result,
  };
}

export async function checkKieStatus(
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskStatusResult> {
  ensureKieWhitelistedLocator(locator);
  const record = await fetchKieRecordInfo(taskId, platformConfig, options);
  const status = mapKieState(record.state ?? '');

  return {
    provider: 'kie',
    taskId,
    status,
    progress: typeof record.progress === 'number' ? record.progress : undefined,
    raw: record,
  };
}

export async function getKieResult(
  locator: string,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<TaskResult> {
  ensureKieWhitelistedLocator(locator);
  const record = await fetchKieRecordInfo(taskId, platformConfig, options);
  const status = mapKieState(record.state ?? '');

  if (status === 'failed') {
    const failCode = record.failCode ?? 'unknown';
    const failMsg = record.failMsg ?? 'Unknown error';
    throw createKieResultError(
      `Kie task ${taskId} failed (failCode=${failCode}, failMsg=${failMsg})`,
      taskId,
      record,
      'failed',
      typeof record.progress === 'number' ? record.progress : undefined,
    );
  }

  if (status !== 'succeeded') {
    throw createKieResultError(
      `Kie task ${taskId} is not completed (state=${record.state ?? 'unknown'})`,
      taskId,
      record,
      status,
      typeof record.progress === 'number' ? record.progress : undefined,
    );
  }

  if (typeof record.resultJson !== 'string' || record.resultJson.length === 0) {
    throw createKieResultError(
      `Kie task ${taskId} succeeded but resultJson is missing`,
      taskId,
      record,
      'succeeded',
      typeof record.progress === 'number' ? record.progress : undefined,
    );
  }

  let outputs;
  try {
    outputs = parseKieResultOutputs(record.resultJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createKieResultError(
      `Kie task ${taskId} has invalid resultJson: ${message}`,
      taskId,
      record,
      'succeeded',
      typeof record.progress === 'number' ? record.progress : undefined,
    );
  }

  return {
    provider: 'kie',
    taskId,
    status: 'succeeded',
    outputs,
    costCoins: typeof record.creditsConsumed === 'number' ? record.creditsConsumed : undefined,
    raw: record,
  };
}

async function fetchKieRecordInfo(
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<KieRecordInfo> {
  const { apiKey, baseURL } = ensureKieConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Status check aborted');
  }

  const url = new URL(`${baseURL}/api/v1/jobs/recordInfo`);
  url.searchParams.set('taskId', taskId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: signal as AbortSignal,
  });

  await assertKieHttpOk(response, 'recordInfo');
  const result = await readKieJsonResponse(response);
  if (!isKieApiSuccessCode(result.code)) {
    throw new Error(formatKieApiError('Kie recordInfo API error', result));
  }

  const data = result?.data;
  if (!data || typeof data !== 'object') {
    throw new Error(`Kie recordInfo API returned empty data for task ${taskId}`);
  }

  return data as KieRecordInfo;
}
