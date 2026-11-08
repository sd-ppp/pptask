import { describe, expect, it, vi } from 'vitest';
import { uploadFile } from 'ai';
import { createCrunProvider } from '../../src/index.ts';

describe('createCrunProvider lifecycle', () => {
  it('describes generic video and GPT Image 2.5 model-specific inputs', async () => {
    const provider = createCrunProvider({ apiKey: 'key' });
    const wan = await provider.describe(provider.videoModel('wan/3-0-i2v'));
    expect(wan.inputSchema?.properties).toMatchObject({
      prompt: { type: 'string', 'x-component': 'Input.TextArea' },
      imgUrls: { type: 'array', 'x-component': 'Upload' },
      duration: { type: 'number', 'x-component': 'NumberPicker' },
      resolution: { type: 'string', 'x-component': 'Select' },
    });
    expect(wan.defaultInput).toMatchObject({ duration: 5, resolution: '480P' });

    const standard = await provider.describe(provider.imageModel('openai/gpt-image-2-5'));
    expect((standard.inputSchema?.properties as any).resolution.enum.map((item: any) => item.value))
      .toEqual(['1K', '2K', '4K']);
    const official = await provider.describe(provider.imageModel('openai/gpt-image-2-5-official'));
    expect((official.inputSchema?.properties as any).quality.enum.map((item: any) => item.value))
      .toEqual(['low', 'medium', 'high', 'xhigh', 'max']);

    const kling = await provider.describe(provider.videoModel('kling/v2-5-turbo-pro'));
    expect(kling.inputSchema?.properties).toMatchObject({
      prompt: { type: 'string', required: true },
      imgUrls: { type: 'array', 'x-component': 'Upload' },
      duration: { type: 'number', 'x-component': 'Select' },
      mode: { type: 'string', 'x-component': 'Select' },
    });
    expect(kling.inputSchema?.properties).not.toHaveProperty('multiShots');
  });

  it('normalizes aliases and restores an asynchronous task', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/CreateTask')) {
        expect(JSON.parse(String(init?.body))).toEqual({ model: 'google/nano-banana-2', input: { prompt: 'hello', img_urls: ['https://input.test/a.png'], aspect_ratio: '16:9', resolution: '2K', output_format: 'png', google_search: false } });
        return Response.json({ code: 200, data: { task_id: 'crun-1' } });
      }
      if (url.includes('/TaskInfo')) return Response.json({ code: 200, data: { status: 'success', result: { media_urls: ['https://files.test/crun.png'] } } });
      if (url === 'https://files.test/crun.png') return new Response(new Uint8Array([5]));
      throw new Error(url);
    });
    const provider = createCrunProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const result = await (await provider.jobs.start<any>({ model: provider.imageModel('google/nano-banana-2'), input: { prompt: 'hello', n: 1, imgUrls: ['https://input.test/a.png'], aspectRatio: '16:9', providerOptions: {} } })).wait();
    expect(result.images[0]).toEqual(new Uint8Array([5]));
  });

  it('uses the presigned upload flow', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 200, data: { presigned_url: 'https://upload.test/file', file_url: 'https://files.test/input.png' } }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const provider = createCrunProvider({ apiKey: 'key', fetch: fetchMock as unknown as typeof fetch });
    const result = await uploadFile({ api: provider, data: new Uint8Array([1]), filename: 'a.png', mediaType: 'image/png' });
    expect(result.providerReference).toEqual({ crun: 'https://files.test/input.png' });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
  });
});
