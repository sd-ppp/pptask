import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerProvider,
  unregisterProvider,
  type TaskResult,
} from '../../src/index.ts';
import { createInlineExecutor } from '../../src/compat/inline.ts';

describe('legacy inline compatibility', () => {
  afterEach(() => unregisterProvider('legacy-test'));

  it('runs a registered legacy provider', async () => {
    const result: TaskResult = {
      provider: 'legacy-test',
      taskId: 'legacy-1',
      status: 'succeeded',
      outputs: [{ url: 'https://files.test/legacy.png' }],
    };
    registerProvider('legacy-test', {
      async createTaskSync() {
        return result;
      },
    });
    const onStart = vi.fn();
    const onFinish = vi.fn();

    const handle = await createInlineExecutor().run({
      locator: 'legacy-test://model',
      options: { reporter: { onStart, onFinish } },
    });

    await expect(handle.promise).resolves.toEqual(result);
    expect(handle.cancelable).toBe(false);
    expect(onStart).toHaveBeenCalledWith('legacy-1', { mode: 'sync' });
    expect(onFinish).toHaveBeenCalledWith('legacy-1', 'completed');
  });

  it('maps a built-in provider job to the legacy result without binary output', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'https://rh.test/rhart-image-v1/edit') {
        return Response.json({ taskId: 'remote-1', status: 'PENDING' });
      }
      if (url === 'https://rh.test/query') {
        return Response.json({
          taskId: 'remote-1',
          status: 'SUCCESS',
          results: [{ url: 'https://files.test/result.png' }],
        });
      }
      if (url === 'https://files.test/result.png') {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const onStart = vi.fn();
    const onFinish = vi.fn();
    const executor = createInlineExecutor({
      platformConfig: {
        apiKey: 'test-key',
        apiBaseURL: 'https://rh.test',
        fetch: fetchMock as typeof fetch,
        pollIntervalMs: 1,
      },
    });

    const handle = await executor.run({
      locator: 'runninghub://api/rhart-image-v1/edit',
      payload: { prompt: 'test' },
      options: { reporter: { onStart, onFinish } },
    });
    const result = await handle.promise;

    expect(handle.taskId).toBe('remote-1');
    expect(result.outputs).toEqual([{ url: 'https://files.test/result.png' }]);
    expect(onStart).toHaveBeenCalledWith('remote-1', expect.objectContaining({
      pptaskJobId: expect.stringMatching(/^job-/),
    }));
    expect(onFinish).toHaveBeenCalledWith('remote-1', 'completed');
    expect(JSON.stringify(result)).not.toContain('1,2,3');
  });

  it('forwards an abort signal to a cancelable built-in provider job', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('https://app.test/api/webapp/apiCallDemo')) {
        return Response.json({ success: true, data: { nodeInfoList: [] } });
      }
      if (url === 'https://app.test/task/openapi/ai-app/run') {
        return Response.json({ success: true, data: { taskId: 'remote-app-1' } });
      }
      if (url === 'https://app.test/task/openapi/status') {
        return Response.json({ success: true, data: { status: 'RUNNING' } });
      }
      if (url === 'https://app.test/task/openapi/cancel') {
        return Response.json({ success: true, data: {} });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const controller = new AbortController();
    const executor = createInlineExecutor({
      platformConfig: {
        apiKey: 'test-key',
        appBaseURL: 'https://app.test',
        fetch: fetchMock as typeof fetch,
        pollIntervalMs: 1,
      },
    });

    const handle = await executor.run({
      locator: 'runninghub://app/webapp-1',
      payload: { prompt: 'test' },
      options: { signal: controller.signal },
    });
    controller.abort();

    await expect(handle.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toContain('https://app.test/task/openapi/cancel');
  });

  it('extracts RunningHub chargedPoint and settleMode into legacy TaskResult', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'https://rh.test/rhart-image-v1/edit') {
        return Response.json({ taskId: 'remote-point-1', status: 'PENDING' });
      }
      if (url === 'https://rh.test/query') {
        return Response.json({
          taskId: 'remote-point-1',
          status: 'SUCCESS',
          settleMode: 'POINT',
          chargedPoint: '1.28',
          results: [{ url: 'https://files.test/result-point.png' }],
          usage: {
            consumeCoins: null,
            consumeMoney: null,
            taskCostTime: '12',
          },
        });
      }
      if (url === 'https://files.test/result-point.png') {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const executor = createInlineExecutor({
      platformConfig: {
        apiKey: 'test-key',
        apiBaseURL: 'https://rh.test',
        fetch: fetchMock as typeof fetch,
        pollIntervalMs: 1,
      },
    });

    const handle = await executor.run({
      locator: 'runninghub://api/rhart-image-v1/edit',
      payload: { prompt: 'test' },
    });
    const result = await handle.promise;

    expect(result.costPoints).toBe(1.28);
    expect(result.settleMode).toBe('POINT');
    expect(result.costCoins).toBeUndefined();
    expect(result.costMoney).toBeUndefined();
  });

  it('extracts RunningHub App consumeCoins and leaves null costs undefined', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith('https://app.test/api/webapp/apiCallDemo')) {
        return Response.json({ success: true, data: { nodeInfoList: [] } });
      }
      if (url === 'https://app.test/task/openapi/ai-app/run') {
        return Response.json({ success: true, data: { taskId: 'remote-app-cost' } });
      }
      if (url === 'https://app.test/task/openapi/status') {
        return Response.json({ success: true, data: { status: 'SUCCESS' } });
      }
      if (url === 'https://app.test/task/openapi/outputs') {
        return Response.json({
          success: true,
          data: [
            {
              fileUrl: 'https://files.test/app-out.png',
              consumeCoins: '42',
              consumeMoney: null,
            },
          ],
        });
      }
      if (url === 'https://files.test/app-out.png') {
        return new Response(new Uint8Array([4, 5, 6]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const executor = createInlineExecutor({
      platformConfig: {
        apiKey: 'test-key',
        appBaseURL: 'https://app.test',
        fetch: fetchMock as typeof fetch,
        pollIntervalMs: 1,
      },
    });

    const handle = await executor.run({
      locator: 'runninghub://app/webapp-1',
      payload: { prompt: 'test' },
    });
    const result = await handle.promise;

    expect(result.costCoins).toBe(42);
    expect(result.costPoints).toBeUndefined();
    expect(result.costMoney).toBeUndefined();
  });
});
