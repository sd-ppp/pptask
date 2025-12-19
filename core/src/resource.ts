import type { ProviderScheme } from './types.ts';

export type ParsedLocator = {
  scheme: ProviderScheme;
  url: URL;
};

export function parseLocator(locator: string): ParsedLocator {
  const url = createUrl(locator);
  const scheme = normalizeScheme(url.protocol);
  return { scheme, url };
}

export function normalizeScheme(scheme: string): ProviderScheme {
  return scheme.replace(/:\s*$/, '').toLowerCase();
}

function createUrl(locator: string): URL {
  try {
    return new URL(locator);
  } catch {
    throw new Error(`Invalid locator: ${locator}`);
  }
}
