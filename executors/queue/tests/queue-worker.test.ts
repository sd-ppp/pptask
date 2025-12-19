import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueWorker } from '../src/index.ts';
import * as service from '../src/service/execution.ts';
import type { QueueJob, ReservedJob } from '../src/types.ts';

describe('queue worker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('processes jobs and reports completion', async () => {
    const job: QueueJob = {
      jobId: 'job-1',
      locator: 'replicate://owner/model',
      payload: { prompt: 'queue' },
      options: {},
      enqueuedAt: Date.now(),
    };
    const reserved: ReservedJob = { job, attempts: 1 };

    vi.spyOn(service, 'executeCreateTask').mockResolvedValue({
      operation: 'createTask',
      locator: job.locator,
      data: {
        provider: 'replicate',
        taskId: 'task-1',
        status: 'pending',
        raw: {},
      },
    });
    vi.spyOn(service, 'executeCheckStatus')
      .mockResolvedValueOnce({
        operation: 'checkStatus',
        locator: job.locator,
        data: {
          provider: 'replicate',
          taskId: 'task-1',
          status: 'running',
          raw: {},
        },
      })
      .mockResolvedValueOnce({
        operation: 'checkStatus',
        locator: job.locator,
        data: {
          provider: 'replicate',
          taskId: 'task-1',
          status: 'succeeded',
          raw: {},
        },
      });
    vi.spyOn(service, 'executeGetResult').mockResolvedValue({
      operation: 'getResult',
      locator: job.locator,
      data: {
        provider: 'replicate',
        taskId: 'task-1',
        status: 'succeeded',
        outputs: [{ rawData: { foo: 'bar' } }],
        raw: {},
      },
    });

    const markComplete = vi.fn(async () => {});
    const markFailed = vi.fn(async () => {});
    const reportStatus = vi.fn(async () => {});

    const worker = createQueueWorker(
      {
        reserve: vi.fn()
          .mockResolvedValueOnce(reserved)
          .mockResolvedValueOnce(undefined),
        markComplete,
        markFailed,
        reportStatus,
      },
      { statusPollIntervalMs: 0 }
    );

    const runPromise = worker.runOnce();
    await vi.runAllTimersAsync();
    await runPromise;

    expect(reportStatus).toHaveBeenCalled();
    expect(markComplete).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        provider: 'replicate',
        taskId: 'job-1',
        status: 'succeeded',
        outputs: [{ rawData: { foo: 'bar' } }],
        raw: expect.objectContaining({ providerTaskId: 'task-1' }),
      })
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('marks job as failed when attempts exceed maxAttempts', async () => {
    const job: QueueJob = {
      jobId: 'job-2',
      locator: 'replicate://owner/model',
      payload: {},
      options: {},
      enqueuedAt: Date.now(),
    };
    const reserved: ReservedJob = { job, attempts: 3 };

    const markFailed = vi.fn(async () => {});
    const worker = createQueueWorker(
      {
        reserve: vi.fn().mockResolvedValueOnce(reserved).mockResolvedValueOnce(undefined),
        markComplete: vi.fn(),
        markFailed,
      },
      { maxAttempts: 2 }
    );

    await worker.runOnce();
    expect(markFailed).toHaveBeenCalled();
  });
});
