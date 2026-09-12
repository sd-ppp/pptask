import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_MINIMAX_H3_MODELS,
  buildCrunMinimaxH3RequestBody,
  crunProviderDefinition,
  getCrunMinimaxH3Profile,
} from '../src/providers/crun/index.ts';

const T2V = 'minimax/h3-t2v';
const I2V = 'minimax/h3-i2v';
const R2V = 'minimax/h3-r2v';
const REGEN = 'minimax/h3-regeneration';
const locator = (model: string) => `crun:///${model}`;

describe('crun MiniMax H3 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers all four official H3 modes', () => {
    expect(CRUN_MINIMAX_H3_MODELS).toEqual([T2V, I2V, R2V, REGEN]);
    expect(getCrunMinimaxH3Profile(T2V).operation).toBe('text-to-video');
    expect(getCrunMinimaxH3Profile(I2V)).toMatchObject({
      operation: 'image-to-video', supportsImageReferences: true,
    });
    expect(getCrunMinimaxH3Profile(R2V)).toMatchObject({
      operation: 'reference-to-video', supportsVideoReferences: true,
      supportsAudioReferences: true,
    });
    expect(getCrunMinimaxH3Profile(REGEN)).toMatchObject({
      operation: 'video-regeneration', requiresPrompt: false,
    });
  });

  it('describes mode-specific forms and defaults', async () => {
    const t2v = await crunProviderDefinition.describeResource({ locator: locator(T2V) });
    expect(t2v.metadata).toMatchObject({
      model: T2V, channel: 'minimax-h3', mode: 'text-to-video', supportsResolution: true,
    });
    expect(t2v.formValues).toMatchObject({
      prompt: '', duration: 5, resolution: '768P', aspectRatio: '16:9',
    });

    const i2v = await crunProviderDefinition.describeResource({ locator: locator(I2V) });
    expect(i2v.formSchema.properties.imgUrls['x-component-props'].accept).toBe('image/*');
    expect(i2v.formValues).toMatchObject({ imgUrls: [], aspectRatio: 'auto' });

    const r2v = await crunProviderDefinition.describeResource({ locator: locator(R2V) });
    expect(r2v.formSchema.properties.referenceVideos['x-component-props'].accept).toBe('video/*');
    expect(r2v.formSchema.properties.referenceAudios['x-component-props'].accept).toBe('audio/*');

    const regen = await crunProviderDefinition.describeResource({ locator: locator(REGEN) });
    expect(regen.metadata).toMatchObject({
      mode: 'video-regeneration', supportsResolution: false,
    });
    expect(Object.keys(regen.formSchema.properties)).toEqual(['h3TaskId', 'callbackUrl']);
    expect(regen.formValues).toEqual({ h3TaskId: '', callbackUrl: '' });
  });

  it('builds text-to-video and first/last-frame requests', () => {
    expect(buildCrunMinimaxH3RequestBody(T2V, {
      prompt: 'cinematic mountain valley at sunrise', duration: 15,
      resolution: '2k', aspectRatio: '21:9',
    })).toEqual({
      model: T2V,
      input: {
        prompt: 'cinematic mountain valley at sunrise', duration: 15,
        resolution: '2K', aspect_ratio: '21:9',
      },
    });

    expect(buildCrunMinimaxH3RequestBody(I2V, {
      prompt: 'the subject turns toward camera',
      imgUrls: ['https://example.com/start.jpg', 'https://example.com/end.jpg'],
      duration: 8, resolution: '768p',
    })).toEqual({
      model: I2V,
      input: {
        prompt: 'the subject turns toward camera',
        img_urls: ['https://example.com/start.jpg', 'https://example.com/end.jpg'],
        duration: 8, resolution: '768P', aspect_ratio: 'auto',
      },
    });
  });

  it('builds multimodal reference and 2K regeneration requests', () => {
    expect(buildCrunMinimaxH3RequestBody(R2V, {
      prompt: 'follow [Video1] motion and [Audio1] rhythm',
      referenceImages: ['https://example.com/subject.png'],
      referenceVideos: ['https://example.com/motion.mp4'],
      referenceAudios: ['https://example.com/music.mp3'],
      duration: 8, resolution: '2K', aspectRatio: '16:9',
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: R2V,
      input: {
        prompt: 'follow [Video1] motion and [Audio1] rhythm',
        reference_images: ['https://example.com/subject.png'],
        reference_videos: ['https://example.com/motion.mp4'],
        reference_audios: ['https://example.com/music.mp3'],
        duration: 8, resolution: '2K', aspect_ratio: '16:9',
      },
      callback_url: 'https://example.com/crun-callback',
    });

    expect(buildCrunMinimaxH3RequestBody(REGEN, {
      h3TaskId: 'successful-768p-task',
    })).toEqual({
      model: REGEN,
      input: { h3_task_id: 'successful-768p-task' },
    });
  });

  it('validates H3 media, duration, resolution, ratio and regeneration source', () => {
    expect(() => buildCrunMinimaxH3RequestBody(I2V, {
      prompt: 'animate', imgUrls: [],
    })).toThrow('requires one or two first/last frame images');
    expect(() => buildCrunMinimaxH3RequestBody(I2V, {
      prompt: 'animate', imgUrls: [
        'https://example.com/1.png', 'https://example.com/2.png', 'https://example.com/3.png',
      ],
    })).toThrow('requires one or two first/last frame images');
    expect(() => buildCrunMinimaxH3RequestBody(R2V, {
      prompt: 'audio only', referenceAudios: ['https://example.com/audio.mp3'],
    })).toThrow('requires reference_images or reference_videos');
    expect(() => buildCrunMinimaxH3RequestBody(R2V, {
      prompt: 'too many images',
      referenceImages: Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.png`),
    })).toThrow('supports at most 9 reference images');
    expect(() => buildCrunMinimaxH3RequestBody(T2V, {
      prompt: 'bad duration', duration: 16,
    })).toThrow('duration must be an integer from 4 to 15');
    expect(() => buildCrunMinimaxH3RequestBody(T2V, {
      prompt: 'bad resolution', resolution: '4K',
    })).toThrow('resolution must be one of: 768P, 2K');
    expect(() => buildCrunMinimaxH3RequestBody(I2V, {
      prompt: 'bad ratio', imgUrls: ['https://example.com/start.png'], aspectRatio: '16:9',
    })).toThrow('aspect_ratio must be auto');
    expect(() => buildCrunMinimaxH3RequestBody(REGEN, {})).toThrow('requires h3_task_id');
  });

  it('creates an H3 task and normalizes the video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'h3-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(T2V), payload: { prompt: 'cinematic city' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('h3-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'h3-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/h3-result.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(T2V), taskId: 'h3-task-1',
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
