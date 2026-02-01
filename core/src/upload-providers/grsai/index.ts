import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadGrsaiZHFile } from './upload.ts';

export const grsaiUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadGrsaiZHFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadGrsaiZHFile } from './upload.ts';
