import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInlineExecutor } from '../src/index.ts';

function createMockResponse(payload: any) {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => body,
  } as Response;
}

describe('inline executor (http mode)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates calls to the configured HTTP endpoint', async () => {
    const responses: Record<string, any> = {
      '/tasks/describe': {
        provider: 'replicate',
        metadata: { scheme: 'replicate' },
        formSchema: { type: 'object', properties: {} },
        formValues: {},
      },
      '/tasks': {
        provider: 'replicate',
        taskId: 'task-http-1',
        status: 'pending',
        raw: {},
      },
      '/tasks/status': {
        provider: 'replicate',
        taskId: 'task-http-1',
        status: 'succeeded',
        raw: {},
      },
      '/tasks/result': {
        provider: 'replicate',
        taskId: 'task-http-1',
        status: 'succeeded',
        outputs: [{ rawData: { foo: 'bar' } }],
        raw: {},
      },
      '/upload': {
        provider: 'replicate',
        url: 'https://files.example.com/uploaded.png',
        raw: {},
      },
    };

    const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const finalUrl = typeof url === 'string' ? new URL(url) : url;
      const path = finalUrl.pathname.replace('/api', '');
      const responseBody = responses[path];
      expect(init?.headers).toMatchObject({ Authorization: expect.stringMatching(/^Bearer/) });
      if (path === '/tasks') {
        expect(init?.body).toBeDefined();
      }
      return createMockResponse(responseBody);
    });

    let headerCounter = 0;
    const headersFn = vi.fn(() => ({
      Authorization: `Bearer token-${++headerCounter}`,
    }));

    const executor = createInlineExecutor({
      mode: 'http',
      baseUrl: 'https://router.example.com/api',
      headers: headersFn,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const describeResult = await executor.describe({ locator: 'replicate://owner/model' });
    expect(describeResult.provider).toBe('replicate');

    const handle = await executor.run({
      locator: 'replicate://owner/model',
      payload: { prompt: 'hi' },
    });
    const outputs = await handle.promise;
    expect(outputs).toEqual([{ rawData: { foo: 'bar' } }]);

    const form = new FormData();
    form.set('file', new Blob(['inline-http'], { type: 'text/plain' }));
    const uploadUrl = await executor.upload({
      locator: 'replicate://owner/model',
      formData: form,
    });
    expect(uploadUrl).toBe('https://files.example.com/uploaded.png');

    expect(headersFn).toHaveBeenCalledTimes(5);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
