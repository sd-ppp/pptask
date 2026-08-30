import { normalizeScheme } from './resource.ts';
import type {
  ProviderDefinition,
  ProviderScheme,
  UploadProviderDefinition,
} from './types.ts';

export type ProviderRegistry = {
  registerProvider(scheme: string, definition: ProviderDefinition): void;
  unregisterProvider(scheme: string): void;
  getProvider(scheme: string): ProviderDefinition | undefined;
  ensureProvider(scheme: string): ProviderDefinition;
  listProviders(): ProviderScheme[];
  registerUploadProvider(scheme: string, definition: UploadProviderDefinition): void;
  getUploadProvider(scheme: string): UploadProviderDefinition | undefined;
  ensureUploadProvider(scheme: string): UploadProviderDefinition;
  listUploadProviders(): ProviderScheme[];
};

export function createProviderRegistry(): ProviderRegistry {
  const providers = new Map<ProviderScheme, ProviderDefinition>();
  const uploadProviders = new Map<ProviderScheme, UploadProviderDefinition>();

  return {
    registerProvider(scheme, definition) {
      if (!definition) throw new Error('provider definition is required');
      providers.set(normalizeScheme(scheme), definition);
    },
    unregisterProvider(scheme) {
      providers.delete(normalizeScheme(scheme));
    },
    getProvider(scheme) {
      return providers.get(normalizeScheme(scheme));
    },
    ensureProvider(scheme) {
      const provider = providers.get(normalizeScheme(scheme));
      if (!provider) throw new Error(`No provider registered for scheme: ${normalizeScheme(scheme)}`);
      return provider;
    },
    listProviders() {
      return Array.from(providers.keys());
    },
    registerUploadProvider(scheme, definition) {
      if (!definition) throw new Error('upload provider definition is required');
      uploadProviders.set(normalizeScheme(scheme), definition);
    },
    getUploadProvider(scheme) {
      return uploadProviders.get(normalizeScheme(scheme));
    },
    ensureUploadProvider(scheme) {
      const provider = uploadProviders.get(normalizeScheme(scheme));
      if (!provider) throw new Error(`No provider registered for name: ${normalizeScheme(scheme)}`);
      return provider;
    },
    listUploadProviders() {
      return Array.from(uploadProviders.keys());
    },
  };
}

/** The compatibility singleton starts empty; built-ins are never registered implicitly. */
export const defaultProviderRegistry = createProviderRegistry();

export const registerProvider = defaultProviderRegistry.registerProvider;
export const unregisterProvider = defaultProviderRegistry.unregisterProvider;
export const getProvider = defaultProviderRegistry.getProvider;
export const ensureProvider = defaultProviderRegistry.ensureProvider;
export const listProviders = defaultProviderRegistry.listProviders;
export const registerUploadProvider = defaultProviderRegistry.registerUploadProvider;
export const getUploadProvider = defaultProviderRegistry.getUploadProvider;
export const ensureUploadProvider = defaultProviderRegistry.ensureUploadProvider;
export const listUploadProviders = defaultProviderRegistry.listUploadProviders;
