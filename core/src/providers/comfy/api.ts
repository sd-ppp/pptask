import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import { buildComfyBaseUrl, mapComfyStatus, parseComfyLocator } from './helpers.ts';

type ComfyHistoryEntry = {
  status?: {
    status_str?: string;
    status?: string;
    state?: string;
    progress?: number;
  };
  outputs?: Record<string, any>;
};

function isRequestAborted(signal?: TaskRequestOptions['signal']): boolean {
  if (!signal) return false;
  if (signal instanceof AbortSignal) return signal.aborted;
  return Boolean(signal.aborted);
}

function createAbortError(message: string): Error {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    (error as any).name = 'AbortError';
    return error;
  }
}

function resolveBaseUrl(url: URL): string {
  const { serverUrl } = parseComfyLocator(url);
  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  const https = scheme === 'comfy-https';
  return buildComfyBaseUrl(serverUrl, https);
}

function resolveProviderName(url: URL): string {
  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  return scheme === 'comfy-https' ? 'comfy-https' : 'comfy-http';
}

function extractHistoryEntry(payload: any, taskId: string): ComfyHistoryEntry | undefined {
  if (!payload) return undefined;
  if (payload[taskId]) return payload[taskId];
  if (payload?.history?.[taskId]) return payload.history[taskId];
  if (payload?.data?.[taskId]) return payload.data[taskId];
  return payload as ComfyHistoryEntry;
}

function extractComfyStatus(entry: ComfyHistoryEntry | undefined): string | undefined {
  if (!entry) return undefined;
  return entry.status?.status_str || entry.status?.status || entry.status?.state;
}

function isTaskInQueue(list: any, taskId: string): boolean {
  if (!Array.isArray(list)) return false;
  return list.some(item => {
    if (!item) return false;
    if (Array.isArray(item)) return item.some(value => value === taskId);
    if (item.prompt_id === taskId || item.id === taskId) return true;
    return false;
  });
}

function buildViewUrl(baseUrl: string, entry: any, fallbackType: string): string | undefined {
  if (!entry) return undefined;
  if (typeof entry.url === 'string' && entry.url) return entry.url;
  const filename = entry.filename || entry.name;
  if (!filename) return undefined;
  const url = new URL(`${baseUrl}/view`);
  url.searchParams.set('filename', filename);
  if (entry.subfolder) url.searchParams.set('subfolder', entry.subfolder);
  url.searchParams.set('type', entry.type || fallbackType);
  return url.toString();
}

function normalizeComfyOutputs(entry: ComfyHistoryEntry | undefined, baseUrl: string): TaskResult['outputs'] {
  if (!entry?.outputs || typeof entry.outputs !== 'object') return [];
  const outputs: TaskResult['outputs'] = [];
  for (const nodeOutput of Object.values(entry.outputs)) {
    if (!nodeOutput) continue;
    const collections = [
      { list: nodeOutput.images, type: 'output' },
      { list: nodeOutput.videos, type: 'output' },
      { list: nodeOutput.files, type: 'output' },
    ];
    let added = false;
    for (const collection of collections) {
      if (!Array.isArray(collection.list)) continue;
      for (const item of collection.list) {
        const url = buildViewUrl(baseUrl, item, collection.type);
        outputs.push({ url, rawData: item });
        added = true;
      }
    }
    if (added) continue;
    if (typeof nodeOutput === 'string') {
      outputs.push({ url: nodeOutput, rawData: nodeOutput });
      continue;
    }
    if (typeof nodeOutput === 'object') {
      const url = buildViewUrl(baseUrl, nodeOutput, 'output');
      if (url) outputs.push({ url, rawData: nodeOutput });
    }
  }
  return outputs;
}

/**
 * Describe a ComfyUI workflow
 * Returns form schema for workflow inputs
 */
export async function describeComfy(
  url: URL,
  platformConfig: PlatformConfig | undefined,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  // TODO: Implement - fetch workflow definition and build form schema
  throw new Error('comfy describeComfy not implemented');
}

/**
 * Create a new ComfyUI task (queue a workflow)
 */
export async function createComfyTask(
  url: URL,
  payload: Record<string, any>,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Task creation aborted');
  }
  const baseUrl = resolveBaseUrl(url);
  const provider = resolveProviderName(url);
  const prompt = payload?.prompt && typeof payload.prompt === 'object' ? payload.prompt : payload;
  const body: Record<string, any> = { prompt };
  if (payload?.client_id) body.client_id = payload.client_id;
  if (payload?.extra_data) body.extra_data = payload.extra_data;
  const response = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal as AbortSignal,
  });
  if (!response.ok) {
    throw new Error(`comfy createTask HTTP ${response.status}`);
  }
  const created = await response.json();
  const taskId = created?.prompt_id || created?.id;
  if (!taskId) {
    throw new Error('comfy createTask missing prompt_id');
  }
  return {
    provider,
    taskId,
    status: 'pending',
    raw: created,
  };
}

/**
 * Check status of a ComfyUI task
 */
export async function checkComfyStatus(
  url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Status check aborted');
  }
  const baseUrl = resolveBaseUrl(url);
  const provider = resolveProviderName(url);
  const historyResponse = await fetch(`${baseUrl}/history/${taskId}`, {
    method: 'GET',
    signal: options?.signal as AbortSignal,
  });
  if (historyResponse.ok) {
    const historyPayload = await historyResponse.json();
    const entry = extractHistoryEntry(historyPayload, taskId);
    const statusValue = extractComfyStatus(entry);
    const inferred =
      statusValue ? mapComfyStatus(statusValue) : entry?.outputs ? 'succeeded' : 'pending';
    const progress = entry?.status?.progress;
    return {
      provider,
      taskId,
      status: inferred,
      progress: typeof progress === 'number' ? progress : undefined,
      raw: historyPayload,
    };
  }

  const queueResponse = await fetch(`${baseUrl}/queue`, {
    method: 'GET',
    signal: options?.signal as AbortSignal,
  });
  if (!queueResponse.ok) {
    throw new Error(`comfy checkStatus HTTP ${queueResponse.status}`);
  }
  const queuePayload = await queueResponse.json();
  const running = isTaskInQueue(queuePayload?.queue_running, taskId);
  const pending = isTaskInQueue(queuePayload?.queue_pending, taskId);
  const status = running ? 'running' : pending ? 'pending' : 'pending';
  return {
    provider,
    taskId,
    status,
    raw: queuePayload,
  };
}

/**
 * Get result of a completed ComfyUI task
 */
export async function getComfyResult(
  url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Result fetch aborted');
  }
  const baseUrl = resolveBaseUrl(url);
  const provider = resolveProviderName(url);
  const response = await fetch(`${baseUrl}/history/${taskId}`, {
    method: 'GET',
    signal: options?.signal as AbortSignal,
  });
  if (!response.ok) {
    throw new Error(`comfy getResult HTTP ${response.status}`);
  }
  const payload = await response.json();
  const entry = extractHistoryEntry(payload, taskId);
  const statusValue = extractComfyStatus(entry);
  const status = statusValue ? mapComfyStatus(statusValue) : entry?.outputs ? 'succeeded' : 'pending';
  if (status !== 'succeeded') {
    throw new Error(`Comfy task ${taskId} not completed (status=${statusValue ?? status})`);
  }
  const outputs = normalizeComfyOutputs(entry, baseUrl);
  return {
    provider,
    taskId,
    status: 'succeeded',
    outputs,
    raw: payload,
  };
}

/**
 * Cancel a running ComfyUI task
 */
export async function cancelComfyTask(
  url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<void> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Cancellation aborted');
  }
  const baseUrl = resolveBaseUrl(url);
  try {
    await fetch(`${baseUrl}/interrupt`, {
      method: 'POST',
      signal: options?.signal as AbortSignal,
    });
  } catch {
    // ignore interrupt failures
  }
  try {
    await fetch(`${baseUrl}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete: [taskId] }),
      signal: options?.signal as AbortSignal,
    });
  } catch {
    // ignore queue delete failures
  }
}
