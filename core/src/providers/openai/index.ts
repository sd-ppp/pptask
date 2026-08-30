import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCreateParams,
  TaskExecutionResult,
  TaskResult,
} from '../../types.ts';
import { describeOpenAI, createOpenAITaskSync } from './api.ts';

const OPENAI_SCHEME = 'openai';

function ensureOpenAIUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== OPENAI_SCHEME) {
    throw new Error(`openai provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const openaiProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureOpenAIUrl(params.locator);
    return describeOpenAI(url, params.platformConfig, params.options);
  },
  
  async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
    const url = ensureOpenAIUrl(params.locator);
    const result = await createOpenAITaskSync(url, params.payload ?? {}, params.platformConfig, params.options);
    return { mode: 'sync', result };
  },

  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    const url = ensureOpenAIUrl(params.locator);
    return createOpenAITaskSync(url, params.payload ?? {}, params.platformConfig, params.options);
  },
};

export { describeOpenAI, createOpenAITaskSync } from './api.ts';

export {
  ensureOpenAIConfig,
  parseOpenAIEndpoint,
  type OpenAIConfig,
} from './helpers.ts';
