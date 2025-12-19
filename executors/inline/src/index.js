import { describeResource as coreDescribeResource, upload as coreUpload, } from '../../../core/src/index.ts';
import { createHttpDelegate } from './http-delegate.ts';
import { createTaskHandle } from './task-runner.ts';
const DEFAULT_HTTP_POLL_INTERVAL = 1500;
export function createInlineExecutor(config) {
    const baseConfig = config.platformConfig;
    if (config.mode === 'local') {
        return createLocalInlineExecutor(baseConfig);
    }
    return createHttpInlineExecutor(config, baseConfig);
}
function createLocalInlineExecutor(source) {
    return {
        async describe({ locator, options }) {
            const resolvedConfig = resolveConfigForLocator(source, locator);
            return coreDescribeResource({
                locator,
                platformConfig: resolvedConfig,
                options: toTaskRequestOptions(options),
            });
        },
        run(params) {
            const resolvedConfig = resolveConfigForLocator(source, params.locator);
            return createTaskHandle(params.locator, params.payload ?? {}, resolvedConfig, params.options, undefined);
        },
        async upload({ locator, formData, options }) {
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
function createHttpInlineExecutor(config, source) {
    const delegate = createHttpDelegate({
        baseUrl: config.baseUrl,
        endpoints: config.endpoints,
        headers: config.headers,
        fetchImpl: config.fetchImpl,
    });
    const pollInterval = config.pollIntervalMs ?? DEFAULT_HTTP_POLL_INTERVAL;
    return {
        async describe({ locator, options }) {
            const resolvedConfig = resolveConfigForLocator(source, locator);
            return delegate.describe({
                locator,
                platformConfig: resolvedConfig,
                options: toTaskRequestOptions(options),
                context: options?.context,
            });
        },
        run(params) {
            const resolvedConfig = resolveConfigForLocator(source, params.locator);
            return createTaskHandle(params.locator, params.payload ?? {}, resolvedConfig, params.options, pollInterval, delegate);
        },
        async upload({ locator, formData, options }) {
            const resolvedConfig = resolveConfigForLocator(source, locator);
            const result = await delegate.upload({
                locator,
                formData,
                platformConfig: resolvedConfig,
                options: toTaskRequestOptions(options),
            });
            return result.url;
        },
    };
}
function toTaskRequestOptions(options) {
    if (!options)
        return undefined;
    if (!options.signal)
        return undefined;
    return {
        signal: options.signal,
    };
}
function resolveConfigForLocator(source, locator) {
    const base = typeof source === 'function' ? source(locator) : source;
    return cloneConfig(base);
}
function cloneConfig(config) {
    if (!config)
        return undefined;
    return { ...config };
}
