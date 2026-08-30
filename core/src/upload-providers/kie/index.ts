import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadKieFile } from './upload.ts';

export const kieUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadKieFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadKieFile } from './upload.ts';
