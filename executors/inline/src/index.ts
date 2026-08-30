import {
  describeResource as coreDescribeResource,
  upload as coreUpload,
} from '../../../core/src/index.ts';
import type { PlatformConfig, TaskRequestOptions } from '../../../core/src/index.ts';
import type {
  InlineExecutor,
  InlineExecutorConfig,
  PlatformConfigSource,
  RunOptions,
  RunParams,
  DescribeParams,
  UploadParams,
} from './types.ts';
import { createTaskHandle } from './task-runner.ts';

export function createInlineExecutor(config: InlineExecutorConfig = {}): InlineExecutor {
  const source = config.platformConfig;
  return {
    async describe({ locator, options }: DescribeParams) {
      const resolvedConfig = resolveConfigForLocator(source, locator);
      return coreDescribeResource({
        locator,
        platformConfig: resolvedConfig,
        options: toTaskRequestOptions(options),
      });
    },
    run(params: RunParams) {
      const resolvedConfig = resolveConfigForLocator(source, params.locator);
      return createTaskHandle(
        params.locator,
        params.payload ?? {},
        resolvedConfig,
        params.options,
        undefined
      );
    },
    async upload({ locator, uploadProvider, formData, options }: UploadParams) {
      const resolvedConfig = resolveConfigForUpload(source, locator, uploadProvider);
      const result = await coreUpload({
        locator,
        uploadProvider,
        formData,
        platformConfig: resolvedConfig,
        options: toTaskRequestOptions(options),
      });
      return result.url;
    },
  };
}

function toTaskRequestOptions(options?: RunOptions): TaskRequestOptions | undefined {
  if (!options) return undefined;
  if (!options.signal) return undefined;
  return {
    signal: options.signal,
  };
}

function resolveConfigForLocator(
  source: PlatformConfigSource | undefined,
  locator: string
): PlatformConfig | undefined {
  const base = typeof source === 'function' ? source(locator) : source;
  return cloneConfig(base);
}

function cloneConfig(config?: PlatformConfig): PlatformConfig | undefined {
  if (!config) return undefined;
  return { ...config };
}

function resolveConfigForUpload(
  source: PlatformConfigSource | undefined,
  locator: string | undefined,
  uploadProvider: string
): PlatformConfig | undefined {
  if (!source) return undefined;
  if (locator) {
    return resolveConfigForLocator(source, locator);
  }
  if (typeof source === 'function' && uploadProvider) {
    return resolveConfigForLocator(source, `${uploadProvider}://__upload`);
  }
  if (typeof source === 'object') {
    return cloneConfig(source);
  }
  return undefined;
}

export type { InlineExecutor, InlineExecutorConfig } from './types.ts';
export type { RunOptions, ExecutionOptions, TaskHandle, DescribeParams, RunParams, UploadParams, TaskRunReporter } from './types.ts';

// Export enhanced task runner with async generator support
export { createTaskHandle } from './task-runner.ts';
export { createTaskHandleStream } from './task-runner-enhanced.ts';
export type { TaskEvent } from './task-runner-enhanced.ts';
