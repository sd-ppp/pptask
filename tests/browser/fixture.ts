import {
  createIndexedDbJobStore,
  createPptaskProvider,
} from '../../src/browser.ts';

const databaseName = 'pptask-playwright-recovery';

function count(key: string): number {
  const next = Number(localStorage.getItem(key) ?? 0) + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function provider() {
  return createPptaskProvider({
    providerId: 'browser-fixture',
    jobStore: createIndexedDbJobStore({ databaseName }),
    pollIntervalMs: 1,
    imageModel: modelId => ({
      maxImagesPerCall: 1,
      async doStart() {
        count('starts');
        return { operation: { remoteId: 'remote-browser-job' } };
      },
      async doStatus() {
        const statuses = count('statuses');
        if (statuses < 2) return { status: 'pending' as const, phase: 'running' as const, progress: 0.5 };
        return {
          status: 'completed' as const,
          images: [new Uint8Array([8, 9, 10])],
          warnings: [],
          response: { timestamp: new Date(), modelId, headers: undefined },
        };
      },
    }),
  });
}

(window as any).pptaskFixture = {
  async clear() {
    localStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB deletion was blocked'));
    });
  },
  async start() {
    const current = provider();
    const job = await current.jobs.start({
      model: current.imageModel('reload-model'),
      input: { prompt: 'survive a real reload', n: 1, providerOptions: {} },
    });
    localStorage.setItem('jobId', job.id);
    return job.id;
  },
  async resume() {
    const jobId = localStorage.getItem('jobId');
    if (!jobId) throw new Error('Missing persisted job id');
    const current = provider();
    const handle = await current.jobs.resume<{ images: Uint8Array[] }>(jobId);
    const result = await handle.wait();
    return Array.from(result.images[0]);
  },
  stats() {
    return {
      starts: Number(localStorage.getItem('starts') ?? 0),
      statuses: Number(localStorage.getItem('statuses') ?? 0),
      jobId: localStorage.getItem('jobId'),
    };
  },
};
