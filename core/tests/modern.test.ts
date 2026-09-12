import { afterEach, describe, expect, it, vi } from 'vitest';
import { listProviders } from '../src/index.ts';
import {
  fishProviderDefinition,
  tavusProviderDefinition,
  MODERN_PROVIDER_METADATA,
  listModernCatalog,
} from '../src/providers/modern/index.ts';

describe('modern provider adapters', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('registers the expanded provider schemes', () => {
    expect(listProviders()).toEqual(expect.arrayContaining([
      'fish', 'deepinfra', 'openrouter', 'tavus', 'scenario', 'xai', 'heygen', 'did',
    ]));
    expect(MODERN_PROVIDER_METADATA.cloudflare.catalogSource).toBe('account');
    expect(Object.keys(MODERN_PROVIDER_METADATA).every(scheme => listProviders().includes(scheme))).toBe(true);
  });

  it('normalizes a Fish Audio catalog response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: 'voice-1', title: 'Test voice', description: 'demo' }],
    }), { status: 200 })));
    const result = await listModernCatalog('fish', { catalogURL: 'https://example.test/models' });
    expect(result).toEqual([{ id: 'voice-1', name: 'voice-1', description: 'demo', raw: { id: 'voice-1', title: 'Test voice', description: 'demo' } }]);
  });

  it('normalizes nested model and voice catalogs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { avatars: [{ avatar_id: 'a1', name: 'Avatar' }] } }), { status: 200 })));
    const result = await listModernCatalog('heygen', { catalogURL: 'https://example.test/avatars', apiKey: 'key' });
    expect(result[0].id).toBe('a1');
  });

  it('describes Fish Audio as a task-family schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    const result = await fishProviderDefinition.describeResource({ locator: 'fish:///v1/tts', platformConfig: { openapiURL: 'https://example.test/openapi' } });
    expect(result.metadata.describeGranularity).toBe('operation');
    expect(result.formSchema.properties).toHaveProperty('text');
  });

  it('runs Tavus through create, status, and result lifecycle', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ video_id: 'vid-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed', download_url: 'https://cdn.test/video.mp4' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const created = await tavusProviderDefinition.createTask({ locator: 'tavus:///v2/videos', payload: { script: 'hello' }, platformConfig: { apiKey: 'key' } });
    expect(created.mode).toBe('async');
    if (created.mode !== 'async') throw new Error('expected async task');
    const result = await tavusProviderDefinition.getResult!({ locator: 'tavus:///v2/videos', taskId: created.task.taskId, platformConfig: { apiKey: 'key' } });
    expect(result.outputs[0].url).toBe('https://cdn.test/video.mp4');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
