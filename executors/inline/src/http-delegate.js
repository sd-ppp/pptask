export const DEFAULT_HTTP_ENDPOINTS = {
    describe: '/tasks/describe',
    createTask: '/tasks',
    checkStatus: '/tasks/status',
    getResult: '/tasks/result',
    cancelTask: '/tasks/cancel',
    upload: '/upload',
};
export function createHttpDelegate(config) {
    const endpoints = mergeEndpoints(DEFAULT_HTTP_ENDPOINTS, config.endpoints);
    return new InlineHttpDelegate({
        baseUrl: config.baseUrl,
        endpoints,
        headers: config.headers,
        fetchImpl: config.fetchImpl,
    });
}
export class InlineHttpDelegate {
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.endpoints = config.endpoints;
        this.headers = config.headers;
        this.fetchImpl = config.fetchImpl;
    }
    async describe(params) {
        return this.postJson(this.endpoints.describe, {
            locator: params.locator,
            platformConfig: params.platformConfig,
            options: serializeOptions(params.options, params.context),
        }, params.options);
    }
    async upload(params) {
        const form = cloneFormData(params.formData);
        form.set('locator', params.locator);
        if (params.platformConfig) {
            form.set('platformConfig', JSON.stringify(params.platformConfig));
        }
        const serializedOptions = serializeOptions(params.options, params.context);
        if (serializedOptions?.context) {
            form.set('context', JSON.stringify(serializedOptions.context));
        }
        const response = await this.postForm(this.endpoints.upload, form, params.options);
        return response;
    }
    async createTask(params) {
        return this.postJson(this.endpoints.createTask, {
            locator: params.locator,
            payload: params.payload,
            platformConfig: params.platformConfig,
            options: serializeOptions(params.options, params.context),
        }, params.options);
    }
    async checkStatus(params) {
        return this.postJson(this.endpoints.checkStatus, {
            locator: params.locator,
            taskId: params.taskId,
            platformConfig: params.platformConfig,
            options: serializeOptions(params.options, params.context),
        }, params.options);
    }
    async getResult(params) {
        return this.postJson(this.endpoints.getResult, {
            locator: params.locator,
            taskId: params.taskId,
            platformConfig: params.platformConfig,
            options: serializeOptions(params.options, params.context),
        }, params.options);
    }
    async cancelTask(params) {
        await this.postJson(this.endpoints.cancelTask, {
            locator: params.locator,
            taskId: params.taskId,
            platformConfig: params.platformConfig,
            options: serializeOptions(params.options, params.context),
        }, params.options, false);
    }
    async postJson(endpoint, body, options, expectResponse = true) {
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
            return undefined;
        }
        const text = await response.text();
        if (!text) {
            return undefined;
        }
        try {
            return JSON.parse(text);
        }
        catch {
            throw new Error('Failed to parse JSON response body');
        }
    }
    async postForm(endpoint, formData, options) {
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
            return undefined;
        }
        try {
            return JSON.parse(text);
        }
        catch {
            throw new Error('Failed to parse JSON response body');
        }
    }
    resolveFetch() {
        const fetcher = this.fetchImpl ?? globalThis.fetch;
        if (!fetcher) {
            throw new Error('fetch implementation is required for http delegate');
        }
        return fetcher;
    }
    async resolveHeaders(isJson) {
        const baseHeaders = this.headers ? await this.headers() : {};
        if (!isJson)
            return { ...baseHeaders };
        const headers = { ...baseHeaders };
        if (!Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }
    resolveUrl(endpoint) {
        if (!endpoint) {
            throw new Error('http delegate endpoint is required');
        }
        if (/^https?:\/\//i.test(endpoint))
            return endpoint;
        const trimmed = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${this.baseUrl}${trimmed}`;
    }
}
function mergeEndpoints(base, overrides) {
    if (!overrides)
        return base;
    return {
        describe: overrides.describe ?? base.describe,
        createTask: overrides.createTask ?? base.createTask,
        checkStatus: overrides.checkStatus ?? base.checkStatus,
        getResult: overrides.getResult ?? base.getResult,
        cancelTask: overrides.cancelTask ?? base.cancelTask,
        upload: overrides.upload ?? base.upload,
    };
}
function serializeOptions(options, context) {
    const payload = {};
    if (context && Object.keys(context).length > 0)
        payload.context = context;
    return Object.keys(payload).length > 0 ? payload : undefined;
}
function toAbortSignal(signal) {
    if (!signal)
        return undefined;
    if (signal instanceof AbortSignal)
        return signal;
    return undefined;
}
function cloneFormData(source) {
    const target = new FormData();
    for (const [key, value] of source.entries()) {
        target.append(key, value);
    }
    return target;
}
async function assertOk(response) {
    if (response.ok)
        return;
    let bodyText;
    try {
        bodyText = await response.text();
    }
    catch {
        bodyText = undefined;
    }
    const detail = bodyText ? ` body=${bodyText}` : '';
    throw new Error(`HTTP ${response.status} ${response.statusText}.${detail}`.trim());
}
