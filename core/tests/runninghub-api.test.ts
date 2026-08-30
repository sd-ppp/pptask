import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
} from '../src/index.ts';
import {
  listPPTaskLocatorOptions,
  listPPTaskLocatorProviders,
} from '../src/locator-catalog.ts';

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

  it('derives schemas for endpoints declared in the model registry', async () => {
    const result = await describeResource({
      locator: 'runninghub://api/rhart-image-n-pro/edit',
      platformConfig: {},
    });

    expect(result.formSchema.properties.imageUrls).toMatchObject({
      type: 'string',
      required: true,
    });
    expect(result.formSchema.properties.resolution).toMatchObject({
      'x-component': 'Select',
      required: true,
      default: '1k',
    });
    expect(result.formValues).toMatchObject({
      aspectRatio: 'empty',
      resolution: '1k',
    });

    const dolaResult = await describeResource({
      locator: 'runninghub://api/dola-Seedream-5.0-pro/image-to-image',
      platformConfig: {},
    });
    expect(dolaResult.formSchema.properties.imageUrls).toMatchObject({ required: true });
    expect(dolaResult.formSchema.properties.outputFormat).toMatchObject({ 'x-component': 'Select' });
  });

  it('lists the RunningHub locator catalog through provider-neutral APIs', () => {
    expect(listPPTaskLocatorProviders()).toEqual([
      { id: 'runninghub', label: 'RunningHub' },
      { id: 'replicate', label: 'Replicate' },
      { id: 'kie', label: 'Kie' },
      { id: 'apiframe', label: 'Apiframe' },
    ]);

    const options = listPPTaskLocatorOptions('runninghub');
    expect(options).toHaveLength(374);
    expect(new Set(options.map(option => option.locator)).size).toBe(options.length);
    expect(options).toContainEqual(expect.objectContaining({
      providerId: 'runninghub',
      locator: 'runninghub://api/rhart-image-n-pro/text-to-image',
      category: expect.any(String),
      outputType: expect.any(String),
      searchText: expect.stringContaining('rhart-image-n-pro/text-to-image'),
    }));
    expect(listPPTaskLocatorOptions('unknown')).toEqual([]);
    const replicateOptions = listPPTaskLocatorOptions('replicate');
    expect(replicateOptions.length).toBeGreaterThan(0);
    expect(replicateOptions.every(option => option.providerId === 'replicate')).toBe(true);
  });

  it('keeps unknown RunningHub endpoints on the generic describe schema', async () => {
    const result = await describeResource({
      locator: 'runninghub://api/custom/not-in-catalog',
      platformConfig: {},
    });

    expect(result.formSchema.properties).toEqual({
      prompt: expect.objectContaining({
        type: 'string',
        required: true,
      }),
    });
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

  it('accepts a queued task response with empty error fields', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      taskId: 'queued-task-id',
      status: 'QUEUED',
      errorCode: '',
      errorMessage: '',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(createTask({
      locator,
      payload: { resolution: '1k' },
      platformConfig: { apiKey },
    })).resolves.toMatchObject({
      taskId: 'queued-task-id',
      status: 'pending',
    });
  });

  it('surfaces the provider error when task creation returns no task id', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      code: 400,
      msg: 'invalid resolution',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(createTask({
      locator,
      payload: { resolution: '2k' },
      platformConfig: { apiKey },
    })).rejects.toThrow(/invalid resolution/);
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

  it('returns provider task failures instead of treating them as polling failures', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      taskId: 'failed-task-id',
      status: 'FAILED',
      errorCode: '1007',
      errorMessage: 'the image format is not supported',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(checkStatus({
      locator,
      taskId: 'failed-task-id',
      platformConfig: { apiKey },
    })).resolves.toMatchObject({
      taskId: 'failed-task-id',
      status: 'failed',
    });
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
