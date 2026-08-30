import type {
  PlatformConfig,
  TaskRequestOptions,
  UploadResult,
} from '../../types.ts';
import {
  createAbortError,
  createRunningHubError,
  getBaseHost,
  isRequestAborted,
  type RunningHubConfig,
} from '../../providers/runninghub/helpers.ts';

export async function uploadRunninghubFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  const signal = options?.signal;
  if (isRequestAborted(signal)) throw createAbortError('Upload aborted');

  const config = platformConfig as (RunningHubConfig & { uploadApiKey?: string }) | undefined;
  const apiKey = config?.uploadApiKey ?? config?.apiKey;
  if (!apiKey) throw new Error('runninghub upload apiKey is required');
  formData.set('apiKey', apiKey);
  if (!formData.has('fileType')) {
    formData.set('fileType', 'image');
  }

  const baseHost = getBaseHost(config?.language);
  const uploadUrl = `https://${baseHost}/task/openapi/upload`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    signal: signal as AbortSignal,
  });
  if (!response.ok) throw new Error(`runninghub upload HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.code !== 0) throw createRunningHubError('upload', payload);
  return {
    provider: 'runninghub',
    url: payload?.data?.fileName,
    raw: payload,
  };
}
