import { parseLocator } from './resource.ts';
import { registerProvider as registerProviderInternal, unregisterProvider, listProviders, ensureProvider, getProvider, } from './provider-registry.ts';
import { replicateProviderDefinition } from './providers/replicate/index.ts';
import { runninghubProviderDefinition } from './providers/runninghub/index.ts';
export * from './types.ts';
export * from './providers/replicate/index.ts';
export * from './providers/runninghub/index.ts';
export * from './resource.ts';
export { unregisterProvider, listProviders, getProvider };
function ensureDefaultProvidersRegistered() {
    if (!getProvider('replicate')) {
        registerProviderInternal('replicate', replicateProviderDefinition);
    }
    if (!getProvider('runninghub')) {
        registerProviderInternal('runninghub', runninghubProviderDefinition);
    }
}
ensureDefaultProvidersRegistered();
export function registerProvider(scheme, definition) {
    registerProviderInternal(scheme, definition);
}
export async function describeResource(params) {
    const provider = resolveProvider(params.locator);
    return provider.describeResource(params);
}
export async function createTask(params) {
    const provider = resolveProvider(params.locator);
    return provider.createTask(params);
}
export async function checkStatus(params) {
    const provider = resolveProvider(params.locator);
    return provider.checkStatus(params);
}
export async function getResult(params) {
    const provider = resolveProvider(params.locator);
    return provider.getResult(params);
}
export async function cancelTask(params) {
    const provider = resolveProvider(params.locator);
    await provider.cancelTask(params);
}
export async function upload(params) {
    const provider = resolveProvider(params.locator);
    return provider.upload(params);
}
function resolveProvider(locator) {
    const { scheme } = parseLocator(locator);
    return ensureProvider(scheme);
}
