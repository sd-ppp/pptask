import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCrunSeedanceRequestBody,
  crunProviderDefinition,
  getCrunSeedanceProfile,
} from '../src/providers/crun/index.ts';

const T2V = 'bytedance/seedance1-5-pro-t2v';
const I2V = 'bytedance/seedance1-5-pro-i2v';
const locator = (model: string) => `crun:///${model}`;

describe('crun Seedance 1.5 Pro', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps text and image channels separate from the 2.x profiles', () => {
    expect(getCrunSeedanceProfile(T2V)).toMatchObject({
      series: '1.5-pro', operation: 'text-to-video', maxDuration: 12,
      resolutions: ['480p', '720p', '1080p'], supportsAudio: false,
      supportsCameraFixed: true, supportsReturnLastFrame: true,
    });
    expect(getCrunSeedanceProfile(I2V)).toMatchObject({
      series: '1.5-pro', operation: 'image-to-video', maxDuration: 12,
      supportsAudio: false, supportsCameraFixed: true,
      supportsReturnLastFrame: false,
    });
  });

  it('describes the text-to-video form without image or audio inputs', async () => {
    const described = await crunProviderDefinition.describeResource({ locator: locator(T2V) });
    expect(described.metadata).toMatchObject({
      model: T2V, mode: 'text-to-video', channel: '1.5-pro',
    });
    expect(described.formSchema.properties).not.toHaveProperty('imgUrls');
    expect(described.formSchema.properties).not.toHaveProperty('audio');
    expect(described.formSchema.properties).toHaveProperty('cameraFixed');
    expect(described.formSchema.properties).toHaveProperty('returnLastFrame');
  });

  it('describes image-to-video with automatic CRUN file uploading', async () => {
    const described = await crunProviderDefinition.describeResource({ locator: locator(I2V) });
    expect(described.metadata.mode).toBe('image-to-video');
    expect(described.formSchema.properties.imgUrls['x-component']).toBe('Upload');
    expect(described.formSchema.properties).not.toHaveProperty('returnLastFrame');
    expect(described.recommendUploadProvider).toBe('crun');
  });

  it('builds the official text-to-video fields', () => {
    expect(buildCrunSeedanceRequestBody(T2V, {
      prompt: 'A cinematic city at night', resolution: '1080P',
      aspectRatio: '16:9', duration: 8, cameraFixed: false,
      returnLastFrame: true, callbackUrl: 'https://example.com/callback',
    })).toEqual({
      model: T2V,
      input: {
        prompt: 'A cinematic city at night', resolution: '1080p',
        aspect_ratio: '16:9', duration: 8, camera_fixed: false,
        return_last_frame: true,
      },
      callback_url: 'https://example.com/callback',
    });
  });

  it('builds image-to-video with one or two frame images', () => {
    expect(buildCrunSeedanceRequestBody(I2V, {
      prompt: 'Transition smoothly from sunrise to night',
      imgUrls: ['https://example.com/start.png', 'https://example.com/end.png'],
      resolution: '720p', aspectRatio: 'auto', duration: 12, cameraFixed: true,
    })).toEqual({
      model: I2V,
      input: {
        prompt: 'Transition smoothly from sunrise to night',
        img_urls: ['https://example.com/start.png', 'https://example.com/end.png'],
        resolution: '720p', aspect_ratio: 'auto', duration: 12, camera_fixed: true,
      },
    });
  });

  it('validates media count, duration and resolution', () => {
    expect(() => buildCrunSeedanceRequestBody(I2V, { prompt: 'animate' }))
      .toThrow('requires at least one input image');
    expect(() => buildCrunSeedanceRequestBody(I2V, {
      prompt: 'animate', imgUrls: ['https://a/1.png', 'https://a/2.png', 'https://a/3.png'],
    })).toThrow('supports at most two frame images');
    expect(() => buildCrunSeedanceRequestBody(T2V, { prompt: 'test', duration: 13 }))
      .toThrow('duration must be an integer from 4 to 12');
    expect(() => buildCrunSeedanceRequestBody(T2V, { prompt: 'test', resolution: '4K' }))
      .toThrow('resolution must be one of: 480p, 720p, 1080p');
  });

  it('creates a task and normalizes its video output', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'seedance-15-task' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(T2V), payload: { prompt: 'cinematic city', duration: 8 },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('seedance-15-task');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'seedance-15-task', status: 'success',
        result: { video_url: 'https://cdn.example.com/seedance-15.mp4' },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(T2V), taskId: 'seedance-15-task',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({
        url: 'https://cdn.example.com/seedance-15.mp4',
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
