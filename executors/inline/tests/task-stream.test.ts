// Test for async generator task stream
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTaskHandleStream, type TaskEvent } from '../src/task-runner-enhanced.ts';
import type { TaskClient } from '../src/task-runner-enhanced.ts';

describe('createTaskHandleStream', () => {
  let mockClient: TaskClient;
  let events: TaskEvent[];

  beforeEach(() => {
    events = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should emit created, progress, and completed events', async () => {
    // Mock client that simulates a successful task
    mockClient = {
      createTaskAsync: vi.fn().mockResolvedValue({
        taskId: 'test-task-123',
        status: 'pending',
        provider: 'test',
        metadata: { some: 'data' },
      }),
      checkStatus: vi.fn()
        .mockResolvedValueOnce({
          taskId: 'test-task-123',
          status: 'running',
          progress: 0.3,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-task-123',
          status: 'running',
          progress: 0.7,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-task-123',
          status: 'succeeded',
          progress: 1.0,
          provider: 'test',
          raw: {},
        }),
      getResult: vi.fn().mockResolvedValue({
        taskId: 'test-task-123',
        status: 'succeeded',
        outputs: [
          { url: 'https://example.com/output1.png' },
          { url: 'https://example.com/output2.png' },
        ],
        provider: 'test',
        raw: {},
      }),
      cancelTask: vi.fn(),
    };

    // Create stream
    const stream = createTaskHandleStream(
      'test://model',
      { prompt: 'test prompt' },
      undefined,
      undefined,
      100, // Fast polling for tests
      mockClient
    );

    // Collect events
    for await (const event of stream) {
      events.push(event);
    }

    // Verify event sequence
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]).toMatchObject({
      type: 'created',
      taskId: 'test-task-123',
    });

    // Should have at least one progress event
    const progressEvents = events.filter(e => e.type === 'progress');
    expect(progressEvents.length).toBeGreaterThanOrEqual(2);

    // Last event should be completed
    const lastEvent = events[events.length - 1];
    expect(lastEvent).toMatchObject({
      type: 'completed',
      taskId: 'test-task-123',
    });
    
    // Verify the result contains outputs
    if (lastEvent.type === 'completed') {
      expect(lastEvent.result.outputs).toEqual([
        { url: 'https://example.com/output1.png' },
        { url: 'https://example.com/output2.png' },
      ]);
    }
  });

  it('should emit failed event on task failure', async () => {
    mockClient = {
      createTaskAsync: vi.fn().mockResolvedValue({
        taskId: 'test-task-456',
        status: 'pending',
        provider: 'test',
      }),
      checkStatus: vi.fn().mockResolvedValue({
        taskId: 'test-task-456',
        status: 'failed',
        provider: 'test',
        raw: { error: 'Something went wrong' },
      }),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const stream = createTaskHandleStream(
      'test://model',
      { prompt: 'test prompt' },
      undefined,
      undefined,
      100,
      mockClient
    );

    try {
      for await (const event of stream) {
        events.push(event);
      }
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('Task failed');
    }

    // Should have created and failed events
    expect(events[0].type).toBe('created');
    const failedEvent = events.find(e => e.type === 'failed');
    expect(failedEvent).toBeDefined();
    expect(failedEvent?.type).toBe('failed');
  });

  it('should handle cancellation', async () => {
    const abortController = new AbortController();
    let checkCount = 0;

    mockClient = {
      createTaskAsync: vi.fn().mockResolvedValue({
        taskId: 'test-task-789',
        status: 'pending',
        provider: 'test',
      }),
      checkStatus: vi.fn().mockImplementation(async () => {
        checkCount++;
        // Cancel after first check, but return status first
        if (checkCount === 1) {
          // Use setTimeout to abort after checkStatus returns
          setTimeout(() => abortController.abort(), 0);
        }
        return {
          taskId: 'test-task-789',
          status: 'running',
          provider: 'test',
          raw: {},
        };
      }),
      getResult: vi.fn(),
      cancelTask: vi.fn(),
    };

    const stream = createTaskHandleStream(
      'test://model',
      { prompt: 'test prompt' },
      undefined,
      { signal: abortController.signal },
      50, // Shorter interval for faster test
      mockClient
    );

    try {
      for await (const event of stream) {
        events.push(event);
        // Give time for abort to trigger
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect.fail('Should have thrown abort error');
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }

    // Should have at least created and progress events before cancellation
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('created');
    
    // May or may not have cancelled event depending on timing
    // but should have thrown AbortError
  });

  it('should track progress percentage correctly', async () => {
    mockClient = {
      createTaskAsync: vi.fn().mockResolvedValue({
        taskId: 'test-progress',
        status: 'pending',
        provider: 'test',
      }),
      checkStatus: vi.fn()
        .mockResolvedValueOnce({
          taskId: 'test-progress',
          status: 'running',
          progress: 0,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-progress',
          status: 'running',
          progress: 0.25,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-progress',
          status: 'running',
          progress: 0.5,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-progress',
          status: 'running',
          progress: 0.75,
          provider: 'test',
          raw: {},
        })
        .mockResolvedValueOnce({
          taskId: 'test-progress',
          status: 'succeeded',
          progress: 1.0,
          provider: 'test',
          raw: {},
        }),
      getResult: vi.fn().mockResolvedValue({
        taskId: 'test-progress',
        status: 'succeeded',
        outputs: [{ result: 'done' }],
        provider: 'test',
        raw: {},
      }),
      cancelTask: vi.fn(),
    };

    const stream = createTaskHandleStream(
      'test://model',
      { prompt: 'test' },
      undefined,
      undefined,
      50,
      mockClient
    );

    for await (const event of stream) {
      events.push(event);
    }

    const progressEvents = events.filter(e => e.type === 'progress');
    
    // Should have multiple progress events
    expect(progressEvents.length).toBeGreaterThanOrEqual(4);
    
    // Progress should increase
    const progressValues = progressEvents
      .map(e => e.type === 'progress' ? e.progress : undefined)
      .filter(p => p !== undefined);
    
    expect(progressValues[0]).toBe(0);
    expect(progressValues[1]).toBe(0.25);
    expect(progressValues[2]).toBe(0.5);
    expect(progressValues[3]).toBe(0.75);
  });

  it('should pass metadata through events', async () => {
    const customMetadata = {
      estimatedTime: 120,
      priority: 'high',
    };

    mockClient = {
      createTaskAsync: vi.fn().mockResolvedValue({
        taskId: 'test-metadata',
        status: 'pending',
        provider: 'test',
        metadata: customMetadata,
      }),
      checkStatus: vi.fn().mockResolvedValue({
        taskId: 'test-metadata',
        status: 'succeeded',
        provider: 'test',
        raw: { additional: 'info' },
      }),
      getResult: vi.fn().mockResolvedValue({
        taskId: 'test-metadata',
        status: 'succeeded',
        outputs: [],
        provider: 'test',
        raw: {},
      }),
      cancelTask: vi.fn(),
    };

    const stream = createTaskHandleStream(
      'test://model',
      {},
      undefined,
      undefined,
      100,
      mockClient
    );

    for await (const event of stream) {
      events.push(event);
    }

    const createdEvent = events.find(e => e.type === 'created');
    expect(createdEvent).toBeDefined();
    if (createdEvent && createdEvent.type === 'created') {
      expect(createdEvent.metadata).toEqual(customMetadata);
    }

    const progressEvent = events.find(e => e.type === 'progress');
    expect(progressEvent).toBeDefined();
    if (progressEvent && progressEvent.type === 'progress') {
      expect(progressEvent.metadata).toEqual({ additional: 'info' });
    }
  });
});
