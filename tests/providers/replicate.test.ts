import { describe, expect, it, vi } from 'vitest';
import { uploadFile } from 'ai';
import { createMemoryJobRepository, createReplicateProvider } from '../../src/index.ts';

describe('createReplicateProvider', () => {
  it('creates and resumes a prediction using model ids', async () => {
    let statusCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/models/owner/model/predictions')) {
        expect(init?.method).toBe('POST');
        expect(new Headers(init?.headers).get('idempotency-key')).toBeNull();
        return Response.json({ id: 'prediction-1', status: 'starting' });
      }
      if (url.endsWith('/predictions/prediction-1')) {
        statusCalls += 1;
        return Response.json(statusCalls === 1
          ? { id: 'prediction-1', status: 'processing', metrics: { progress: 0.4 } }
          : { id: 'prediction-1', status: 'succeeded', output: ['https://output.test/image.png'] });
      }
      if (url === 'https://output.test/image.png') {
        return new Response(new Uint8Array([9, 8, 7]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const provider = createReplicateProvider({
      apiKey: 'test-key',
      fetch: fetchMock as typeof fetch,
      jobRepository: createMemoryJobRepository(),
      pollIntervalMs: 1,
    });

    const job = await provider.jobs.start<{ images: Uint8Array[] }>({
      model: provider.imageModel('owner/model'),
      input: { prompt: 'hello', n: 1, providerOptions: {} },
    });
    const result = await job.wait();

    expect(result.images[0]).toEqual(new Uint8Array([9, 8, 7]));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('describes a model without a locator', async () => {
    const fetchMock = vi.fn(async () => Response.json({
      name: 'Model',
      description: 'Model description',
      owner: 'owner',
      default_example: { input: { prompt: 'default' } },
      latest_version: {
        openapi_schema: {
          components: {
            schemas: {
              Input: { type: 'object', properties: { prompt: { type: 'string' } } },
            },
          },
        },
      },
    }));
    const provider = createReplicateProvider({
      apiKey: 'test-key',
      fetch: fetchMock as typeof fetch,
    });

    const description = await provider.describe(provider.imageModel('owner/model'));

    expect(description).toMatchObject({
      providerId: 'replicate',
      modelId: 'owner/model',
      modelType: 'image',
      title: 'Model',
      defaultInput: { prompt: 'default' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.replicate.com/v1/models/owner/model',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('uploads files through the official FilesV4 interface', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
      return Response.json({
        id: 'file-1',
        urls: { get: 'https://api.replicate.com/v1/files/file-1' },
      });
    });
    const provider = createReplicateProvider({
      apiKey: 'test-key',
      fetch: fetchMock as typeof fetch,
    });

    const result = await uploadFile({
      api: provider,
      data: new Uint8Array([1, 2, 3]),
      filename: 'image.png',
      mediaType: 'image/png',
    });

    expect(result.providerReference).toEqual({ replicate: 'file-1' });
    expect(result.byteSize).toBe(3);
  });

  it('cancels a prediction through the job handle', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/models/owner/model/predictions')) {
        return Response.json({ id: 'prediction-cancel', status: 'starting' });
      }
      if (url.endsWith('/predictions/prediction-cancel/cancel')) {
        return Response.json({ id: 'prediction-cancel', status: 'canceled' });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const provider = createReplicateProvider({
      apiKey: 'test-key',
      fetch: fetchMock as typeof fetch,
    });
    const job = await provider.jobs.start({
      model: provider.imageModel('owner/model'),
      input: { prompt: 'cancel', n: 1, providerOptions: {} },
    });

    await job.cancel();

    expect((await job.status()).state).toBe('cancelled');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
