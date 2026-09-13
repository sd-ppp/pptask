import type { PptaskJobRecord, PptaskJobStore } from '../core/types.ts';
import { matchesFilter } from './shared.ts';

export type IndexedDbJobStoreOptions = { databaseName?: string; storeName?: string };

export function createIndexedDbJobStore(options: IndexedDbJobStoreOptions = {}): PptaskJobStore {
  const databaseName = options.databaseName ?? 'pptask';
  const storeName = options.storeName ?? 'jobs';
  let databasePromise: Promise<IDBDatabase> | undefined;
  const database = () => {
    if (!globalThis.indexedDB) throw new Error('IndexedDB is not available in this runtime');
    databasePromise ??= openDatabase(globalThis.indexedDB, databaseName, storeName);
    return databasePromise;
  };
  return {
    async get<RESULT>(id: string) {
      const db = await database();
      return request<PptaskJobRecord<RESULT> | undefined>(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
    },
    async create(record) {
      const db = await database();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index(IDEMPOTENCY_INDEX);
      const existing = await request<PptaskJobRecord | undefined>(
        index.get([record.providerId, record.idempotencyKey]),
      );
      if (existing) {
        await completeTransaction(transaction);
        return { record: existing, created: false };
      }
      store.add(record);
      await completeTransaction(transaction);
      return { record, created: true };
    },
    async put(record) {
      const db = await database();
      await transactionDone(db, storeName, store => store.put(record));
    },
    async update<RESULT>(id: string, updater: (record: PptaskJobRecord<RESULT>) => PptaskJobRecord<RESULT>) {
      const db = await database();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const current = await request<PptaskJobRecord<RESULT> | undefined>(store.get(id));
      if (!current) { transaction.abort(); throw new Error(`Job not found: ${id}`); }
      const updated = updater(current);
      store.put(updated);
      await completeTransaction(transaction);
      return updated;
    },
    async list(filter) {
      const db = await database();
      const all = await request<PptaskJobRecord[]>(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
      return all.filter(record => matchesFilter(record, filter));
    },
    async delete(id) {
      const db = await database();
      await transactionDone(db, storeName, store => store.delete(id));
    },
  };
}

function openDatabase(indexedDB: IDBFactory, databaseName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(databaseName, 2);
    open.onupgradeneeded = () => {
      const store = open.result.objectStoreNames.contains(storeName)
        ? open.transaction!.objectStore(storeName)
        : open.result.createObjectStore(storeName, { keyPath: 'id' });
      if (!store.indexNames.contains(IDEMPOTENCY_INDEX)) {
        store.createIndex(IDEMPOTENCY_INDEX, ['providerId', 'idempotencyKey']);
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Failed to open IndexedDB'));
  });
}
const IDEMPOTENCY_INDEX = 'providerId_idempotencyKey';
function request<T>(value: IDBRequest<T>): Promise<T> { return new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error ?? new Error('IndexedDB request failed')); }); }
async function transactionDone(db: IDBDatabase, storeName: string, action: (store: IDBObjectStore) => IDBRequest): Promise<void> { const transaction = db.transaction(storeName, 'readwrite'); action(transaction.objectStore(storeName)); await completeTransaction(transaction); }
function completeTransaction(transaction: IDBTransaction): Promise<void> { return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted')); transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed')); }); }
