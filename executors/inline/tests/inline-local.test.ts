import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../core/src/index.ts', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    describeResource: vi.fn(),
    createTask: vi.fn(),
    checkStatus: vi.fn(),
    getResult: vi.fn(),
    cancelTask: vi.fn(),
    upload: vi.fn(),
    // Mock getProvider to return a provider without createTaskSync
    getProvider: vi.fn(() => ({
      createTaskAsync: vi.fn(),
      checkStatus: vi.fn(),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    })),
  };
});

import { createInlineExecutor } from '../src/index.ts';
import * as core from '../../../core/src/index.ts';

describe('inline executor (local mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('describes resources via core module', async () => {
    const describeMock = vi.mocked(core.describeResource).mockResolvedValue({
      provider: 'replicate',
      metadata: { scheme: 'replicate' },
      formSchema: { type: 'object', properties: {} },
      formValues: {},
    });

    const executor = createInlineExecutor();
    const result = await executor.describe({ locator: 'replicate://owner/model' });

    expect(result.provider).toBe('replicate');
    expect(describeMock).toHaveBeenCalledWith({
      locator: 'replicate://owner/model',
      platformConfig: undefined,
      options: undefined,
    });
  });

  it('runs tasks to completion and returns full result', async () => {
    const mockProvider = {
      createTaskAsync: vi.fn().mockResolvedValue({
        provider: 'replicate',
        taskId: 'task-1',
        status: 'pending',
        raw: {},
      }),
      checkStatus: vi.fn(),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };
    
    // Mock getProvider to return our mock provider
    vi.mocked(core.getProvider).mockReturnValue(mockProvider);
    
    vi.mocked(core.createTask).mockResolvedValue({
      provider: 'replicate',
      taskId: 'task-1',
      status: 'pending',
      raw: {},
    });
    const checkStatusMock = vi
      .mocked(core.checkStatus)
      .mockResolvedValueOnce({
        provider: 'replicate',
        taskId: 'task-1',
        status: 'running',
        raw: {},
      })
      .mockResolvedValueOnce({
        provider: 'replicate',
        taskId: 'task-1',
        status: 'succeeded',
        progress: 1,
        raw: {},
      });
    const getResultMock = vi.mocked(core.getResult).mockResolvedValue({
      provider: 'replicate',
      taskId: 'task-1',
      status: 'succeeded',
      outputs: [{ rawData: { url: 'foo' } }],
      raw: {},
    });
    const cancelMock = vi.mocked(core.cancelTask).mockResolvedValue(undefined);

    const reporter = {
      onStart: vi.fn(),
      onProgress: vi.fn(),
      onFinish: vi.fn(),
    };

    const executor = createInlineExecutor();
    const handle = await executor.run({
      locator: 'replicate://owner/model',
      payload: { prompt: 'hello' },
      options: { reporter },
    });

    expect(handle.taskId).toBe('task-1');
    expect(handle.cancelable).toBe(true);

    await vi.runAllTimersAsync();

    const result = await handle.promise;
    expect(result.provider).toBe('replicate');
    expect(result.taskId).toBe('task-1');
    expect(result.status).toBe('succeeded');
    expect(result.outputs).toEqual([{ rawData: { url: 'foo' } }]);
    expect(checkStatusMock).toHaveBeenCalledTimes(2);
    expect(getResultMock).toHaveBeenCalledTimes(1);
    expect(reporter.onStart).toHaveBeenCalledWith('task-1', undefined);
    expect(reporter.onProgress).toHaveBeenCalledWith('task-1', 1, 'succeeded');
    const finishArgs = reporter.onFinish.mock.calls[0];
    expect(finishArgs[0]).toBe('task-1');
    expect(finishArgs[1]).toBe('completed');
    expect(finishArgs[2]).toBeUndefined();

    await handle.cancel();
    expect(cancelMock).toHaveBeenCalledWith({
      locator: 'replicate://owner/model',
      taskId: 'task-1',
      platformConfig: undefined,
      options: undefined,
    });
  });

  it('invokes upload via core module', async () => {
    const uploadMock = vi.mocked(core.upload).mockResolvedValue({
      provider: 'replicate',
      url: 'https://files.example.com/foo.png',
      raw: {},
    });

    const executor = createInlineExecutor();
    const form = new FormData();
    form.set('file', new Blob(['hello'], { type: 'text/plain' }));
    const url = await executor.upload({
      locator: 'replicate://owner/model',
      formData: form,
    });

    expect(url).toBe('https://files.example.com/foo.png');
    expect(uploadMock).toHaveBeenCalledWith({
      locator: 'replicate://owner/model',
      uploadProvider: undefined,
      formData: form,
      platformConfig: undefined,
      options: undefined,
    });
  });
});
