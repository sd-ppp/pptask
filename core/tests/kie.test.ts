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
  mapKieState,
  parseKieResultOutputs,
  defaultKieUploadPath,
  KIE_DEFAULT_UPLOAD_BASE_URL,
  KIE_FILE_STREAM_UPLOAD_PATH,
  normalizeKieUploadPath,
} from '../src/providers/kie/helpers.ts';

const locator = 'kie://market/seedream/5-pro-text-to-image';
const nonWhitelistedLocator = 'kie://market/bytedance/seedream';
const apiKey = 'test-kie-key';
const baseURL = 'https://api.kie.ai';

describe('kie helpers', () => {
  it('maps kie task states', () => {
    expect(mapKieState('waiting')).toBe('pending');
    expect(mapKieState('queuing')).toBe('pending');
    expect(mapKieState('generating')).toBe('running');
    expect(mapKieState('success')).toBe('succeeded');
    expect(mapKieState('fail')).toBe('failed');
    expect(() => mapKieState('unknown-state')).toThrow(/unknown kie task state/i);
  });

  it('parses resultJson output shapes', () => {
    const urlOutputs = parseKieResultOutputs(
      JSON.stringify({ resultUrls: ['https://example.com/a.png', 'https://example.com/b.png'] }),
    );
    expect(urlOutputs).toHaveLength(2);
    expect(urlOutputs[0]?.url).toBe('https://example.com/a.png');

    const frameOutputs = parseKieResultOutputs(
      JSON.stringify({
        resultUrls: ['https://example.com/video.mp4'],
        firstFrameUrl: 'https://example.com/first.jpg',
        lastFrameUrl: ['https://example.com/last-1.jpg', 'https://example.com/last-2.jpg'],
      }),
    );
    expect(frameOutputs.map(output => output.url)).toEqual([
      'https://example.com/video.mp4',
      'https://example.com/first.jpg',
      'https://example.com/last-1.jpg',
      'https://example.com/last-2.jpg',
    ]);

    const maskOutputs = parseKieResultOutputs(
      JSON.stringify({
        resultObject: {
          mask_urls: ['https://example.com/mask-1.png', 'https://example.com/mask-2.png'],
        },
      }),
    );
    expect(maskOutputs).toHaveLength(2);
    expect(maskOutputs[0]?.url).toBe('https://example.com/mask-1.png');

    const objectOutputs = parseKieResultOutputs(
      JSON.stringify({ resultObject: { subject_status: 1 } }),
    );
    expect(objectOutputs).toHaveLength(1);
    expect(objectOutputs[0]?.url).toBeUndefined();
    expect(objectOutputs[0]?.rawData).toEqual({ subject_status: 1 });

    const emptyMaskOutputs = parseKieResultOutputs(
      JSON.stringify({ resultObject: { mask_urls: [] } }),
    );
    expect(emptyMaskOutputs).toHaveLength(1);
    expect(emptyMaskOutputs[0]?.url).toBeUndefined();
    expect(emptyMaskOutputs[0]?.rawData).toEqual({ mask_urls: [] });
  });

  it('normalizes uploadPath by trimming slashes and falling back to default', () => {
    expect(normalizeKieUploadPath('/images/custom/')).toBe('images/custom');
    expect(normalizeKieUploadPath('///')).toBeUndefined();
    expect(normalizeKieUploadPath('   ')).toBeUndefined();
  });

  it('builds default upload path with date segment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00.000Z'));
    expect(defaultKieUploadPath()).toBe('pptask/2026-08-02');
    vi.useRealTimers();
  });
});

describe('kie provider (unit tests)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(mockFetchImplementation);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is registered in core provider lists', () => {
    expect(listProviders()).toContain('kie');
    expect(listUploadProviders()).toContain('kie');
  });

  it('requires apiKey for createTask', async () => {
    await expect(
      createTask({ locator, payload: { prompt: 'test' }, platformConfig: {} }),
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
    const describeResult = await describeResource({ locator, platformConfig: { apiKey } });
    expect(describeResult.provider).toBe('kie');
    expect(describeResult.cancelable).toBe(false);
    expect(describeResult.recommendUploadProvider).toBe('kie');
    expect(describeResult.metadata.model).toBe('seedream/5-pro-text-to-image');
    expect(describeResult.formSchema.properties).not.toHaveProperty('model');
    expect(describeResult.formSchema.properties).not.toHaveProperty('callBackUrl');
  });

  it('creates task with locator model, auth header, and sanitized payload', async () => {
    const createResult = await createTask({
      locator,
      payload: {
        model: 'evil-model',
        callBackUrl: 'https://evil.example/callback',
        callbackUrl: 'https://evil.example/callback2',
        callback_url: 'https://evil.example/callback3',
        prompt: 'A scenic mountain landscape',
        aspect_ratio: '16:9',
      },
      platformConfig: {
        apiKey,
        callbackUrl: 'https://platform.example/callback',
      },
    });

    expect(createResult.provider).toBe('kie');
    expect(createResult.taskId).toBe('task-kie-123');
    expect(createResult.status).toBe('pending');

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/v1/jobs/createTask'),
    );
    expect(request).toBeDefined();
    expect(request?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({
      model: 'seedream/5-pro-text-to-image',
      input: {
        prompt: 'A scenic mountain landscape',
        aspect_ratio: '16:9',
      },
      callBackUrl: 'https://platform.example/callback',
    });
  });

  it('uses platformConfig callback_url when creating task', async () => {
    await createTask({
      locator,
      payload: {
        callback_url: 'https://evil.example/callback',
        prompt: 'callback from platform config',
      },
      platformConfig: {
        apiKey,
        callback_url: 'https://platform.example/callback-snake',
      },
    });

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/v1/jobs/createTask'),
    );
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({
      model: 'seedream/5-pro-text-to-image',
      input: {
        prompt: 'callback from platform config',
      },
      callBackUrl: 'https://platform.example/callback-snake',
    });
  });

  it('returns provider error details when createTask API code is non-success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: 422, msg: 'validation failed', data: null }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      createTask({
        locator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/validation failed/i);
  });

  it('returns HTTP error details when createTask response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }),
    );

    await expect(
      createTask({
        locator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/401/i);
  });

  it('aborts createTask when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createTask({
        locator,
        payload: { prompt: 'test' },
        platformConfig: { apiKey },
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps all poll states and preserves fail details', async () => {
    const cases = [
      { taskId: 'task-waiting', status: 'pending', state: 'waiting' },
      { taskId: 'task-queuing', status: 'pending', state: 'queuing' },
      { taskId: 'task-generating', status: 'running', state: 'generating', progress: 42 },
      { taskId: 'task-success', status: 'succeeded', state: 'success', progress: 100 },
      { taskId: 'task-fail', status: 'failed', state: 'fail' },
    ] as const;

    for (const testCase of cases) {
      const statusResult = await checkStatus({
        locator,
        taskId: testCase.taskId,
        platformConfig: { apiKey },
      });
      expect(statusResult.status).toBe(testCase.status);
      expect(statusResult.raw.state).toBe(testCase.state);
      if ('progress' in testCase) {
        expect(statusResult.progress).toBe(testCase.progress);
      }
      if (testCase.taskId === 'task-fail') {
        expect(statusResult.raw.failCode).toBe('501');
        expect(statusResult.raw.failMsg).toBe('generation failed');
      }
    }
  });

  it('throws on unknown poll state', async () => {
    await expect(
      checkStatus({
        locator,
        taskId: 'task-unknown-state',
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/unknown kie task state/i);
  });

  it('gets succeeded result with urls, frames, masks, raw object, and costCoins', async () => {
    const result = await getResult({
      locator,
      taskId: 'task-result-rich',
      platformConfig: { apiKey },
    });

    expect(result.status).toBe('succeeded');
    expect(result.costCoins).toBe(12);
    expect(result.outputs.map(output => output.url)).toEqual([
      'https://example.com/output.png',
      'https://example.com/first.png',
      'https://example.com/last.png',
    ]);
  });

  it('gets succeeded result with mask_urls outputs', async () => {
    const result = await getResult({
      locator,
      taskId: 'task-result-mask',
      platformConfig: { apiKey },
    });

    expect(result.outputs.map(output => output.url)).toEqual([
      'https://example.com/mask-1.png',
      'https://example.com/mask-2.png',
    ]);
  });

  it('gets succeeded result with empty mask_urls as raw resultObject output', async () => {
    const result = await getResult({
      locator,
      taskId: 'task-result-mask-empty',
      platformConfig: { apiKey },
    });

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]?.url).toBeUndefined();
    expect(result.outputs[0]?.rawData).toEqual({ mask_urls: [] });
  });

  it('gets succeeded result with raw resultObject output', async () => {
    const result = await getResult({
      locator,
      taskId: 'task-result-object',
      platformConfig: { apiKey },
    });

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]?.rawData).toEqual({ subject_status: 1 });
    expect(result.outputs[0]?.url).toBeUndefined();
  });

  it('throws when result task failed with structured statusResult', async () => {
    try {
      await getResult({
        locator,
        taskId: 'task-result-failed',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/failed/i);
      expect(error.statusResult).toMatchObject({
        provider: 'kie',
        taskId: 'task-result-failed',
        status: 'failed',
      });
      expect(error.statusResult.raw.failCode).toBe('501');
      expect(error.statusResult.raw.failMsg).toBe('generation failed');
    }
  });

  it('throws when result task is not completed with structured statusResult', async () => {
    try {
      await getResult({
        locator,
        taskId: 'task-result-pending',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/not completed/i);
      expect(error.statusResult).toMatchObject({
        provider: 'kie',
        taskId: 'task-result-pending',
        status: 'running',
      });
      expect(error.statusResult.raw.state).toBe('generating');
      expect(error.statusResult.progress).toBe(10);
    }
  });

  it('throws when resultJson is invalid JSON with structured statusResult', async () => {
    try {
      await getResult({
        locator,
        taskId: 'task-result-bad-json',
        platformConfig: { apiKey },
      });
      expect.fail('expected getResult to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/resultJson/i);
      expect(error.statusResult).toMatchObject({
        provider: 'kie',
        taskId: 'task-result-bad-json',
        status: 'succeeded',
      });
      expect(error.statusResult.raw.resultJson).toBe('{not-json');
    }
  });

  it('uploads file via multipart without manual content-type', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00.000Z'));

    const form = new FormData();
    form.append('file', new File(['image'], 'demo.png', { type: 'image/png' }));

    const uploadResult = await upload({
      uploadProvider: 'kie',
      formData: form,
      platformConfig: { apiKey },
    });

    expect(uploadResult.provider).toBe('kie');
    expect(uploadResult.url).toBe('https://tempfile.example/demo.png');

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/file-stream-upload'),
    );
    expect(request).toBeDefined();
    expect(String(request?.[0])).toBe(
      `${KIE_DEFAULT_UPLOAD_BASE_URL}${KIE_FILE_STREAM_UPLOAD_PATH}`,
    );
    expect(request?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${apiKey}`,
    });
    expect(request?.[1]?.headers).not.toHaveProperty('Content-Type');

    const body = request?.[1]?.body as FormData;
    expect(body.get('uploadPath')).toBe('pptask/2026-08-02');
    expect(body.get('fileName')).toBe('demo.png');
    expect(body.get('file')).toBeTruthy();

    vi.useRealTimers();
  });

  it('uses configured uploadPath and fileName when provided', async () => {
    const form = new FormData();
    form.append('file', new File(['image'], 'demo.png', { type: 'image/png' }));
    form.append('fileName', 'custom-name.png');

    await upload({
      uploadProvider: 'kie',
      formData: form,
      platformConfig: {
        apiKey,
        uploadPath: '/images/custom/',
      },
    });

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/file-stream-upload'),
    );
    const body = request?.[1]?.body as FormData;
    expect(body.get('uploadPath')).toBe('images/custom');
    expect(body.get('fileName')).toBe('custom-name.png');
  });

  it('falls back to default uploadPath when configured uploadPath is empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00.000Z'));

    const form = new FormData();
    form.append('file', new File(['image'], 'demo.png', { type: 'image/png' }));

    await upload({
      uploadProvider: 'kie',
      formData: form,
      platformConfig: {
        apiKey,
        uploadPath: '///',
      },
    });

    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/file-stream-upload'),
    );
    const body = request?.[1]?.body as FormData;
    expect(body.get('uploadPath')).toBe('pptask/2026-08-02');

    vi.useRealTimers();
  });

  it('returns upload HTTP and provider errors with detail', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Bad Request', { status: 400, statusText: 'Bad Request' }),
    );

    const form = new FormData();
    form.append('file', new Blob(['image'], { type: 'image/png' }), 'demo.png');

    await expect(
      upload({
        uploadProvider: 'kie',
        formData: form,
        platformConfig: { apiKey },
      }),
    ).rejects.toThrow(/400/i);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, code: 401, msg: 'Authentication failed' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      upload({
        uploadProvider: 'kie',
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
        uploadProvider: 'kie',
        formData: form,
        platformConfig: { apiKey },
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

function mockFetchImplementation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/api/v1/jobs/createTask')) {
    return mockJsonResponse({
      code: 200,
      msg: 'success',
      data: { taskId: 'task-kie-123' },
    });
  }

  if (url.includes('/api/v1/jobs/recordInfo')) {
    const taskId = new URL(url).searchParams.get('taskId');

    switch (taskId) {
      case 'task-waiting':
        return mockRecordInfo({ state: 'waiting' });
      case 'task-queuing':
        return mockRecordInfo({ state: 'queuing' });
      case 'task-generating':
        return mockRecordInfo({ state: 'generating', progress: 42 });
      case 'task-success':
        return mockRecordInfo({ state: 'success', progress: 100 });
      case 'task-fail':
        return mockRecordInfo({
          state: 'fail',
          failCode: '501',
          failMsg: 'generation failed',
        });
      case 'task-unknown-state':
        return mockRecordInfo({ state: 'mystery' });
      case 'task-result-rich':
        return mockRecordInfo({
          state: 'success',
          creditsConsumed: 12,
          resultJson: JSON.stringify({
            resultUrls: ['https://example.com/output.png'],
            firstFrameUrl: 'https://example.com/first.png',
            lastFrameUrl: 'https://example.com/last.png',
          }),
        });
      case 'task-result-mask':
        return mockRecordInfo({
          state: 'success',
          resultJson: JSON.stringify({
            resultObject: {
              mask_urls: ['https://example.com/mask-1.png', 'https://example.com/mask-2.png'],
            },
          }),
        });
      case 'task-result-mask-empty':
        return mockRecordInfo({
          state: 'success',
          resultJson: JSON.stringify({
            resultObject: {
              mask_urls: [],
            },
          }),
        });
      case 'task-result-object':
        return mockRecordInfo({
          state: 'success',
          resultJson: JSON.stringify({ resultObject: { subject_status: 1 } }),
        });
      case 'task-result-failed':
        return mockRecordInfo({
          state: 'fail',
          failCode: '501',
          failMsg: 'generation failed',
        });
      case 'task-result-pending':
        return mockRecordInfo({ state: 'generating', progress: 10 });
      case 'task-result-bad-json':
        return mockRecordInfo({ state: 'success', resultJson: '{not-json' });
      default:
        return mockJsonResponse({ code: 404, msg: 'Task not found', data: null });
    }
  }

  if (url.includes('/api/file-stream-upload')) {
    return mockJsonResponse({
      success: true,
      code: 200,
      msg: 'File uploaded successfully',
      data: {
        fileName: 'demo.png',
        filePath: 'pptask/2026-08-02/demo.png',
        downloadUrl: 'https://tempfile.example/demo.png',
        fileSize: 5,
        mimeType: 'image/png',
        uploadedAt: '2026-08-02T12:00:00.000Z',
      },
    });
  }

  return new Response('Not Found', { status: 404, statusText: 'Not Found' });
}

function mockRecordInfo(data: Record<string, unknown>): Promise<Response> {
  return mockJsonResponse({
    code: 200,
    msg: 'success',
    data: {
      taskId: 'task-id',
      model: 'seedream/5-pro-text-to-image',
      ...data,
    },
  });
}

function mockJsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}
