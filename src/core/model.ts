import type {
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamPart,
  JSONValue,
} from '@ai-sdk/provider';
import { createId, delay, tagModel, throwIfAborted } from './internal.ts';
import type {
  PptaskImageModel,
  PptaskImageModelImplementation,
  PptaskLanguageModel,
  PptaskLanguageModelImplementation,
  PptaskOperationContext,
  PptaskOperationStartResult,
  PptaskOperationStatusResult,
  PptaskVideoModel,
  PptaskVideoModelImplementation,
} from './types.ts';

export function createLanguageModel(
  providerId: string,
  modelId: string,
  implementation: PptaskLanguageModelImplementation,
  pollIntervalMs: number,
): PptaskLanguageModel {
  const doGenerate = implementation.doGenerate ?? (async options => {
    return runOperation(implementation, options, pollIntervalMs);
  });
  const doStream = implementation.doStream ?? (async options => {
    const result = await doGenerate(options);
    return {
      stream: streamLanguageResult(result),
      request: result.request,
      response: result.response ? { headers: result.response.headers } : undefined,
    };
  });

  return tagModel({
    specificationVersion: 'v4' as const,
    provider: providerId,
    modelId,
    supportedUrls: implementation.supportedUrls,
    doGenerate,
    doStream,
    doStart: implementation.doStart,
    doStatus: implementation.doStatus,
    doCancel: implementation.doCancel,
    doDescribe: implementation.doDescribe,
  }, 'language');
}

export function createImageModel(
  providerId: string,
  modelId: string,
  implementation: PptaskImageModelImplementation,
  pollIntervalMs: number,
): PptaskImageModel {
  const doGenerate = implementation.doGenerate ?? (async options => {
    return runOperation(implementation, options, pollIntervalMs);
  });
  return tagModel({
    specificationVersion: 'v4' as const,
    provider: providerId,
    modelId,
    maxImagesPerCall: implementation.maxImagesPerCall,
    doGenerate,
    doStart: implementation.doStart,
    doStatus: implementation.doStatus,
    doCancel: implementation.doCancel,
    doDescribe: implementation.doDescribe,
  }, 'image');
}

export function createVideoModel(
  providerId: string,
  modelId: string,
  implementation: PptaskVideoModelImplementation,
): PptaskVideoModel {
  return tagModel({
    ...implementation,
    specificationVersion: 'v4' as const,
    provider: providerId,
    modelId,
  }, 'video') as PptaskVideoModel;
}

async function runOperation<OPTIONS, RESULT extends object>(
  implementation: {
    doStart?: (
      options: OPTIONS,
      context?: PptaskOperationContext,
    ) => PromiseLike<PptaskOperationStartResult>;
    doStatus?: (options: {
      operation: JSONValue;
      abortSignal?: AbortSignal;
      headers?: Record<string, string | undefined>;
    }) => PromiseLike<
      PptaskOperationStatusResult<RESULT>
    >;
  },
  options: OPTIONS & {
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  },
  pollIntervalMs: number,
): Promise<RESULT> {
  if (!implementation.doStart || !implementation.doStatus) {
    throw new Error('Model must implement doGenerate or both doStart and doStatus');
  }
  const idempotencyKey = ensureIdempotencyKey(options);
  const started = await implementation.doStart(options, {
    jobId: createId('transient-job'),
    idempotencyKey,
  });
  while (true) {
    throwIfAborted(options.abortSignal);
    const status = await implementation.doStatus({
      operation: started.operation,
      abortSignal: options.abortSignal,
      headers: options.headers,
    });
    if (status.status === 'completed') {
      const { status: _status, ...result } = status;
      return result as RESULT;
    }
    if (status.status === 'error') throw new Error(status.error);
    await delay(pollIntervalMs, options.abortSignal);
  }
}

function ensureIdempotencyKey(options: { headers?: Record<string, string | undefined> }): string {
  options.headers ??= {};
  const existing = Object.entries(options.headers).find(
    ([key, value]) => key.toLowerCase() === 'idempotency-key' && value,
  )?.[1];
  if (existing) return existing;
  const generated = createId('aisdk');
  options.headers['idempotency-key'] = generated;
  return generated;
}

function streamLanguageResult(result: LanguageModelV4GenerateResult): ReadableStream<LanguageModelV4StreamPart> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ type: 'stream-start', warnings: result.warnings });
      if (result.response) {
        controller.enqueue({
          type: 'response-metadata',
          id: result.response.id,
          timestamp: result.response.timestamp,
          modelId: result.response.modelId,
        });
      }
      for (const content of result.content) enqueueContent(controller, content);
      controller.enqueue({
        type: 'finish',
        usage: result.usage,
        finishReason: result.finishReason,
        providerMetadata: result.providerMetadata,
      });
      controller.close();
    },
  });
}

function enqueueContent(
  controller: ReadableStreamDefaultController<LanguageModelV4StreamPart>,
  content: LanguageModelV4Content,
): void {
  if (content.type === 'text') {
    const id = createId('text');
    controller.enqueue({ type: 'text-start', id, providerMetadata: content.providerMetadata });
    controller.enqueue({ type: 'text-delta', id, delta: content.text, providerMetadata: content.providerMetadata });
    controller.enqueue({ type: 'text-end', id, providerMetadata: content.providerMetadata });
    return;
  }
  if (content.type === 'reasoning') {
    const id = createId('reasoning');
    controller.enqueue({ type: 'reasoning-start', id, providerMetadata: content.providerMetadata });
    controller.enqueue({ type: 'reasoning-delta', id, delta: content.text, providerMetadata: content.providerMetadata });
    controller.enqueue({ type: 'reasoning-end', id, providerMetadata: content.providerMetadata });
    return;
  }
  controller.enqueue(content);
}
