import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  cancelTask,
} from '../src/index.ts';

const locator = 'grsai:///nano-banana-fast';
const apiKey = 'test-key';

describe('grsai provider (unit tests)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(mockFetchImplementation);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires apiKey for createTask', async () => {
    await expect(
      createTask({ locator, payload: { prompt: 'test' }, platformConfig: {} })
    ).rejects.toThrow(/apiKey/);
  });

  it('describes resource', async () => {
    const platformConfig = { apiKey };
    const describeResult = await describeResource({ locator, platformConfig });
    
    expect(describeResult.provider).toBe('grsai');
    expect(describeResult.metadata.model).toBe('nano-banana-fast');
    expect(describeResult.formSchema.properties.prompt).toBeDefined();
    expect(describeResult.formSchema.properties.aspectRatio).toBeDefined();
    expect(describeResult.formSchema.properties.imageSize).toBeDefined();
    expect(describeResult.recommendUploadProvider).toBe('grsai');
    expect(describeResult.cancelable).toBe(false);
  });

  it('creates task', async () => {
    const platformConfig = { apiKey, baseURL: 'https://api.grsai.com' };
    const createResult = await createTask({
      locator,
      payload: { 
        prompt: '一只可爱的猫咪在草地上玩耍',
        aspectRatio: '16:9',
        imageSize: '1K'
      },
      platformConfig,
    });
    
    expect(createResult.provider).toBe('grsai');
    expect(createResult.taskId).toBe('task-abc123');
    expect(createResult.status).toBe('pending');
  });

  it('checks status', async () => {
    const platformConfig = { apiKey, baseURL: 'https://status.api.com' };
    const statusResult = await checkStatus({
      locator,
      taskId: 'task-running',
      platformConfig,
    });
    
    expect(statusResult.provider).toBe('grsai');
    expect(statusResult.taskId).toBe('task-running');
    expect(statusResult.status).toBe('running');
    expect(statusResult.progress).toBe(50);
  });

  it('gets result', async () => {
    const platformConfig = { apiKey, baseURL: 'https://api.grsai.com' };
    const result = await getResult({
      locator,
      taskId: 'task-abc123',
      platformConfig,
    });
    
    expect(result.provider).toBe('grsai');
    expect(result.taskId).toBe('task-abc123');
    expect(result.status).toBe('succeeded');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]?.url).toBe('https://example.com/output.png');
    expect(result.outputs[0]?.content).toBe('一只可爱的猫咪在草地上玩耍');
  });

  it('handles api error response', async () => {
    const platformConfig = { apiKey, baseURL: 'https://error.api.com' };
    
    await expect(
      checkStatus({
        locator,
        taskId: 'task-error',
        platformConfig,
      })
    ).rejects.toThrow('API error: Task not found');
  });

  it('cancels task (no-op)', async () => {
    const platformConfig = { apiKey, baseURL: 'https://api.grsai.com' };
    
    await expect(
      cancelTask({ locator, taskId: 'task-abc123', platformConfig })
    ).resolves.toBeUndefined();
  });

  it('throws error when result is not succeeded', async () => {
    const platformConfig = { apiKey, baseURL: 'https://failed.api.com' };
    
    await expect(
      getResult({
        locator,
        taskId: 'task-failed',
        platformConfig,
      })
    ).rejects.toThrow(/is not completed/);
  });
});

function mockFetchImplementation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const baseUrl = url.split('/v1')[0];

  // Create task endpoint
  if (url.includes('/v1/draw/nano-banana')) {
    const body = JSON.parse(init?.body as string);
    
    // Direct response format (without wrapping in data field)
    return mockJsonResponse({
      id: 'task-abc123',
      status: 'pending',
      progress: 0,
    });
  }

  // Result endpoint - different responses based on baseUrl and taskId
  if (url.includes('/v1/draw/result')) {
    const body = JSON.parse(init?.body as string);
    const taskId = body.id;

    // Error case
    if (baseUrl.includes('error.api.com')) {
      return mockJsonResponse({
        code: 404,
        msg: 'Task not found',
      });
    }

    // Failed task case
    if (baseUrl.includes('failed.api.com') || taskId === 'task-failed') {
      return mockJsonResponse({
        code: 0,
        data: {
          id: taskId,
          status: 'failed',
          progress: 100,
          error: 'Generation failed',
          failure_reason: 'Model error',
          results: [],
        },
      });
    }

    // Running status (for checkStatus test)
    if (baseUrl.includes('status.api.com') || taskId === 'task-running') {
      return mockJsonResponse({
        code: 0,
        data: {
          id: taskId,
          status: 'running',
          progress: 50,
          results: [],
        },
      });
    }

    // Default: return succeeded status with results (for getResult test)
    return mockJsonResponse({
      code: 0,
      data: {
        id: taskId,
        status: 'succeeded',
        progress: 100,
        results: [
          {
            url: 'https://example.com/output.png',
            content: '一只可爱的猫咪在草地上玩耍',
          },
        ],
      },
    });
  }

  return mockJsonResponse({ code: 0 });
}

function mockJsonResponse(body: any, status = 200): Promise<Response> {
  const ok = status >= 200 && status < 300;
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}
