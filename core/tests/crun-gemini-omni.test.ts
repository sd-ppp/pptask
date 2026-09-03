import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_GEMINI_OMNI_MODELS,
  buildCrunGeminiOmniRequestBody,
  crunProviderDefinition,
  isCrunGeminiOmniModel,
} from '../src/providers/crun/index.ts';

const MODEL = 'google/gemini-omni';
const LOCATOR = `crun:///${MODEL}`;

describe('crun Gemini Omni provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers the official Gemini Omni model', () => {
    expect(CRUN_GEMINI_OMNI_MODELS).toEqual([MODEL]);
    expect(isCrunGeminiOmniModel(MODEL)).toBe(true);
    expect(isCrunGeminiOmniModel('google/veo3-1-t2v')).toBe(false);
  });

  it('describes the multimodal video form and defaults', async () => {
    const result = await crunProviderDefinition.describeResource({ locator: LOCATOR });
    expect(result.metadata).toMatchObject({
      model: MODEL,
      channel: 'gemini-omni',
      mode: 'multimodal-video-generation',
      supportsResolution: true,
    });
    expect(result.formValues).toEqual({
      prompt: '', referenceImages: [], referenceVideos: [], videoStart: 0, videoEnd: 6,
      duration: 6, aspectRatio: '16:9', resolution: '720p', callbackUrl: '',
    });
    expect(result.formSchema.properties.referenceImages['x-component-props'])
      .toMatchObject({ accept: 'image/*', multiple: true });
    expect(result.formSchema.properties.referenceVideos['x-component-props'])
      .toMatchObject({ accept: 'video/*', multiple: false });
  });

  it('builds the official image and video reference request', () => {
    expect(buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'Create a cinematic product video with continuous lighting',
      referenceImages: [
        'https://example.com/product.png',
        'https://example.com/style.webp',
      ],
      videoList: [{ url: 'https://example.com/motion.mp4', start: 1, ends: 7 }],
      duration: 10,
      aspectRatio: '9:16',
      resolution: '4K',
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: MODEL,
      input: {
        prompt: 'Create a cinematic product video with continuous lighting',
        img_urls: [
          'https://example.com/product.png',
          'https://example.com/style.webp',
        ],
        video_list: [{ url: 'https://example.com/motion.mp4', start: 1, ends: 7 }],
        duration: 10,
        aspect_ratio: '9:16',
        resolution: '4k',
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('maps uploaded video fields and allows text-only generation', () => {
    expect(buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'A cinematic city at night',
    }).input).toEqual({
      prompt: 'A cinematic city at night',
      duration: 6, aspect_ratio: '16:9', resolution: '720p',
    });

    expect(buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'Follow the camera movement',
      referenceVideos: ['https://example.com/source.mp4'],
      videoStart: 0,
      videoEnd: 6,
    }).input.video_list).toEqual([
      { url: 'https://example.com/source.mp4', start: 0, ends: 6 },
    ]);
  });

  it('validates prompt, references, trim range, duration, ratio and resolution', () => {
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, { prompt: ' ' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'too many images',
      referenceImages: Array.from({ length: 8 }, (_, i) => `https://example.com/${i}.png`),
    })).toThrow('supports at most 7 reference images');
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'bad range',
      videoList: [{ url: 'https://example.com/source.mp4', start: 6, ends: 6 }],
    })).toThrow('ends must be later than start');
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'bad duration', duration: 5,
    })).toThrow('duration must be one of: 4, 6, 8, 10');
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'bad ratio', aspectRatio: '1:1',
    })).toThrow('aspect_ratio must be one of: 16:9, 9:16');
    expect(() => buildCrunGeminiOmniRequestBody(MODEL, {
      prompt: 'bad resolution', resolution: '480p',
    })).toThrow('resolution must be one of: 720p, 1080p, 4k');
  });

  it('creates a task and normalizes its video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'gemini-omni-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: LOCATOR,
      payload: { prompt: 'cinematic product video' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('gemini-omni-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'gemini-omni-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/gemini-omni.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: LOCATOR, taskId: 'gemini-omni-task-1',
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
