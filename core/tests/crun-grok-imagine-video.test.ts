import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_GROK_IMAGINE_VIDEO_MODELS,
  buildCrunGrokImagineVideoRequestBody,
  crunProviderDefinition,
  isCrunGrokImagineVideoModel,
} from '../src/providers/crun/index.ts';

const MODEL = 'grok-imagine-video-1.5-preview';
const LOCATOR = `crun:///${MODEL}`;

describe('crun Grok Imagine Video 1.5 Preview provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers the official preview video model', () => {
    expect(CRUN_GROK_IMAGINE_VIDEO_MODELS).toEqual([MODEL]);
    expect(isCrunGrokImagineVideoModel(MODEL)).toBe(true);
    expect(isCrunGrokImagineVideoModel('grok-imagine/i2v')).toBe(false);
  });

  it('describes the image-to-video form and defaults', async () => {
    const result = await crunProviderDefinition.describeResource({ locator: LOCATOR });
    expect(result.metadata).toMatchObject({
      model: MODEL,
      channel: 'grok-imagine-video-1.5-preview',
      mode: 'image-to-video',
      supportsResolution: true,
    });
    expect(result.formValues).toEqual({
      prompt: '', imgUrls: [], aspectRatio: 'auto', resolution: '720p',
      duration: 6, callbackUrl: '',
    });
    expect(result.formSchema.properties.imgUrls['x-component-props']).toMatchObject({
      accept: 'image/*', multiple: false,
    });
  });

  it('builds the official image-to-video request body', () => {
    expect(buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'slow cinematic push-in with synchronized ambient audio',
      imgUrls: ['https://example.com/reference.png'],
      aspectRatio: 'AUTO', resolution: '720P', duration: 15,
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: MODEL,
      input: {
        prompt: 'slow cinematic push-in with synchronized ambient audio',
        img_urls: ['https://example.com/reference.png'],
        aspect_ratio: 'auto', resolution: '720p', duration: 15,
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('accepts the documented minimum duration and 480p resolution', () => {
    expect(buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'gentle motion', image: 'https://example.com/reference.webp',
      resolution: '480p', duration: 1,
    }).input).toMatchObject({ resolution: '480p', duration: 1, aspect_ratio: 'auto' });
  });

  it('validates prompt, image count, ratio, resolution and duration', () => {
    expect(() => buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: '', imgUrls: ['https://example.com/a.png'],
    })).toThrow('requires a non-empty prompt');
    expect(() => buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'motion', imgUrls: [],
    })).toThrow('requires exactly one reference image');
    expect(() => buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'motion', imgUrls: ['https://example.com/a.png'], aspectRatio: '16:9',
    })).toThrow('aspect_ratio must be auto');
    expect(() => buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'motion', imgUrls: ['https://example.com/a.png'], resolution: '1080p',
    })).toThrow('resolution must be one of: 480p, 720p');
    expect(() => buildCrunGrokImagineVideoRequestBody(MODEL, {
      prompt: 'motion', imgUrls: ['https://example.com/a.png'], duration: 16,
    })).toThrow('duration must be an integer from 1 to 15');
  });

  it('creates a task and normalizes its video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'grok-preview-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: LOCATOR,
      payload: {
        prompt: 'cinematic motion', imgUrls: ['https://example.com/reference.png'],
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('grok-preview-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'grok-preview-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/grok-preview.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: LOCATOR, taskId: 'grok-preview-task-1',
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
