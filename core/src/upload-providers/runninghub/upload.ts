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
  // 上传使用固定的 apiKey，不从配置中读取
  const UPLOAD_API_KEY = 'c32dbc1cdd024b9ea3a0498eeca22f73';
  
  const signal = options?.signal;
  if (isRequestAborted(signal)) throw createAbortError('Upload aborted');
  
  // 使用固定的 apiKey
  if (!formData.has('apiKey')) {
    formData.set('apiKey', UPLOAD_API_KEY);
  }
  if (!formData.has('fileType')) {
    formData.set('fileType', 'image');
  }
  
  // 从配置中获取 language 设置（如果有的话），用于确定上传的 host
  let language: string | undefined;
  try {
    const config = platformConfig as RunningHubConfig | undefined;
    language = config?.language;
  } catch {
    // 如果无法获取配置，使用默认值（undefined 会使用默认的 host）
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
