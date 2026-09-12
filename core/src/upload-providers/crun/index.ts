import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadCrunFile } from './upload.ts';

export const crunUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadCrunFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadCrunFile } from './upload.ts';
