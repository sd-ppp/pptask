import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_IMAGE_UPSCALE_MODELS,
  buildCrunImageUpscaleRequestBody,
  crunProviderDefinition,
  getCrunImageUpscaleProfile,
} from '../src/providers/crun/index.ts';

const BASIC = 'image-upscale';
const PRO = 'image-upscale-pro';
const locator = (model: string) => `crun:///${model}`;

describe('crun Image Upscale provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('registers the basic and pro versions separately', () => {
    expect(CRUN_IMAGE_UPSCALE_MODELS).toEqual([BASIC, PRO]);
    expect(getCrunImageUpscaleProfile(BASIC)).toMatchObject({
      channel: 'basic', scaleFactors: [1, 2, 4], modes: ['clean', 'face'],
      outputFormats: ['png', 'jpg'],
    });
    expect(getCrunImageUpscaleProfile(PRO)).toMatchObject({
      channel: 'pro', clarityLevels: ['high', 'ultra'],
    });
  });

  it('describes version-specific forms and automatic local upload', async () => {
    const basic = await crunProviderDefinition.describeResource({ locator: locator(BASIC) });
    expect(basic.metadata).toMatchObject({
      model: BASIC, mode: 'image-upscale', channel: 'image-upscale-basic',
      supportsOutputFormat: true,
    });
    expect(basic.formValues).toMatchObject({
      imgUrls: [], scaleFactor: 'auto', mode: 'clean', outputFormat: 'png',
    });
    expect(basic.formSchema.properties.imgUrls['x-component-props']).toMatchObject({
      accept: 'image/*', multiple: false,
    });

    const pro = await crunProviderDefinition.describeResource({ locator: locator(PRO) });
    expect(pro.metadata).toMatchObject({ channel: 'image-upscale-pro' });
    expect(pro.formValues).toMatchObject({ imgUrls: [], clarity: 'high' });
    expect(pro.formValues).not.toHaveProperty('scaleFactor');
  });

  it('builds the documented basic request with automatic scale', () => {
    expect(buildCrunImageUpscaleRequestBody(BASIC, {
      imgUrls: ['https://example.com/source.jpg'], scaleFactor: 'auto',
    })).toEqual({
      model: BASIC,
      input: {
        img_urls: ['https://example.com/source.jpg'], mode: 'clean', output_format: 'png',
      },
    });
  });

  it('builds a configured basic request and callback', () => {
    expect(buildCrunImageUpscaleRequestBody(BASIC, {
      image: 'https://example.com/portrait.webp', scale_factor: 4,
      mode: 'face', outputFormat: 'jpg', callbackUrl: 'https://example.com/callback',
    })).toEqual({
      model: BASIC,
      input: {
        img_urls: ['https://example.com/portrait.webp'], scale_factor: 4,
        mode: 'face', output_format: 'jpg',
      },
      callback_url: 'https://example.com/callback',
    });
  });

  it('builds both pro clarity levels without basic-only fields', () => {
    expect(buildCrunImageUpscaleRequestBody(PRO, {
      imgUrls: ['https://example.com/product.png'], clarity: 'ultra',
    })).toEqual({
      model: PRO,
      input: { img_urls: ['https://example.com/product.png'], clarity: 'ultra' },
    });
  });

  it('validates source image and version-specific values', () => {
    expect(() => buildCrunImageUpscaleRequestBody(BASIC, {}))
      .toThrow('requires exactly one source image');
    expect(() => buildCrunImageUpscaleRequestBody(BASIC, {
      imgUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    })).toThrow('requires exactly one source image');
    expect(() => buildCrunImageUpscaleRequestBody(BASIC, {
      imgUrls: ['https://example.com/a.jpg'], scaleFactor: 3,
    })).toThrow('scale_factor must be auto or one of: 1, 2, 4');
    expect(() => buildCrunImageUpscaleRequestBody(BASIC, {
      imgUrls: ['https://example.com/a.jpg'], mode: 'anime',
    })).toThrow('mode must be one of: clean, face');
    expect(() => buildCrunImageUpscaleRequestBody(PRO, {
      imgUrls: ['https://example.com/a.jpg'], clarity: 'medium',
    })).toThrow('clarity must be one of: high, ultra');
  });

  it('creates a task and normalizes the result as an image', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, data: { task_id: 'upscale-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(PRO),
      payload: { imgUrls: ['https://example.com/source.jpg'], clarity: 'high' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('upscale-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'upscale-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/upscaled.png?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(PRO), taskId: 'upscale-task-1',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({ type: 'image', mimeType: 'image/png' }),
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
