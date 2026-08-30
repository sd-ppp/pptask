import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCreateParams,
  TaskExecutionResult,
  TaskResult,
} from '../../types.ts';
import { createArkTaskSync, describeArk } from './api.ts';

const ARK_SCHEME = 'ark';

function ensureArkUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== ARK_SCHEME) {
    throw new Error(`ark provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const arkProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    return describeArk(ensureArkUrl(params.locator), params.platformConfig, params.options);
  },

  async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
    const result = await createArkTaskSync(
      ensureArkUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
    return { mode: 'sync', result };
  },

  /** @deprecated Use createTask; retained for compatibility. */
  getExecutionMode(): 'sync' {
    return 'sync';
  },

  /** @deprecated Use createTask; retained for compatibility. */
  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    return createArkTaskSync(
      ensureArkUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },
};

export { buildArkSeedreamRequestBody, createArkTaskSync, describeArk } from './api.ts';
export { buildArkFormSchema } from './formily.ts';
export {
  ARK_DEFAULT_BASE_URL,
  ARK_SEEDREAM_5_PRO_MODEL,
  ARK_SUPPORTED_MODELS,
  buildArkImagesEndpoint,
  ensureArkConfig,
  normalizeArkImageOutputs,
  parseArkModel,
  type ArkConfig,
} from './helpers.ts';
