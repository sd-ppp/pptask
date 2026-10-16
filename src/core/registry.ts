import type { PptaskJobListener, PptaskJobs } from './types.ts';

// Discovery must not own a provider's lifetime: handlers may create a provider
// per request, whose jobs API closes over credentials and the job repository.
const sources = new Set<WeakRef<PptaskJobs>>();
const references = new WeakMap<PptaskJobs, WeakRef<PptaskJobs>>();
const collected = new FinalizationRegistry<WeakRef<PptaskJobs>>(reference => {
  sources.delete(reference);
});
const listeners = new Set<(jobs: PptaskJobs) => void>();

/** Register a jobs API so integrations can discover providers in this process. */
export function registerPptaskJobs(jobs: PptaskJobs): () => void {
  let reference = references.get(jobs);
  if (!reference) {
    reference = new WeakRef(jobs);
    references.set(jobs, reference);
  }
  if (!sources.has(reference)) {
    sources.add(reference);
    collected.register(jobs, reference, reference);
  }
  for (const listener of listeners) listener(jobs);
  return () => {
    sources.delete(reference);
    collected.unregister(reference);
  };
}

/** Enumerate live jobs APIs without retaining providers after their owners release them. */
export function listPptaskJobs(): PptaskJobs[] {
  const jobs: PptaskJobs[] = [];
  for (const reference of sources) {
    const source = reference.deref();
    if (source) jobs.push(source);
    else {
      sources.delete(reference);
      collected.unregister(reference);
    }
  }
  return jobs;
}

/** Observe jobs APIs created after the subscriber is attached. */
export function subscribePptaskJobs(listener: (jobs: PptaskJobs) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type PptaskJobsRegistry = {
  list(): PptaskJobs[];
  subscribe(listener: (jobs: PptaskJobs) => void): () => void;
};

export const pptaskJobsRegistry: PptaskJobsRegistry = {
  list: listPptaskJobs,
  subscribe: subscribePptaskJobs,
};

export type { PptaskJobListener };
