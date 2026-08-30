import type {
  PlatformConfig,
  TaskRequestOptions,
  UploadResult,
} from '../../types.ts';
import {
  assertKieHttpOk,
  createAbortError,
  defaultKieUploadPath,
  ensureKieConfig,
  formatKieApiError,
  isKieApiSuccessCode,
  isRequestAborted,
  KIE_FILE_STREAM_UPLOAD_PATH,
  readKieJsonResponse,
} from '../../providers/kie/helpers.ts';

export async function uploadKieFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<UploadResult> {
  const { apiKey, uploadBaseURL, uploadPath: configuredUploadPath } = ensureKieConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Upload aborted');
  }

  const fileEntry = formData.get('file');
  if (!fileEntry) {
    throw new Error('kie upload requires formData field "file"');
  }

  const uploadFormData = new FormData();
  uploadFormData.append('file', fileEntry);
  uploadFormData.append('uploadPath', configuredUploadPath ?? defaultKieUploadPath());

  const explicitFileName = formData.get('fileName');
  if (typeof explicitFileName === 'string' && explicitFileName.length > 0) {
    uploadFormData.append('fileName', explicitFileName);
  } else if (fileEntry instanceof File && fileEntry.name) {
    uploadFormData.append('fileName', fileEntry.name);
  }

  const response = await fetch(`${uploadBaseURL}${KIE_FILE_STREAM_UPLOAD_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: uploadFormData,
    signal: signal as AbortSignal,
  });

  await assertKieHttpOk(response, 'file-stream upload');
  const payload = await readKieJsonResponse(response);

  const uploadSuccess = payload.success === true || isKieApiSuccessCode(payload.code);
  if (!uploadSuccess) {
    throw new Error(formatKieApiError('Kie upload API error', payload));
  }

  const downloadUrl = payload?.data?.downloadUrl;
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    throw new Error('Kie upload API did not return data.downloadUrl');
  }

  return {
    provider: 'kie',
    url: downloadUrl,
    raw: payload,
  };
}
