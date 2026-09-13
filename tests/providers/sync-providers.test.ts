import { describe, expect, it, vi } from 'vitest';
import {
  ARK_SEEDREAM_5_PRO_MODEL,
  buildArkSeedreamRequestBody,
  createArkProvider,
  createGeminiProvider,
  createOpenAIProvider,
} from '../../src/index.ts';

const call = (provider: ReturnType<typeof createArkProvider>, modelId: string) => provider.imageModel(modelId).doGenerate!({ prompt: 'hello', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: undefined, mask: undefined, providerOptions: {} });

describe('synchronous image providers', () => {
  it('OpenAI', async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [{ b64_json: 'AQ==' }] }));
    const provider = createOpenAIProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    expect((await call(provider, 'gpt-image-1')).images[0]).toEqual(new Uint8Array([1]));
  });
  it('Gemini', async () => {
    const fetchMock = vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: 'Ag==' } }] } }] }));
    const provider = createGeminiProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    expect((await call(provider, 'gemini-image')).images[0]).toEqual(new Uint8Array([2]));
  });
  it('Ark', async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: [{ b64_json: 'Aw==' }] }));
    const provider = createArkProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    expect((await call(provider, ARK_SEEDREAM_5_PRO_MODEL)).images[0]).toEqual(new Uint8Array([3]));
    const request = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request[1].body))).toMatchObject({
      model: ARK_SEEDREAM_5_PRO_MODEL,
      prompt: 'hello',
      size: '2K',
      output_format: 'jpeg',
      response_format: 'url',
      background: 'opaque',
    });
  });

  it('validates Ark Seedream model constraints before sending a request', async () => {
    expect(() => buildArkSeedreamRequestBody(ARK_SEEDREAM_5_PRO_MODEL, { prompt: '' }))
      .toThrow('requires a non-empty prompt');
    expect(() => buildArkSeedreamRequestBody(ARK_SEEDREAM_5_PRO_MODEL, {
      layerDecomposition: true,
    })).toThrow('exactly one source image');
    expect(() => buildArkSeedreamRequestBody(ARK_SEEDREAM_5_PRO_MODEL, {
      prompt: 'test',
      size: '512x512',
    })).toThrow('921600-4624220 pixels');
    expect(() => buildArkSeedreamRequestBody(ARK_SEEDREAM_5_PRO_MODEL, {
      prompt: 'test',
      image: ['https://example.com/a.png'],
      background: 'transparent',
      outputFormat: 'jpeg',
    })).toThrow('requires output_format=png');
  });

  it('rejects unsupported Ark models', () => {
    const provider = createArkProvider({ apiKey: 'key', fetch: vi.fn() as typeof fetch });
    expect(() => provider.imageModel('seedream')).toThrow('Unsupported Ark model');
  });
});
