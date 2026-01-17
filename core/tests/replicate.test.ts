import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  cancelTask,
} from '../src/index.ts';

const locator = 'replicate:///stability-ai/sdxl';
const apiKey = 'test-key';

describe('replicate provider (unit tests)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(mockFetchImplementation);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires apiKey', async () => {
    await expect(
      describeResource({ locator, platformConfig: {} })
    ).rejects.toThrow(/apiKey/);
  });

  it('describes resource', async () => {
    const platformConfig = { apiKey };
    const describeResult = await describeResource({ locator, platformConfig });
    
    expect(describeResult.provider).toBe('replicate');
    expect(describeResult.metadata.model).toBe('stability-ai/sdxl');
    expect(describeResult.formSchema).toBeDefined();
    expect(describeResult.recommendUploadProvider).toBe('replicate');
  });

  it('creates task', async () => {
    const platformConfig = { apiKey };
    const createResult = await createTask({
      locator,
      payload: { prompt: 'a beautiful landscape' },
      platformConfig,
    });
    
    expect(createResult.provider).toBe('replicate');
    expect(createResult.taskId).toBe('pred-abc123');
    expect(createResult.status).toBe('pending');
  });

  it('checks status', async () => {
    const platformConfig = { apiKey };
    const statusResult = await checkStatus({
      locator,
      taskId: 'pred-running',
      platformConfig,
    });
    
    expect(statusResult.provider).toBe('replicate');
    expect(statusResult.taskId).toBe('pred-running');
    expect(statusResult.status).toBe('running');
  });

  it('gets result', async () => {
    const platformConfig = { apiKey };
    const result = await getResult({
      locator,
      taskId: 'pred-succeeded',
      platformConfig,
    });
    
    expect(result.provider).toBe('replicate');
    expect(result.taskId).toBe('pred-succeeded');
    expect(result.status).toBe('succeeded');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]?.url).toBe('https://replicate.com/output.png');
  });
});

function mockFetchImplementation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Describe model - GET /models/stability-ai/sdxl
  if (url.includes('/models/stability-ai/sdxl') && init?.method?.toUpperCase() !== 'POST') {
    return mockJsonResponse({
      id: 'stability-ai/sdxl',
      name: 'stability-ai/sdxl',
      owner: 'stability-ai',
      latest_version: {
        id: 'v1.0.0',
        created_at: '2024-01-01T00:00:00.000Z',
        openapi_schema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              default: 'a beautiful landscape',
            },
          },
        },
      },
    });
  }

  // Create prediction - POST /predictions
  if (url.includes('/predictions') && init?.method?.toUpperCase() === 'POST') {
    const body = JSON.parse(init?.body as string);
    return mockJsonResponse({
      id: 'pred-abc123',
      status: 'starting',
      version: 'v1.0.0',
      model: body.model,
      input: body.input,
    });
  }

  // Get prediction status - GET /predictions/pred-running (for checkStatus test)
  if (url.includes('/predictions/pred-running')) {
    return mockJsonResponse({
      id: 'pred-running',
      status: 'running',
      progress: 0.5,
      logs: 'Processing...',
      created_at: '2024-01-01T00:00:00.000Z',
    });
  }

  // Get prediction result - GET /predictions/pred-succeeded (for getResult test)
  if (url.includes('/predictions/pred-succeeded')) {
    return mockJsonResponse({
      id: 'pred-succeeded',
      status: 'succeeded',
      output: ['https://replicate.com/output.png'],
      created_at: '2024-01-01T00:00:00.000Z',
      metrics: {
        predict_time: 5.2,
      },
    });
  }

  // Cancel prediction - POST /predictions/pred-abc123/cancel
  if (url.includes('/predictions/pred-abc123/cancel')) {
    return mockJsonResponse({ 
      id: 'pred-abc123', 
      status: 'cancelling',
      created_at: '2024-01-01T00:00:00.000Z',
    });
  }

  // Error case - wrong model name or API error
  if (url.includes('pred-error') || url.includes('error.api.com')) {
    return mockJsonResponse({ error: 'Not found' }, 404);
  }

  return mockJsonResponse({ code: 0 });
}

function mockJsonResponse(body: any, status = 200): Promise<Response> {
  const ok = status >= 200 && status < 300;
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}
