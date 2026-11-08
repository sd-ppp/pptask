import { describe, expect, it, vi } from 'vitest';
import { uploadFile } from 'ai';
import { createGrsaiProvider } from '../../src/index.ts';

describe('createGrsaiProvider lifecycle', () => {
  it('reads the task id from the first SSE event', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/nano-banana')) return new Response('data: {"code":0,"data":{"id":"gr-1","status":"pending"}}\n\n', { headers: { 'content-type': 'text/event-stream' } });
      if (url.endsWith('/result')) return Response.json({ code: 0, data: { status: 'succeeded', results: [{ url: 'https://files.test/gr.png' }] } });
      if (url === 'https://files.test/gr.png') return new Response(new Uint8Array([6]));
      throw new Error(url);
    });
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const result = await (await provider.jobs.start<any>({ model: provider.imageModel('nano-banana-fast'), input: { prompt: 'hello', n: 1, providerOptions: {} } })).wait();
    expect(result.images[0]).toEqual(new Uint8Array([6]));
  });

  it('submits GPT Image asynchronously and polls the matching generate API', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/generate')) {
        return new Response(JSON.stringify({ id: 'gr-gpt-1', status: 'running' }), { headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/api/result?id=gr-gpt-1')) return Response.json({ status: 'succeeded', results: [{ url: 'https://files.test/gpt.png' }] });
      if (url === 'https://files.test/gpt.png') return new Response(new Uint8Array([7]));
      throw new Error(url);
    });
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const result = await (await provider.jobs.start<any>({ model: provider.imageModel('gpt-image-2'), input: { prompt: 'hello', images: [], aspectRatio: 'auto', quality: 'auto' } })).wait();
    expect(result.images[0]).toEqual(new Uint8Array([7]));
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/api/generate');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ replyType: 'async' });
    expect(fetchMock.mock.calls[1][1]?.method).toBe('GET');
  });

  it.each(['nano-banana-2.1', 'nano-banana-2-lite'])('supports explicitly selecting the new API for %s', async model => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/api/generate')) return Response.json({ id: 'banana-1', status: 'running' });
      throw new Error(String(input));
    });
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as typeof fetch, grsaiApiVersion: 'generate' });
    const job = await provider.jobs.start({ model: provider.imageModel(model), input: { prompt: 'hello', urls: ['https://files.test/input.png'] } });
    expect(job.record.operation).toEqual({ taskId: 'banana-1', grsaiApiVersion: 'generate' });
    // The operation keeps its protocol when restored into another provider instance.
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(JSON.parse(String(calls[0][1].body))).toMatchObject({ images: ['https://files.test/input.png'], replyType: 'async' });
    expect(JSON.parse(String(calls[0][1].body))).not.toHaveProperty('urls');
  });

  it('retains legacy polling for operations saved before API versioning', async () => {
    const fetchMock = vi.fn(async () => Response.json({ code: 0, data: { status: 'running' } }));
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as typeof fetch, grsaiApiVersion: 'generate' });
    await provider.imageModel('gpt-image-2').doStatus!({ operation: { taskId: 'old-1' } });
    expect(fetchMock).toHaveBeenCalledWith('https://gr.test/v1/draw/result', expect.objectContaining({ method: 'POST' }));
  });

  it('treats violation as a terminal failure', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => String(input).endsWith('/api/generate')
      ? Response.json({ id: 'blocked-1', status: 'running' })
      : Response.json({ status: 'violation', error: 'blocked' }));
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const job = await provider.jobs.start({ model: provider.imageModel('gpt-image-2.6-flare'), input: { prompt: 'hello' } });
    await expect(job.wait()).rejects.toThrow('blocked');
  });

  it('uploads through token and object-storage requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 0, data: { url: 'https://upload.test', token: 'token', key: 'folder/a.png', domain: 'https://cdn.test' } }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const provider = createGrsaiProvider({ apiKey: 'key', baseURL: 'https://gr.test', fetch: fetchMock as unknown as typeof fetch });
    const result = await uploadFile({ api: provider, data: new Uint8Array([1]), filename: 'a.png', mediaType: 'image/png' });
    expect(result.providerReference).toEqual({ grsai: 'https://cdn.test/folder/a.png' });
  });
});
