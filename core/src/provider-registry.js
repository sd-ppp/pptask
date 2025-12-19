import { normalizeScheme } from './resource.ts';
const providers = new Map();
export function registerProvider(scheme, definition) {
    if (!definition) {
        throw new Error('provider definition is required');
    }
    const normalized = normalizeScheme(scheme);
    providers.set(normalized, definition);
}
export function unregisterProvider(scheme) {
    const normalized = normalizeScheme(scheme);
    providers.delete(normalized);
}
export function getProvider(scheme) {
    const normalized = normalizeScheme(scheme);
    return providers.get(normalized);
}
export function ensureProvider(scheme) {
    const provider = getProvider(scheme);
    if (!provider) {
        throw new Error(`No provider registered for scheme: ${normalizeScheme(scheme)}`);
    }
    return provider;
}
export function listProviders() {
    return Array.from(providers.keys());
}
