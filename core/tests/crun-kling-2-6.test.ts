import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCrunKlingRequestBody,
  crunProviderDefinition,
  getCrunKlingProfile,
} from '../src/providers/crun/index.ts';

const VIDEO = 'kling/v2-6';
const MOTION = 'kling/v2-6-motion-control';
const locator = (model: string) => `crun:///${model}`;

describe('crun Kling 2.6', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers generation and motion-control as separate channels', () => {
    expect(getCrunKlingProfile(VIDEO)).toMatchObject({
      channel: 'v2.6', operation: 'video-generation', requiresImage: false,
    });
    expect(getCrunKlingProfile(MOTION)).toMatchObject({
      channel: 'v2.6-motion-control', operation: 'motion-control',
      requiresImage: true, requiresVideo: true,
    });
  });

  it('describes model-specific forms and upload behavior', async () => {
    const generation = await crunProviderDefinition.describeResource({ locator: locator(VIDEO) });
    expect(generation.metadata).toMatchObject({
      model: VIDEO, mode: 'video-generation', channel: 'v2.6',
    });
    expect(generation.formSchema.properties).toHaveProperty('imgUrls');
    expect(generation.formSchema.properties).toHaveProperty('audio');
    expect(generation.formSchema.properties).not.toHaveProperty('multiShots');
    expect(generation.formValues).toMatchObject({ mode: 'std', duration: 5, audio: false });

    const motion = await crunProviderDefinition.describeResource({ locator: locator(MOTION) });
    expect(motion.formSchema.properties.videoUrls['x-component-props'].accept).toBe('video/*');
    expect(motion.formSchema.properties).not.toHaveProperty('keepOriginalSound');
    expect(motion.formValues).toMatchObject({ characterOrientation: 'image', mode: 'pro' });
    expect(motion.recommendUploadProvider).toBe('crun');
  });

  it('builds Standard text-to-video and first/last-frame requests', () => {
    expect(buildCrunKlingRequestBody(VIDEO, {
      prompt: 'A woman stands on a cliff at sunrise', mode: 'std',
      duration: 10, aspectRatio: '16:9', audio: false,
      imgUrls: ['https://example.com/start.jpg', 'https://example.com/end.jpg'],
    })).toEqual({
      model: VIDEO,
      input: {
        mode: 'std', prompt: 'A woman stands on a cliff at sunrise',
        img_urls: ['https://example.com/start.jpg', 'https://example.com/end.jpg'],
        duration: 10, aspect_ratio: '16:9', audio: false,
        input_compliance: 'enabled', output_compliance: 'enabled',
      },
    });
  });

  it('builds Pro 1080p-channel generation with native audio', () => {
    expect(buildCrunKlingRequestBody(VIDEO, {
      prompt: 'A cinematic tracking shot through a night market', mode: 'pro',
      duration: 5, aspectRatio: '9:16', audio: true,
      imgUrls: ['https://example.com/start.jpg'],
      inputCompliance: 'disabled', outputCompliance: 'enabled',
    })).toEqual({
      model: VIDEO,
      input: {
        mode: 'pro', prompt: 'A cinematic tracking shot through a night market',
        img_urls: ['https://example.com/start.jpg'], duration: 5,
        aspect_ratio: '9:16', audio: true,
        input_compliance: 'disabled', output_compliance: 'enabled',
      },
    });
  });

  it('builds V2.6 motion control without V3-only fields', () => {
    expect(buildCrunKlingRequestBody(MOTION, {
      prompt: 'Perform the action precisely',
      imgUrls: ['https://example.com/character.png'],
      videoUrls: ['https://example.com/action.mp4'],
      characterOrientation: 'image', mode: 'pro',
      keepOriginalSound: true, inputCompliance: 'disabled',
    })).toEqual({
      model: MOTION,
      input: {
        img_urls: ['https://example.com/character.png'],
        video_urls: ['https://example.com/action.mp4'],
        character_orientation: 'image', mode: 'pro',
        prompt: 'Perform the action precisely',
      },
    });
  });

  it('enforces Standard, Pro, frame and duration constraints', () => {
    expect(() => buildCrunKlingRequestBody(VIDEO, {
      prompt: 'test', mode: 'std', audio: true,
    })).toThrow('audio must be false in std mode');
    expect(() => buildCrunKlingRequestBody(VIDEO, {
      prompt: 'test', mode: 'pro',
      imgUrls: ['https://a/start.jpg', 'https://a/end.jpg'],
    })).toThrow('first/last frame generation requires std mode');
    expect(() => buildCrunKlingRequestBody(VIDEO, {
      prompt: 'test', duration: 7,
    })).toThrow('duration must be one of: 5, 10');
    expect(() => buildCrunKlingRequestBody(MOTION, {
      imgUrls: ['https://a/character.png'],
    })).toThrow('requires exactly one motion reference video');
  });

  it('creates a task and normalizes the video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'kling-26-task' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(VIDEO), payload: { prompt: 'cinematic city', duration: 5 },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('kling-26-task');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'kling-26-task', status: 'success',
        result: { media_urls: ['https://cdn.example.com/kling-26.mp4'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(VIDEO), taskId: 'kling-26-task',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({
        url: 'https://cdn.example.com/kling-26.mp4',
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
