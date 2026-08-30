import type {
  PlatformConfig,
  TaskRequestOptions,
  UploadResult,
} from '../../types.ts';
import {
  assertApiframeHttpOk,
  createAbortError,
  createApiframeApiError,
  ensureApiframeConfig,
  formatApiframeApiError,
  formatApiframeUploadSizeLimit,
  isRequestAborted,
  readApiframeJsonResponse,
  resolveApiframeUploadMaxBytes,
} from '../../providers/apiframe/helpers.ts';

export async function uploadApiframeFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions,
): Promise<UploadResult> {
  const { apiKey, baseURL } = ensureApiframeConfig(platformConfig);
  const signal = options?.signal;

  if (isRequestAborted(signal)) {
    throw createAbortError('Upload aborted');
  }

  const fileEntry = formData.get('file');
  if (!fileEntry) {
    throw new Error('apiframe upload requires formData field "file"');
  }
  if (typeof fileEntry === 'string') {
    throw new Error('apiframe upload formData field "file" must be a Blob or File, not a string');
  }

  const fileSize = fileEntry.size;
  const fileType = fileEntry.type;
  const maxBytes = resolveApiframeUploadMaxBytes(fileType);

  if (fileSize > maxBytes) {
    throw new Error(
      `apiframe upload exceeds ${formatApiframeUploadSizeLimit(maxBytes)} limit for ${fileType || 'unknown'} files`,
    );
  }

  const uploadFormData = new FormData();
  uploadFormData.append('file', fileEntry);

  const response = await fetch(`${baseURL}/v2/uploads`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: uploadFormData,
    signal: signal as AbortSignal,
  });

  await assertApiframeHttpOk(response, 'upload');
  const payload = await readApiframeJsonResponse(response);

  if (payload?.error) {
    throw createApiframeApiError(
      formatApiframeApiError('Apiframe upload API error', payload),
      response,
      payload,
    );
  }

  const url = payload?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Apiframe upload API did not return url');
  }

  return {
    provider: 'apiframe',
    url,
    raw: payload,
  };
}
