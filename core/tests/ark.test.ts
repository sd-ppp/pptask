import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProviders } from '../src/index.ts';
import { arkProviderDefinition } from '../src/providers/ark/index.ts';

const MODEL = 'doubao-seedream-5-0-pro-260628';
const LOCATOR = `ark:///${MODEL}`;

describe('ark provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is registered separately from PPIO and describes Seedream 5.0 Pro', async () => {
    expect(listProviders()).toContain('ark');
    const result = await arkProviderDefinition.describeResource({ locator: LOCATOR });

    expect(result.provider).toBe('ark');
    expect(result.metadata).toMatchObject({
      scheme: 'ark',
      model: MODEL,
      apiEndpoint: '/api/v3/images/generations',
      protocol: 'volcengine-ark-images-generations',
      supportsLayerDecomposition: true,
    });
    expect(result.formSchema.properties).toHaveProperty('layerDecomposition');
    expect(result.formSchema.properties).toHaveProperty('image');
    expect(result.formValues).toMatchObject({
      image: [],
      layerDecomposition: false,
      size: '2K',
      outputFormat: 'jpeg',
      responseFormat: 'url',
      watermark: true,
    });
  });

  it('creates a text-to-image request with the native Ark protocol', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      created: 1787450000,
      model: MODEL,
      data: [{
        url: 'https://ark.example.com/generated.jpeg',
        size: '2048x2048',
        output_format: 'jpeg',
      }],
      usage: { generated_images: 1, output_tokens: 16384, total_tokens: 16384 },
    }));

    const result = await arkProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload: {
        prompt: '一只站在竹林里的红色熊猫',
        size: '2K',
        optimizePromptMode: 'fast',
        outputFormat: 'jpeg',
        responseFormat: 'url',
        watermark: false,
      },
      platformConfig: { apiKey: 'ark-test-key' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://ark.cn-beijing.volces.com/api/v3/images/generations');
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer ark-test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: MODEL,
      layer_decomposition: false,
      size: '2K',
      output_format: 'jpeg',
      response_format: 'url',
      watermark: false,
      prompt: '一只站在竹林里的红色熊猫',
      background: 'opaque',
      optimize_prompt_options: { mode: 'fast' },
    });
    expect(result.costCoins).toBe(16384);
    expect(result.outputs[0]).toMatchObject({
      url: 'https://ark.example.com/generated.jpeg',
      mimeType: 'image/jpeg',
      type: 'image',
      size: '2048x2048',
    });
  });

  it('creates a layer-decomposition request and preserves layer metadata', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      created: 1787450001,
      model: MODEL,
      data: [
        {
          url: 'https://ark.example.com/base.jpeg',
          size: '2048x2048',
          output_format: 'jpeg',
          z_index: 0,
          name: '背景',
        },
        {
          b64_json: 'transparent-layer',
          size: '1024x1536',
          output_format: 'png',
          z_index: 1,
          name: '鹦鹉',
          description: '一只彩色鹦鹉',
          bounding_box: {
            absolute: [225, 442, 796, 1414],
            normalized: [220, 432, 777, 1000],
          },
        },
      ],
    }));

    const result = await arkProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload: {
        prompt: '拆分鹦鹉与文字',
        image: ['https://ark.example.com/source.png'],
        layerDecomposition: true,
        size: 'auto',
        outputFormat: 'jpeg',
        responseFormat: 'b64_json',
      },
      platformConfig: {
        apiKey: 'ark-test-key',
        baseUrl: 'https://ark-proxy.example.com/api/v3/',
      },
    });

    expect(fetchMock.mock.calls[0][0]).toBe('https://ark-proxy.example.com/api/v3/images/generations');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      model: MODEL,
      layer_decomposition: true,
      size: 'auto',
      output_format: 'jpeg',
      response_format: 'b64_json',
      watermark: true,
      prompt: '拆分鹦鹉与文字',
      image: 'https://ark.example.com/source.png',
    });
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[1]).toMatchObject({
      url: 'data:image/png;base64,transparent-layer',
      mimeType: 'image/png',
      zIndex: 1,
      name: '鹦鹉',
      description: '一只彩色鹦鹉',
      boundingBox: {
        absolute: [225, 442, 796, 1414],
        normalized: [220, 432, 777, 1000],
      },
    });
  });

  it('supports image editing and custom pixel sizes', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      data: [{ url: 'https://ark.example.com/edit.png', output_format: 'png' }],
    }));

    await arkProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload: {
        prompt: '保留主体，改为透明背景',
        urls: [{ inlineData: { mimeType: 'image/png', data: 'source-base64' } }],
        size: '2048x1024',
        output_format: 'png',
        background: 'transparent',
      },
      platformConfig: { apiKey: 'ark-test-key' },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      image: 'data:image/png;base64,source-base64',
      size: '2048x1024',
      output_format: 'png',
      background: 'transparent',
    });
  });

  it('validates model constraints before calling the API', async () => {
    const make = (payload: Record<string, any>) => arkProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload,
      platformConfig: { apiKey: 'ark-test-key' },
    });

    await expect(make({ prompt: '' })).rejects.toThrow('requires a non-empty prompt');
    await expect(make({ layerDecomposition: true })).rejects.toThrow('exactly one source image');
    await expect(make({
      image: ['https://ark.example.com/a.png', 'https://ark.example.com/b.png'],
      layerDecomposition: true,
    })).rejects.toThrow('exactly one source image');
    await expect(make({ prompt: 'test', size: '512x512' })).rejects.toThrow('921600-4624220 pixels');
    await expect(make({
      prompt: 'test', image: ['https://ark.example.com/a.png'], background: 'transparent', outputFormat: 'jpeg',
    })).rejects.toThrow('requires output_format=png');
    await expect(make({ prompt: 'test', sequential_image_generation: 'auto' })).rejects.toThrow(
      'does not support sequential_image_generation'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported locators and requires an API key', async () => {
    await expect(
      arkProviderDefinition.describeResource({ locator: 'ppio:///doubao-seedream-5-0-pro-260628' })
    ).rejects.toThrow('ark provider received unsupported locator');
    await expect(
      arkProviderDefinition.describeResource({ locator: 'ark:///unknown-model' })
    ).rejects.toThrow('Unsupported Ark model');
    await expect(
      arkProviderDefinition.createTaskSync!({ locator: LOCATOR, payload: { prompt: 'test' } })
    ).rejects.toThrow('ark provider requires apiKey');
  });
});

function mockResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}
