import { describe, expect, it, vi } from 'vitest';
import { createQueueExecutor, ServiceError } from '../src/index.ts';

describe('queue executor', () => {
  it('delegates to provided hooks', async () => {
    const enqueue = vi.fn(async request => ({ jobId: request.jobId ?? 'job-1' }));
    const getStatus = vi.fn(async jobId => ({ provider: 'replicate', taskId: jobId, status: 'running', raw: {} }));
    const getResult = vi.fn(async jobId => ({
      provider: 'replicate',
      taskId: jobId,
      status: 'succeeded',
      outputs: [],
      raw: {},
    }));
    const cancel = vi.fn(async () => {});

    const executor = createQueueExecutor({ enqueue, getStatus, getResult, cancel });

    const enqueued = await executor.enqueue({ locator: 'replicate://owner/model', payload: { prompt: 'hi' } });
    expect(enqueued.jobId).toBe('job-1');
    await executor.getStatus('job-1');
    await executor.getResult('job-1');
    await executor.cancel('job-1');

    expect(enqueue).toHaveBeenCalledWith({
      jobId: undefined,
      locator: 'replicate://owner/model',
      payload: { prompt: 'hi' },
      options: undefined,
    });
    expect(getStatus).toHaveBeenCalledWith('job-1');
    expect(getResult).toHaveBeenCalledWith('job-1');
    expect(cancel).toHaveBeenCalledWith('job-1');
  });

  it('throws if cancel is not supported', async () => {
    const executor = createQueueExecutor({
      enqueue: async () => ({ jobId: 'job-1' }),
      getStatus: async () => undefined,
      getResult: async () => undefined as any,
    });
    await expect(executor.cancel('job-1')).rejects.toBeInstanceOf(ServiceError);
  });
});
