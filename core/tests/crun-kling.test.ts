import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_KLING_MODELS,
  buildCrunKlingRequestBody,
  crunProviderDefinition,
  getCrunKlingProfile,
} from '../src/providers/crun/index.ts';

const V3 = 'kling/v3';
const TURBO = 'kling/v3-turbo';
const MOTION = 'kling/v3-motion-control';
const V26 = 'kling/v2-6';
const V26_MOTION = 'kling/v2-6-motion-control';
const AVATAR = 'kling/avatar';
const locator = (model: string) => `crun:///${model}`;

describe('crun Kling provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers the selected Kling models', () => {
    expect(CRUN_KLING_MODELS).toEqual([V3, TURBO, MOTION, V26, V26_MOTION, AVATAR]);
    expect(getCrunKlingProfile(V3)).toMatchObject({
      channel: 'v3', operation: 'video-generation', requiresImage: false,
    });
    expect(getCrunKlingProfile(MOTION)).toMatchObject({
      channel: 'v3-motion-control', operation: 'motion-control',
      requiresImage: true, requiresVideo: true,
    });
    expect(getCrunKlingProfile(AVATAR)).toMatchObject({
      operation: 'talking-avatar', requiresImage: true, requiresAudio: true,
    });
  });

  it('describes model-specific forms and defaults', async () => {
    const v3 = await crunProviderDefinition.describeResource({ locator: locator(V3) });
    expect(v3.metadata).toMatchObject({
      model: V3, mode: 'video-generation', channel: 'v3', supportsResolution: false,
    });
    expect(v3.formSchema.properties).toHaveProperty('multiShots');
    expect(v3.formSchema.properties).toHaveProperty('multiPrompt');
    expect(v3.formSchema.properties).toHaveProperty('elementList');
    expect(v3.formValues).toMatchObject({ mode: 'pro', multiShots: false, audio: true });

    const turbo = await crunProviderDefinition.describeResource({ locator: locator(TURBO) });
    expect(turbo.metadata.supportsResolution).toBe(true);
    expect(turbo.formSchema.properties).toHaveProperty('resolution');
    expect(turbo.formSchema.properties).not.toHaveProperty('audio');

    const motion = await crunProviderDefinition.describeResource({ locator: locator(MOTION) });
    expect(motion.formSchema.properties.videoUrls['x-component-props'].accept).toBe('video/*');
    expect(motion.formValues).toMatchObject({
      characterOrientation: 'video', keepOriginalSound: true,
    });

    const avatar = await crunProviderDefinition.describeResource({ locator: locator(AVATAR) });
    expect(avatar.formSchema.properties.audioUrl['x-component-props'].accept).toBe('audio/*');
    expect(avatar.formValues).toMatchObject({ imageUrl: [], audioUrl: [], mode: 'pro' });
    expect(avatar.recommendUploadProvider).toBe('crun');
  });

  it('builds Kling V3 text-to-video and first/last-frame requests', () => {
    expect(buildCrunKlingRequestBody(V3, {
      prompt: 'cinematic robot awakening',
      mode: 'std',
      multiShots: false,
      duration: 15,
      aspectRatio: '16:9',
      audio: false,
    })).toEqual({
      model: V3,
      input: {
        mode: 'std', multi_shots: false, duration: 15,
        prompt: 'cinematic robot awakening', audio: false, aspect_ratio: '16:9',
        input_compliance: 'enabled', output_compliance: 'enabled',
      },
    });

    expect(buildCrunKlingRequestBody(V3, {
      prompt: 'the robot repairs itself',
      mode: 'pro',
      imgUrls: ['https://example.com/start.png', 'https://example.com/end.png'],
      duration: 10,
      aspectRatio: '9:16',
      audio: true,
    }).input).toEqual({
      mode: 'pro', multi_shots: false, duration: 10,
      prompt: 'the robot repairs itself',
      img_urls: ['https://example.com/start.png', 'https://example.com/end.png'],
      audio: true,
      input_compliance: 'enabled', output_compliance: 'enabled',
    });
  });

  it('builds V3 custom multi-shot and character references', () => {
    expect(buildCrunKlingRequestBody(V3, {
      mode: 'pro',
      multiShots: true,
      shotType: 'customize',
      imgUrls: ['https://example.com/start.png'],
      multiPrompt: [
        { prompt: 'wide shot of @hero entering a temple', duration: 4 },
        { prompt: 'close-up of @hero lifting a relic', duration: 6 },
      ],
      elementList: [{
        name: 'hero',
        description: 'explorer in a yellow coat',
        elementImageUrls: [
          'https://example.com/hero-1.png',
          'https://example.com/hero-2.png',
        ],
      }],
      duration: 10,
      audio: false,
    })).toEqual({
      model: V3,
      input: {
        mode: 'pro', multi_shots: true, duration: 10,
        img_urls: ['https://example.com/start.png'],
        shot_type: 'customize',
        multi_prompt: [
          { prompt: 'wide shot of @hero entering a temple', duration: 4 },
          { prompt: 'close-up of @hero lifting a relic', duration: 6 },
        ],
        audio: true,
        element_list: [{
          name: 'hero', description: 'explorer in a yellow coat',
          element_image_urls: [
            'https://example.com/hero-1.png',
            'https://example.com/hero-2.png',
          ],
        }],
        input_compliance: 'enabled', output_compliance: 'enabled',
      },
    });
  });

  it('builds Turbo, Motion Control, and Avatar requests without mixing fields', () => {
    expect(buildCrunKlingRequestBody(TURBO, {
      prompt: 'a dancer on a neon stage', resolution: '1080P', duration: 8,
      imgUrls: ['https://example.com/dancer.png'], aspectRatio: '1:1',
    })).toEqual({
      model: TURBO,
      input: {
        prompt: 'a dancer on a neon stage',
        img_urls: ['https://example.com/dancer.png'],
        resolution: '1080p', duration: 8,
        input_compliance: 'enabled', output_compliance: 'enabled',
      },
    });

    expect(buildCrunKlingRequestBody(MOTION, {
      prompt: 'keep the character identity',
      imgUrls: ['https://example.com/character.png'],
      videoUrls: ['https://example.com/motion.mp4'],
      characterOrientation: 'image', mode: 'pro', keepOriginalSound: false,
    })).toEqual({
      model: MOTION,
      input: {
        img_urls: ['https://example.com/character.png'],
        video_urls: ['https://example.com/motion.mp4'],
        character_orientation: 'image', mode: 'pro', keep_original_sound: false,
        prompt: 'keep the character identity',
        input_compliance: 'enabled', output_compliance: 'enabled',
      },
    });

    expect(buildCrunKlingRequestBody(AVATAR, {
      imageUrl: ['https://example.com/avatar.png'],
      audioUrl: ['https://example.com/speech.mp3'],
      prompt: 'smile and wave', mode: 'std',
    })).toEqual({
      model: AVATAR,
      input: {
        mode: 'std', image_url: 'https://example.com/avatar.png',
        audio_url: 'https://example.com/speech.mp3', prompt: 'smile and wave',
      },
    });
  });

  it('validates Kling media and multi-shot constraints', () => {
    expect(() => buildCrunKlingRequestBody(V3, {
      prompt: 'story', multiShots: true, shotType: 'intelligence', duration: 5,
    })).toThrow('requires exactly one start image');
    expect(() => buildCrunKlingRequestBody(V3, {
      multiShots: true, shotType: 'customize',
      imgUrls: ['https://example.com/start.png'],
      multiPrompt: [{ prompt: 'shot one', duration: 3 }], duration: 5,
    })).toThrow('must add up to duration');
    expect(() => buildCrunKlingRequestBody(TURBO, {
      prompt: 'test', resolution: '4K',
    })).toThrow('resolution must be one of: 720p, 1080p');
    expect(() => buildCrunKlingRequestBody(MOTION, {
      imgUrls: ['https://example.com/character.png'],
    })).toThrow('requires exactly one motion reference video');
    expect(() => buildCrunKlingRequestBody(AVATAR, {
      imageUrl: ['https://example.com/avatar.png'],
    })).toThrow('requires exactly one speech audio');
  });

  it('creates a Kling task and normalizes its video result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'kling-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: locator(TURBO),
      payload: { prompt: 'cinematic city', duration: 5 },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('kling-task-1');

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'kling-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/kling-result.mp4?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(TURBO), taskId: 'kling-task-1',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({
        url: 'https://cdn.example.com/kling-result.mp4?expires=123',
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
