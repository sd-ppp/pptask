import { createPptaskProvider } from '../../core/provider.ts';
import { uploadBlob } from '../shared/http.ts';
import { createCosMediaUploader, type CosMediaStorageConfig } from './storage.ts';
export * from './storage.ts';

/** Server-side upload-only provider. Keep COS credentials out of clients. */
export function createCosProvider(config: CosMediaStorageConfig) {
  const upload = createCosMediaUploader(config);
  return createPptaskProvider({
    providerId: 'cos',
    files: {
      specificationVersion: 'v4', provider: 'cos',
      async uploadFile(options) {
        options.abortSignal?.throwIfAborted();
        const blob = await uploadBlob(options);
        const url = await upload({ bytes: new Uint8Array(await blob.arrayBuffer()), mediaType: options.mediaType, signal: options.abortSignal });
        return { providerReference: { cos: url }, mediaType: options.mediaType,
          filename: options.filename, byteSize: blob.size,
          providerMetadata: { cos: { url } }, warnings: [] };
      },
    },
  });
}
