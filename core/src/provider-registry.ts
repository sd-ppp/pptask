import { normalizeScheme } from './resource.ts';
import type {
  ProviderDefinition,
  ProviderScheme,
  UploadProviderDefinition,
} from './types.ts';

const providers = new Map<ProviderScheme, ProviderDefinition>();
const uploadProviders = new Map<ProviderScheme, UploadProviderDefinition>();

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

export function registerUploadProvider(scheme: string, definition: UploadProviderDefinition): void {
  if (!definition) {
    throw new Error('upload provider definition is required');
  }
  const normalized = normalizeScheme(scheme);
  uploadProviders.set(normalized, definition);
}

export function getUploadProvider(scheme: string): UploadProviderDefinition | undefined {
  const normalized = normalizeScheme(scheme);
  return uploadProviders.get(normalized);
}

export function ensureUploadProvider(scheme: string): UploadProviderDefinition {
  const provider = getUploadProvider(scheme);
  if (!provider) {
    throw new Error(`No upload provider registered for name: ${normalizeScheme(scheme)}`);
  }
  return provider;
}

export function listUploadProviders(): ProviderScheme[] {
  return Array.from(uploadProviders.keys());
}
