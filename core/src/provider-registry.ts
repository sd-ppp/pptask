import { normalizeScheme } from './resource.ts';
import type { ProviderDefinition, ProviderScheme } from './types.ts';

const providers = new Map<ProviderScheme, ProviderDefinition>();

export function registerProvider(scheme: string, definition: ProviderDefinition): void {
  if (!definition) {
    throw new Error('provider definition is required');
  }
  const normalized = normalizeScheme(scheme);
  providers.set(normalized, definition);
}

export function unregisterProvider(scheme: string): void {
  const normalized = normalizeScheme(scheme);
  providers.delete(normalized);
}

export function getProvider(scheme: string): ProviderDefinition | undefined {
  const normalized = normalizeScheme(scheme);
  return providers.get(normalized);
}

export function ensureProvider(scheme: string): ProviderDefinition {
  const provider = getProvider(scheme);
  if (!provider) {
    throw new Error(`No provider registered for scheme: ${normalizeScheme(scheme)}`);
  }
  return provider;
}

export function listProviders(): ProviderScheme[] {
  return Array.from(providers.keys());
}
