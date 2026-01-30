import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  cancelTask,
  upload,
} from '../src/index.ts';

const locator = 'runninghub://app/mock-app';
const apiKey = 'test-key';

describe('runninghub provider (unit tests)', () => {
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
    
    expect(describeResult.provider).toBe('runninghub');
    expect(Object.keys(describeResult.formSchema.properties)).toHaveLength(1);
    expect(describeResult.recommendUploadProvider).toBe('runninghub');
  });

  it('creates task', async () => {
    const platformConfig = { apiKey };
    const createResult = await createTask({
      locator,
      payload: { '1_prompt': 'hello' },
      platformConfig,
    });
    
    expect(createResult.taskId).toBe('task-123');
    expect(createResult.provider).toBe('runninghub');
  });

  it('checks status', async () => {
    const platformConfig = { apiKey };
    const statusResult = await checkStatus({
      locator,
      taskId: 'task-123',
      platformConfig,
    });
    
    expect(statusResult.status).toBe('succeeded');
  });

  it('gets result', async () => {
    const platformConfig = { apiKey };
    const result = await getResult({
      locator,
      taskId: 'task-123',
      platformConfig,
    });
    
    expect(result.outputs[0]?.url).toBe('https://files/output.png');
    expect(result.costMoney).toBeCloseTo(0.3);
    expect(result.costMoneyCurrency).toBe('CNY');
    expect(result.costCoins).toBe(14);
  });

  it('cancels task', async () => {
    const platformConfig = { apiKey };
    
    await expect(
      cancelTask({ locator, taskId: 'task-123', platformConfig })
    ).resolves.toBeUndefined();
  });

  it('uploads file', async () => {
    const platformConfig = { apiKey };
    const form = new FormData();
    form.append('file', new Blob(['data'], { type: 'text/plain' }), 'demo.txt');
    
    const uploadResult = await upload({
      uploadProvider: 'runninghub',
      formData: form,
      platformConfig,
    });
    
    expect(uploadResult.url).toBe('uploaded-file');
  });
});

function mockFetchImplementation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes('/api/webapp/apiCallDemo')) {
    return mockJsonResponse({
      code: 0,
      data: {
        nodeInfoList: [
          { nodeId: 1, fieldName: 'prompt', fieldType: 'text', fieldValue: 'default prompt' },
        ],
      },
    });
  }
  if (url.includes('/task/openapi/ai-app/run')) {
    const body = JSON.parse(init?.body as string);
    if (!body.nodeInfoList || body.nodeInfoList[0]?.fieldValue === undefined) {
      return mockJsonResponse({ code: 1, msg: 'missing nodeInfoList' }, 200);
    }
    return mockJsonResponse({ code: 0, data: { taskId: 'task-123' } });
  }
  if (url.includes('/task/openapi/status')) {
    return mockJsonResponse({ code: 0, data: { status: 'SUCCESS' } });
  }
  if (url.includes('/task/openapi/outputs')) {
    return mockJsonResponse({
      code: 0,
      data: [
        {
          fileUrl: 'https://files/output.png',
          thirdPartyConsumeMoney: '0.3',
          consumeCoins: '14',
        },
      ],
    });
  }
  if (url.includes('/task/openapi/cancel')) {
    return mockJsonResponse({ code: 0, data: {} });
  }
  if (url.includes('/task/openapi/upload')) {
    return mockJsonResponse({ code: 0, data: { fileName: 'uploaded-file' } });
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
