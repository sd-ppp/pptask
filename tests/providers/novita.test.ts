import { describe, expect, it, vi } from 'vitest';
import { createNovitaProvider } from '../../src/index.ts';

describe('createNovitaProvider protocols', () => {
  it('describes GPT Image 2.5 with its supported edit fields', async () => {
    const provider = createNovitaProvider({ apiKey: 'key', fetch: vi.fn() as typeof fetch });
    const description = await provider.describe(provider.imageModel('gpt-image-2.5-flare-oai'));
    expect(Object.keys(description.inputSchema?.properties ?? {})).toEqual(['urls', 'prompt', 'size', 'quality', 'moderation', 'output_format']);
    expect(description.defaultInput).toEqual({ urls: [], prompt: '', size: '1024x1024', quality: 'low', moderation: 'low', output_format: 'png' });
  });

  it('normalizes a synchronous Gemini image response', async () => {
    const fetchMock = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'BA==' } }] } }] }));
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const result = await provider.imageModel('gemini-3.1-flash-image').doGenerate!({ prompt: 'hello', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: undefined, mask: undefined, providerOptions: {} });
    expect(result.images[0]).toEqual(new Uint8Array([4]));
  });

  it('materializes uploaded image URLs for the Gemini native request', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === 'https://files.test/reference.png') {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        contents: [{ role: 'user', parts: [
          { text: 'edit this image' },
          { inlineData: { mimeType: 'image/png', data: 'AQID' } },
        ] }],
        generationConfig: { imageConfig: { aspectRatio: '1:1', imageSize: '2K' } },
      });
      return Response.json({
        candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'BA==' } }] } }],
      });
    });
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const result = await provider.imageModel('gemini-3-pro-image').doGenerate!({
      prompt: 'edit this image', n: 1, size: undefined, aspectRatio: undefined,
      seed: undefined, files: undefined, mask: undefined,
      providerOptions: { novita: { input: {
        prompt: 'edit this image', urls: ['https://files.test/reference.png'],
        aspectRatio: '1:1', imageSize: '2K',
      } } },
    });
    expect(result.images[0]).toEqual(new Uint8Array([4]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('builds the Gemini wire contents from flat handler input', async () => {
    let requestBody: any;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/png', data: 'BA==' } }] } }] });
    });
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });

    await provider.imageModel('gemini-3.1-flash-image').doGenerate!({
      prompt: 'flat prompt',
      n: 1,
      size: undefined,
      aspectRatio: undefined,
      seed: undefined,
      files: undefined,
      mask: undefined,
      providerOptions: {
        novita: {
          input: {
            urls: ['data:image/png;base64,AQID'],
            aspectRatio: '16:9',
            imageSize: '2K',
            includeTextResponse: false,
          },
        },
      },
    });

    expect(requestBody).toEqual({
      contents: [{
        role: 'user',
        parts: [
          { text: 'flat prompt' },
          { inlineData: { mimeType: 'image/png', data: 'AQID' } },
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
      },
    });
  });

  it('cancels a Seedance task through its persisted URL', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => init?.method === 'DELETE' ? Response.json({}) : Response.json({ data: { id: 'novita-1' } }));
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const job = await provider.jobs.start({ model: provider.videoModel('doubao-seedance-2-0-260128'), input: { prompt: 'hello', n: 1, providerOptions: {} } });
    await job.cancel();
    expect((await job.status()).state).toBe('cancelled');
  });
});
