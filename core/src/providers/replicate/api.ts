import { buildFormilySchemaFromReplicate } from './formily.ts';
import {
  createAbortError,
  createReplicateClient,
  ensureReplicateConfig,
  extractReplicateCost,
  extractReplicateProgress,
  getModelMetadata,
  isRequestAborted,
  mapReplicateStatus,
  normalizeReplicateOutputs,
  parseReplicateModel,
  resolveModelVersion,
} from './helpers.ts';
import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
  UploadResult,
} from '../../types.ts';

export async function describeReplicate(
  url: URL,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<DescribeResult> {
  const { apiKey } = ensureReplicateConfig(platformConfig);
  const model = parseReplicateModel(url);
  const client = createReplicateClient(apiKey);
  const { modelInfo, defaultValues } = await getModelMetadata(client, model, apiKey);
  const { schema, values } = buildFormilySchemaFromReplicate(modelInfo, defaultValues);
  return {
    provider: 'replicate',
    metadata: {
      scheme: 'replicate',
      model,
      defaultValues,
      rawData: modelInfo,
    },
    formSchema: schema,
    formValues: values,
  };
}

export async function createReplicateTask(
  url: URL,
  payload: Record<string, any> = {},
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  const { apiKey, version } = ensureReplicateConfig(platformConfig);
  const model = parseReplicateModel(url);
  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Task creation aborted');
  }
  const client = createReplicateClient(apiKey);
  const resolvedVersion = await resolveModelVersion(client, model, apiKey, version);
  const [owner, name] = model.split('/');
  const created: any = await client.predictions.create({
    model: `${owner}/${name}`,
    input: payload,
    version: resolvedVersion,
  });
  return {
    provider: 'replicate',
    taskId: created.id,
    status: mapReplicateStatus(created.status),
    raw: created,
    metadata: {
      version: created.version,
    },
  };
}

export async function checkReplicateStatus(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  const { apiKey } = ensureReplicateConfig(platformConfig);
  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Status check aborted');
  }
  const client = createReplicateClient(apiKey);
  const prediction: any = await client.predictions.get(taskId);
  const status = mapReplicateStatus(prediction.status);
  const progress = extractReplicateProgress(prediction);
  return {
    provider: 'replicate',
    taskId,
    status,
    progress,
    raw: prediction,
  };
}

export async function getReplicateResult(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const { apiKey } = ensureReplicateConfig(platformConfig);
  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Result fetch aborted');
  }
  const client = createReplicateClient(apiKey);
  const prediction: any = await client.predictions.get(taskId);
  const status = mapReplicateStatus(prediction.status);
  if (status !== 'succeeded') {
    throw new Error(`Replicate task ${taskId} is not completed (status=${prediction.status ?? 'unknown'})`);
  }
  const outputs = normalizeReplicateOutputs(prediction);
  const cost = extractReplicateCost(prediction);
  return {
    provider: 'replicate',
    taskId,
    status: 'succeeded',
    outputs,
    costCoins: cost?.coins,
    costMoney: cost?.money,
    costMoneyCurrency: cost?.moneyCurrency,
    raw: prediction,
  };
}

export async function cancelReplicateTask(
  _url: URL,
  taskId: string,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<void> {
  const { apiKey } = ensureReplicateConfig(platformConfig);
  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Cancellation aborted');
  }
  const client = createReplicateClient(apiKey);
  try {
    await client.predictions.cancel(taskId);
  } catch (err: any) {
    if (err?.status === 404) return;
    throw err;
  }
}

export async function uploadReplicateFile(
  _url: URL,
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  const { apiKey } = ensureReplicateConfig(platformConfig);
  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Upload aborted');
  }
  const fileEntry = formData.get('file');
  if (!fileEntry) throw new Error('replicate upload requires formData field "file"');

  const blob = await toBlob(fileEntry);
  const client = createReplicateClient(apiKey);
  const uploaded: any = await (client as any).files.create(blob);
  return {
    provider: 'replicate',
    url: uploaded?.urls?.get ?? '',
    raw: uploaded,
  };
}

async function toBlob(entry: FormDataEntryValue): Promise<Blob> {
  if (entry instanceof Blob) {
    return entry;
  }
  if (typeof entry === 'string') {
    return new Blob([entry], { type: 'text/plain' });
  }
  if ((entry as any)?.arrayBuffer instanceof Function) {
    const fileLike: any = entry;
    const data = await fileLike.arrayBuffer();
    return new Blob([data], { type: fileLike.type ?? 'application/octet-stream' });
  }
  throw new Error('Unsupported file entry for replicate upload');
}

export type { ReplicateConfig } from './helpers.ts';
