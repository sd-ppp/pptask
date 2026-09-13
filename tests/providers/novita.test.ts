import { describe, expect, it, vi } from 'vitest';
import { createNovitaProvider } from '../../src/index.ts';

describe('createNovitaProvider protocols', () => {
  it('normalizes a synchronous Gemini image response', async () => {
    const fetchMock = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'BA==' } }] } }] }));
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const result = await provider.imageModel('gemini-3.1-flash-image').doGenerate!({ prompt: 'hello', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: undefined, mask: undefined, providerOptions: {} });
    expect(result.images[0]).toEqual(new Uint8Array([4]));
  });

  it('cancels a Seedance task through its persisted URL', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => init?.method === 'DELETE' ? Response.json({}) : Response.json({ data: { id: 'novita-1' } }));
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const job = await provider.jobs.start({ model: provider.videoModel('doubao-seedance-2-0-260128'), input: { prompt: 'hello', n: 1, providerOptions: {} } });
    await job.cancel();
    expect((await job.status()).state).toBe('cancelled');
  });
});
