import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_VEO_31_MODELS,
  buildCrunVeo31RequestBody,
  crunProviderDefinition,
  getCrunVeo31Profile,
  isCrunVeo31Model,
} from '../src/providers/crun/index.ts';

const MODELS = [
  'google/veo3-1-t2v',
  'google/veo3-1-i2v',
  'google/veo3-1-fast-t2v',
  'google/veo3-1-fast-i2v',
  'google/veo3-1-fast-r2v',
  'google/veo3-1-lite-t2v',
  'google/veo3-1-lite-i2v',
  'google/veo3-1-lite-r2v',
] as const;
const locator = (model: string) => `crun:///${model}`;

describe('crun Google Veo 3.1 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers all eight official Veo 3.1 channels', () => {
    expect(CRUN_VEO_31_MODELS).toEqual(MODELS);
    for (const model of MODELS) expect(isCrunVeo31Model(model)).toBe(true);
    expect(getCrunVeo31Profile('google/veo3-1-t2v')).toMatchObject({
      channel: 'standard', operation: 'text-to-video', minImages: 0, maxImages: 0,
      durations: [4, 6, 8],
    });
    expect(getCrunVeo31Profile('google/veo3-1-fast-i2v')).toMatchObject({
      channel: 'fast', operation: 'image-to-video', minImages: 1, maxImages: 2,
    });
    expect(getCrunVeo31Profile('google/veo3-1-lite-r2v')).toMatchObject({
      channel: 'lite', operation: 'reference-to-video', minImages: 1, maxImages: 3,
      durations: [8],
    });
  });

  it('describes mode-specific forms and defaults', async () => {
    const t2v = await crunProviderDefinition.describeResource({
      locator: locator('google/veo3-1-t2v'),
    });
    expect(t2v.metadata).toMatchObject({
      channel: 'veo-3.1-standard', mode: 'text-to-video', supportsResolution: true,
    });
    expect(t2v.formValues).toEqual({
      prompt: '', duration: 8, resolution: '720p', aspectRatio: '16:9',
      translatePrompt: true, callbackUrl: '',
    });
    expect(t2v.formSchema.properties).not.toHaveProperty('imgUrls');

    const i2v = await crunProviderDefinition.describeResource({
      locator: locator('google/veo3-1-fast-i2v'),
    });
    expect(i2v.formValues).toMatchObject({ imgUrls: [], duration: 8 });
    expect(i2v.formSchema.properties.imgUrls['x-component-props'])
      .toMatchObject({ accept: 'image/*', multiple: true });

    const r2v = await crunProviderDefinition.describeResource({
      locator: locator('google/veo3-1-lite-r2v'),
    });
    expect(r2v.metadata).toMatchObject({
      channel: 'veo-3.1-lite', mode: 'reference-to-video',
    });
    expect(r2v.formSchema.properties.duration.enum).toEqual([{ label: '8s', value: 8 }]);
  });

  it('builds a standard text-to-video request', () => {
    expect(buildCrunVeo31RequestBody('google/veo3-1-t2v', {
      prompt: 'A paper boat crossing a neon city in the rain with native ambience',
      duration: 4,
      resolution: '1080P',
      aspectRatio: '9:16',
      translatePrompt: false,
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: 'google/veo3-1-t2v',
      input: {
        prompt: 'A paper boat crossing a neon city in the rain with native ambience',
        duration: 4,
        resolution: '1080p',
        translate_prompt: false,
        aspect_ratio: '9:16',
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('builds first-frame and first-last-frame image-to-video requests', () => {
    const one = buildCrunVeo31RequestBody('google/veo3-1-fast-i2v', {
      prompt: 'Animate the first frame with a slow camera push',
      imgUrls: ['https://example.com/start.png'],
      duration: 6,
    });
    expect(one.input.img_urls).toEqual(['https://example.com/start.png']);

    const two = buildCrunVeo31RequestBody('google/veo3-1-lite-i2v', {
      prompt: 'Create a smooth transition between the two frames',
      imgUrls: ['https://example.com/start.png', 'https://example.com/end.png'],
      duration: 8,
    });
    expect(two.input.img_urls).toHaveLength(2);
  });

  it('builds Fast and Lite reference-to-video requests with up to three images', () => {
    for (const model of ['google/veo3-1-fast-r2v', 'google/veo3-1-lite-r2v']) {
      expect(buildCrunVeo31RequestBody(model, {
        prompt: 'Keep the character and product consistent across the scene',
        referenceImages: [
          'https://example.com/character.png',
          'https://example.com/product.png',
          'https://example.com/style.png',
        ],
      }).input).toMatchObject({
        duration: 8,
        img_urls: [
          'https://example.com/character.png',
          'https://example.com/product.png',
          'https://example.com/style.png',
        ],
      });
    }
  });

  it('validates prompt, images, duration, resolution and aspect ratio', () => {
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-t2v', { prompt: ' ' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-i2v', {
      prompt: 'missing frame', imgUrls: [],
    })).toThrow('requires 1 to 2 images');
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-fast-r2v', {
      prompt: 'too many references',
      imgUrls: Array.from({ length: 4 }, (_, i) => `https://example.com/${i}.png`),
    })).toThrow('requires 1 to 3 images');
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-lite-r2v', {
      prompt: 'bad duration', imgUrls: ['https://example.com/ref.png'], duration: 6,
    })).toThrow('duration must be one of: 8');
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-t2v', {
      prompt: 'bad resolution', resolution: '4k',
    })).toThrow('resolution must be one of: 720p, 1080p');
    expect(() => buildCrunVeo31RequestBody('google/veo3-1-t2v', {
      prompt: 'bad ratio', aspectRatio: '1:1',
    })).toThrow('aspect_ratio must be one of: 16:9, 9:16');
  });

  it('creates a task and normalizes its native-audio video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'veo31-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator('google/veo3-1-fast-t2v'),
      payload: { prompt: 'cinematic video with synchronized dialogue' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('veo31-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'veo31-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/veo31.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator('google/veo3-1-fast-t2v'), taskId: 'veo31-task-1',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({ type: 'video', mimeType: 'video/mp4' }),
    ]);
  });
});

function mockResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}
