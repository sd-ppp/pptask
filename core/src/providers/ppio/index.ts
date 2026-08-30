import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskExecutionResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
} from '../../types.ts';
import {
  checkPpioStatus,
  createPpioTaskAsync,
  createPpioTaskSync,
  describePpio,
  getPpioResult,
} from './api.ts';
import { isPpioAsyncModel, parsePpioModel } from './helpers.ts';

const PPIO_SCHEME = 'ppio';

function ensurePpioUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== PPIO_SCHEME) {
    throw new Error(`ppio provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const ppioProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    return describePpio(ensurePpioUrl(params.locator), params.platformConfig, params.options);
  },

  async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
    const url = ensurePpioUrl(params.locator);
    const model = parsePpioModel(url);
    if (isPpioAsyncModel(model)) {
      const task = await createPpioTaskAsync(url, params.payload ?? {}, params.platformConfig, params.options);
      return { mode: 'async', task };
    }
    const result = await createPpioTaskSync(url, params.payload ?? {}, params.platformConfig, params.options);
    return { mode: 'sync', result };
  },

  /** @deprecated Use createTask; retained for compatibility. */
  getExecutionMode(params: TaskCreateParams): 'sync' | 'async' {
    return isPpioAsyncModel(parsePpioModel(ensurePpioUrl(params.locator))) ? 'async' : 'sync';
  },

  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    return createPpioTaskSync(
      ensurePpioUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },

  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    return createPpioTaskAsync(
      ensurePpioUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },

  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    return checkPpioStatus(
      ensurePpioUrl(params.locator),
      params.taskId,
      params.platformConfig,
      params.options
    );
  },

  async getResult(params: TaskResultParams): Promise<TaskResult> {
    return getPpioResult(
      ensurePpioUrl(params.locator),
      params.taskId,
      params.platformConfig,
      params.options
    );
  },
};

export {
  checkPpioStatus,
  createPpioTaskAsync,
  createPpioTaskSync,
  describePpio,
  getPpioResult,
} from './api.ts';
export {
  PPIO_DEFAULT_API_VERSION,
  PPIO_DEFAULT_ASYNC_BASE_URL,
  PPIO_DEFAULT_BASE_URL,
  PPIO_DEFAULT_CHAT_BASE_URL,
  PPIO_DEFAULT_GPT_IMAGE_BASE_URL,
  PPIO_DEFAULT_RESPONSE_BASE_URL,
  PPIO_DEFAULT_VEO_BASE_URL,
  PPIO_DEFAULT_MINIMAX_BASE_URL,
  PPIO_DEFAULT_SEEDANCE_CN_METERED_BASE_URL,
  PPIO_DEFAULT_VEO_API_VERSION,
  PPIO_GPT_IMAGE_MODEL,
  PPIO_FUSION_MODEL,
  PPIO_SEEDANCE_MODEL,
  PPIO_MINIMAX_H3_MODEL,
  PPIO_RESPONSE_MODELS,
  PPIO_VEO_MODELS,
  PPIO_KLING_V3_MODELS,
  PPIO_HAILUO_23_MODELS,
  PPIO_SEEDANCE_CN_METERED_MODELS,
  PPIO_SUPPORTED_MODELS,
  buildPpioEndpoint,
  buildPpioChatEndpoint,
  buildPpioGptImageEndpoint,
  buildPpioResponseEndpoint,
  buildPpioSeedanceEndpoint,
  buildPpioTaskResultEndpoint,
  buildPpioVeoEndpoint,
  buildPpioAsyncEndpoint,
  buildPpioMinimaxH3CreateEndpoint,
  buildPpioMinimaxH3QueryEndpoint,
  buildPpioSeedanceCnMeteredCreateEndpoint,
  buildPpioSeedanceCnMeteredQueryEndpoint,
  ensurePpioConfig,
  normalizePpioOutputs,
  parsePpioModel,
  isPpioResponseModel,
  isPpioChatModel,
  isPpioAsyncModel,
  isPpioVeoModel,
  isPpioKlingV3Model,
  isPpioHailuo23Model,
  isPpioMinimaxH3Model,
  isPpioSeedanceCnMeteredModel,
  mapPpioAsyncStatus,
  normalizePpioAsyncOutputs,
  type PpioConfig,
} from './helpers.ts';
