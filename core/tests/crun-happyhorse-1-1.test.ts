import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_HAPPYHORSE_11_MODELS,
  buildCrunHappyHorse11RequestBody,
  crunProviderDefinition,
  getCrunHappyHorse11Profile,
} from '../src/providers/crun/index.ts';

const T2V = 'happyhorse-1-1-t2v';
const I2V = 'happyhorse-1-1-i2v';
const R2V = 'happyhorse-1-1-r2v';
const locator = (model: string) => `crun:///${model}`;

describe('crun HappyHorse 1.1 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers all three official HappyHorse 1.1 modes', () => {
    expect(CRUN_HAPPYHORSE_11_MODELS).toEqual([T2V, I2V, R2V]);
    expect(getCrunHappyHorse11Profile(T2V)).toMatchObject({
      operation: 'text-to-video', requiresImage: false, supportsAspectRatio: true,
    });
    expect(getCrunHappyHorse11Profile(I2V)).toMatchObject({
      operation: 'image-to-video', requiresImage: true, supportsAspectRatio: false,
    });
    expect(getCrunHappyHorse11Profile(R2V)).toMatchObject({
      operation: 'reference-to-video', supportsMultipleReferences: true,
      supportsAspectRatio: true,
    });
  });

  it('describes mode-specific forms and defaults', async () => {
    const t2v = await crunProviderDefinition.describeResource({ locator: locator(T2V) });
    expect(t2v.metadata).toMatchObject({
      model: T2V, channel: 'happyhorse-1.1', mode: 'text-to-video',
      supportsResolution: true,
    });
    expect(t2v.formValues).toMatchObject({
      prompt: '', resolution: '720P', duration: 5, aspectRatio: '16:9',
    });

    const i2v = await crunProviderDefinition.describeResource({ locator: locator(I2V) });
    expect(i2v.formSchema.properties.imgUrls['x-component-props']).toMatchObject({
      accept: 'image/*', multiple: false,
    });
    expect(i2v.formValues).not.toHaveProperty('aspectRatio');

    const r2v = await crunProviderDefinition.describeResource({ locator: locator(R2V) });
    expect(r2v.formValues).toMatchObject({ imgUrls: [], aspectRatio: '16:9' });
  });

  it('builds text-to-video and image-to-video requests', () => {
    expect(buildCrunHappyHorse11RequestBody(T2V, {
      prompt: 'cinematic horse running at sunrise', duration: 15,
      resolution: '1080p', aspectRatio: '21:9',
    })).toEqual({
      model: T2V,
      input: {
        prompt: 'cinematic horse running at sunrise', resolution: '1080P', duration: 15,
        aspect_ratio: '21:9', region: 'global', input_compliance: 'enable',
        output_compliance: 'enable',
      },
    });

    expect(buildCrunHappyHorse11RequestBody(I2V, {
      prompt: 'the subject turns toward camera',
      imgUrls: ['https://example.com/start.webp'], resolution: '480P', duration: 3,
    })).toEqual({
      model: I2V,
      input: {
        prompt: 'the subject turns toward camera', img_urls: ['https://example.com/start.webp'],
        resolution: '480P', duration: 3, region: 'global',
        input_compliance: 'enable', output_compliance: 'enable',
      },
    });
  });

  it('builds reference-to-video requests with callback', () => {
    expect(buildCrunHappyHorse11RequestBody(R2V, {
      prompt: 'keep the two subjects consistent in a fantasy riding scene',
      referenceImages: [
        'https://example.com/rider.png', 'https://example.com/horse.jpg',
      ],
      resolution: '720P', duration: 8, aspectRatio: '16:9',
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: R2V,
      input: {
        prompt: 'keep the two subjects consistent in a fantasy riding scene',
        img_urls: ['https://example.com/rider.png', 'https://example.com/horse.jpg'],
        resolution: '720P', duration: 8, aspect_ratio: '16:9', region: 'global',
        input_compliance: 'enable', output_compliance: 'enable',
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('validates prompt, duration, resolution, images and aspect ratio', () => {
    expect(() => buildCrunHappyHorse11RequestBody(T2V, { prompt: ' ' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunHappyHorse11RequestBody(T2V, {
      prompt: 'bad duration', duration: 16,
    })).toThrow('duration must be an integer from 3 to 15');
    expect(() => buildCrunHappyHorse11RequestBody(T2V, {
      prompt: 'bad resolution', resolution: '4K',
    })).toThrow('resolution must be one of: 480P, 720P, 1080P');
    expect(() => buildCrunHappyHorse11RequestBody(I2V, {
      prompt: 'missing image', imgUrls: [],
    })).toThrow('requires exactly one first-frame image');
    expect(() => buildCrunHappyHorse11RequestBody(R2V, {
      prompt: 'missing references', imgUrls: [],
    })).toThrow('requires 1 to 9 reference images');
    expect(() => buildCrunHappyHorse11RequestBody(T2V, {
      prompt: 'bad ratio', aspectRatio: 'auto',
    })).toThrow('aspect_ratio must be one of');
  });

  it('creates a HappyHorse task and normalizes the video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'happyhorse-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(T2V), payload: { prompt: 'cinematic horse' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('happyhorse-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'happyhorse-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/happyhorse-1-1.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(T2V), taskId: 'happyhorse-task-1',
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
