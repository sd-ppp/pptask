import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadApiframeFile } from './upload.ts';

export const apiframeUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadApiframeFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadApiframeFile } from './upload.ts';
