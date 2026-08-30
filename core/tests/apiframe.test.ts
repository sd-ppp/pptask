import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  upload,
  listProviders,
  listUploadProviders,
} from '../src/index.ts';
import {
  mapApiframeStatus,
  parseApiframeResultOutputs,
  APIFRAME_DEFAULT_BASE_URL,
  APIFRAME_IMAGE_AUDIO_MAX_BYTES,
  APIFRAME_VIDEO_MAX_BYTES,
} from '../src/providers/apiframe/helpers.ts';
import { parseApiframeLocator } from '../src/providers/apiframe/locator.ts';

// Official Apiframe docs contract (https://apiframe.ai/docs images/videos/music pages):
// image result.images[] + gridUrl; video result.videoUrl or videos[]; music result.tracks[].audioUrl.
// Not sourced from OpenAPI Job.result schema (which is untyped {}).
const OFFICIAL_RESULT_DOCS = 'https://apiframe.ai/docs';

const imageLocator = 'apiframe://image/flux-2-pro';
const videoLocator = 'apiframe://video/kling-3.0';
const musicLocator = 'apiframe://music/suno';
const numericEnumLocator = 'apiframe://video/veo-3.1';
const nonWhitelistedLocator = 'apiframe://image/dall-e-3';
const apiKey = 'test-apiframe-key';
const baseURL = APIFRAME_DEFAULT_BASE_URL;

describe('apiframe helpers', () => {
  it('maps apiframe job statuses', () => {
    expect(mapApiframeStatus('QUEUED')).toBe('pending');
    expect(mapApiframeStatus('PROCESSING')).toBe('running');
    expect(mapApiframeStatus('COMPLETED')).toBe('succeeded');
    expect(mapApiframeStatus('FAILED')).toBe('failed');
    expect(mapApiframeStatus('CANCELLED')).toBe('cancelled');
    expect(() => mapApiframeStatus('MYSTERY')).toThrow(/unknown apiframe job status/i);
  });

  it('parses image, video, and music result shapes per official docs contract', () => {
    // See OFFICIAL_RESULT_DOCS — shapes documented on apiframe.ai/docs, not OpenAPI Job.result.
    expect(OFFICIAL_RESULT_DOCS).toContain('apiframe.ai/docs');

    const imageOutputs = parseApiframeResultOutputs('image', {
      images: ['https://example.com/a.png', 'https://example.com/b.png'],
      gridUrl: 'https://example.com/grid.png',
    });
    expect(imageOutputs.map(output => output.url)).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.png',
      'https://example.com/grid.png',
    ]);
    expect(imageOutputs.every(output => output.rawData)).toBe(true);

    const videoSingle = parseApiframeResultOutputs('video', {
      videoUrl: 'https://example.com/video.mp4',
    });
    expect(videoSingle).toHaveLength(1);
    expect(videoSingle[0]?.url).toBe('https://example.com/video.mp4');

    const videoMulti = parseApiframeResultOutputs('video', {
      videos: ['https://example.com/v1.mp4', 'https://example.com/v2.mp4'],
    });
    expect(videoMulti.map(output => output.url)).toEqual([
      'https://example.com/v1.mp4',
      'https://example.com/v2.mp4',
    ]);

    const musicOutputs = parseApiframeResultOutputs('music', {
      tracks: [
        { id: 'track-1', audioUrl: 'https://example.com/track-1.mp3', title: 'A' },
        { id: 'track-2', audioUrl: 'https://example.com/track-2.mp3', title: 'B' },
      ],
    });
    expect(musicOutputs.map(output => output.url)).toEqual([
      'https://example.com/track-1.mp3',
      'https://example.com/track-2.mp3',
    ]);
    expect(musicOutputs[0]?.rawData).toEqual({
      id: 'track-1',
      audioUrl: 'https://example.com/track-1.mp3',
      title: 'A',
    });
  });
});

describe('apiframe provider (unit tests)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(mockFetchImplementation);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is registered in core provider lists', () => {
    expect(listProviders()).toContain('apiframe');
    expect(listUploadProviders()).toContain('apiframe');
  });

  it('requires apiKey for createTask', async () => {
    await expect(
      createTask({ locator: imageLocator, payload: { prompt: 'test' }, platformConfig: {} }),
    ).rejects.toThrow(/apiKey/i);
  });

  it('rejects non-whitelisted locators for createTask', async () => {
    await expect(
      createTask({
        locator: nonWhitelistedLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/unsupported locator/i);
  });

  it('describes whitelisted resource with cancelable false', async () => {
    const describeResult = await describeResource({ locator: imageLocator, platformConfig: { apiKey } });
    expect(describeResult.provider).toBe('apiframe');
    expect(describeResult.cancelable).toBe(false);
    expect(describeResult.recommendUploadProvider).toBe('apiframe');
    expect(describeResult.metadata.model).toBe('flux-2-pro');
    expect(describeResult.formSchema.properties).not.toHaveProperty('model');
    expect(describeResult.formSchema.properties).not.toHaveProperty('webhookUrl');
  });

  it('creates image task with locator model, auth header, and sanitized nested payload', async () => {
    const createResult = await createTask({
      locator: imageLocator,
      payload: {
        model: 'evil-model',
        webhookUrl: 'https://evil.example/webhook',
        webhookEvents: ['completed'],
        prompt: 'A scenic mountain landscape',
        aspect_ratio: '16:9',
        guidance: 7.5,
      },
      platformConfig: {
        apiKey,
        webhookUrl: 'https://platform.example/webhook',
        webhookEvents: ['completed', 'failed'],
      },
    });

    expect(createResult.provider).toBe('apiframe');
    expect(createResult.taskId).toBe('job-apiframe-image-123');
    expect(createResult.status).toBe('pending');

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v2/images/generate'),
    );
    expect(request).toBeDefined();
    expect(String(request?.[0])).toBe(`${baseURL}/v2/images/generate`);
    expect(request?.[1]?.headers).toMatchObject({
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({
      model: 'flux-2-pro',
      prompt: 'A scenic mountain landscape',
      fluxParams: {
        aspect_ratio: '16:9',
        guidance: 7.5,
      },
      webhookUrl: 'https://platform.example/webhook',
      webhookEvents: ['completed', 'failed'],
    });
  });

  it('creates video and music tasks on modality endpoints', async () => {
    await createTask({
      locator: videoLocator,
      payload: {
        prompt: 'A cinematic drone shot',
        duration: 8,
        mode: 'pro',
      },
      platformConfig: { apiKey },
    });

    await createTask({
      locator: musicLocator,
      payload: {
        prompt: 'Upbeat synthwave',
        model_version: 'V5',
        instrumental: true,
      },
      platformConfig: { apiKey },
    });

    const videoRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v2/videos/generate'),
    );
    const musicRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v2/music/generate'),
    );

    expect(JSON.parse(videoRequest?.[1]?.body as string)).toEqual({
      model: 'kling-3.0',
      prompt: 'A cinematic drone shot',
      klingParams: {
        duration: 8,
        mode: 'pro',
      },
    });
    expect(JSON.parse(musicRequest?.[1]?.body as string)).toEqual({
      model: 'suno',
      prompt: 'Upbeat synthwave',
      sunoParams: {
        model_version: 'V5',
        instrumental: true,
      },
    });
  });

  it('preserves numeric enum values in nested params', async () => {
    await createTask({
      locator: numericEnumLocator,
      payload: {
        prompt: 'Ocean waves at sunset',
        duration: 6,
      },
      platformConfig: { apiKey },
    });

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v2/videos/generate'),
    );
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({
      model: 'veo-3.1',
      prompt: 'Ocean waves at sunset',
      veoParams: {
        duration: 6,
      },
    });
  });

  it('returns structured API error body for 400 ValidationError', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: {
            prompt: ['prompt is required'],
            'fluxParams.aspect_ratio': ['invalid aspect ratio'],
          },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );

    try {
      await createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      });
      expect.fail('expected createTask to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/Validation failed/i);
      expect(error.message).toMatch(/prompt is required/i);
      expect(error.response).toMatchObject({ status: 400 });
      expect(error.body).toMatchObject({
        error: 'Validation failed',
        details: {
          prompt: ['prompt is required'],
        },
      });
    }
  });

  it('returns structured API error body for 402 insufficient credits', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          creditsRequired: 12,
          creditsAvailable: 3,
        }),
        { status: 402, headers: { 'content-type': 'application/json' } },
      ),
    );

    try {
      await createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      });
      expect.fail('expected createTask to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/Insufficient credits/i);
      expect(error.message).toMatch(/creditsRequired=12/i);
      expect(error.message).toMatch(/creditsAvailable=3/i);
      expect(error.response).toMatchObject({ status: 402 });
      expect(error.body).toMatchObject({
        creditsRequired: 12,
        creditsAvailable: 3,
      });
    }
  });

  it('returns provider error details when create API returns JSON error', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'validation failed' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it('returns HTTP error details when create response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(
      createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/401/i);
  });

  it('returns error details when create response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('not json', { status: 202, statusText: 'Accepted' }),
    );

    await expect(
      createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/invalid json/i);
  });

  it('aborts createTask when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createTask({
        locator: imageLocator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps all poll states and preserves progress', async () => {
    const cases = [
      { taskId: 'job-queued', status: 'pending', rawStatus: 'QUEUED' },
      { taskId: 'job-processing', status: 'running', rawStatus: 'PROCESSING', progress: 42 },
      { taskId: 'job-completed', status: 'succeeded', rawStatus: 'COMPLETED', progress: 100 },
      { taskId: 'job-failed', status: 'failed', rawStatus: 'FAILED' },
      { taskId: 'job-cancelled', status: 'cancelled', rawStatus: 'CANCELLED' },
    ] as const;

    for (const testCase of cases) {
      const statusResult = await checkStatus({
        locator: imageLocator,
        taskId: testCase.taskId,
        platformConfig: { apiKey },
      });
      expect(statusResult.status).toBe(testCase.status);
      expect(statusResult.raw.status).toBe(testCase.rawStatus);
      if ('progress' in testCase) {
        expect(statusResult.progress).toBe(testCase.progress);
      }
      if (testCase.taskId === 'job-failed') {
        expect(statusResult.raw.error).toBe('generation failed');
      }
    }
  });

  it('throws on unknown poll state', async () => {
    await expect(
      checkStatus({
        locator: imageLocator,
        taskId: 'job-unknown-state',
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/unknown apiframe job status/i);
  });

  it('preserves expired flag in checkStatus raw for completed jobs', async () => {
    const statusResult = await checkStatus({
      locator: imageLocator,
      taskId: 'job-expired',
      platformConfig: { apiKey },
    });
    expect(statusResult.status).toBe('succeeded');
    expect(statusResult.raw.expired).toBe(true);
    expect(statusResult.raw.status).toBe('COMPLETED');
  });

  it('throws structured error when getResult hits expired completed job CDN assets', async () => {
    try {
      await getResult({
        locator: imageLocator,
        taskId: 'job-result-expired',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/cdn assets expired/i);
      expect(error.statusResult).toMatchObject({
        provider: 'apiframe',
        taskId: 'job-result-expired',
        status: 'succeeded',
      });
      expect(error.statusResult.raw.expired).toBe(true);
      expect(error.statusResult.raw.status).toBe('COMPLETED');
    }
  });

  it('supports legacy audio locator modality as music', async () => {
    expect(parseApiframeLocator('apiframe://audio/suno')).toEqual({
      modality: 'music',
      model: 'suno',
    });

    await createTask({
      locator: 'apiframe://audio/suno',
      payload: { prompt: 'Legacy audio locator' },
      platformConfig: { apiKey },
    });

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/v2/music/generate'),
    );
    expect(JSON.parse(request?.[1]?.body as string)).toMatchObject({
      model: 'suno',
      prompt: 'Legacy audio locator',
    });
  });

  it('gets succeeded image, video, and music results with costCoins', async () => {
    const imageResult = await getResult({
      locator: imageLocator,
      taskId: 'job-result-image',
      platformConfig: { apiKey },
    });
    expect(imageResult.status).toBe('succeeded');
    expect(imageResult.costCoins).toBe(12);
    expect(imageResult.outputs.map(output => output.url)).toEqual([
      'https://example.com/image-1.png',
      'https://example.com/grid.png',
    ]);

    const videoResult = await getResult({
      locator: videoLocator,
      taskId: 'job-result-video',
      platformConfig: { apiKey },
    });
    expect(videoResult.outputs[0]?.url).toBe('https://example.com/video.mp4');

    const musicResult = await getResult({
      locator: musicLocator,
      taskId: 'job-result-music',
      platformConfig: { apiKey },
    });
    expect(musicResult.outputs.map(output => output.url)).toEqual([
      'https://example.com/track-1.mp3',
      'https://example.com/track-2.mp3',
    ]);
  });

  it('throws when result task failed with structured statusResult', async () => {
    try {
      await getResult({
        locator: imageLocator,
        taskId: 'job-result-failed',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/failed/i);
      expect(error.statusResult).toMatchObject({
        provider: 'apiframe',
        taskId: 'job-result-failed',
        status: 'failed',
      });
      expect(error.statusResult.raw.error).toBe('generation failed');
    }
  });

  it('throws when result task is not completed with structured statusResult', async () => {
    try {
      await getResult({
        locator: imageLocator,
        taskId: 'job-result-pending',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/not completed/i);
      expect(error.statusResult).toMatchObject({
        provider: 'apiframe',
        taskId: 'job-result-pending',
        status: 'running',
      });
      expect(error.statusResult.raw.status).toBe('PROCESSING');
      expect(error.statusResult.progress).toBe(10);
    }
  });

  it('throws when completed result has no outputs with structured statusResult', async () => {
    try {
      await getResult({
        locator: imageLocator,
        taskId: 'job-result-empty',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/no outputs/i);
      expect(error.statusResult).toMatchObject({
        provider: 'apiframe',
        taskId: 'job-result-empty',
        status: 'succeeded',
      });
    }
  });

  it('uploads file via multipart without manual content-type', async () => {
    const form = new FormData();
    form.append('file', new File(['image'], 'demo.png', { type: 'image/png' }));

    const uploadResult = await upload({
      uploadProvider: 'apiframe',
      formData: form,
      platformConfig: { apiKey },
    });

    expect(uploadResult.provider).toBe('apiframe');
    expect(uploadResult.url).toBe('https://cdn.apiframe.ai/uploads/demo.png');

    const request = fetchMock.mock.calls.find(([url]) => String(url).includes('/v2/uploads'));
    expect(request).toBeDefined();
    expect(String(request?.[0])).toBe(`${baseURL}/v2/uploads`);
    expect(request?.[1]?.headers).toMatchObject({
      'X-API-Key': apiKey,
    });
    expect(request?.[1]?.headers).not.toHaveProperty('Content-Type');

    const body = request?.[1]?.body as FormData;
    expect(body.get('file')).toBeTruthy();
  });

  it('rejects string file field before network call', async () => {
    const form = new FormData();
    form.append('file', 'https://example.com/not-a-file.png');

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: form,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/file.*string|formData field "file".*blob/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversize image and video uploads before network call', async () => {
    const imageForm = new FormData();
    imageForm.append(
      'file',
      new File([new Uint8Array(APIFRAME_IMAGE_AUDIO_MAX_BYTES + 1)], 'big.png', {
        type: 'image/png',
      }),
    );

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: imageForm,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/25/i);
    expect(fetchMock).not.toHaveBeenCalled();

    const videoForm = new FormData();
    videoForm.append(
      'file',
      new File([new Uint8Array(APIFRAME_VIDEO_MAX_BYTES + 1)], 'big.mp4', {
        type: 'video/mp4',
      }),
    );

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: videoForm,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/50/i);
  });

  it('allows unknown MIME between 25MB and 50MB for server magic-byte sniff', async () => {
    const blob = new Blob(['x'], { type: '' });
    Object.defineProperty(blob, 'size', {
      value: APIFRAME_IMAGE_AUDIO_MAX_BYTES + 1024,
      configurable: true,
    });

    const form = new FormData();
    form.append('file', blob, 'unknown-video.bin');

    const uploadResult = await upload({
      uploadProvider: 'apiframe',
      formData: form,
      platformConfig: { apiKey },
    });

    expect(uploadResult.url).toBe('https://cdn.apiframe.ai/uploads/demo.png');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects unknown MIME uploads above absolute 50MB limit', async () => {
    const blob = new Blob(['x'], { type: '' });
    Object.defineProperty(blob, 'size', {
      value: APIFRAME_VIDEO_MAX_BYTES + 1,
      configurable: true,
    });

    const form = new FormData();
    form.append('file', blob, 'huge.bin');

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: form,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/50/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows small unknown file types without modality-specific client cap', async () => {
    const form = new FormData();
    form.append('file', new File(['data'], 'demo.bin', { type: 'application/octet-stream' }));

    const uploadResult = await upload({
      uploadProvider: 'apiframe',
      formData: form,
      platformConfig: { apiKey },
    });

    expect(uploadResult.url).toBe('https://cdn.apiframe.ai/uploads/demo.png');
  });

  it('returns upload HTTP and provider errors with detail', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Bad Request', { status: 400, statusText: 'Bad Request' }),
    );

    const form = new FormData();
    form.append('file', new Blob(['image'], { type: 'image/png' }), 'demo.png');

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: form,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/400/i);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: form,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/Authentication failed/i);
  });

  it('aborts upload when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const form = new FormData();
    form.append('file', new Blob(['image'], { type: 'image/png' }), 'demo.png');

    await expect(
      upload({
        uploadProvider: 'apiframe',
        formData: form,
        platformConfig: { apiKey },
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

function mockFetchImplementation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/v2/images/generate') || url.includes('/v2/videos/generate') || url.includes('/v2/music/generate')) {
    return mockJsonResponse({ jobId: resolveCreateJobId(url), status: 'QUEUED' }, 202);
  }

  if (url.includes('/v2/jobs/')) {
    const jobId = url.split('/v2/jobs/')[1]?.split('?')[0] ?? '';

    switch (jobId) {
      case 'job-queued':
        return mockJsonResponse(mockJob({ status: 'QUEUED', progress: 0 }));
      case 'job-processing':
        return mockJsonResponse(mockJob({ status: 'PROCESSING', progress: 42 }));
      case 'job-completed':
        return mockJsonResponse(mockJob({ status: 'COMPLETED', progress: 100 }));
      case 'job-failed':
        return mockJsonResponse(mockJob({ status: 'FAILED', error: 'generation failed' }));
      case 'job-cancelled':
        return mockJsonResponse(mockJob({ status: 'CANCELLED' }));
      case 'job-unknown-state':
        return mockJsonResponse(mockJob({ status: 'MYSTERY' }));
      case 'job-expired':
        return mockJsonResponse(mockJob({
          status: 'COMPLETED',
          progress: 100,
          expired: true,
          result: {
            images: ['https://example.com/expired.png'],
          },
        }));
      case 'job-result-expired':
        return mockJsonResponse(mockJob({
          status: 'COMPLETED',
          progress: 100,
          expired: true,
          creditCost: 5,
          result: {
            images: ['https://example.com/expired.png'],
            gridUrl: 'https://example.com/expired-grid.png',
          },
        }));
      case 'job-result-image':
        return mockJsonResponse(mockJob({
          status: 'COMPLETED',
          progress: 100,
          creditCost: 12,
          result: {
            images: ['https://example.com/image-1.png'],
            gridUrl: 'https://example.com/grid.png',
          },
        }));
      case 'job-result-video':
        return mockJsonResponse(mockJob({
          status: 'COMPLETED',
          progress: 100,
          creditCost: 20,
          result: { videoUrl: 'https://example.com/video.mp4' },
        }));
      case 'job-result-music':
        return mockJsonResponse(mockJob({
          status: 'COMPLETED',
          progress: 100,
          creditCost: 8,
          result: {
            tracks: [
              { id: 'track-1', audioUrl: 'https://example.com/track-1.mp3' },
              { id: 'track-2', audioUrl: 'https://example.com/track-2.mp3' },
            ],
          },
        }));
      case 'job-result-failed':
        return mockJsonResponse(mockJob({ status: 'FAILED', error: 'generation failed' }));
      case 'job-result-pending':
        return mockJsonResponse(mockJob({ status: 'PROCESSING', progress: 10 }));
      case 'job-result-empty':
        return mockJsonResponse(mockJob({ status: 'COMPLETED', progress: 100, result: {} }));
      default:
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
    }
  }

  if (url.includes('/v2/uploads')) {
    return mockJsonResponse({
      id: 'upload-123',
      url: 'https://cdn.apiframe.ai/uploads/demo.png',
      kind: 'image',
      contentType: 'image/png',
      byteSize: 5,
      expiresAt: '2026-08-02T14:00:00.000Z',
    }, 201);
  }

  return new Response('Not Found', { status: 404, statusText: 'Not Found' });
}

function resolveCreateJobId(url: string): string {
  if (url.includes('/v2/images/generate')) return 'job-apiframe-image-123';
  if (url.includes('/v2/videos/generate')) return 'job-apiframe-video-123';
  return 'job-apiframe-music-123';
}

function mockJob(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'job-id',
    model: 'flux-2-pro',
    progress: 0,
    error: null,
    creditCost: null,
    webhookStatus: null,
    createdAt: '2026-08-02T12:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

function mockJsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}
