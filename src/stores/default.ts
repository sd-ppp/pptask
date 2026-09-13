import type { PptaskJobStore } from '../core/types.ts';
import { createIndexedDbJobStore } from './indexed-db.ts';
import { createMemoryJobStore } from './memory.ts';

/** Uses durable IndexedDB in browsers and transient memory in server runtimes. */
export function createDefaultJobStore(): PptaskJobStore {
  return typeof globalThis.indexedDB !== 'undefined'
    ? createIndexedDbJobStore()
    : createMemoryJobStore();
}
