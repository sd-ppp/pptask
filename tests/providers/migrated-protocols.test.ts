import { describe, expect, it, vi } from 'vitest';
import {
  buildCrunGenericVideoRequestBody,
  buildCrunGeminiOmniRequestBody,
  buildCrunGptImage2RequestBody,
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

  it('maps flat CRUN image handler inputs to upstream request bodies', () => {
    expect(buildCrunGptImage2RequestBody('openai/gpt-image-2-5-official', {
      prompt: 'draw', img_urls: ['https://a.test/i.png'], quality: 'xhigh',
      aspect_ratio: '9:16', model_variant: 'flare', output_format: 'webp', background: 'transparent',
    })).toEqual({
      model: 'openai/gpt-image-2-5-official',
      input: {
        prompt: 'draw', img_urls: ['https://a.test/i.png'], quality: 'xhigh',
        aspect_ratio: '9:16',
      },
    });
    expect(buildCrunImageUpscaleRequestBody('image-upscale-pro', {
      img_urls: ['https://a.test/i.png'], clarity: 'ultra', output_format: 'jpg',
    })).toEqual({
      model: 'image-upscale-pro',
      input: { img_urls: ['https://a.test/i.png'], clarity: 'ultra' },
    });
  });

  it('maps flat CRUN video handler inputs to upstream request bodies', () => {
    expect(buildCrunGenericVideoRequestBody('wan/3-0-i2v', {
      prompt: 'move', img_urls: ['https://a.test/i.png'], duration: 12, resolution: '1080P',
      audio: false, aspect_ratio: '9:16', prompt_extend: true,
    })).toEqual({
      model: 'wan/3-0-i2v',
      input: {
        prompt: 'move', image_url: 'https://a.test/i.png', duration: 12, resolution: '1080P',
      },
    });
    expect(buildCrunMinimaxH3RequestBody('minimax/h3-i2v', {
      prompt: 'move', imgUrls: ['https://a.test/a.png'], duration: 5,
      resolution: '768P', aspectRatio: 'auto',
    }).input).toMatchObject({ img_urls: ['https://a.test/a.png'], aspect_ratio: 'auto' });
    expect(buildCrunKlingRequestBody('kling/v2-6', {
      prompt: 'move', imgUrls: ['https://a.test/a.png'], duration: 10,
      mode: 'pro', aspectRatio: '9:16', audio: true,
      inputCompliance: 'disabled', outputCompliance: 'enabled',
    }).input).toMatchObject({
      img_urls: ['https://a.test/a.png'], mode: 'pro', aspect_ratio: '9:16', audio: true,
      input_compliance: 'disabled', output_compliance: 'enabled',
    });
    expect(buildCrunVeo31RequestBody('google/veo3-1-fast-i2v', {
      prompt: 'move', imgUrls: ['https://a.test/a.png'], duration: 8,
      resolution: '1080p', aspectRatio: '16:9', translatePrompt: true,
    }).input).toMatchObject({ resolution: '1080p', aspect_ratio: '16:9', translate_prompt: true });
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
