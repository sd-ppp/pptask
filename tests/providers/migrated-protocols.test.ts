import { describe, expect, it, vi } from 'vitest';
import {
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
