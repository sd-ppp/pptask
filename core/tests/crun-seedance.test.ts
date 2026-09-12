import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_SEEDANCE_MODELS,
  buildCrunSeedanceRequestBody,
  crunProviderDefinition,
  getCrunSeedanceProfile,
} from '../src/providers/crun/index.ts';

const locator = (model: string) => `crun:///${model}`;
const T25 = 'bytedance/seedance2-5-t2v';
const I25 = 'bytedance/seedance2-5-i2v';
const R25 = 'bytedance/seedance2-5-r2v';
const T20 = 'bytedance/seedance2-0-t2v';
const I20 = 'bytedance/seedance2-0-i2v';
const R20 = 'bytedance/seedance2-0-r2v';
const MINI_T = 'bytedance/seedance2-0-mini-t2v';
const MINI_I = 'bytedance/seedance2-0-mini-i2v';
const MINI_R = 'bytedance/seedance2-0-mini-r2v';
const FAST_T = 'bytedance/seedance2-0-fast-t2v';
const FAST_I = 'bytedance/seedance2-0-fast-i2v';
const FAST_R = 'bytedance/seedance2-0-fast-r2v';
const PRO15_T = 'bytedance/seedance1-5-pro-t2v';
const PRO15_I = 'bytedance/seedance1-5-pro-i2v';

describe('crun Seedance provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers every requested 2.5, 2.0, Mini, Fast, and 1.5 Pro locator', () => {
    expect(CRUN_SEEDANCE_MODELS).toEqual([
      T25, I25, R25,
      T20, I20, R20,
      MINI_T, MINI_I, MINI_R,
      FAST_T, FAST_I, FAST_R,
      PRO15_T, PRO15_I,
    ]);
    expect(getCrunSeedanceProfile(R25)).toMatchObject({
      series: '2.5', operation: 'reference-to-video', maxDuration: 30,
      resolutions: ['480p', '720p', '1080p'],
    });
    expect(getCrunSeedanceProfile(MINI_I)).toMatchObject({
      series: '2.0-mini', operation: 'image-to-video', maxDuration: 15,
      resolutions: ['480p', '720p'],
    });
    expect(getCrunSeedanceProfile(PRO15_T)).toMatchObject({
      series: '1.5-pro', operation: 'text-to-video', supportsAudio: false,
      supportsCameraFixed: true,
    });
  });

  it('describes operation-specific forms', async () => {
    const text = await crunProviderDefinition.describeResource({ locator: locator(T25) });
    expect(text.metadata).toMatchObject({
      model: T25, mode: 'text-to-video', channel: '2.5', supportsResolution: true,
    });
    expect(text.formSchema.properties).not.toHaveProperty('imgUrls');
    expect(text.formSchema.properties).toHaveProperty('audio');
    expect(text.formSchema.properties).toHaveProperty('byteplusFallback');

    const image = await crunProviderDefinition.describeResource({ locator: locator(I20) });
    expect(image.metadata.mode).toBe('image-to-video');
    expect(image.formSchema.properties.imgUrls['x-component']).toBe('Upload');
    expect(image.formSchema.properties).not.toHaveProperty('referenceVideos');

    const reference = await crunProviderDefinition.describeResource({ locator: locator(R20) });
    expect(reference.metadata.mode).toBe('reference-to-video');
    expect(reference.formSchema.properties.referenceImages['x-component']).toBe('Upload');
    expect(reference.formSchema.properties.referenceVideos['x-component-props'].accept)
      .toBe('video/*');
    expect(reference.formSchema.properties.referenceAudios['x-component-props'].accept)
      .toBe('audio/*');
    expect(reference.recommendUploadProvider).toBe('crun');
  });

  it('builds a Seedance 2.5 text-to-video request', () => {
    expect(buildCrunSeedanceRequestBody(T25, {
      prompt: 'cinematic mountain village at sunrise',
      resolution: '720P',
      aspectRatio: '16:9',
      duration: 30,
      audio: true,
      byteplusFallback: false,
      returnLastFrame: true,
      callbackUrl: 'https://example.com/callback',
    })).toEqual({
      model: T25,
      input: {
        prompt: 'cinematic mountain village at sunrise',
        resolution: '720p',
        aspect_ratio: '16:9',
        duration: 30,
        audio: true,
        byteplus_fallback: false,
        return_last_frame: true,
      },
      callback_url: 'https://example.com/callback',
    });
  });

  it('builds image-to-video and keeps 1.5-only camera controls separate', () => {
    expect(buildCrunSeedanceRequestBody(PRO15_I, {
      prompt: 'animate the product with a slow camera orbit',
      imgUrls: [
        'https://example.com/start.png',
        'https://example.com/end.png',
      ],
      resolution: '1080p',
      aspectRatio: 'auto',
      duration: 8,
      cameraFixed: false,
      audio: true,
      returnLastFrame: true,
    })).toEqual({
      model: PRO15_I,
      input: {
        prompt: 'animate the product with a slow camera orbit',
        img_urls: ['https://example.com/start.png', 'https://example.com/end.png'],
        resolution: '1080p',
        aspect_ratio: 'auto',
        duration: 8,
        camera_fixed: false,
      },
    });
  });

  it('builds 2.5 multimodal reference requests with the official field names', () => {
    expect(buildCrunSeedanceRequestBody(R25, {
      prompt: '[Image1] walks through the setting from [Video1] with [Audio1]',
      referenceImages: ['https://example.com/person.png'],
      referenceVideos: ['asset://asset-video-1'],
      referenceAudios: ['https://example.com/music.mp3'],
      resolution: '1080p',
      aspectRatio: '16:9',
      duration: 8,
      audio: true,
    })).toEqual({
      model: R25,
      input: {
        prompt: '[Image1] walks through the setting from [Video1] with [Audio1]',
        reference_images: ['https://example.com/person.png'],
        reference_videos: ['asset://asset-video-1'],
        reference_audios: ['https://example.com/music.mp3'],
        task_type: 'reference',
        resolution: '1080p',
        aspect_ratio: '16:9',
        duration: 8,
        audio: true,
        byteplus_fallback: false,
        return_last_frame: false,
      },
    });
  });

  it('validates required media, limits, resolution, duration, and callback', () => {
    expect(() => buildCrunSeedanceRequestBody(I25, {
      prompt: 'animate', imgUrls: [],
    })).toThrow('requires at least one input image');
    expect(() => buildCrunSeedanceRequestBody(I25, {
      prompt: 'animate', imgUrls: ['https://a/1.png', 'https://a/2.png', 'https://a/3.png'],
    })).toThrow('supports at most two frame images');
    expect(() => buildCrunSeedanceRequestBody(R20, { prompt: 'reference' }))
      .toThrow('requires reference_images or reference_videos');
    expect(() => buildCrunSeedanceRequestBody(MINI_T, {
      prompt: 'test', resolution: '1080p',
    })).toThrow('resolution must be one of: 480p, 720p');
    expect(() => buildCrunSeedanceRequestBody(T20, { prompt: 'test', duration: 16 }))
      .toThrow('duration must be an integer from 4 to 15');
    expect(() => buildCrunSeedanceRequestBody(T20, {
      prompt: 'test', callbackUrl: 'http://localhost/callback',
    })).toThrow('must be a public HTTPS URL');
  });

  it('creates and returns a video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'seedance-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(FAST_T),
      payload: { prompt: 'cinematic city', duration: 5 },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('seedance-task-1');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe(FAST_T);
    expect(body.input).toMatchObject({
      resolution: '720p', aspect_ratio: '16:9', duration: 5, audio: true,
    });

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'seedance-task-1',
        status: 'success',
        result: { media_urls: ['https://cdn.example.com/result.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(FAST_T),
      taskId: 'seedance-task-1',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({
        url: 'https://cdn.example.com/result.mp4?expires=123',
        type: 'video', mimeType: 'video/mp4',
      }),
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
