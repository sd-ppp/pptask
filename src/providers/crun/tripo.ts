import type { ImageModelV4Result } from '@ai-sdk/provider';

export const TRIPO_MODEL = 'tripo-3d-3.1';
const flags = ['texture', 'pbr', 'quad', 'smart_low_poly', 'auto_size'];

export function buildTripoRequestBody(payload: Record<string, any>) {
  const input: Record<string, any> = {};
  if (typeof payload.prompt === 'string' && payload.prompt.trim()) input.prompt = payload.prompt.trim();
  if (Array.isArray(payload.image_urls) && payload.image_urls.length) input.image_urls = payload.image_urls;
  const views = payload.multiview_image_urls;
  if (views && typeof views === 'object' && !Array.isArray(views)) {
    const entries = Object.entries(views).filter(([, value]) => value !== '' && value != null);
    if (entries.length) {
      if (entries.length < 2) throw new Error('Tripo multiview requires at least two views');
      if (entries.some(([key]) => !['front', 'back', 'left', 'right'].includes(key))) throw new Error('Invalid Tripo view');
      input.multiview_image_urls = Object.fromEntries(entries);
    }
  }
  if (Object.keys(input).length !== 1) throw new Error('Tripo requires exactly one of prompt, image_urls or multiview_image_urls');
  if (input.prompt?.length > 1024) throw new Error('Tripo prompt exceeds 1024 characters');
  if (input.image_urls?.length > 1) throw new Error('Tripo image_urls accepts one image');
  const urls = input.image_urls ?? Object.values(input.multiview_image_urls ?? {});
  for (const value of urls) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) throw new Error('Tripo images require HTTP URLs');
  }
  if (payload.negative_prompt) {
    if (typeof payload.negative_prompt !== 'string' || payload.negative_prompt.length > 255) throw new Error('Invalid Tripo negative_prompt');
    input.negative_prompt = payload.negative_prompt;
  }
  for (const key of flags) {
    if (payload[key] === undefined) continue;
    if (typeof payload[key] !== 'boolean') throw new Error(`Tripo ${key} must be boolean`);
    input[key] = payload[key];
  }
  for (const [key, options] of Object.entries({ texture_quality: ['standard', 'detailed', 'extreme'], geometry_quality: ['standard', 'detailed'] })) {
    if (payload[key] === undefined) continue;
    if (!options.includes(payload[key])) throw new Error(`Invalid Tripo ${key}`);
    input[key] = payload[key];
  }
  if (payload.face_limit !== undefined) {
    if (!Number.isInteger(payload.face_limit) || payload.face_limit < 50) throw new Error('Tripo face_limit must be an integer >= 50');
    input.face_limit = payload.face_limit;
  }
  return { model: TRIPO_MODEL, input };
}

// The SDK has no 3D model interface; keep file URLs in metadata on the image job transport.
export function tripoResult(output: any, modelId: string, metadata: any = {}): ImageModelV4Result {
  const urls = new Set<string>();
  function visit(value: any): void {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) { urls.add(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === 'object') Object.values(value).forEach(visit);
  }
  visit(output?.media_urls);
  visit(output?.media_info);
  if (!urls.size) throw new Error('CRUN Tripo returned no model files');
  return {
    images: [], warnings: [],
    providerMetadata: { crun: { ...metadata, files: [...urls].map(url => ({ url, mediaType: 'application/octet-stream' })) } },
    response: { timestamp: new Date(), modelId, headers: undefined },
  };
}
