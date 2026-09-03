import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_IMAGE_EXPAND_MODELS,
  buildCrunImageExpandRequestBody,
  buildCrunRequestBody,
  crunProviderDefinition,
  parseCrunModel,
} from '../src/providers/crun/index.ts';

const MODEL = 'image-expand';
const locator = 'crun:///image-expand';
const source = 'https://assets.example.com/source.png';
const mask = 'https://assets.example.com/mask.png';
const build = (payload: Record<string, any>) => buildCrunImageExpandRequestBody(MODEL, payload);

describe('CRUN Image Expand', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => vi.unstubAllGlobals());

  it('registers image-expand as async and describes both modes', async () => {
    expect(CRUN_IMAGE_EXPAND_MODELS).toEqual([MODEL]);
    expect(parseCrunModel(new URL(locator))).toBe(MODEL);
    expect(crunProviderDefinition.getExecutionMode!({ locator })).toBe('async');
    const result = await crunProviderDefinition.describeResource({ locator });
    expect(result.metadata).toMatchObject({
      model: MODEL, mode: MODEL, supportsResolution: false, supportsOutputFormat: true,
      supportedExpandModes: ['sides', 'canvas'],
    });
    expect(result.formValues).toMatchObject({ expandMode: 'sides', top: 0.25, maskUrl: [] });
    expect(result.formSchema.properties.imgUrls['x-component-props'].maxCount).toBe(1);
    expect(result.formSchema.properties.maskUrl['x-component']).toBe('Upload');
    expect(result.formSchema.properties.maskUrl['x-reactions'].dependencies).toEqual(['expandMode']);
    expect(result.recommendUploadProvider).toBe('crun');
  });

  it('routes four-side expansion through the unified request builder', () => {
    expect(buildCrunRequestBody(MODEL, {
      imgUrls: [{ url: source }], top: 0.25, bottom: '0.1', left: 0, right: 1,
      prompt: ' extend the blue sky ', outputFormat: 'jpg', callbackUrl: 'https://example.com/hook',
    })).toEqual({
      model: MODEL, callback_url: 'https://example.com/hook',
      input: { img_urls: [source], top: 0.25, bottom: 0.1, left: 0, right: 1,
        prompt: 'extend the blue sky', output_format: 'jpg' },
    });
  });

  it('omits optional prompt and absent or null side values', () => {
    expect(build({ image: source, top: null, bottom: '', prompt: '' })).toEqual({
      model: MODEL, input: { img_urls: [source], output_format: 'png' },
    });
  });

  it('infers canvas mode from a mask and omits side values and client-only mode', () => {
    expect(build({ img_urls: [source], mask_url: mask, top: 0.3, left: 1 })).toEqual({
      model: MODEL, input: { img_urls: [source], mask_url: mask, output_format: 'png' },
    });
  });

  it('accepts uploaded mask arrays and filters stale fields after mode switching', () => {
    expect(build({ imgUrls: [source], expandMode: 'canvas', maskUrl: [{ url: mask }], right: 0.5 })
      .input).toEqual({ img_urls: [source], mask_url: mask, output_format: 'png' });
    expect(build({ imgUrls: [source], expandMode: 'sides', maskUrl: [mask], top: 0.5 })
      .input).toEqual({ img_urls: [source], top: 0.5, output_format: 'png' });
  });

  it('requires exactly one source and one mask in canvas mode', () => {
    for (const images of [[], [source, source]]) {
      expect(() => build({ imgUrls: images })).toThrow('exactly one source image');
    }
    for (const masks of [[], [mask, mask]]) {
      expect(() => build({ image: source, expandMode: 'canvas', maskUrl: masks }))
        .toThrow('exactly one mask');
    }
    expect(() => build({ image: 'data:image/png;base64,AAAA' })).toThrow('HTTP(S)');
    expect(() => build({ image: source, maskUrl: 'C:/mask.png' })).toThrow('HTTP(S)');
  });

  it.each(['top', 'bottom', 'left', 'right'])('validates %s ratios without accepting invalid coercions', side => {
    for (const value of [-0.01, 1.01, NaN, Infinity, true, [], {}, 'abc', ' ']) {
      expect(() => build({ image: source, [side]: value })).toThrow(`${side} must be a number from 0 to 1`);
    }
  });

  it('validates mode, prompt, output format and callback', () => {
    expect(() => build({ image: source, expandMode: 'unknown' })).toThrow('expandMode');
    expect(() => build({ image: source, prompt: {} })).toThrow('prompt must be a string');
    expect(() => build({ image: source, outputFormat: 'webp' })).toThrow('output_format');
    expect(() => build({ image: source, callbackUrl: 'http://example.com/hook' })).toThrow('HTTPS');
    expect(() => buildCrunImageExpandRequestBody('image-upscale', {})).toThrow('Unsupported');
  });

  it('creates, polls and normalizes image results and credits', async () => {
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: { task_id: 'expand-1' } }));
    const created = await crunProviderDefinition.createTaskAsync!({
      locator, payload: { image: source, top: 0.25 }, platformConfig: { apiKey: 'test-key' },
    });
    expect(created).toMatchObject({ provider: 'crun', status: 'pending', taskId: 'expand-1' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.crun.ai/api/v1/client/job/CreateTask');
    expect(fetchMock.mock.calls[0][1].headers['X-API-KEY']).toBe('test-key');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(build({ image: source, top: 0.25 }));
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: { status: 'processing' } }));
    expect(await crunProviderDefinition.checkStatus!({ locator, taskId: 'expand-1', platformConfig: { apiKey: 'test-key' } }))
      .toMatchObject({ status: 'running' });
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: {
      status: 'success', credits: 7.5, result: { media_urls: ['https://cdn.test/output.jpg?expires=1'] },
    } }));
    const result = await crunProviderDefinition.getResult!({ locator, taskId: 'expand-1', platformConfig: { apiKey: 'test-key' } });
    expect(result.outputs[0]).toMatchObject({ type: 'image', mimeType: 'image/jpeg' });
    expect(result.costCoins).toBe(7.5);
  });

  it('preserves failed and empty-result errors', async () => {
    fetchMock.mockResolvedValueOnce(response({ code: 402, message: 'Insufficient Credits' }, 402));
    await expect(crunProviderDefinition.createTaskAsync!({
      locator, payload: { image: source }, platformConfig: { apiKey: 'test-key' },
    })).rejects.toThrow('HTTP 402');
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: { status: 'success', result: {} } }));
    await expect(crunProviderDefinition.getResult!({ locator, taskId: 'empty', platformConfig: { apiKey: 'test-key' } }))
      .rejects.toThrow('returned no result.media_urls');
  });
});

function response(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
