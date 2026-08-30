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
  cancelNovitaTask,
  checkNovitaStatus,
  createNovitaTaskAsync,
  createNovitaTaskSync,
  describeNovita,
  getNovitaResult,
  mapNovitaAsyncStatus,
  mapNovitaSeedanceOverseaStatus,
} from './api.ts';
import { isNovitaAsyncModel, parseNovitaModel } from './helpers.ts';

const NOVITA_SCHEME = 'novita';

function ensureNovitaUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== NOVITA_SCHEME) {
    throw new Error(`novita provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const novitaProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    return describeNovita(ensureNovitaUrl(params.locator), params.platformConfig, params.options);
  },

  async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
    const url = ensureNovitaUrl(params.locator);
    const model = parseNovitaModel(url);
    if (isNovitaAsyncModel(model)) {
      const task = await createNovitaTaskAsync(url, params.payload ?? {}, params.platformConfig, params.options);
      return { mode: 'async', task };
    }
    const result = await createNovitaTaskSync(url, params.payload ?? {}, params.platformConfig, params.options);
    return { mode: 'sync', result };
  },

  /** @deprecated Use createTask; retained for compatibility. */
  getExecutionMode(params: TaskCreateParams): 'sync' | 'async' {
    return isNovitaAsyncModel(parseNovitaModel(ensureNovitaUrl(params.locator))) ? 'async' : 'sync';
  },

  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    return createNovitaTaskSync(
      ensureNovitaUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },

  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    return createNovitaTaskAsync(
      ensureNovitaUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },

  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    return checkNovitaStatus(
      ensureNovitaUrl(params.locator), params.taskId, params.platformConfig, params.options
    );
  },

  async getResult(params: TaskResultParams): Promise<TaskResult> {
    return getNovitaResult(
      ensureNovitaUrl(params.locator), params.taskId, params.platformConfig, params.options
    );
  },

  async cancelTask(params: TaskCheckParams): Promise<void> {
    return cancelNovitaTask(
      ensureNovitaUrl(params.locator), params.taskId, params.platformConfig, params.options
    );
  },
};

export {
  buildNovitaGptImageEditFormData,
  buildNovitaGptImageGenerationBody,
  buildNovitaGpt56ChatBody,
  buildNovitaGpt56ResponsesBody,
  buildNovitaKlingV3RequestBody,
  buildNovitaVeo31RequestBody,
  buildNovitaSeedanceOverseaRequestBody,
  buildNovitaRequestBody,
  cancelNovitaTask,
  checkNovitaStatus,
  createNovitaTaskAsync,
  createNovitaTaskSync,
  describeNovita,
  getNovitaResult,
  mapNovitaAsyncStatus,
} from './api.ts';
export { buildNovitaFormSchema } from './formily.ts';
export {
  NOVITA_DEFAULT_API_VERSION,
  NOVITA_DEFAULT_BASE_URL,
  NOVITA_DEFAULT_ASYNC_BASE_URL,
  NOVITA_DEFAULT_OPENAI_BASE_URL,
  NOVITA_DEFAULT_VEO31_BASE_URL,
  NOVITA_DEFAULT_SEEDANCE_OVERSEA_METERED_BASE_URL,
  NOVITA_GPT56_MODELS,
  NOVITA_GPT_IMAGE_MODELS,
  NOVITA_KLING_V3_MODELS,
  NOVITA_VEO31_MODELS,
  NOVITA_SEEDANCE_OVERSEA_MODELS,
  NOVITA_SUPPORTED_MODELS,
  buildNovitaEndpoint,
  buildNovitaOpenAIImagesEndpoint,
  buildNovitaResponsesEndpoint,
  buildNovitaChatCompletionsEndpoint,
  buildNovitaAsyncCreateEndpoint,
  buildNovitaAsyncTaskResultEndpoint,
  buildNovitaVeo31CreateEndpoint,
  buildNovitaSeedanceOverseaCreateEndpoint,
  buildNovitaSeedanceOverseaTaskEndpoint,
  ensureNovitaConfig,
  isNovitaGptImageModel,
  isNovitaGpt56Model,
  isNovitaAsyncModel,
  isNovitaKlingV3Model,
  isNovitaVeo31Model,
  isNovitaSeedanceOverseaModel,
  normalizeNovitaGptImageOutputs,
  normalizeNovitaOutputs,
  parseNovitaModel,
  type NovitaConfig,
} from './helpers.ts';
