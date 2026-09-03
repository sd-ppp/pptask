import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProviders, listUploadProviders, upload } from '../src/index.ts';
import {
  buildCrunGptImage2RequestBody,
  buildCrunNanoBananaRequestBody,
  crunProviderDefinition,
} from '../src/providers/crun/index.ts';

const NANO_2 = 'google/nano-banana-2';
const NANO_2_V2 = 'google/nano-banana-2-v2';
const NANO_2_LITE = 'google/nano-banana-2-lite';
const GPT_IMAGE_2 = 'openai/gpt-image-2';
const GPT_IMAGE_2_STABLE = 'openai/gpt-image-2-stable';
const GPT_IMAGE_2_PREMIUM = 'openai/gpt-image-2-premium';
const locator = (model: string) => `crun:///${model}`;

describe('crun provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers independently and describes each Nano Banana channel', async () => {
    expect(listProviders()).toContain('crun');
    expect(listUploadProviders()).toContain('crun');

    const standard = await crunProviderDefinition.describeResource({ locator: locator(NANO_2) });
    expect(standard.provider).toBe('crun');
    expect(standard.metadata).toMatchObject({
      scheme: 'crun',
      model: NANO_2,
      protocol: 'crun-unified-async-task',
      supportsResolution: true,
      supportsOutputFormat: true,
      supportsGoogleSearch: true,
    });
    expect(standard.formSchema.properties).toHaveProperty('resolution');
    expect(standard.formSchema.properties).toHaveProperty('outputFormat');
    expect(standard.formSchema.properties).toHaveProperty('googleSearch');
    expect(standard.formSchema.properties.imgUrls['x-component']).toBe('Upload');
    expect(standard.recommendUploadProvider).toBe('crun');

    const v2 = await crunProviderDefinition.describeResource({ locator: locator(NANO_2_V2) });
    expect(v2.metadata.channel).toBe('cost-optimized-v2');
    expect(v2.formSchema.properties).not.toHaveProperty('outputFormat');
    expect(v2.formSchema.properties).not.toHaveProperty('googleSearch');

    const lite = await crunProviderDefinition.describeResource({ locator: locator(NANO_2_LITE) });
    expect(lite.metadata.channel).toBe('lite');
    expect(lite.formSchema.properties).not.toHaveProperty('resolution');
    expect(lite.formSchema.properties).not.toHaveProperty('outputFormat');
  });

  it('describes GPT Image 2 with only its documented standard fields', async () => {
    const result = await crunProviderDefinition.describeResource({ locator: locator(GPT_IMAGE_2) });

    expect(result.metadata).toMatchObject({
      scheme: 'crun',
      model: GPT_IMAGE_2,
      channel: 'standard',
      supportsResolution: false,
      supportsOutputFormat: false,
      supportsGoogleSearch: false,
    });
    expect(Object.keys(result.formSchema.properties)).toEqual([
      'prompt', 'imgUrls', 'aspectRatio', 'callbackUrl',
    ]);
    expect(result.formSchema.properties.imgUrls['x-component']).toBe('Upload');
    expect(result.formValues).toEqual({
      prompt: '', imgUrls: [], aspectRatio: '1:1', callbackUrl: '',
    });
    expect(result.recommendUploadProvider).toBe('crun');
  });

  it('describes the Stable and Premium channel-specific fields', async () => {
    const stable = await crunProviderDefinition.describeResource({
      locator: locator(GPT_IMAGE_2_STABLE),
    });
    expect(stable.metadata).toMatchObject({
      model: GPT_IMAGE_2_STABLE,
      channel: 'stable',
      supportsResolution: false,
      supportsOutputFormat: true,
    });
    expect(Object.keys(stable.formSchema.properties)).toEqual([
      'prompt', 'imgUrls', 'aspectRatio', 'quality', 'background',
      'outputFormat', 'moderation', 'callbackUrl',
    ]);
    expect(stable.formValues).toMatchObject({
      quality: 'medium', background: 'auto', outputFormat: 'png', moderation: 'low',
    });

    const premium = await crunProviderDefinition.describeResource({
      locator: locator(GPT_IMAGE_2_PREMIUM),
    });
    expect(premium.metadata).toMatchObject({
      model: GPT_IMAGE_2_PREMIUM,
      channel: 'premium',
      supportsResolution: true,
      supportsOutputFormat: false,
    });
    expect(Object.keys(premium.formSchema.properties)).toEqual([
      'prompt', 'imgUrls', 'aspectRatio', 'quality', 'resolution', 'callbackUrl',
    ]);
    expect(premium.formValues).toMatchObject({ quality: 'high', resolution: '2K' });
  });

  it('uploads a local image through the official presigned URL flow', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({
        code: 200,
        message: 'success',
        data: {
          presigned_url: 'https://upload.example.com/reference?signature=abc',
          file_url: 'https://resource.crun.ai/reference.png',
        },
      }))
      .mockResolvedValueOnce(mockResponse('', 200, 'text/plain'));

    const formData = new FormData();
    formData.append('file', new Blob(['png-data'], { type: 'image/png' }), 'reference.png');
    const result = await upload({
      uploadProvider: 'crun',
      formData,
      platformConfig: { apiKey: 'crun-test-key' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.crun.ai/api/v1/client/files/upload-url?content_type=image%2Fpng&ext=.png'
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: { 'X-API-KEY': 'crun-test-key', Accept: 'application/json' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://upload.example.com/reference?signature=abc'
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
    });
    expect(result).toMatchObject({
      provider: 'crun',
      url: 'https://resource.crun.ai/reference.png',
    });
  });

  it('creates a Nano Banana 2 task with the unified CRUN protocol', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      code: 200,
      message: 'success',
      data: { task_id: 'task_nano_2_123' },
    }));

    const result = await crunProviderDefinition.createTaskAsync!({
      locator: locator(NANO_2),
      payload: {
        prompt: 'Create a cinematic 4K poster',
        imgUrls: ['https://assets.example.com/one.png'],
        resolution: '4k',
        aspectRatio: '16:9',
        outputFormat: 'jpeg',
        googleSearch: true,
        callbackUrl: 'https://example.com/crun-callback',
      },
      platformConfig: { apiKey: 'crun-test-key' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.crun.ai/api/v1/client/job/CreateTask');
    expect(requestInit.headers).toMatchObject({
      'X-API-KEY': 'crun-test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: NANO_2,
      input: {
        prompt: 'Create a cinematic 4K poster',
        img_urls: ['https://assets.example.com/one.png'],
        aspect_ratio: '16:9',
        resolution: '4K',
        output_format: 'jpg',
        google_search: true,
      },
      callback_url: 'https://example.com/crun-callback',
    });
    expect(result).toMatchObject({ provider: 'crun', taskId: 'task_nano_2_123', status: 'pending' });
  });

  it('creates a GPT Image 2 generation or editing task', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      code: 200,
      message: 'success',
      data: { task_id: 'task_gpt_image_2_123' },
    }));

    const result = await crunProviderDefinition.createTaskAsync!({
      locator: locator(GPT_IMAGE_2),
      payload: {
        prompt: '把参考图改成杂志封面风格',
        imgUrls: ['https://assets.example.com/reference.png'],
        aspectRatio: '3:2',
        callbackUrl: 'https://example.com/crun-callback',
        resolution: '4K',
        quality: 'high',
        outputFormat: 'png',
      },
      platformConfig: { apiKey: 'crun-test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.crun.ai/api/v1/client/job/CreateTask');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: GPT_IMAGE_2,
      input: {
        prompt: '把参考图改成杂志封面风格',
        img_urls: ['https://assets.example.com/reference.png'],
        aspect_ratio: '3:2',
      },
      callback_url: 'https://example.com/crun-callback',
    });
    expect(result).toMatchObject({
      provider: 'crun', taskId: 'task_gpt_image_2_123', status: 'pending',
    });
  });

  it('builds Stable and Premium requests without mixing channel fields', () => {
    expect(buildCrunGptImage2RequestBody(GPT_IMAGE_2_STABLE, {
      prompt: 'transparent product image',
      imgUrls: ['https://assets.example.com/product.png'],
      aspectRatio: '2:3',
      quality: 'medium',
      background: 'transparent',
      outputFormat: 'webp',
      moderation: 'low',
      resolution: '4K',
    })).toEqual({
      model: GPT_IMAGE_2_STABLE,
      input: {
        prompt: 'transparent product image',
        img_urls: ['https://assets.example.com/product.png'],
        aspect_ratio: '2:3',
        quality: 'medium',
        background: 'transparent',
        output_format: 'webp',
        moderation: 'low',
      },
    });

    expect(buildCrunGptImage2RequestBody(GPT_IMAGE_2_PREMIUM, {
      prompt: 'premium editorial image',
      imgUrls: ['https://assets.example.com/reference.png'],
      aspectRatio: '1:1',
      quality: 'high',
      resolution: '4k',
      background: 'transparent',
      outputFormat: 'png',
    })).toEqual({
      model: GPT_IMAGE_2_PREMIUM,
      input: {
        prompt: 'premium editorial image',
        img_urls: ['https://assets.example.com/reference.png'],
        aspect_ratio: '1:1',
        quality: 'high',
        resolution: '4K',
      },
    });
  });

  it('removes unsupported v2 and Lite parameters', () => {
    expect(buildCrunNanoBananaRequestBody(NANO_2_V2, {
      prompt: 'cost optimized',
      resolution: '2K',
      outputFormat: 'png',
      googleSearch: true,
    })).toEqual({
      model: NANO_2_V2,
      input: { prompt: 'cost optimized', resolution: '2K' },
    });

    expect(buildCrunNanoBananaRequestBody(NANO_2_LITE, {
      prompt: 'fast product image',
      aspectRatio: '1:1',
      resolution: '4K',
      outputFormat: 'png',
    })).toEqual({
      model: NANO_2_LITE,
      input: { prompt: 'fast product image', aspect_ratio: '1:1' },
    });
  });

  it('maps task status and normalizes successful media URLs', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      message: 'success',
      data: { task_id: 'task-1', status: 'running', result: null },
    }));
    const status = await crunProviderDefinition.checkStatus!({
      locator: locator(NANO_2),
      taskId: 'task-1',
      platformConfig: { apiKey: 'crun-test-key' },
    });
    expect(status.status).toBe('running');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      message: 'success',
      data: {
        task_id: 'task-1',
        status: 'success',
        credits: 12,
        result: {
          code: 200,
          message: 'generation success',
          media_urls: [
            'https://cdn.example.com/result.png?expires=123',
            { url: 'https://cdn.example.com/result.jpg' },
          ],
        },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(NANO_2),
      taskId: 'task-1',
      platformConfig: { apiKey: 'crun-test-key' },
    });
    expect(result.costCoins).toBe(12);
    expect(result.outputs).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/result.png?expires=123', mimeType: 'image/png' }),
      expect.objectContaining({ url: 'https://cdn.example.com/result.jpg', mimeType: 'image/jpeg' }),
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain('TaskInfo?task_id=task-1');
  });

  it('validates locators, credentials, URLs, and business errors', async () => {
    await expect(
      crunProviderDefinition.describeResource({ locator: 'ppio:///google/nano-banana-2' })
    ).rejects.toThrow('crun provider received unsupported locator');
    await expect(
      crunProviderDefinition.describeResource({ locator: 'crun:///google/unknown' })
    ).rejects.toThrow('Unsupported CRUN model');
    await expect(
      crunProviderDefinition.createTaskAsync!({
        locator: locator(NANO_2), payload: { prompt: 'test' },
      })
    ).rejects.toThrow('crun provider requires apiKey');

    expect(() => buildCrunNanoBananaRequestBody(NANO_2, { prompt: '' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunNanoBananaRequestBody(NANO_2, {
      prompt: 'edit', imgUrls: ['data:image/png;base64,abc'],
    })).toThrow('must be an HTTP(S) URL');
    expect(() => buildCrunNanoBananaRequestBody(NANO_2, {
      prompt: 'test', callbackUrl: 'http://localhost/callback',
    })).toThrow('must be a public HTTPS URL');
    expect(() => buildCrunGptImage2RequestBody(GPT_IMAGE_2, { prompt: '' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunGptImage2RequestBody(GPT_IMAGE_2, {
      prompt: 'edit', imgUrls: ['data:image/png;base64,abc'],
    })).toThrow('must be an HTTP(S) URL');
    expect(() => buildCrunGptImage2RequestBody(NANO_2, { prompt: 'test' }))
      .toThrow('GPT Image 2 builder received unsupported model');
    expect(() => buildCrunGptImage2RequestBody(GPT_IMAGE_2_PREMIUM, {
      prompt: 'too many references',
      imgUrls: Array.from({ length: 15 }, (_, index) => `https://example.com/${index}.png`),
    })).toThrow('supports at most 14 reference images');
    expect(() => buildCrunGptImage2RequestBody(GPT_IMAGE_2_PREMIUM, {
      prompt: 'bad resolution', resolution: '8K',
    })).toThrow('resolution must be one of: 1K, 2K, 4K');

    fetchMock.mockResolvedValue(mockResponse({ code: 422, message: 'Invalid parameters' }));
    await expect(crunProviderDefinition.createTaskAsync!({
      locator: locator(NANO_2),
      payload: { prompt: 'test' },
      platformConfig: { apiKey: 'crun-test-key' },
    })).rejects.toThrow('Invalid parameters');
  });
});

function mockResponse(body: any, status = 200, contentType = 'application/json'): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': contentType }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  } as Response;
}
