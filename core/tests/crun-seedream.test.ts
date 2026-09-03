import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_SEEDREAM_MODELS,
  buildCrunRequestBody,
  buildCrunSeedreamRequestBody,
  crunProviderDefinition,
} from '../src/providers/crun/index.ts';

const SEEDREAM_5_PRO = 'bytedance/seedream-5-pro';
const LOCATOR = `crun:///${SEEDREAM_5_PRO}`;

describe('crun Seedream provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('registers and describes Seedream 5.0 Pro separately', async () => {
    expect(CRUN_SEEDREAM_MODELS).toEqual([SEEDREAM_5_PRO]);
    const result = await crunProviderDefinition.describeResource({ locator: LOCATOR });

    expect(result.metadata).toMatchObject({
      model: SEEDREAM_5_PRO,
      mode: 'text-to-image-or-image-edit',
      channel: 'seedream-5-pro',
      supportsResolution: true,
      supportsOutputFormat: true,
    });
    expect(Object.keys(result.formSchema.properties)).toEqual([
      'prompt', 'imgUrls', 'aspectRatio', 'resolution', 'outputFormat', 'callbackUrl',
    ]);
    expect(result.formSchema.properties.imgUrls['x-component']).toBe('Upload');
    expect(result.formValues).toEqual({
      prompt: '', imgUrls: [], aspectRatio: '1:1', resolution: '2K',
      outputFormat: 'png', callbackUrl: '',
    });
    expect(result.recommendUploadProvider).toBe('crun');
  });

  it('builds text-to-image and reference-image requests', () => {
    expect(buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'Futuristic espresso machine product campaign',
      aspectRatio: '16:9',
      resolution: '2k',
      outputFormat: 'jpg',
      callbackUrl: 'https://example.com/crun-callback',
    })).toEqual({
      model: SEEDREAM_5_PRO,
      input: {
        prompt: 'Futuristic espresso machine product campaign',
        aspect_ratio: '16:9',
        resolution: '2K',
        output_format: 'jpeg',
      },
      callback_url: 'https://example.com/crun-callback',
    });

    expect(buildCrunRequestBody(SEEDREAM_5_PRO, {
      prompt: 'Keep the subject and turn the scene into a magazine cover',
      imgUrls: [
        'https://assets.example.com/subject.png',
        'https://assets.example.com/style.jpg',
      ],
      aspectRatio: 'match_input_image',
      resolution: '1K',
      outputFormat: 'png',
    })).toEqual({
      model: SEEDREAM_5_PRO,
      input: {
        prompt: 'Keep the subject and turn the scene into a magazine cover',
        img_urls: [
          'https://assets.example.com/subject.png',
          'https://assets.example.com/style.jpg',
        ],
        aspect_ratio: 'match_input_image',
        resolution: '1K',
        output_format: 'png',
      },
    });
  });

  it('validates prompt, reference images, ratio, resolution and format', () => {
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, { prompt: '' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'edit', imgUrls: ['data:image/png;base64,abc'],
    })).toThrow('must be an HTTP(S) URL');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'edit',
      imgUrls: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}.png`),
    })).toThrow('supports at most 10 reference images');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'generate', aspectRatio: 'match_input_image',
    })).toThrow('requires a reference image');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'generate', aspectRatio: '5:7',
    })).toThrow('aspect_ratio must be one of');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'generate', resolution: '4K',
    })).toThrow('resolution must be one of: 1K, 2K');
    expect(() => buildCrunSeedreamRequestBody(SEEDREAM_5_PRO, {
      prompt: 'generate', outputFormat: 'webp',
    })).toThrow('output_format must be one of: png, jpeg');
  });

  it('creates a task and normalizes the successful image result', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200, message: 'success', data: { task_id: 'seedream-task-1' },
    }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator: LOCATOR,
      payload: { prompt: 'editorial product image' },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(created.taskId).toBe('seedream-task-1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      model: SEEDREAM_5_PRO,
      input: {
        prompt: 'editorial product image', aspect_ratio: '1:1',
        resolution: '2K', output_format: 'png',
      },
    });

    fetchMock.mockResolvedValueOnce(mockResponse({
      code: 200,
      data: {
        task_id: 'seedream-task-1', status: 'success',
        result: { media_urls: ['https://cdn.example.com/seedream-result.jpeg?expires=123'] },
      },
    }));
    const result = await crunProviderDefinition.getResult!({
      locator: LOCATOR, taskId: 'seedream-task-1',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({
        url: 'https://cdn.example.com/seedream-result.jpeg?expires=123',
        type: 'image', mimeType: 'image/jpeg',
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
