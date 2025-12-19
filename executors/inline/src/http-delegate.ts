import type {
  DescribeResult,
  TaskCheckParams,
  TaskCreateParams,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskResultParams,
  TaskStatusResult,
  UploadResult,
  PlatformConfig,
} from '../../../core/src/types.ts';
import type { DelegateEndpoints } from './types.ts';
import type { TaskClient } from './task-runner.ts';

export type HeadersResolver = () => Record<string, string> | Promise<Record<string, string>>;

export type HttpDelegateConfig = {
  baseUrl: string;
  endpoints: DelegateEndpoints;
  headers?: HeadersResolver;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_HTTP_ENDPOINTS: DelegateEndpoints = {
  describe: '/tasks/describe',
  createTask: '/tasks',
  checkStatus: '/tasks/status',
  getResult: '/tasks/result',
  cancelTask: '/tasks/cancel',
  upload: '/upload',
};

export function createHttpDelegate(config: Omit<HttpDelegateConfig, 'endpoints'> & { endpoints?: Partial<DelegateEndpoints> }) {
  const endpoints = mergeEndpoints(DEFAULT_HTTP_ENDPOINTS, config.endpoints);
  return new InlineHttpDelegate({
    baseUrl: config.baseUrl,
    endpoints,
    headers: config.headers,
    fetchImpl: config.fetchImpl,
  });
}

export class InlineHttpDelegate implements TaskClient {
  private readonly baseUrl: string;
  private readonly endpoints: DelegateEndpoints;
  private readonly headers?: HeadersResolver;
  private readonly fetchImpl?: typeof fetch;

  constructor(config: HttpDelegateConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.endpoints = config.endpoints;
    this.headers = config.headers;
    this.fetchImpl = config.fetchImpl;
  }

  async describe(params: {
    locator: string;
    platformConfig?: PlatformConfig;
    options?: TaskRequestOptions;
    context?: Record<string, any>;
  }): Promise<DescribeResult> {
    return this.postJson<DescribeResult>(this.endpoints.describe, {
      locator: params.locator,
      platformConfig: params.platformConfig,
      options: serializeOptions(params.options, params.context),
    }, params.options);
  }

  async upload(params: {
    locator: string;
    formData: FormData;
    platformConfig?: PlatformConfig;
    options?: TaskRequestOptions;
    context?: Record<string, any>;
  }): Promise<UploadResult> {
    const form = cloneFormData(params.formData);
    form.set('locator', params.locator);
    if (params.platformConfig) {
      form.set('platformConfig', JSON.stringify(params.platformConfig));
    }
    const serializedOptions = serializeOptions(params.options, params.context);
    if (serializedOptions?.context) {
      form.set('context', JSON.stringify(serializedOptions.context));
    }
    const response = await this.postForm<UploadResult>(this.endpoints.upload, form, params.options);
    return response;
  }

  async createTask(params: TaskCreateParams & { context?: Record<string, any> }): Promise<TaskCreateResult> {
    return this.postJson<TaskCreateResult>(this.endpoints.createTask, {
      locator: params.locator,
      payload: params.payload,
      platformConfig: params.platformConfig,
      options: serializeOptions(params.options, params.context),
    }, params.options);
  }

  async checkStatus(params: TaskCheckParams & { context?: Record<string, any> }): Promise<TaskStatusResult> {
    return this.postJson<TaskStatusResult>(this.endpoints.checkStatus, {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: serializeOptions(params.options, params.context),
    }, params.options);
  }

  async getResult(params: TaskResultParams & { context?: Record<string, any> }): Promise<TaskResult> {
    return this.postJson<TaskResult>(this.endpoints.getResult, {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: serializeOptions(params.options, params.context),
    }, params.options);
  }

  async cancelTask(params: TaskCheckParams & { context?: Record<string, any> }): Promise<void> {
    await this.postJson<void>(this.endpoints.cancelTask, {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: serializeOptions(params.options, params.context),
    }, params.options, false);
  }

  private async postJson<T>(
    endpoint: string,
    body: Record<string, any>,
    options?: TaskRequestOptions,
    expectResponse: boolean = true
  ): Promise<T> {
    const fetcher = this.resolveFetch();
    const url = this.resolveUrl(endpoint);
    const headers = await this.resolveHeaders(true);
    const response = await fetcher(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: toAbortSignal(options?.signal),
    });
    await assertOk(response);
    if (!expectResponse) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Failed to parse JSON response body');
    }
  }

  private async postForm<T>(
    endpoint: string,
    formData: FormData,
    options?: TaskRequestOptions
  ): Promise<T> {
    const fetcher = this.resolveFetch();
    const url = this.resolveUrl(endpoint);
    const headers = await this.resolveHeaders(false);
    const response = await fetcher(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: toAbortSignal(options?.signal),
    });
    await assertOk(response);
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Failed to parse JSON response body');
    }
  }

  private resolveFetch(): typeof fetch {
    const fetcher = this.fetchImpl ?? globalThis.fetch;
    if (!fetcher) {
      throw new Error('fetch implementation is required for http delegate');
    }
    return fetcher;
  }

  private async resolveHeaders(isJson: boolean): Promise<Record<string, string>> {
    const baseHeaders = this.headers ? await this.headers() : {};
    if (!isJson) return { ...baseHeaders };
    const headers = { ...baseHeaders };
    if (!Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private resolveUrl(endpoint: string): string {
    if (!endpoint) {
      throw new Error('http delegate endpoint is required');
    }
    if (/^https?:\/\//i.test(endpoint)) return endpoint;
    const trimmed = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${trimmed}`;
  }
}

function mergeEndpoints(base: DelegateEndpoints, overrides?: Partial<DelegateEndpoints>): DelegateEndpoints {
  if (!overrides) return base;
  return {
    describe: overrides.describe ?? base.describe,
    createTask: overrides.createTask ?? base.createTask,
    checkStatus: overrides.checkStatus ?? base.checkStatus,
    getResult: overrides.getResult ?? base.getResult,
    cancelTask: overrides.cancelTask ?? base.cancelTask,
    upload: overrides.upload ?? base.upload,
  };
}

function serializeOptions(
  options?: TaskRequestOptions,
  context?: Record<string, any>
): { context?: Record<string, any> } | undefined {
  const payload: Record<string, any> = {};
  if (context && Object.keys(context).length > 0) payload.context = context;
  return Object.keys(payload).length > 0 ? payload : undefined;
}

function toAbortSignal(signal: TaskRequestOptions['signal']): AbortSignal | undefined {
  if (!signal) return undefined;
  if (signal instanceof AbortSignal) return signal;
  return undefined;
}

function cloneFormData(source: FormData): FormData {
  const target = new FormData();
  for (const [key, value] of source.entries()) {
    target.append(key, value);
  }
  return target;
}

type HttpError = Error & {
  status: number;
  statusText: string;
  body?: string;
};

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  let bodyText: string | undefined;
  try {
    bodyText = await response.text();
  } catch {
    bodyText = undefined;
  }
  const detail = bodyText ? ` body=${bodyText}` : '';
  const error: HttpError = new Error(`HTTP ${response.status} ${response.statusText}.${detail}`.trim()) as HttpError;
  error.status = response.status;
  error.statusText = response.statusText;
  if (bodyText) error.body = bodyText;
  throw error;
}
