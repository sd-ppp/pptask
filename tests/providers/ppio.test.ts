import { describe, expect, it, vi } from 'vitest';
import { createPpioProvider } from '../../src/index.ts';

describe('createPpioProvider protocols', () => {
  it('runs a synchronous Gemini image model', async () => {
    const fetchMock = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AQID' } }] } }] }));
    const provider = createPpioProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const result = await provider.imageModel('gemini-3.1-flash-image').doGenerate!({ prompt: 'hello', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: undefined, mask: undefined, providerOptions: {} });
    expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('persists the query URL for an asynchronous video task', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => String(input).includes('task-result')
      ? Response.json({ data: { task: { status: 'TASK_STATUS_SUCCEED' }, videos: [{ video_url: 'https://files.test/p.mp4' }] } })
      : Response.json({ data: { task_id: 'ppio-1' } }));
    const provider = createPpioProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const result = await (await provider.jobs.start<any>({ model: provider.videoModel('seedance-2.0'), input: { prompt: 'hello', n: 1, providerOptions: {} } })).wait();
    expect(result.videos[0].url).toBe('https://files.test/p.mp4');
  });
});
