import { parseLocator } from '../../resource.ts';

const APIFRAME_SCHEME = 'apiframe';
const SUPPORTED_MODALITIES = new Set(['image', 'video', 'music']);

export type ApiframeModality = 'image' | 'video' | 'music';

export type ParsedApiframeLocator = {
  modality: ApiframeModality;
  model: string;
};

export function parseApiframeLocator(locator: string): ParsedApiframeLocator {
  const { scheme, url } = parseLocator(locator);
  if (scheme !== APIFRAME_SCHEME) {
    throw new Error(`Invalid apiframe locator: ${locator}`);
  }
  assertNoUserinfoQueryOrFragment(url, locator);

  const modality = normalizeApiframeModality(url.hostname, locator);
  const model = url.pathname.replace(/^\/+/, '');
  if (!model) {
    throw new Error(`apiframe locator model is required: ${locator}`);
  }

  return { modality, model };
}

function normalizeApiframeModality(hostname: string, locator: string): ApiframeModality {
  if (hostname === 'audio') return 'music';
  if (!SUPPORTED_MODALITIES.has(hostname)) {
    throw new Error(`apiframe locator modality must be image, video, or music: ${locator}`);
  }
  return hostname as ApiframeModality;
}

function assertNoUserinfoQueryOrFragment(url: URL, locator: string): void {
  if (url.username || url.password) {
    throw new Error(`apiframe locator must not include userinfo: ${locator}`);
  }
  if (url.search) {
    throw new Error(`apiframe locator must not include query: ${locator}`);
  }
  if (url.hash) {
    throw new Error(`apiframe locator must not include fragment: ${locator}`);
  }
}

export function canonicalizeApiframeLocator(locator: string): string {
  const parsed = parseApiframeLocator(locator);
  return `apiframe://${parsed.modality}/${parsed.model}`;
}
