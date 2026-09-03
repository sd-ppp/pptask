import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_WATERMARK_REMOVE_MODELS,
  buildCrunRequestBody,
  buildCrunWatermarkRemoveRequestBody,
  crunProviderDefinition,
  parseCrunModel,
} from '../src/providers/crun/index.ts';
import { uploadCrunFile } from '../src/upload-providers/crun/index.ts';

const IMAGE = 'image-watermark-remove';
const VIDEO = 'video-watermark-remove';
const locator = (model: string) => `crun:///${model}`;
const config = { apiKey: 'test-key' };

describe('CRUN watermark removal', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('registers two asynchronous models without inventing a Pro model ID', () => {
    expect(CRUN_WATERMARK_REMOVE_MODELS).toEqual([IMAGE, VIDEO]);
    for (const model of CRUN_WATERMARK_REMOVE_MODELS) {
      expect(parseCrunModel(new URL(locator(model)))).toBe(model);
      expect(crunProviderDefinition.getExecutionMode!({ locator: locator(model) })).toBe('async');
    }
    expect(() => parseCrunModel(new URL('crun:///image-watermark-remove-pro')))
      .toThrow('Unsupported CRUN model');
  });

  it('describes image Basic/Pro and video forms separately', async () => {
    const image = await crunProviderDefinition.describeResource({ locator: locator(IMAGE) });
    const video = await crunProviderDefinition.describeResource({ locator: locator(VIDEO) });
    expect(image.formValues).toEqual({ imgUrls: [], mode: 'basic', callbackUrl: '' });
    expect(image.formSchema.properties.mode.enum.map((v: any) => v.value)).toEqual(['basic', 'pro']);
    expect(video.formValues).toEqual({ videoUrl: [], callbackUrl: '' });
    expect(video.formSchema.properties).not.toHaveProperty('mode');
    expect(video.formSchema.properties).not.toHaveProperty('prompt');
    expect(video.formSchema.properties.videoUrl['x-component-props']).toMatchObject({
      accept: 'video/*', multiple: false, maxCount: 1,
    });
    for (const result of [image, video]) {
      expect(result.recommendUploadProvider).toBe('crun');
      expect(result.metadata).toMatchObject({
        supportsResolution: false, supportsOutputFormat: false,
        protocol: 'crun-unified-async-task', channel: 'watermark-remove',
      });
    }
  });

  it.each(['basic', 'pro'])('builds image mode %s on the same model ID', mode => {
    expect(buildCrunRequestBody(IMAGE, {
      imgUrls: [{ url: 'https://example.com/source.png' }], mode,
      prompt: 'ignored', resolution: '4K', callbackUrl: 'https://example.com/hook',
    })).toEqual({
      model: IMAGE,
      input: { img_urls: ['https://example.com/source.png'], mode },
      callback_url: 'https://example.com/hook',
    });
  });

  it('defaults image mode to Basic and supports snake-case fields', () => {
    expect(buildCrunRequestBody(IMAGE, { img_urls: ['https://e.test/source.jpg'] }).input)
      .toEqual({ img_urls: ['https://e.test/source.jpg'], mode: 'basic' });
    expect(buildCrunRequestBody(VIDEO, { video_url: 'https://e.test/source.mp4' }).input)
      .toEqual({ video_url: 'https://e.test/source.mp4' });
  });

  it('builds a scalar video_url from Upload output without image-only parameters', () => {
    expect(buildCrunRequestBody(VIDEO, {
      videoUrl: [{ url: 'https://e.test/source.mp4' }], mode: 'pro', imgUrls: ['ignored'],
    })).toEqual({ model: VIDEO, input: { video_url: 'https://e.test/source.mp4' } });
  });

  it('rejects missing, multiple, local and Base64 inputs plus invalid modes', () => {
    for (const model of [IMAGE, VIDEO]) {
      expect(() => buildCrunWatermarkRemoveRequestBody(model, {})).toThrow('exactly one source');
      expect(() => buildCrunWatermarkRemoveRequestBody(model, {
        urls: ['https://e.test/1', 'https://e.test/2'],
      })).toThrow('exactly one source');
      for (const url of ['C:/source.png', 'data:image/png;base64,AAAA']) {
        expect(() => buildCrunWatermarkRemoveRequestBody(model, { urls: [url] }))
          .toThrow('must be an HTTP(S) URL');
      }
    }
    expect(() => buildCrunRequestBody(IMAGE, { image: 'https://e.test/1', mode: 'ultra' }))
      .toThrow('mode must be one of: basic, pro');
    expect(() => buildCrunRequestBody(VIDEO, {
      video: 'https://e.test/1', callbackUrl: 'http://e.test/hook',
    })).toThrow('callback_url must be a public HTTPS URL');
    expect(() => buildCrunWatermarkRemoveRequestBody('image-upscale', {}))
      .toThrow('Unsupported CRUN watermark removal model');
  });

  it('uploads local video via CRUN then submits the returned URL', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ code: 200, data: {
        presigned_url: 'https://upload.test/source', file_url: 'https://cdn.test/source.mp4',
      } }))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ code: 200, data: { task_id: 'wm-video-1' } }));
    const form = new FormData();
    form.append('file', new Blob(['mock video'], { type: 'video/mp4' }), 'source.mp4');
    const uploaded = await uploadCrunFile(form, config);
    const result = await crunProviderDefinition.createTaskAsync!({
      locator: locator(VIDEO), payload: { videoUrl: [uploaded.url] }, platformConfig: config,
    });
    expect(fetchMock.mock.calls[0][0]).toContain('content_type=video%2Fmp4&ext=.mp4');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.crun.ai/api/v1/client/job/CreateTask');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      model: VIDEO, input: { video_url: 'https://cdn.test/source.mp4' },
    });
    expect(result).toMatchObject({ provider: 'crun', taskId: 'wm-video-1', status: 'pending' });
  });

  it.each([
    [IMAGE, { image_url: 'https://cdn.test/image.png' }, 'image'],
    [VIDEO, { media_urls: ['https://cdn.test/download?id=1'] }, 'video'],
  ])('normalizes %s outputs as the correct media type', async (model, media, type) => {
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: {
      status: 'success', credits: 6, result: media,
    } }));
    const result = await crunProviderDefinition.getResult!({
      locator: locator(model as string), taskId: 'wm-1', platformConfig: config,
    });
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toMatchObject({ type });
    expect(result.costCoins).toBe(6);
  });

  it('preserves API failure and missing-result errors', async () => {
    fetchMock.mockResolvedValueOnce(response({ code: 402, message: 'Insufficient Credits' }, 402));
    await expect(crunProviderDefinition.createTaskAsync!({
      locator: locator(IMAGE), payload: { image: 'https://e.test/1' }, platformConfig: config,
    })).rejects.toThrow('HTTP 402 Insufficient Credits');
    fetchMock.mockResolvedValueOnce(response({ code: 200, data: { status: 'success', result: {} } }));
    await expect(crunProviderDefinition.getResult!({
      locator: locator(VIDEO), taskId: 'wm-1', platformConfig: config,
    })).rejects.toThrow('returned no result.media_urls');
  });
});

function response(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
