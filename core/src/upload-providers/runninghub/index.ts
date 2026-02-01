import type {
  UploadParams,
  UploadProviderDefinition,
  UploadResult,
} from '../../types.ts';
import { uploadRunninghubFile } from './upload.ts';

export const runninghubUploadProviderDefinition: UploadProviderDefinition = {
  async upload(params: UploadParams): Promise<UploadResult> {
    return uploadRunninghubFile(params.formData, params.platformConfig, params.options);
  },
};

export { uploadRunninghubFile } from './upload.ts';
