import { setImmediate } from 'node:timers/promises';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  createMemoryJobRepository,
  listPptaskJobs,
  registerPptaskJobs,
  subscribePptaskJobs,
  type PptaskJobs,
} from '../../src/index.ts';
import { createFakeProvider } from '../support/fake-provider.ts';

describe('Pptask jobs registry lifecycle', () => {
  it('discovers live providers without duplicate entries and supports unregistering', () => {
    const { provider } = createFakeProvider();
    const unregister = registerPptaskJobs(provider.jobs);
    expect(listPptaskJobs().filter(jobs => jobs === provider.jobs)).toHaveLength(1);
    unregister();
    expect(listPptaskJobs()).not.toContain(provider.jobs);
    const unregisterAgain = registerPptaskJobs(provider.jobs);
    expect(listPptaskJobs()).toContain(provider.jobs);
    unregisterAgain();
  });

  it('notifies subscribers about new providers until unsubscribed', () => {
    const observed: PptaskJobs[] = [];
    const unsubscribe = subscribePptaskJobs(jobs => observed.push(jobs));
    try {
      const first = createFakeProvider().provider;
      expect(observed).toEqual([first.jobs]);
      unsubscribe();
      createFakeProvider();
      expect(observed).toEqual([first.jobs]);
    } finally {
      unsubscribe();
    }
  });

  it('releases completed per-request providers and their repositories while keeping live providers discoverable', async () => {
    setFlagsFromString('--expose-gc');
    const collect = runInNewContext('gc') as () => void;
    const live = createFakeProvider().provider;
    const released = await (async () => {
      const store = createMemoryJobRepository();
      const { provider } = createFakeProvider({ store });
      const handle = await provider.jobs.start({ model: provider.imageModel('ephemeral'), input: { prompt: 'hello' } });
      await handle.wait();
      return {
        jobs: new WeakRef(provider.jobs),
        store: new WeakRef(store),
        // Holding the cleanup callback must not keep the provider alive either.
        unregister: registerPptaskJobs(provider.jobs),
      };
    })();

    await expect.poll(async () => {
      await setImmediate();
      collect();
      return released.jobs.deref() === undefined && released.store.deref() === undefined;
    }, { timeout: 3_000 }).toBe(true);
    expect(listPptaskJobs()).toContain(live.jobs);
    released.unregister();
  });
});
