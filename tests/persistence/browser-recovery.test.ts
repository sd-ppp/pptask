import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createIndexedDbJobStore } from '../../src/index.ts';
import { createFakeProvider } from '../support/fake-provider.ts';

describe('browser-style job recovery', () => {
  it('recreates both store and provider before resuming a job', async () => {
    const databaseName = `pptask-reload-${Date.now()}-${Math.random()}`;
    const controller = {
      starts: 0,
      statuses: 0,
      cancels: 0,
      completeAfter: 2,
      statusErrors: 0,
    };
    const firstProvider = createFakeProvider({
      store: createIndexedDbJobStore({ databaseName }),
      controller,
    }).provider;
    const started = await firstProvider.jobs.start({
      model: firstProvider.imageModel('reload-model'),
      input: { prompt: 'survive reload', n: 1, providerOptions: {} },
    });

    const reloadedProvider = createFakeProvider({
      store: createIndexedDbJobStore({ databaseName }),
      controller,
    }).provider;
    const restored = await reloadedProvider.jobs.resume<{ images: Uint8Array[] }>(started.id);
    const result = await restored.wait();

    expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    expect(controller.starts).toBe(1);
  });
});
