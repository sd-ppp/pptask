import type { PptaskJobRecord, PptaskJobStore } from '../core/types.ts';
import { clone, matchesFilter } from './shared.ts';

export function createMemoryJobStore(): PptaskJobStore {
  const records = new Map<string, PptaskJobRecord>();
  return {
    async get<RESULT>(id: string) {
      return clone(records.get(id)) as PptaskJobRecord<RESULT> | undefined;
    },
    async create(record) {
      const existing = Array.from(records.values()).find(
        item => item.providerId === record.providerId && item.idempotencyKey === record.idempotencyKey,
      );
      if (existing) return { record: clone(existing), created: false };
      records.set(record.id, clone(record));
      return { record: clone(record), created: true };
    },
    async put(record) {
      records.set(record.id, clone(record));
    },
    async update<RESULT>(id: string, updater: (record: PptaskJobRecord<RESULT>) => PptaskJobRecord<RESULT>) {
      const current = records.get(id);
      if (!current) throw new Error(`Job not found: ${id}`);
      const updated = updater(clone(current) as PptaskJobRecord<RESULT>);
      records.set(id, clone(updated));
      return clone(updated);
    },
    async list(filter) {
      return Array.from(records.values()).filter(record => matchesFilter(record, filter)).map(clone);
    },
    async delete(id) {
      records.delete(id);
    },
  };
}
