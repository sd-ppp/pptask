import {
  describeResource as coreDescribeResource,
  upload as coreUpload,
} from '../../../core/src/index.ts';
import { parseLocator } from '../../../core/src/resource.ts';
import type { PlatformConfig, TaskRequestOptions, UploadResult } from '../../../core/src/types.ts';
import { createHttpDelegate } from './http-delegate.ts';
import type {
  InlineExecutor,
  InlineEndpointConfig,
  PlatformConfigSource,
  RunOptions,
  RunParams,
  DescribeParams,
  UploadParams,
} from './types.ts';
import { createTaskHandle } from './task-runner.ts';

const DEFAULT_HTTP_POLL_INTERVAL = 1500;

export function createInlineExecutor(config: InlineEndpointConfig): InlineExecutor {
  const baseConfig = config.platformConfig;
  if (config.mode === 'local') {
    return createLocalInlineExecutor(baseConfig);
  }
  return createHttpInlineExecutor(config, baseConfig);
}

function createLocalInlineExecutor(source: PlatformConfigSource | undefined): InlineExecutor {
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
    async upload({ locator, formData, options }: UploadParams) {
      const resolvedConfig = resolveConfigForLocator(source, locator);
      const result = await coreUpload({
        locator,
        formData,
        platformConfig: resolvedConfig,
        options: toTaskRequestOptions(options),
      });
      return result.url;
    },
  };
}

function createHttpInlineExecutor(
  config: Extract<InlineEndpointConfig, { mode: 'http' }>,
  source: PlatformConfigSource | undefined
): InlineExecutor {
  const delegate = createHttpDelegate({
    baseUrl: config.baseUrl,
    endpoints: config.endpoints,
    headers: config.headers,
    fetchImpl: config.fetchImpl,
  });
  const pollInterval = config.pollIntervalMs ?? DEFAULT_HTTP_POLL_INTERVAL;
  const uploadStrategy = config.uploadStrategy ?? 'delegate';

  return {
    async describe({ locator, options }: DescribeParams) {
      const resolvedConfig = resolveConfigForLocator(source, locator);
      return delegate.describe({
        locator,
        platformConfig: resolvedConfig,
        options: toTaskRequestOptions(options),
        context: options?.context,
      });
    },
    run(params: RunParams) {
      const resolvedConfig = resolveConfigForLocator(source, params.locator);
      return createTaskHandle(
        params.locator,
        params.payload ?? {},
        resolvedConfig,
        params.options,
        pollInterval,
        delegate
      );
    },
    async upload({ locator, formData, options }: UploadParams) {
      let resolvedConfig = resolveConfigForLocator(source, locator);
      if (uploadStrategy === 'core') {
        const { scheme } = parseLocator(locator);
        if (scheme === 'runninghub') {
          const existingKey = (resolvedConfig as any)?.apiKey;
          const fallbackKey = '186a37f9493f4b32b07a3741168f5d8c';
          if (!existingKey) {
            resolvedConfig = { ...(resolvedConfig ?? {}), apiKey: fallbackKey };
          }
        }
        const coreResult = await coreUpload({
          locator,
          formData,
          platformConfig: resolvedConfig,
          options: toTaskRequestOptions(options),
        });
        return coreResult.url;
      }
      // treat unknown strategy as delegate
      const result: UploadResult = await delegate.upload({
        locator,
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

export type { InlineExecutor, InlineEndpointConfig } from './types.ts';
export type { RunOptions, TaskHandle, DescribeParams, RunParams, UploadParams, TaskRunReporter } from './types.ts';
