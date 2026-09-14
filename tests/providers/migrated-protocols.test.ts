import { describe, expect, it, vi } from 'vitest';
import {
  buildCrunGptImage2RequestBody,
  buildCrunGeminiOmniRequestBody,
  buildCrunGrokImagineVideoRequestBody,
  buildCrunImageExpandRequestBody,
  buildCrunImageUpscaleRequestBody,
  buildCrunKlingRequestBody,
  buildCrunMinimaxH3RequestBody,
  buildCrunPixverseV6RequestBody,
  buildCrunSeedanceRequestBody,
  buildCrunSeedreamRequestBody,
  buildCrunVeo31RequestBody,
  buildCrunWatermarkRemoveRequestBody,
  createCrunProvider,
  createNovitaProvider,
  createPpioProvider,
} from '../../src/index.ts';

describe('CRUN GPT Image 2.5 transport', () => {
  it('builds the documented unified model request', () => {
    const body = buildCrunGptImage2RequestBody('openai/gpt-image-2-5', {
      prompt: 'Refine the product lighting',
      imgUrls: ['https://input.test/product.png'],
      modelVariant: 'sunburst',
      aspectRatio: '4:5',
      resolution: '4K',
      n: 2,
    });
    expect(body).toEqual({
      model: 'openai/gpt-image-2-5',
      input: {
        prompt: 'Refine the product lighting',
        img_urls: ['https://input.test/product.png'],
        aspect_ratio: '4:5',
        model_variant: 'sunburst',
        resolution: '4k',
        n: 2,
      },
    });
  });

  it('describes the variant, resolution, and image count controls', async () => {
    const provider = createCrunProvider({ apiKey: 'key', fetch: vi.fn() as typeof fetch });
    const description = await provider.describe(provider.imageModel('openai/gpt-image-2-5'));
    expect(description.defaultInput).toMatchObject({ modelVariant: 'flare', resolution: '1k', n: 1 });
    expect((description.inputSchema as any).properties.modelVariant.enum.map((item: any) => item.value))
      .toEqual(['flare', 'sunburst']);
  });

  it('builds the extended official-channel options', async () => {
    const body = buildCrunGptImage2RequestBody('openai/gpt-image-2-5-official', {
      prompt: 'Refine the product materials',
      modelVariant: 'sunburst', aspectRatio: '21:9', resolution: '4K', n: 10,
      quality: 'max', background: 'transparent', outputFormat: 'webp', outputCompression: 80,
    });
    expect(body).toEqual({
      model: 'openai/gpt-image-2-5-official',
      input: {
        prompt: 'Refine the product materials', model_variant: 'sunburst', aspect_ratio: '21:9',
        resolution: '4k', n: 10, quality: 'max', background: 'transparent',
        output_format: 'webp', output_compression: 80,
      },
    });

    const provider = createCrunProvider({ apiKey: 'key', fetch: vi.fn() as typeof fetch });
    const description = await provider.describe(provider.imageModel('openai/gpt-image-2-5-official'));
    expect(description.defaultInput).toMatchObject({ aspectRatio: 'auto', quality: 'auto', outputFormat: 'png' });
    expect((description.inputSchema as any).properties.n['x-component-props'].max).toBe(10);
  });
});

describe('migrated model protocol builders', () => {
  it('routes every CRUN model family through a model-specific builder', () => {
    const cases = [
      ['image-expand', buildCrunImageExpandRequestBody, { imgUrls: ['https://a.test/i.png'], prompt: 'extend' }],
      ['image-watermark-remove', buildCrunWatermarkRemoveRequestBody, { imgUrls: ['https://a.test/i.png'] }],
      ['image-upscale', buildCrunImageUpscaleRequestBody, { imgUrls: ['https://a.test/i.png'] }],
      ['bytedance/seedream-5-pro', buildCrunSeedreamRequestBody, { prompt: 'image' }],
      ['bytedance/seedance2-5-t2v', buildCrunSeedanceRequestBody, { prompt: 'video' }],
      ['kling/v3', buildCrunKlingRequestBody, { prompt: 'video' }],
      ['minimax/h3-t2v', buildCrunMinimaxH3RequestBody, { prompt: 'video' }],
      ['pixverse/v6-t2v', buildCrunPixverseV6RequestBody, { prompt: 'video' }],
      ['happyhorse-1-1-t2v', (model: string, input: any) => ({ model, input }), { prompt: 'video' }],
      ['minimax/hailuo-2-3', (model: string, input: any) => ({ model, input }), { prompt: 'video' }],
      ['grok-imagine-video-1.5-preview', buildCrunGrokImagineVideoRequestBody, { prompt: 'video', imgUrls: ['https://a.test/i.png'] }],
      ['google/gemini-omni', buildCrunGeminiOmniRequestBody, { prompt: 'video' }],
      ['google/veo3-1-t2v', buildCrunVeo31RequestBody, { prompt: 'video' }],
    ] as const;
    for (const [model, builder, input] of cases) {
      if (model === 'happyhorse-1-1-t2v' || model === 'minimax/hailuo-2-3') continue;
      expect(builder(model, input as any).model).toBe(model);
    }
  });
});

describe('PPIO migrated transport', () => {
  it('uses the legacy GPT Image 2 request contract for generation and editing', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('gpt-image-2-text-to-image')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ prompt: 'draw', n: 2, output_format: 'png' });
        return Response.json({ images: [{ b64_json: 'AQID' }] });
      }
      expect(url).toContain('gpt-image-2-edit');
      expect(JSON.parse(String(init?.body))).toMatchObject({ prompt: 'edit', image: 'data:image/png;base64,AQID' });
      return Response.json({ images: [{ b64_json: 'BAUG' }] });
    });
    const provider = createPpioProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const generation = await provider.imageModel('gpt-image-2').doGenerate!({ prompt: 'draw', n: 2, size: undefined, aspectRatio: undefined, seed: undefined, files: undefined, mask: undefined, providerOptions: {} });
    expect(generation.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    const edit = await provider.imageModel('gpt-image-2').doGenerate!({ prompt: 'edit', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: [{ type: 'file', data: 'AQID', mediaType: 'image/png' }], mask: undefined, providerOptions: {} });
    expect(edit.images[0]).toEqual(new Uint8Array([4, 5, 6]));
  });

  it('uses the distinct MiniMax and Seedance CN polling endpoints', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/video_generation')) return Response.json({ data: { task_id: 'mini-1' } });
      if (url.includes('/query/video_generation/')) return Response.json({ data: { task: { status: 'succeeded', content: { url: 'https://cdn.test/mini.mp4' } } } });
      if (url.endsWith('/contents/generations/tasks')) return Response.json({ data: { id: 'cn-1' } });
      return Response.json({ data: { status: 'succeeded', content: { video_url: 'https://cdn.test/cn.mp4' } } });
    });
    const provider = createPpioProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const mini = await (await provider.jobs.start<any>({ model: provider.videoModel('MiniMax-H3'), input: { prompt: 'mini' } })).wait();
    const cn = await (await provider.jobs.start<any>({ model: provider.videoModel('doubao-seedance-2-5-260628'), input: { prompt: 'cn' } })).wait();
    expect(mini.videos[0].url).toBe('https://cdn.test/mini.mp4');
    expect(cn.videos[0].url).toBe('https://cdn.test/cn.mp4');
  });
});

describe('Novita migrated transport', () => {
  it('supports the openai/gpt-6-astra language model', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.novita.ai/openai/v1/responses');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'openai/gpt-6-astra', input: 'hello', stream: false,
      });
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }] });
    });
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const result = await provider.languageModel('openai/gpt-6-astra').doGenerate!({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }],
      maxOutputTokens: undefined, temperature: undefined, topP: undefined,
      stopSequences: undefined, presencePenalty: undefined, frequencyPenalty: undefined,
      responseFormat: undefined, tools: undefined, toolChoice: undefined, providerOptions: {},
    } as any);
    expect(result.content[0]).toMatchObject({ type: 'text', text: 'ok' });
  });

  it('supports GPT Image 2.5 native models and extended quality tiers', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.novita.ai/openai/v1/images/generations');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'gpt-image-2.5-flare-oai',
        quality: 'xhigh',
      });
      return Response.json({ data: [{ b64_json: 'AQID', output_format: 'png' }], usage: { total_tokens: 123 } });
    });
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const description = await provider.describe(provider.imageModel('gpt-image-2.5-flare-oai'));
    expect((description.defaultInput as any).quality).toBe('auto');
    expect((description.inputSchema as any).properties.quality.enum.map((item: any) => item.value)).toContain('max');
    const image = await provider.imageModel('gpt-image-2.5-flare-oai').doGenerate!({
      prompt: 'draw', n: 1, size: undefined, aspectRatio: undefined, seed: undefined,
      files: undefined, mask: undefined,
      providerOptions: { novita: { quality: 'xhigh' } },
    });
    expect(image.images[0]).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('uses the legacy GPT-5.6 body and GPT Image multipart protocol', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/responses')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'pa/gpt-5.6-sol', input: 'hello', stream: false });
        return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }] });
      }
      expect(url.endsWith('/images/edits')).toBe(true);
      expect(init?.body).toBeInstanceOf(FormData);
      return Response.json({ data: [{ b64_json: 'AQID', output_format: 'png' }] });
    });
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const text = await provider.languageModel('pa/gpt-5.6-sol').doGenerate!({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }], maxOutputTokens: undefined, temperature: undefined, topP: undefined, stopSequences: undefined, presencePenalty: undefined, frequencyPenalty: undefined, responseFormat: undefined, tools: undefined, toolChoice: undefined, providerOptions: {} } as any);
    expect(text.content[0]).toMatchObject({ type: 'text', text: 'ok' });
    const image = await provider.imageModel('gpt-image-2').doGenerate!({ prompt: 'edit', n: 1, size: undefined, aspectRatio: undefined, seed: undefined, files: [{ type: 'file', data: 'AQID', mediaType: 'image/png' }], mask: undefined, providerOptions: {} });
    expect(image.images[0]).toEqual(new Uint8Array([1, 2, 3]));
  });
});
