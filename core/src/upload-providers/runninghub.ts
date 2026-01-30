import type { PlatformConfig, TaskRequestOptions, UploadResult } from '../types.ts';
import {
  createAbortError,
  createRunningHubError,
  getBaseHost,
  isRequestAborted,
  type RunningHubConfig,
} from '../providers/runninghub/helpers.ts';

export async function uploadRunninghubFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  const UPLOAD_API_KEY = 'c32dbc1cdd024b9ea3a0498eeca22f73';
  const signal = options?.signal;
  if (isRequestAborted(signal)) throw createAbortError('Upload aborted');

  if (!formData.has('apiKey')) {
    formData.set('apiKey', UPLOAD_API_KEY);
  }
  if (!formData.has('fileType')) {
    formData.set('fileType', 'image');
  }

  let language: string | undefined;
  try {
    const config = platformConfig as RunningHubConfig | undefined;
    language = config?.language;
  } catch {
    // ignore config extraction errors
  }

  const baseHost = getBaseHost(language);
  const uploadUrl = `https://${baseHost}/task/openapi/upload`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
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
