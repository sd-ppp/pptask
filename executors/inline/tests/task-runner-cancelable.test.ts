import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../core/src/index.ts', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    checkStatus: vi.fn(),
    getResult: vi.fn(),
    cancelTask: vi.fn(),
    getProvider: vi.fn(),
  };
});

import { createTaskHandle } from '../src/task-runner.ts';
import * as core from '../../../core/src/index.ts';

function mockAsyncProvider(cancelTask?: () => Promise<void>) {
  return {
    createTaskAsync: vi.fn().mockResolvedValue({
      provider: 'test',
      taskId: 'task-1',
      status: 'pending',
      raw: {},
    }),
    checkStatus: vi.fn(),
    getResult: vi.fn(),
    ...(cancelTask ? { cancelTask } : {}),
  };
}

describe('task-runner cancelable semantics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(core.checkStatus).mockResolvedValue({
      provider: 'test',
      taskId: 'task-1',
      status: 'succeeded',
      raw: {},
    });
    vi.mocked(core.getResult).mockResolvedValue({
      provider: 'test',
      taskId: 'task-1',
      status: 'succeeded',
      outputs: [],
      raw: {},
    });
    vi.mocked(core.cancelTask).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('marks async handle cancelable when provider implements cancelTask', async () => {
    vi.mocked(core.getProvider).mockReturnValue(mockAsyncProvider(vi.fn()));
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'test', taskId: 'task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const handle = await createTaskHandle('replicate://owner/model', {}, undefined, undefined, undefined, client);

    expect(handle.cancelable).toBe(true);
    await handle.cancel();
    expect(client.cancelTask).toHaveBeenCalledWith({
      locator: 'replicate://owner/model',
      taskId: 'task-1',
      platformConfig: undefined,
      options: undefined,
      context: undefined,
    });
  });

  it('marks async handle non-cancelable when provider lacks cancelTask', async () => {
    vi.mocked(core.getProvider).mockReturnValue(mockAsyncProvider());
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'test', taskId: 'task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const handle = await createTaskHandle('kie://market/seedream/5-pro-text-to-image', {}, undefined, undefined, undefined, client);

    expect(handle.cancelable).toBe(false);
    await handle.cancel();
    expect(core.cancelTask).not.toHaveBeenCalled();
    expect(client.cancelTask).not.toHaveBeenCalled();
  });

  it('reports Kie async handle as non-cancelable via registry', async () => {
    const actual = await vi.importActual<typeof core>('../../../core/src/index.ts');
    vi.mocked(core.getProvider).mockImplementation((scheme: string) => actual.getProvider(scheme));
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'kie', taskId: 'kie-task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const handle = await createTaskHandle(
      'kie://market/seedream/5-pro-text-to-image',
      {},
      { apiKey: 'test-key' },
      undefined,
      undefined,
      client,
    );

    expect(handle.cancelable).toBe(false);
    await handle.cancel();
    expect(core.cancelTask).not.toHaveBeenCalled();
    expect(client.cancelTask).not.toHaveBeenCalled();
  });

  it('reports Apiframe async handle as non-cancelable via registry', async () => {
    const actual = await vi.importActual<typeof core>('../../../core/src/index.ts');
    vi.mocked(core.getProvider).mockImplementation((scheme: string) => actual.getProvider(scheme));
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'apiframe', taskId: 'apiframe-task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const handle = await createTaskHandle(
      'apiframe://image/flux-2-pro',
      {},
      { apiKey: 'test-key' },
      undefined,
      undefined,
      client,
    );

    expect(handle.cancelable).toBe(false);
    await handle.cancel();
    expect(core.cancelTask).not.toHaveBeenCalled();
    expect(client.cancelTask).not.toHaveBeenCalled();
  });

  it('propagates cancelTask failures from cancelable handles', async () => {
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'test', taskId: 'task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn().mockRejectedValue(new Error('cancel failed')),
    };
    vi.mocked(core.getProvider).mockReturnValue(mockAsyncProvider(vi.fn()));

    const handle = await createTaskHandle('replicate://owner/model', {}, undefined, undefined, undefined, client);
    await expect(handle.cancel()).rejects.toThrow('cancel failed');
  });

  it('reports runninghub://api handle as non-cancelable via locator-aware capability (registry)', async () => {
    const actual = await vi.importActual<typeof core>('../../../core/src/index.ts');
    vi.mocked(core.getProvider).mockImplementation((scheme: string) => actual.getProvider(scheme));
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'runninghub-api', taskId: 'rh-api-task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const handle = await createTaskHandle(
      'runninghub://api/rhart-image-n-pro/text-to-image',
      {},
      { apiKey: 'test-key' },
      undefined,
      undefined,
      client,
    );

    expect(handle.cancelable).toBe(false);
    await handle.cancel();
    expect(client.cancelTask).not.toHaveBeenCalled();
  });

  it('reports runninghub://app handle as cancelable via locator-aware capability (registry)', async () => {
    const actual = await vi.importActual<typeof core>('../../../core/src/index.ts');
    vi.mocked(core.getProvider).mockImplementation((scheme: string) => actual.getProvider(scheme));
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'runninghub', taskId: 'rh-app-task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockReturnValue(new Promise(() => undefined)),
      getResult: vi.fn(),
      cancelTask: vi.fn().mockResolvedValue(undefined),
    };

    const handle = await createTaskHandle(
      'runninghub://app/webapp-123',
      {},
      { apiKey: 'test-key' },
      undefined,
      undefined,
      client,
    );

    expect(handle.cancelable).toBe(true);
    await handle.cancel();
    expect(client.cancelTask).toHaveBeenCalledWith({
      locator: 'runninghub://app/webapp-123',
      taskId: 'rh-app-task-1',
      platformConfig: { apiKey: 'test-key' },
      options: undefined,
      context: undefined,
    });
  });

  it('reports cancelled once when poll observes cancelled status', async () => {
    const client = {
      createTaskAsync: vi.fn().mockResolvedValue({ provider: 'test', taskId: 'task-1', status: 'pending', raw: {} }),
      checkStatus: vi.fn().mockResolvedValue({ provider: 'test', taskId: 'task-1', status: 'cancelled', raw: {} }),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };
    vi.mocked(core.getProvider).mockReturnValue(mockAsyncProvider());

    const reporter = { onStart: vi.fn(), onProgress: vi.fn(), onFinish: vi.fn() };
    const handle = await createTaskHandle('kie://market/seedream/5-pro-text-to-image', {}, undefined, { reporter }, undefined, client);

    await expect(handle.promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(reporter.onFinish).toHaveBeenCalledTimes(1);
    expect(reporter.onFinish).toHaveBeenCalledWith('task-1', 'cancelled', expect.any(String));
  });
});
