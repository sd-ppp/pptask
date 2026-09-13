import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDefaultJobStore, type PptaskJobRecord } from '../../src/index.ts';

describe('default job store selection', () => {
  it('uses IndexedDB when the runtime provides it', async () => {
    const store = createDefaultJobStore();
    const now = new Date().toISOString();
    const record: PptaskJobRecord = {
      schemaVersion: 1,
      id: `default-store-${Date.now()}-${Math.random()}`,
      idempotencyKey: 'key',
      providerId: 'fake',
      modelType: 'image',
      modelId: 'demo',
      state: 'pending',
      input: {},
      createdAt: now,
      updatedAt: now,
    };

    await store.put(record);
    expect(await store.get(record.id)).toEqual(record);
  });
});
