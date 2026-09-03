import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
} from '../../types.ts';
import {
  checkCrunStatus,
  createCrunTaskAsync,
  createCrunTaskSync,
  describeCrun,
  getCrunResult,
} from './api.ts';
import { isCrunGpt56Model, parseCrunModel } from './helpers.ts';

const CRUN_SCHEME = 'crun';

function ensureCrunUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== CRUN_SCHEME) {
    throw new Error(`crun provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const crunProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    return describeCrun(ensureCrunUrl(params.locator), params.platformConfig, params.options);
  },
  getExecutionMode(params: TaskCreateParams): 'sync' | 'async' {
    const model = parseCrunModel(ensureCrunUrl(params.locator));
    return isCrunGpt56Model(model) ? 'sync' : 'async';
  },
  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    return createCrunTaskSync(
      ensureCrunUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },
  async createTaskAsync(params: TaskCreateParams): Promise<TaskCreateResult> {
    return createCrunTaskAsync(
      ensureCrunUrl(params.locator), params.payload ?? {}, params.platformConfig, params.options
    );
  },
  async checkStatus(params: TaskCheckParams): Promise<TaskStatusResult> {
    return checkCrunStatus(
      ensureCrunUrl(params.locator), params.taskId, params.platformConfig, params.options
    );
  },
  async getResult(params: TaskResultParams): Promise<TaskResult> {
    return getCrunResult(
      ensureCrunUrl(params.locator), params.taskId, params.platformConfig, params.options
    );
  },
};

export {
  buildCrunImageUpscaleRequestBody,
  buildCrunWatermarkRemoveRequestBody,
  buildCrunImageExpandRequestBody,
  buildCrunHailuo23RequestBody,
  buildCrunNanoBananaRequestBody,
  buildCrunHappyHorse11RequestBody,
  buildCrunGeminiOmniRequestBody,
  buildCrunGrokImagineVideoRequestBody,
  buildCrunGpt56ChatBody,
  buildCrunGpt56ResponsesBody,
  buildCrunGptImage2RequestBody,
  buildCrunKlingRequestBody,
  buildCrunMinimaxH3RequestBody,
  buildCrunRequestBody,
  buildCrunPixverseV6RequestBody,
  buildCrunSeedreamRequestBody,
  buildCrunSeedanceRequestBody,
  buildCrunVeo31RequestBody,
  checkCrunStatus,
  createCrunTaskAsync,
  createCrunTaskSync,
  describeCrun,
  getCrunResult,
} from './api.ts';
export {
  buildCrunImageUpscaleFormSchema,
  buildCrunWatermarkRemoveFormSchema,
  buildCrunImageExpandFormSchema,
  buildCrunHailuo23FormSchema,
  buildCrunGpt56FormSchema,
  buildCrunGptImage2FormSchema,
  buildCrunHappyHorse11FormSchema,
  buildCrunGeminiOmniFormSchema,
  buildCrunGrokImagineVideoFormSchema,
  buildCrunKlingFormSchema,
  buildCrunMinimaxH3FormSchema,
  buildCrunNanoBananaFormSchema,
  buildCrunPixverseV6FormSchema,
  buildCrunSeedreamFormSchema,
  buildCrunSeedanceFormSchema,
  buildCrunVeo31FormSchema,
} from './formily.ts';
export {
  CRUN_DEFAULT_BASE_URL,
  CRUN_GEMINI_OMNI_MODELS,
  CRUN_GPT_IMAGE_MODELS,
  CRUN_GPT56_MODELS,
  CRUN_HAILUO_23_MODELS,
  CRUN_IMAGE_UPSCALE_MODELS,
  CRUN_WATERMARK_REMOVE_MODELS,
  CRUN_IMAGE_EXPAND_MODELS,
  CRUN_HAPPYHORSE_11_MODELS,
  CRUN_GROK_IMAGINE_VIDEO_MODELS,
  CRUN_KLING_MODELS,
  CRUN_MINIMAX_H3_MODELS,
  CRUN_NANO_BANANA_MODELS,
  CRUN_PIXVERSE_V6_MODELS,
  CRUN_SEEDREAM_MODELS,
  CRUN_SEEDANCE_MODELS,
  CRUN_SUPPORTED_MODELS,
  CRUN_VEO_31_MODELS,
  buildCrunCreateTaskEndpoint,
  buildCrunChatCompletionsEndpoint,
  buildCrunResponsesEndpoint,
  buildCrunTaskInfoEndpoint,
  ensureCrunConfig,
  getCrunHailuo23Profile,
  getCrunImageUpscaleProfile,
  getCrunKlingProfile,
  getCrunHappyHorse11Profile,
  getCrunMinimaxH3Profile,
  getCrunPixverseV6Profile,
  getCrunSeedanceProfile,
  getCrunVeo31Profile,
  isCrunNanoBanana2,
  isCrunGeminiOmniModel,
  isCrunHappyHorse11Model,
  isCrunGrokImagineVideoModel,
  isCrunNanoBanana2Lite,
  isCrunNanoBananaModel,
  isCrunGptImage2,
  isCrunGptImage2Premium,
  isCrunGptImage2Stable,
  isCrunGpt56Model,
  isCrunHailuo23Model,
  isCrunImageUpscaleModel,
  isCrunWatermarkRemoveModel,
  isCrunImageExpandModel,
  isCrunKlingModel,
  isCrunMinimaxH3Model,
  isCrunPixverseV6Model,
  isCrunSeedreamModel,
  isCrunSeedanceModel,
  isCrunNanoBananaPro,
  isCrunV2Channel,
  isCrunVeo31Model,
  mapCrunTaskStatus,
  normalizeCrunMediaOutputs,
  parseCrunModel,
  type CrunConfig,
  type CrunHailuo23Profile,
  type CrunImageUpscaleProfile,
  type CrunHappyHorse11Operation,
  type CrunHappyHorse11Profile,
  type CrunKlingProfile,
  type CrunMinimaxH3Operation,
  type CrunMinimaxH3Profile,
  type CrunPixverseV6Operation,
  type CrunPixverseV6Profile,
  type CrunSeedanceOperation,
  type CrunSeedanceProfile,
  type CrunVeo31Operation,
  type CrunVeo31Profile,
} from './helpers.ts';
