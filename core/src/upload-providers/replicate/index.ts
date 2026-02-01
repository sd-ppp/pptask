import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadReplicateFile } from './upload.ts';

export const replicateUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadReplicateFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadReplicateFile } from './upload.ts';
