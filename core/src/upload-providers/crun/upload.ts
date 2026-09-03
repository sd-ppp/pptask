import type {
  PlatformConfig,
  TaskRequestOptions,
  UploadResult,
} from '../../types.ts';
import { ensureCrunConfig } from '../../providers/crun/helpers.ts';

export async function uploadCrunFile(
  formData: FormData,
  platformConfig: PlatformConfig | undefined,
  options?: TaskRequestOptions
): Promise<UploadResult> {
  if (options?.signal?.aborted) throw createAbortError('CRUN upload aborted');

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    throw new Error('crun upload requires a Blob/File in formData field "file"');
  }

  const fileName = String((file as any).name ?? formData.get('fileName') ?? '').trim();
  const extension = getFileExtension(fileName);
  const contentType = String(
    file.type || formData.get('contentType') || inferContentType(extension) || ''
  ).trim();
  if (!extension) throw new Error('crun upload requires a file name with an extension');
  if (!contentType) throw new Error('crun upload requires a MIME type');

  const config = ensureCrunConfig(platformConfig);
  const query = new URLSearchParams({ content_type: contentType, ext: extension });
  const endpoint = `${config.baseURL}/client/files/upload-url?${query.toString()}`;
  const signal = toAbortSignal(options?.signal);

  const tokenResponse = await fetch(endpoint, {
    method: 'GET',
    headers: { 'X-API-KEY': config.apiKey, Accept: 'application/json' },
    signal,
  });
  const tokenText = await tokenResponse.text();
  const tokenResult = parseJsonResponse(tokenText);
  if (!tokenResponse.ok || tokenResult?.code !== 200) {
    const detail = tokenResult?.message ?? tokenResult?.msg ?? tokenText;
    throw new Error(
      `CRUN upload URL request failed: HTTP ${tokenResponse.status}${detail ? ` ${detail}` : ''}`
    );
  }

  const uploadData = tokenResult?.data ?? tokenResult;
  const presignedUrl = uploadData?.presigned_url;
  const fileUrl = uploadData?.file_url;
  if (!isHttpUrl(presignedUrl) || !isHttpUrl(fileUrl)) {
    throw new Error('CRUN upload URL response is missing presigned_url or file_url');
  }

  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
    signal,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => '');
    throw new Error(
      `CRUN file upload failed: HTTP ${uploadResponse.status}${detail ? ` ${detail}` : ''}`
    );
  }

  return {
    provider: 'crun',
    url: fileUrl,
    raw: {
      uploadUrlResponse: tokenResult,
      uploadStatus: uploadResponse.status,
      contentType,
      extension,
    },
  };
}

function getFileExtension(fileName: string): string {
  const match = /(?:^|[/\\])[^/\\]+(\.[a-z0-9]+)$/i.exec(fileName);
  return match?.[1]?.toLowerCase() ?? '';
}

function inferContentType(extension: string): string | undefined {
  return ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
  } as Record<string, string>)[extension];
}

function parseJsonResponse(text: string): any {
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function toAbortSignal(signal: TaskRequestOptions['signal']): AbortSignal | undefined {
  if (!signal) return undefined;
  if (typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal) return signal;
  return undefined;
}
