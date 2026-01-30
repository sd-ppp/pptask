import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
} from '../src/index.ts';

const locator = 'runninghub://api/rhart-image-n-pro/text-to-image';
const apiKey = 'test-api-key';

describe('runninghub-api provider (unit tests)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(mockFetchImplementation);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('describes resource without apiKey', async () => {
    // describe 不需要 apiKey，因为只是返回静态 schema
    const result = await describeResource({
      locator,
      platformConfig: {},
    });
    expect(result.provider).toBe('runninghub-api');
    expect(result.formSchema).toBeDefined();
  });

  it('describes resource', async () => {
    const result = await describeResource({
      locator,
      platformConfig: { apiKey },
    });
    expect(result.provider).toBe('runninghub-api');
    expect(result.formSchema).toBeDefined();
    expect(result.formSchema.properties.prompt).toBeDefined();
    expect(result.formSchema.properties.aspectRatio).toBeDefined();
    expect(result.formSchema.properties.resolution).toBeDefined();
  });

  it('creates task', async () => {
    const result = await createTask({
      locator,
      payload: {
        prompt: 'test prompt',
        aspectRatio: '9:16',
        resolution: '1k',
      },
      platformConfig: { apiKey },
    });
    expect(result.provider).toBe('runninghub-api');
    expect(result.taskId).toBe('mock-task-id');
    expect(result.status).toBe('pending');
  });

  it('checks status', async () => {
    const result = await checkStatus({
      locator,
      taskId: 'mock-task-id',
      platformConfig: { apiKey },
    });
    expect(result.provider).toBe('runninghub-api');
    expect(result.taskId).toBe('mock-task-id');
    expect(result.status).toBe('succeeded');
  });

  it('gets result', async () => {
    const result = await getResult({
      locator,
      taskId: 'mock-task-id',
      platformConfig: { apiKey },
    });
    expect(result.provider).toBe('runninghub-api');
    expect(result.taskId).toBe('mock-task-id');
    expect(result.status).toBe('succeeded');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].url).toBe('https://example.com/output.png');
  });

  it('validates hostname', async () => {
    const invalidLocator = 'runninghub://invalid/path';
    await expect(
      createTask({
        locator: invalidLocator,
        payload: {},
        platformConfig: { apiKey },
      })
    ).rejects.toThrow(/hostname/);
  });

  it('validates model path', async () => {
    const invalidLocator = 'runninghub://api/';
    await expect(
      createTask({
        locator: invalidLocator,
        payload: {},
        platformConfig: { apiKey },
      })
    ).rejects.toThrow(/model path/);
  });
});

// Mock fetch implementation
async function mockFetchImplementation(url: string, options?: any): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // Mock create task
  if (urlStr.includes('/openapi/v2/rhart-image-n-pro/text-to-image')) {
    return new Response(
      JSON.stringify({
        taskId: 'mock-task-id',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Mock query status
  if (urlStr.includes('/openapi/v2/query')) {
    return new Response(
      JSON.stringify({
        taskId: 'mock-task-id',
        status: 'SUCCESS',
        errorCode: '',
        errorMessage: '',
        results: [
          {
            url: 'https://example.com/output.png',
            outputType: 'png',
            text: null,
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response('Not Found', { status: 404 });
}
