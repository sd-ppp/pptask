import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createIndexedDbJobStore, type PptaskJobRecord } from '../../src/index.ts';

describe('IndexedDbJobStore', () => {
  it('persists records across store instances', async () => {
    const databaseName = `pptask-test-${Date.now()}-${Math.random()}`;
    const first = createIndexedDbJobStore({ databaseName });
    const now = new Date().toISOString();
    const record: PptaskJobRecord = {
      schemaVersion: 1,
      id: 'job-1',
      idempotencyKey: 'key-1',
      providerId: 'fake',
      modelType: 'image',
      modelId: 'demo',
      state: 'running',
      input: { prompt: 'hello' },
      operation: { id: 'remote-1' },
      createdAt: now,
      updatedAt: now,
    };
    await first.put(record);

    const second = createIndexedDbJobStore({ databaseName });
    expect(await second.get(record.id)).toEqual(record);
  });

  it('updates a record atomically', async () => {
    const databaseName = `pptask-update-${Date.now()}-${Math.random()}`;
    const store = createIndexedDbJobStore({ databaseName });
    const now = new Date().toISOString();
    await store.put({
      schemaVersion: 1,
      id: 'job-update',
      idempotencyKey: 'key',
      providerId: 'fake',
      modelType: 'image',
      modelId: 'demo',
      state: 'pending',
      input: {},
      createdAt: now,
      updatedAt: now,
    });

    await store.update('job-update', record => ({ ...record, state: 'running', progress: 0.4 }));

    expect(await store.get('job-update')).toMatchObject({ state: 'running', progress: 0.4 });
  });

  it('atomically claims an idempotency key across store instances', async () => {
    const databaseName = `pptask-idempotency-${Date.now()}-${Math.random()}`;
    const first = createIndexedDbJobStore({ databaseName });
    const second = createIndexedDbJobStore({ databaseName });
    const now = new Date().toISOString();
    const base: PptaskJobRecord = {
      schemaVersion: 1,
      id: 'job-first',
      idempotencyKey: 'shared-key',
      providerId: 'fake',
      modelType: 'image',
      modelId: 'demo',
      state: 'creating',
      input: {},
      createdAt: now,
      updatedAt: now,
    };

    const [left, right] = await Promise.all([
      first.create(base),
      second.create({ ...base, id: 'job-second' }),
    ]);

    expect([left.created, right.created].filter(Boolean)).toHaveLength(1);
    expect(left.record.id).toBe(right.record.id);
  });
});
