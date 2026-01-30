import type { PlatformConfig, TaskRequestOptions, UploadResult } from '../types.ts';
import {
  createAbortError,
  createReplicateClient,
  ensureReplicateConfig,
  isRequestAborted,
} from '../providers/replicate/helpers.ts';

export async function uploadReplicateFile(
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
