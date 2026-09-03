import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_PIXVERSE_V6_MODELS,
  buildCrunPixverseV6RequestBody,
  crunProviderDefinition,
  getCrunPixverseV6Profile,
} from '../src/providers/crun/index.ts';

const T2V = 'pixverse/v6-t2v';
const I2V = 'pixverse/v6-i2v';
const R2V = 'pixverse/v6-r2v';
const locator = (model: string) => `crun:///${model}`;

describe('crun PixVerse V6 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers all three CRUN PixVerse V6 modes', () => {
    expect(CRUN_PIXVERSE_V6_MODELS).toEqual([T2V, I2V, R2V]);
    expect(getCrunPixverseV6Profile(T2V)).toMatchObject({
      operation: 'text-to-video', supportsAspectRatio: true, supportsMultiClip: true,
    });
    expect(getCrunPixverseV6Profile(I2V)).toMatchObject({
      operation: 'image-to-video', requiresImage: true, supportsAspectRatio: false,
    });
    expect(getCrunPixverseV6Profile(R2V)).toMatchObject({
      operation: 'reference-to-video', supportsReferenceImages: true,
      supportsMultiClip: false,
    });
  });

  it('describes mode-specific forms and defaults', async () => {
    const t2v = await crunProviderDefinition.describeResource({ locator: locator(T2V) });
    expect(t2v.metadata).toMatchObject({
      model: T2V, channel: 'pixverse-v6', mode: 'text-to-video', supportsResolution: true,
    });
    expect(t2v.formValues).toMatchObject({
      prompt: '', duration: 5, quality: '720p', aspectRatio: '16:9',
      generateAudio: true, generateMultiClip: false,
    });

    const i2v = await crunProviderDefinition.describeResource({ locator: locator(I2V) });
    expect(i2v.formSchema.properties.image['x-component-props']).toMatchObject({
      accept: 'image/*', multiple: false,
    });
    expect(i2v.formValues).not.toHaveProperty('aspectRatio');

    const r2v = await crunProviderDefinition.describeResource({ locator: locator(R2V) });
    expect(r2v.formSchema.properties.referenceImages['x-component-props'].accept).toBe('image/*');
    expect(r2v.formValues).toMatchObject({
      referenceImages: [], referenceNames: [], referenceTypes: [],
    });
  });

  it('builds text-to-video and image-to-video requests', () => {
    expect(buildCrunPixverseV6RequestBody(T2V, {
      prompt: 'cinematic city at night', duration: 15, quality: '1080P',
      aspectRatio: '21:9', generateAudio: true, generateMultiClip: true, seed: 123,
    })).toEqual({
      model: T2V,
      input: {
        prompt: 'cinematic city at night', duration: 15, quality: '1080p',
        aspect_ratio: '21:9', generate_audio_switch: true,
        generate_multi_clip_switch: true, seed: 123,
      },
    });

    expect(buildCrunPixverseV6RequestBody(I2V, {
      prompt: 'the subject turns toward camera',
      image: ['https://example.com/start.webp'], duration: 8, quality: '720p',
      generateAudio: false, generateMultiClip: false, templateId: 42,
    })).toEqual({
      model: I2V,
      input: {
        prompt: 'the subject turns toward camera', duration: 8, quality: '720p',
        image: 'https://example.com/start.webp', template_id: 42,
        generate_audio_switch: false, generate_multi_clip_switch: false,
      },
    });
  });

  it('builds named reference-to-video requests', () => {
    expect(buildCrunPixverseV6RequestBody(R2V, {
      prompt: '@hero walks through @forest',
      referenceImages: [
        { url: 'https://example.com/hero.png', refName: 'hero', type: 'subject' },
        'https://example.com/forest.jpg',
      ],
      referenceNames: ['', 'forest'],
      referenceTypes: ['', 'background'],
      duration: 6, quality: '540p', aspectRatio: '16:9', generateAudio: true,
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: R2V,
      input: {
        prompt: '@hero walks through @forest', duration: 6, quality: '540p',
        aspect_ratio: '16:9',
        reference_images: [
          { url: 'https://example.com/hero.png', ref_name: 'hero', type: 'subject' },
          { url: 'https://example.com/forest.jpg', ref_name: 'forest', type: 'background' },
        ],
        generate_audio_switch: true,
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('validates duration, quality, inputs, references, ratio and seed', () => {
    expect(() => buildCrunPixverseV6RequestBody(T2V, {
      prompt: 'bad duration', duration: 16,
    })).toThrow('duration must be an integer from 1 to 15');
    expect(() => buildCrunPixverseV6RequestBody(T2V, {
      prompt: 'bad quality', quality: '4K',
    })).toThrow('quality must be one of: 360p, 540p, 720p, 1080p');
    expect(() => buildCrunPixverseV6RequestBody(I2V, {
      prompt: 'missing image', image: [],
    })).toThrow('requires exactly one starting image');
    expect(() => buildCrunPixverseV6RequestBody(R2V, {
      prompt: 'missing references', referenceImages: [],
    })).toThrow('requires 1 to 7 reference images');
    expect(() => buildCrunPixverseV6RequestBody(R2V, {
      prompt: 'bad role', referenceImages: [{ url: 'https://example.com/a.png', type: 'style' }],
    })).toThrow('type must be subject or background');
    expect(() => buildCrunPixverseV6RequestBody(T2V, {
      prompt: 'bad ratio', aspectRatio: 'auto',
    })).toThrow('aspect_ratio must be one of');
    expect(() => buildCrunPixverseV6RequestBody(T2V, {
      prompt: 'bad seed', seed: -1,
    })).toThrow('seed must be an integer from 0 to 2147483647');
  });

  it('creates a PixVerse task and normalizes the video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'pixverse-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(T2V), payload: { prompt: 'cinematic ocean' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('pixverse-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'pixverse-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/pixverse-v6.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(T2V), taskId: 'pixverse-task-1',
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
