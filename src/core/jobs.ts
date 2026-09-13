import {
  createAbortError,
  createId,
  delay,
  getModelType,
  isAbortError,
  sanitizePersistedInput,
  serializeError,
  throwIfAborted,
} from './internal.ts';
import type {
  PptaskJobHandle,
  PptaskJobRecord,
  PptaskJobCallOptions,
  PptaskJobs,
  PptaskJobStore,
  PptaskModel,
  PptaskModelType,
} from './types.ts';

type CreateJobsOptions = {
  providerId: string;
  store: PptaskJobStore;
  pollIntervalMs: number;
  maxStatusErrors: number;
  resolveModel(type: PptaskModelType, modelId: string): PptaskModel;
};

export function createJobs(options: CreateJobsOptions): PptaskJobs {
  const inFlightStarts = new Map<string, Promise<void>>();

  async function start<RESULT = unknown>({
    model,
    input,
    idempotencyKey,
  }: {
    model: PptaskModel;
    input: unknown;
    idempotencyKey?: string;
  }): Promise<PptaskJobHandle<RESULT>> {
    if (model.provider !== options.providerId) {
      throw new Error(`Model provider ${model.provider} does not match ${options.providerId}`);
    }
    const now = new Date().toISOString();
    const record: PptaskJobRecord = {
      schemaVersion: 1,
      id: createId('job'),
      idempotencyKey: idempotencyKey ?? createId('idempotency'),
      providerId: options.providerId,
      modelType: getModelType(model),
      modelId: model.modelId,
      state: 'creating',
      input: sanitizePersistedInput(input),
      createdAt: now,
      updatedAt: now,
    };
    const claimed = await options.store.create(record);
    const claimedRecord = claimed.record;
    if (
      claimedRecord.providerId !== options.providerId ||
      claimedRecord.modelType !== record.modelType ||
      claimedRecord.modelId !== record.modelId
    ) {
      throw new Error(
        `Idempotency key ${record.idempotencyKey} is already used by ` +
          `${claimedRecord.providerId}/${claimedRecord.modelType}/${claimedRecord.modelId}`,
      );
    }
    if (claimedRecord.state === 'creating' && claimedRecord.operation === undefined) {
      await startRecordOnce(claimedRecord, model, claimed.created ? input : undefined);
    }
    return createHandle<RESULT>(claimedRecord.id);
  }

  const jobs: PptaskJobs = {
    start,
    async resume<RESULT>(jobId: string) {
      const record = await ensureRecord<RESULT>(jobId);
      if (record.providerId !== options.providerId) {
        throw new Error(`Job ${jobId} belongs to provider ${record.providerId}`);
      }
      return createHandle<RESULT>(jobId);
    },
    status: pollStatus,
    watch,
    wait,
    cancel,
    list: filter => options.store.list(filter),
  };

  function createHandle<RESULT>(id: string): PptaskJobHandle<RESULT> {
    return {
      id,
      status: statusOptions => jobs.status<RESULT>(id, statusOptions),
      watch: watchOptions => jobs.watch<RESULT>(id, watchOptions),
      wait: waitOptions => jobs.wait<RESULT>(id, waitOptions),
      cancel: cancelOptions => jobs.cancel(id, cancelOptions),
    };
  }

  function startRecordOnce(
    record: PptaskJobRecord,
    model: PptaskModel,
    executionInput?: unknown,
  ): Promise<void> {
    const existing = inFlightStarts.get(record.id);
    if (existing) return existing;
    const started = startRecord(record, model, executionInput).finally(() => {
      inFlightStarts.delete(record.id);
    });
    inFlightStarts.set(record.id, started);
    return started;
  }

  async function startRecord(
    record: PptaskJobRecord,
    model: PptaskModel,
    executionInput: unknown = record.input,
  ): Promise<void> {
    try {
      if (model.doStart && model.doStatus) {
        const started = await model.doStart(executionInput as never, {
          jobId: record.id,
          idempotencyKey: record.idempotencyKey,
        });
        await options.store.update(record.id, current => ({
          ...current,
          operation: started.operation,
          state: 'pending',
          error: undefined,
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      if (!model.doGenerate) throw new Error('Model does not support generation or operations');
      const result = await model.doGenerate(executionInput as never);
      await options.store.update(record.id, current => ({
        ...current,
        state: 'succeeded',
        result,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      if (isAbortError(error)) throw error;
      await options.store.update(record.id, current => ({
        ...current,
        error: serializeError(error),
        updatedAt: new Date().toISOString(),
      }));
      throw error;
    }
  }

  async function pollStatus<RESULT>(
    jobId: string,
    statusOptions?: PptaskJobCallOptions,
  ): Promise<PptaskJobRecord<RESULT>> {
    throwIfAborted(statusOptions?.signal);
    let record = await ensureRecord<RESULT>(jobId);
    if (isTerminal(record.state)) return record;
    const model = options.resolveModel(record.modelType, record.modelId);

    if (record.state === 'creating' && record.operation === undefined) {
      await startRecordOnce(record, model);
      record = await ensureRecord(jobId);
      if (isTerminal(record.state)) return record;
    }
    if (!record.operation || !model.doStatus) return record;

    try {
      const status = await model.doStatus({
        operation: record.operation,
        abortSignal: statusOptions?.signal,
        headers: statusOptions?.headers,
      });
      if (status.status === 'pending') {
        const phase = 'phase' in status ? status.phase : undefined;
        const progress = 'progress' in status ? status.progress : undefined;
        return options.store.update(jobId, current => {
          if (isTerminal(current.state)) return current;
          return {
            ...current,
            state: phase === 'running' ? 'running' : 'pending',
            progress,
            error: undefined,
            updatedAt: new Date().toISOString(),
          };
        }) as Promise<PptaskJobRecord<RESULT>>;
      }
      if (status.status === 'error') {
        return options.store.update(jobId, current => {
          if (isTerminal(current.state)) return current;
          return {
            ...current,
            state: 'failed',
            error: { message: status.error },
            updatedAt: new Date().toISOString(),
          };
        }) as Promise<PptaskJobRecord<RESULT>>;
      }
      const { status: _status, ...result } = status;
      return options.store.update<RESULT>(jobId, current => {
        if (isTerminal(current.state)) return current;
        return {
          ...current,
          state: 'succeeded',
          progress: 1,
          result: result as RESULT,
          error: undefined,
          updatedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      if (isAbortError(error) || statusOptions?.signal?.aborted) throw error;
      await options.store.update(jobId, current => ({
        ...current,
        error: serializeError(error),
        updatedAt: new Date().toISOString(),
      }));
      throw error;
    }
  }

  async function* watch<RESULT>(
    jobId: string,
    watchOptions?: PptaskJobCallOptions,
  ): AsyncIterableIterator<{ type: 'state'; job: PptaskJobRecord<RESULT> }> {
    let consecutiveErrors = 0;
    while (true) {
      throwIfAborted(watchOptions?.signal);
      let job: PptaskJobRecord<RESULT>;
      try {
        job = await pollStatus<RESULT>(jobId, watchOptions);
        consecutiveErrors = 0;
      } catch (error) {
        if (isAbortError(error) || watchOptions?.signal?.aborted) throw error;
        consecutiveErrors += 1;
        if (consecutiveErrors >= options.maxStatusErrors) throw error;
        await delay(options.pollIntervalMs, watchOptions?.signal);
        continue;
      }
      yield { type: 'state', job };
      if (isTerminal(job.state)) return;
      await delay(options.pollIntervalMs, watchOptions?.signal);
    }
  }

  async function wait<RESULT>(jobId: string, waitOptions?: PptaskJobCallOptions): Promise<RESULT> {
    for await (const event of watch<RESULT>(jobId, waitOptions)) {
      const record = event.job;
      if (record.state === 'succeeded') return record.result as RESULT;
      if (record.state === 'failed') throw new Error(record.error?.message ?? `Job failed: ${jobId}`);
      if (record.state === 'cancelled') throw createAbortError(`Job cancelled: ${jobId}`);
    }
    throw new Error(`Job ended without a result: ${jobId}`);
  }

  async function cancel(jobId: string, cancelOptions?: PptaskJobCallOptions): Promise<void> {
    throwIfAborted(cancelOptions?.signal);
    const record = await ensureRecord(jobId);
    if (isTerminal(record.state)) return;
    const model = options.resolveModel(record.modelType, record.modelId);
    if (!record.operation || !model.doCancel) {
      throw new Error(`Model does not support cancellation: ${record.modelId}`);
    }
    await model.doCancel({
      operation: record.operation,
      abortSignal: cancelOptions?.signal,
      headers: cancelOptions?.headers,
    });
    await options.store.update(jobId, current => {
      if (isTerminal(current.state)) return current;
      return {
        ...current,
        state: 'cancelled',
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function ensureRecord<RESULT>(jobId: string): Promise<PptaskJobRecord<RESULT>> {
    const record = await options.store.get<RESULT>(jobId);
    if (!record) throw new Error(`Job not found: ${jobId}`);
    return record;
  }

  return jobs;
}

function isTerminal(state: PptaskJobRecord['state']): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'cancelled';
}
