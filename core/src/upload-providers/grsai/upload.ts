import type {
  PlatformConfig,
  TaskRequestOptions,
  UploadResult,
} from '../../types.ts';
import {
  createAbortError,
  isRequestAborted,
} from '../../providers/grsai/helpers.ts';

export async function uploadGrsaiZHFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  const GRSAI_ZH_BASE_URL = 'https://grsaiapi.com';
  const apiKey = platformConfig?.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('grsai upload requires apiKey in platformConfig');
  }

  const signal = options?.signal;
  if (isRequestAborted(signal)) {
    throw createAbortError('Upload aborted');
  }

  // Extract file from FormData
  const fileEntry = formData.get('file');
  if (!fileEntry) {
    throw new Error('grsai upload requires formData field "file"');
  }

  // Extract file extension
  let fileExt = 'png';
  if (fileEntry instanceof File && fileEntry.name) {
    const ext = fileEntry.name.split('.').pop()?.toLowerCase();
    if (ext) fileExt = ext;
  }

  // Step 1: Request upload token
  const tokenEndpoint = `${GRSAI_ZH_BASE_URL}/client/resource/newUploadTokenZH`;
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sux: fileExt }),
    signal: signal as AbortSignal,
  });

  if (!tokenResponse.ok) {
    throw new Error(
      `Grsai upload token request failed: ${tokenResponse.status} ${tokenResponse.statusText}`
    );
  }

  const tokenResult = await tokenResponse.json();
  
  // Check for API error code
  if (tokenResult.code !== undefined && tokenResult.code !== 0) {
    throw new Error(`Grsai API error: ${tokenResult.msg || 'Unknown error'}`);
  }

  const data = tokenResult?.data;
  if (!data?.url || !data?.token || !data?.key || !data?.domain) {
    throw new Error(
      'Grsai upload token response missing required fields (url, token, key, domain)'
    );
  }

  // Step 2: Upload file with token
  const uploadFormData = new FormData();
  uploadFormData.append('token', data.token);
  uploadFormData.append('key', data.key);
  uploadFormData.append('file', fileEntry);

  const uploadResponse = await fetch(data.url, {
    method: 'POST',
    body: uploadFormData,
    signal: signal as AbortSignal,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Grsai file upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  // Step 3: Construct final CDN URL
  const finalUrl = `${data.domain.replace(/\/+$/, '')}/${data.key.replace(/^\/+/, '')}`;

  return {
    provider: 'grsai',
    url: finalUrl,
    raw: {
      tokenResult,
      uploadStatus: uploadResponse.status,
    },
  };
}
