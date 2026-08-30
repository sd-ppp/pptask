import { parseLocator } from '../../resource.ts';

const KIE_SCHEME = 'kie';
const MARKET_HOST = 'market';

export type ParsedKieLocator = {
  model: string;
};

export function parseKieLocator(locator: string): ParsedKieLocator {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== KIE_SCHEME) {
    throw new Error(`Invalid kie locator: ${locator}`);
  }
  assertNoUserinfoQueryOrFragment(url, locator);

  if (url.hostname !== MARKET_HOST) {
    throw new Error(`kie locator host must be "${MARKET_HOST}": ${locator}`);
  }

  const model = url.pathname.replace(/^\/+/, '');
  if (!model) {
    throw new Error(`kie locator model is required: ${locator}`);
  }

  return { model };
}

function assertNoUserinfoQueryOrFragment(url: URL, locator: string): void {
  if (url.username || url.password) {
    throw new Error(`kie locator must not include userinfo: ${locator}`);
  }
  if (url.search) {
    throw new Error(`kie locator must not include query: ${locator}`);
  }
  if (url.hash) {
    throw new Error(`kie locator must not include fragment: ${locator}`);
  }
}

/**
 * Reconstructs the canonical `kie://market/{model}` form from a parsed
 * locator. Registry lookups must canonicalize before keying into the
 * describe/whitelist maps (which are always populated with this canonical
 * shape) so that any raw locator string that still parses to the same model
 * (e.g. containing a doubled slash) resolves consistently, mirroring
 * `canonicalizeApiframeLocator`.
 */
export function canonicalizeKieLocator(locator: string): string {
  const { model } = parseKieLocator(locator);
  return `${KIE_SCHEME}://${MARKET_HOST}/${model}`;
}
