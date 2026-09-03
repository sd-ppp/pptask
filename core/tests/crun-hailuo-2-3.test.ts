import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_HAILUO_23_MODELS,
  buildCrunHailuo23RequestBody,
  crunProviderDefinition,
  getCrunHailuo23Profile,
} from '../src/providers/crun/index.ts';

const MODEL = 'minimax/hailuo-2-3';
const LOCATOR = `crun:///${MODEL}`;

describe('crun Hailuo 2.3 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers the official Hailuo 2.3 model and profile', () => {
    expect(CRUN_HAILUO_23_MODELS).toEqual([MODEL]);
    expect(getCrunHailuo23Profile(MODEL)).toMatchObject({
      operation: 'text-or-image-to-video', maxImages: 1,
      modes: ['std', 'pro'], resolutions: ['768P', '1080P'], durations: [6, 10],
    });
  });

  it('describes one form for text-to-video and image-to-video', async () => {
    const described = await crunProviderDefinition.describeResource({ locator: LOCATOR });
    expect(described.metadata).toMatchObject({
      model: MODEL, channel: 'hailuo-2.3', mode: 'text-or-image-to-video',
      supportsResolution: true,
    });
    expect(described.formValues).toMatchObject({
      prompt: '', imgUrls: [], mode: 'std', duration: 6, resolution: '1080P',
    });
    expect(described.formSchema.properties.imgUrls['x-component-props']).toMatchObject({
      accept: 'image/*', multiple: false,
    });
  });

  it('builds a documented text-to-video request', () => {
    expect(buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'A peaceful landscape with trees swaying in the wind',
      mode: 'std', duration: 6, resolution: '1080p',
    })).toEqual({
      model: MODEL,
      input: {
        mode: 'std', prompt: 'A peaceful landscape with trees swaying in the wind',
        duration: 6, resolution: '1080P',
      },
    });
  });

  it('builds an image-to-video request and callback', () => {
    expect(buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'The camera slowly pushes in', mode: 'pro',
      imgUrls: ['https://example.com/start.jpg'], duration: 10, resolution: '768P',
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: MODEL,
      input: {
        mode: 'pro', prompt: 'The camera slowly pushes in',
        img_urls: ['https://example.com/start.jpg'], duration: 10, resolution: '768P',
      },
      callback_url: 'https://example.com/crun-callback',
    });
  });

  it('validates model parameters and the documented resolution restriction', () => {
    expect(() => buildCrunHailuo23RequestBody(MODEL, { prompt: ' ' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'bad mode', mode: 'fast',
    })).toThrow('mode must be one of: std, pro');
    expect(() => buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'bad duration', duration: 8,
    })).toThrow('duration must be one of: 6, 10');
    expect(() => buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'bad resolution', resolution: '4K',
    })).toThrow('resolution must be one of: 768P, 1080P');
    expect(() => buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'bad combination', resolution: '1080P', duration: 10,
    })).toThrow('1080P resolution only supports 6-second duration');
    expect(() => buildCrunHailuo23RequestBody(MODEL, {
      prompt: 'too many images', imgUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    })).toThrow('accepts at most one reference image');
  });

  it('creates a task through the shared CRUN async endpoint', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'hailuo-23-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: LOCATOR, payload: { prompt: 'cinematic ocean', duration: 6 },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('hailuo-23-task-1');
  });

  it('normalizes a successful Hailuo result as video', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'hailuo-23-task-1', status: 'success',
        result: { video_url: 'https://cdn.example.com/hailuo-23.mp4?expires=123' },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: LOCATOR, taskId: 'hailuo-23-task-1',
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
