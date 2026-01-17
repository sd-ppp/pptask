import { parseLocator } from '../../resource.ts';
import type {
  DescribeParams,
  DescribeResult,
  ProviderDefinition,
  TaskCreateParams,
  TaskResult,
} from '../../types.ts';
import { describeGemini, createGeminiTaskSync } from './api.ts';

const GEMINI_SCHEME = 'gemini';

function ensureGeminiUrl(locator: string): URL {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== GEMINI_SCHEME) {
    throw new Error(`gemini provider received unsupported locator: ${locator}`);
  }
  return url;
}

export const geminiProviderDefinition: ProviderDefinition = {
  async describeResource(params: DescribeParams): Promise<DescribeResult> {
    const url = ensureGeminiUrl(params.locator);
    return describeGemini(url, params.platformConfig, params.options);
  },
  
  async createTaskSync(params: TaskCreateParams): Promise<TaskResult> {
    const url = ensureGeminiUrl(params.locator);
    return createGeminiTaskSync(url, params.payload ?? {}, params.platformConfig, params.options);
  },
};

export { describeGemini, createGeminiTaskSync } from './api.ts';

export {
  ensureGeminiConfig,
  parseGeminiModel,
  type GeminiConfig,
} from './helpers.ts';
