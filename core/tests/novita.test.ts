import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProviders } from '../src/index.ts';
import {
  NOVITA_KLING_V3_MODELS,
  NOVITA_SUPPORTED_MODELS,
  NOVITA_VEO31_MODELS,
  novitaProviderDefinition,
} from '../src/providers/novita/index.ts';

const MODEL = 'gemini-3.1-flash-image';
const LOCATOR = `novita:///${MODEL}`;

describe('novita provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is registered separately from PPIO and describes the native Gemini protocol', async () => {
    expect(listProviders()).toContain('novita');
    expect(NOVITA_SUPPORTED_MODELS).toHaveLength(31);

    const result = await novitaProviderDefinition.describeResource({ locator: LOCATOR });
    expect(result.provider).toBe('novita');
    expect(result.metadata).toMatchObject({
      scheme: 'novita',
      model: MODEL,
      apiEndpoint: `/v1/models/${MODEL}:generateContent`,
      protocol: 'google-gemini-generate-content-token-billing',
      billing: 'tokens',
      responseModalitiesDefault: ['IMAGE'],
    });
    expect(result.formSchema.properties).toHaveProperty('imageSize');
    expect(result.formValues).toMatchObject({
      urls: [],
      aspectRatio: '16:9',
      imageSize: '2K',
      includeTextResponse: false,
    });
  });

  it('generates a 4K image using the Novita Gemini endpoint and image-only default', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      candidates: [{
        content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'generated-image' } }] },
      }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4096, totalTokenCount: 4108 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload: {
        prompt: 'Generate a cinematic city skyline',
        aspectRatio: '16:9',
        imageSize: '4K',
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      `https://api.novita.ai/gemini/v1/models/${MODEL}:generateContent`
    );
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer novita-test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'Generate a cinematic city skyline' }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9', imageSize: '4K' },
      },
    });
    expect(result.provider).toBe('novita');
    expect(result.costCoins).toBe(4108);
    expect(result.outputs[0]).toMatchObject({
      url: 'data:image/png;base64,generated-image',
      mimeType: 'image/png',
      type: 'image',
    });
  });

  it('supports image editing, text output, and snake_case response fields', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      candidates: [{
        content: {
          parts: [
            { text: 'Edited successfully' },
            { inline_data: { mime_type: 'image/jpeg', data: 'edited-image' } },
          ],
        },
      }],
      usage_metadata: { total_token_count: 2050 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///gemini-3.1-flash-image-as',
      payload: {
        prompt: 'Turn the background blue',
        urls: ['data:image/webp;base64,source-image'],
        includeTextResponse: true,
        imageSize: '2K',
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Turn the background blue' },
          { inlineData: { mimeType: 'image/webp', data: 'source-image' } },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { imageSize: '2K' },
      },
    });
    expect(result.costCoins).toBe(2050);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0]).toMatchObject({ type: 'text', text: 'Edited successfully' });
    expect(result.outputs[1]).toMatchObject({
      type: 'image',
      mimeType: 'image/jpeg',
      url: 'data:image/jpeg;base64,edited-image',
    });
  });

  it('supports v1beta and a custom compatible base URL', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      candidates: [{ content: { parts: [{ inlineData: { data: 'image' } }] } }],
    }));

    await novitaProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload: { prompt: 'test' },
      platformConfig: {
        apiKey: 'novita-test-key',
        baseUrl: 'https://proxy.example.com/gemini/',
        apiVersion: '/v1beta/',
      },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://proxy.example.com/gemini/v1beta/models/${MODEL}:generateContent`
    );
  });

  it('validates configuration, locators, images and modalities before requesting', async () => {
    await expect(
      novitaProviderDefinition.describeResource({ locator: 'ppio:///gemini-3.1-flash-image' })
    ).rejects.toThrow('novita provider received unsupported locator');
    await expect(
      novitaProviderDefinition.describeResource({ locator: 'novita:///unknown-model' })
    ).rejects.toThrow('Unsupported Novita model');
    await expect(
      novitaProviderDefinition.createTaskSync!({ locator: LOCATOR, payload: { prompt: 'test' } })
    ).rejects.toThrow('novita provider requires apiKey');
    await expect(create({ prompt: '' })).rejects.toThrow('requires a prompt or at least one reference image');
    await expect(create({ prompt: 'test', urls: ['https://example.com/image.png'] }))
      .rejects.toThrow('must be a base64 string');
    await expect(create({ prompt: 'test', responseModalities: ['AUDIO'] }))
      .rejects.toThrow('only supports TEXT and IMAGE');
    await expect(create({ prompt: 'test', imageSize: '8K' }))
      .rejects.toThrow('imageSize must be one of');
    await expect(create({ prompt: 'test' }, { apiVersion: 'v2' }))
      .rejects.toThrow('apiVersion must be v1 or v1beta');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves HTTP errors from Novita', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: { message: 'invalid request' } }, 400));
    await expect(create({ prompt: 'test' })).rejects.toThrow(
      'Novita API error: HTTP 400'
    );
  });

  it('describes Novita GPT Image 2 with separate generation and edit endpoints', async () => {
    const result = await novitaProviderDefinition.describeResource({
      locator: 'novita:///gpt-image-2',
    });
    expect(result.metadata).toMatchObject({
      model: 'gpt-image-2',
      apiEndpoint: '/openai/v1/images/generations',
      editApiEndpoint: '/openai/v1/images/edits',
      protocol: 'openai-images-token-billing',
      billing: 'tokens',
      requestModes: { generation: 'application/json', editing: 'multipart/form-data' },
    });
    expect(result.formSchema.properties).toHaveProperty('mask');
    expect(result.formSchema.properties.size.enum.map((item: any) => item.value)).toEqual([
      'auto', '1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152',
      '3840x2160', '2160x3840', '2048x1360', '1360x2048', '1152x2048',
      '2048x1536', '1536x2048', '2048x880', '880x2048', '688x2048',
      '2048x688', '2048x1024', '1024x2048',
    ]);
    expect(result.formValues).toMatchObject({
      size: '1024x1024', quality: 'high', outputFormat: 'png', moderation: 'low',
    });
  });

  it('creates a GPT Image 2 generation request and reports token usage', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      created: 1787970000,
      output_format: 'webp',
      data: [{ b64_json: 'generated-webp' }],
      usage: { input_tokens: 12, output_tokens: 2000, total_tokens: 2012 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///gpt-image-2-oai',
      payload: {
        prompt: 'A white ceramic mug on a wooden table',
        size: '3840x2160',
        quality: 'high',
        outputFormat: 'webp',
        outputCompression: 90,
        n: 2,
        background: 'opaque',
        moderation: 'low',
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.novita.ai/openai/v1/images/generations');
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer novita-test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'gpt-image-2-oai',
      prompt: 'A white ceramic mug on a wooden table',
      size: '3840x2160',
      quality: 'high',
      output_format: 'webp',
      n: 2,
      background: 'opaque',
      output_compression: 90,
      moderation: 'low',
    });
    expect(result.costCoins).toBe(2012);
    expect(result.outputs[0]).toMatchObject({
      url: 'data:image/webp;base64,generated-webp', mimeType: 'image/webp', type: 'image',
    });
  });

  it('switches GPT Image 2 editing to multipart and uploads repeated image fields', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      created: 1787970001,
      data: [{ b64_json: 'edited-png' }],
      usage: { total_tokens: 4096 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///gpt-image-2',
      payload: {
        prompt: 'Create a gift basket using the products',
        urls: [
          'data:image/png;base64,aW1hZ2UtMQ==',
          { inlineData: { mimeType: 'image/jpeg', data: 'aW1hZ2UtMg==' } },
        ],
        mask: 'data:image/png;base64,bWFzaw==',
        size: '1024x1024',
        quality: 'high',
        outputFormat: 'png',
        inputFidelity: 'high',
      },
      platformConfig: {
        apiKey: 'novita-test-key',
        openaiBaseUrl: 'https://proxy.example.com/openai/',
      },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://proxy.example.com/openai/v1/images/edits');
    expect(requestInit.headers).toEqual({ Authorization: 'Bearer novita-test-key' });
    const form = requestInit.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('model')).toBe('gpt-image-2');
    expect(form.get('prompt')).toBe('Create a gift basket using the products');
    expect(form.get('output_format')).toBe('png');
    expect(form.get('input_fidelity')).toBe('high');
    expect(form.getAll('image[]')).toHaveLength(2);
    expect(form.get('mask')).toBeInstanceOf(Blob);
    expect(result.costCoins).toBe(4096);
    expect(result.outputs[0].url).toBe('data:image/png;base64,edited-png');
  });

  it('validates GPT Image 2 constraints before requesting', async () => {
    const createGpt = (payload: Record<string, any>) => novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///gpt-image-2',
      payload,
      platformConfig: { apiKey: 'novita-test-key' },
    });
    await expect(createGpt({ prompt: '' })).rejects.toThrow('requires a non-empty prompt');
    await expect(createGpt({ prompt: 'test', size: '1025x1024' }))
      .rejects.toThrow('divisible by 16');
    await expect(createGpt({ prompt: 'test', size: '4096x1024' }))
      .rejects.toThrow('not exceed 3840x2160');
    await expect(createGpt({ prompt: 'test', n: 11 })).rejects.toThrow('integer between 1 and 10');
    await expect(createGpt({ prompt: 'test', background: 'transparent', outputFormat: 'jpeg' }))
      .rejects.toThrow('requires output_format=png or webp');
    await expect(createGpt({
      prompt: 'test', urls: ['data:image/png;base64,aW1hZ2U='],
      mask: 'data:image/jpeg;base64,bWFzaw==',
    })).rejects.toThrow('mask must be a PNG');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes the three PPIO GPT-5.6 models with both API modes', async () => {
    for (const model of ['pa/gpt-5.6-terra', 'pa/gpt-5.6-luna', 'pa/gpt-5.6-sol']) {
      expect(NOVITA_SUPPORTED_MODELS).toContain(model);
    }
    const result = await novitaProviderDefinition.describeResource({
      locator: 'novita:///pa/gpt-5.6-terra',
    });
    expect(result.metadata).toMatchObject({
      model: 'pa/gpt-5.6-terra',
      apiEndpoint: '/openai/v1/responses',
      alternateApiEndpoint: '/openai/v1/chat/completions',
      supportedApiModes: ['responses', 'chat_completions'],
      defaultApiMode: 'responses',
    });
    expect(result.formSchema.properties.apiMode.enum).toEqual([
      { label: 'Responses API', value: 'responses' },
      { label: 'Chat Completions API', value: 'chat_completions' },
    ]);
  });

  it('uses Responses API by default for GPT-5.6 and normalizes text output', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      id: 'resp-novita-1',
      object: 'response',
      status: 'completed',
      output: [{
        type: 'message', role: 'assistant', status: 'completed',
        content: [{ type: 'output_text', text: 'The sky appears blue due to scattering.' }],
      }],
      usage: { input_tokens: 12, output_tokens: 44, total_tokens: 56 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///pa/gpt-5.6-sol',
      payload: {
        prompt: 'Why is the sky blue?',
        systemPrompt: 'Answer clearly.',
        urls: ['https://example.com/sky.png'],
        reasoningEffort: 'high',
        reasoningSummary: 'auto',
        maxOutputTokens: 500,
        verbosity: 'high',
        responseFormat: 'text',
        stream: false,
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.novita.ai/openai/v1/responses');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'pa/gpt-5.6-sol',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Why is the sky blue?' },
        { type: 'input_image', image_url: 'https://example.com/sky.png' },
      ] }],
      instructions: 'Answer clearly.',
      max_output_tokens: 500,
      reasoning: { effort: 'high', summary: 'auto' },
      text: { format: { type: 'text' }, verbosity: 'high' },
      stream: false,
    });
    expect(result.taskId).toBe('resp-novita-1');
    expect(result.costCoins).toBe(56);
    expect(result.outputs[0]).toMatchObject({
      text: 'The sky appears blue due to scattering.', mimeType: 'text/plain',
    });
  });

  it('uses Chat Completions mode with multimodal messages and token usage', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      id: 'chatcmpl-novita-1', object: 'chat.completion', model: 'pa/gpt-5.6-luna',
      choices: [{
        index: 0, finish_reason: 'stop',
        message: { role: 'assistant', content: 'The image shows a green landscape.' },
      }],
      usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
    }));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///pa/gpt-5.6-luna',
      payload: {
        apiMode: 'chat_completions',
        prompt: 'What is in this image?',
        instructions: 'Be concise.',
        urls: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }],
        maxOutputTokens: 250,
        reasoningEffort: 'medium',
        responseFormat: 'json_object',
        temperature: 0.4,
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.novita.ai/openai/v1/chat/completions');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'pa/gpt-5.6-luna',
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: [
          { type: 'text', text: 'What is in this image?' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,aW1hZ2U=' } },
        ] },
      ],
      stream: false,
      max_completion_tokens: 250,
      temperature: 0.4,
      reasoning_effort: 'medium',
      response_format: { type: 'json_object' },
    });
    expect(result.costCoins).toBe(50);
    expect(result.outputs[0].text).toBe('The image shows a green landscape.');
  });

  it('accepts wireApi configuration and parses a Responses SSE stream', async () => {
    fetchMock.mockResolvedValue(mockTextResponse([
      'data: {"type":"response.output_text.delta","delta":"Hello "}',
      'data: {"type":"response.output_text.delta","delta":"world"}',
      'data: [DONE]',
      '',
    ].join('\n'), 'text/event-stream'));

    const result = await novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///pa/gpt-5.6-terra',
      payload: { prompt: 'hello', stream: true },
      platformConfig: { apiKey: 'novita-test-key', wire_api: 'responses' },
    });

    expect(result.outputs[0].text).toBe('Hello world');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).stream).toBe(true);
  });

  it('rejects unsupported GPT-5.6 modes and top_p in both protocols', async () => {
    const createGpt56 = (payload: Record<string, any>) => novitaProviderDefinition.createTaskSync!({
      locator: 'novita:///pa/gpt-5.6-terra', payload,
      platformConfig: { apiKey: 'novita-test-key' },
    });
    await expect(createGpt56({ apiMode: 'assistants', prompt: 'test' }))
      .rejects.toThrow('apiMode must be responses or chat_completions');
    await expect(createGpt56({ apiMode: 'responses', prompt: 'test', top_p: 0.8 }))
      .rejects.toThrow('do not support top_p');
    await expect(createGpt56({ apiMode: 'chat_completions', prompt: 'test', topP: 0.8 }))
      .rejects.toThrow('do not support top_p');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes Seedance oversea as an independent async token-billed model', async () => {
    const models = [
      'doubao-seedance-2-0-260128',
      'doubao-seedance-2-0-fast-260128',
      'doubao-seedance-2-0-mini-260615',
      'doubao-seedance-2-5-260628',
      'dreamina-seedance-2-0-260128',
      'dreamina-seedance-2-0-fast-260128',
      'dreamina-seedance-2-0-mini-260615',
      'dreamina-seedance-2-5-260628',
    ];
    models.forEach(model => expect(NOVITA_SUPPORTED_MODELS).toContain(model));
    const locator = 'novita:///doubao-seedance-2-5-260628';
    const result = await novitaProviderDefinition.describeResource({ locator });
    expect(result.metadata).toMatchObject({
      model: 'doubao-seedance-2-5-260628',
      apiEndpoint: '/v3/bytedance/metered/contents/generations/tasks',
      resultApiEndpoint: '/v3/bytedance/metered/contents/generations/tasks/{id}',
      protocol: 'bytedance-oversea-content-generation-metered',
      billing: 'tokens',
    });
    expect(result.cancelable).toBe(true);
    expect(result.formSchema.properties).toHaveProperty('referenceAudios');
    expect(result.formSchema.properties.duration).toMatchObject({
      'x-component': 'Slider',
      'x-component-props': { min: 4, max: 15, step: 1, unit: 's' },
    });
    expect(result.formSchema.properties.firstFrameFile['x-component']).toBe('Upload');
    expect(result.formSchema.properties.lastFrameFile['x-component-props'].maxCount).toBe(1);
    expect(result.formSchema.properties.referenceImageFiles['x-component-props'].maxCount).toBe(9);
    expect(novitaProviderDefinition.getExecutionMode?.({ locator })).toBe('async');
    expect(novitaProviderDefinition.getExecutionMode?.({ locator: LOCATOR })).toBe('sync');
  });

  it('creates a Seedance oversea task using official content fields', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'cgt-novita-seedance-1' }));
    const result = await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///dreamina-seedance-2-0-fast-260128',
      payload: {
        prompt: 'A product video in a bright studio',
        firstFrame: 'https://cdn.example.com/first.png',
        resolution: '720p', duration: 8, ratio: '16:9', generateAudio: true,
        returnLastFrame: true, watermark: false, seed: 42,
      },
      platformConfig: {
        apiKey: 'novita-test-key',
        seedanceOverseaMeteredBaseUrl: 'https://proxy.example/v3/bytedance/metered/',
      },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      'https://proxy.example/v3/bytedance/metered/contents/generations/tasks'
    );
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer novita-test-key', 'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'dreamina-seedance-2-0-fast-260128',
      content: [
        { type: 'text', text: 'A product video in a bright studio' },
        {
          type: 'image_url', image_url: { url: 'https://cdn.example.com/first.png' },
          role: 'first_frame',
        },
      ],
      resolution: '720p', ratio: '16:9', duration: 8, generate_audio: true,
      return_last_frame: true, watermark: false, seed: 42,
    });
    expect(result).toMatchObject({
      provider: 'novita', taskId: 'cgt-novita-seedance-1', status: 'pending',
      metadata: { model: 'dreamina-seedance-2-0-fast-260128' },
    });
  });

  it('polls Seedance oversea status and returns video with token usage', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ id: 'cgt-result', status: 'running' }))
      .mockResolvedValueOnce(mockResponse({
        id: 'cgt-result', status: 'succeeded',
        content: { video_url: 'https://cdn.example.com/seedance.mp4' },
        usage: { completion_tokens: 108900, total_tokens: 108900 },
      }));
    const params = {
      locator: 'novita:///doubao-seedance-2-5-260628',
      taskId: 'cgt-result', platformConfig: { apiKey: 'novita-test-key' },
    };
    const status = await novitaProviderDefinition.checkStatus!(params);
    expect(status.status).toBe('running');
    const result = await novitaProviderDefinition.getResult!(params);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.novita.ai/v3/bytedance/metered/contents/generations/tasks/cgt-result'
    );
    expect(result.costCoins).toBe(108900);
    expect(result.outputs[0]).toMatchObject({
      type: 'video', mimeType: 'video/mp4', url: 'https://cdn.example.com/seedance.mp4',
    });
  });

  it('accepts local Seedance frame uploads as base64 data URLs', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'cgt-local-frames' }));
    await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///doubao-seedance-2-5-260628',
      payload: {
        prompt: 'Animate the uploaded frames',
        firstFrameFile: [{ inlineData: { mimeType: 'image/png', data: 'Zmlyc3Q=' } }],
        lastFrameFile: ['data:image/jpeg;base64,bGFzdA=='],
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).content).toEqual([
      { type: 'text', text: 'Animate the uploaded frames' },
      {
        type: 'image_url', image_url: { url: 'data:image/png;base64,Zmlyc3Q=' },
        role: 'first_frame',
      },
      {
        type: 'image_url', image_url: { url: 'data:image/jpeg;base64,bGFzdA==' },
        role: 'last_frame',
      },
    ]);
  });

  it('combines local and URL Seedance reference images', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'cgt-local-references' }));
    await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///dreamina-seedance-2-0-260128',
      payload: {
        prompt: 'Keep the reference character consistent',
        referenceImages: ['https://cdn.example.com/character.png'],
        referenceImageFiles: [{ data: 'bG9jYWw=', mimeType: 'image/webp' }],
        ratio: 'adaptive',
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });
    const content = JSON.parse(fetchMock.mock.calls[0][1].body as string).content;
    expect(content.slice(1)).toEqual([
      {
        type: 'image_url', image_url: { url: 'https://cdn.example.com/character.png' },
        role: 'reference_image',
      },
      {
        type: 'image_url', image_url: { url: 'data:image/webp;base64,bG9jYWw=' },
        role: 'reference_image',
      },
    ]);
  });

  it('cancels or deletes a Seedance oversea task with DELETE and no body', async () => {
    fetchMock.mockResolvedValue(mockResponse({}));
    await novitaProviderDefinition.cancelTask!({
      locator: 'novita:///doubao-seedance-2-0-260128',
      taskId: 'cgt-delete', platformConfig: { apiKey: 'novita-test-key' },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      'https://api.novita.ai/v3/bytedance/metered/contents/generations/tasks/cgt-delete'
    );
    expect(requestInit.method).toBe('DELETE');
    expect(requestInit.body).toBeUndefined();
  });

  it('validates Seedance oversea input modes before sending requests', async () => {
    const createSeedance = (payload: Record<string, any>) =>
      novitaProviderDefinition.createTaskAsync!({
        locator: 'novita:///doubao-seedance-2-0-fast-260128', payload,
        platformConfig: { apiKey: 'novita-test-key' },
      });
    await expect(createSeedance({ prompt: '' })).rejects.toThrow('requires a prompt or input material');
    await expect(createSeedance({ prompt: 'test', resolution: '1080p' }))
      .rejects.toThrow('does not support 1080p');
    await expect(createSeedance({ prompt: 'test', duration: 16 }))
      .rejects.toThrow('duration must be an integer between 4 and 15');
    await expect(createSeedance({ prompt: 'test', ratio: 'adaptive' }))
      .rejects.toThrow('text-to-video does not support adaptive ratio');
    await expect(createSeedance({
      prompt: 'test', lastFrame: 'https://cdn.example.com/last.png',
    })).rejects.toThrow('last_frame requires first_frame');
    await expect(createSeedance({
      prompt: 'test', firstFrame: 'https://cdn.example.com/first.png',
      referenceImages: ['asset://asset-1'],
    })).rejects.toThrow('frame inputs cannot be mixed with reference materials');
    await expect(createSeedance({
      prompt: 'test', firstFrame: 'https://cdn.example.com/first.png',
      firstFrameFile: ['data:image/png;base64,eA=='],
    })).rejects.toThrow('either firstFrame or firstFrameFile');
    await expect(createSeedance({
      prompt: 'test', firstFrameFile: ['data:text/plain;base64,eA=='],
    })).rejects.toThrow('supported base64 image data URL');
    await expect(createSeedance({
      prompt: 'test', referenceImageFiles: Array(10).fill('data:image/png;base64,eA=='),
    })).rejects.toThrow('at most 9 reference images');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes all seven Kling v3 models as independent Novita async resources', async () => {
    expect(NOVITA_KLING_V3_MODELS).toEqual([
      'kling-v3.0-std-t2v',
      'kling-v3.0-std-i2v',
      'kling-v3.0-pro-t2v',
      'kling-v3.0-pro-i2v',
      'kling-v3.0-4k-t2v',
      'kling-v3.0-4k-i2v',
      'kling-v3.0-motion-control',
    ]);
    for (const model of NOVITA_KLING_V3_MODELS) {
      const locator = `novita:///${model}`;
      const result = await novitaProviderDefinition.describeResource({ locator });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result?task_id={taskId}',
        protocol: 'novita-v3-async-kling-v3',
      });
      expect(result.cancelable).toBe(false);
      expect(novitaProviderDefinition.getExecutionMode?.({ locator })).toBe('async');
    }
  });

  it('creates a Kling v3 Standard text-to-video task', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'kling-std-t2v' }));
    const result = await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///kling-v3.0-std-t2v',
      payload: {
        prompt: 'A cinematic product reveal', negativePrompt: 'blur',
        duration: 8, cfgScale: 0.6, aspectRatio: '9:16', sound: true,
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.novita.ai/v3/async/kling-v3.0-std-t2v'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      sound: true,
      duration: 8,
      cfg_scale: 0.6,
      prompt: 'A cinematic product reveal',
      negative_prompt: 'blur',
      aspect_ratio: '9:16',
    });
    expect(result).toMatchObject({ taskId: 'kling-std-t2v', status: 'pending' });
  });

  it('creates a Kling v3 Pro image-to-video task with local frames and multi-shot prompts', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'kling-pro-i2v' }));
    await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///kling-v3.0-pro-i2v',
      payload: {
        image: [{ inlineData: { mimeType: 'image/png', data: 'Zmlyc3Q=' } }],
        multiPrompt: ['Camera pushes in', 'The subject turns toward the light'],
        duration: 10,
      },
      platformConfig: { apiKey: 'novita-test-key', asyncBaseUrl: 'https://proxy.example/v3/async/' },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://proxy.example/v3/async/kling-v3.0-pro-i2v'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      sound: false,
      duration: 10,
      cfg_scale: 0.5,
      multi_prompt: ['Camera pushes in', 'The subject turns toward the light'],
      image: 'data:image/png;base64,Zmlyc3Q=',
    });
  });

  it('creates Kling v3 Motion Control with image upload and video URL', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'kling-motion' }));
    await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///kling-v3.0-motion-control',
      payload: {
        image: 'data:image/jpeg;base64,aW1hZ2U=',
        video: 'https://cdn.example.com/motion.mp4',
        prompt: 'Preserve the character outfit',
        modelName: 'kling-v3-0-pro',
        characterOrientation: 'video',
        keepOriginalSound: false,
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      image: 'data:image/jpeg;base64,aW1hZ2U=',
      video: 'https://cdn.example.com/motion.mp4',
      model_name: 'kling-v3-0-pro',
      keep_original_sound: false,
      character_orientation: 'video',
      prompt: 'Preserve the character outfit',
    });
  });

  it('polls and returns Kling v3 videos from the shared async task endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({
        task: { task_id: 'kling-result', status: 'TASK_STATUS_PROCESSING', progress_percent: 42 },
        videos: [],
      }))
      .mockResolvedValueOnce(mockResponse({
        task: { task_id: 'kling-result', status: 'TASK_STATUS_SUCCEED', progress_percent: 100 },
        videos: [{ video_url: 'https://cdn.example.com/kling.mp4', video_type: 'mp4' }],
      }));
    const params = {
      locator: 'novita:///kling-v3.0-4k-t2v',
      taskId: 'kling-result',
      platformConfig: { apiKey: 'novita-test-key' },
    };
    const status = await novitaProviderDefinition.checkStatus!(params);
    expect(status).toMatchObject({ status: 'running', progress: 42 });
    const result = await novitaProviderDefinition.getResult!(params);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.novita.ai/v3/async/task-result?task_id=kling-result'
    );
    expect(result.outputs[0]).toMatchObject({
      url: 'https://cdn.example.com/kling.mp4', type: 'video', mimeType: 'video/mp4',
    });
  });

  it('validates Kling v3 model-specific constraints before requesting', async () => {
    const make = (model: string, payload: Record<string, any>) =>
      novitaProviderDefinition.createTaskAsync!({
        locator: `novita:///${model}`, payload,
        platformConfig: { apiKey: 'novita-test-key' },
      });
    await expect(make('kling-v3.0-std-t2v', { prompt: '', duration: 5 }))
      .rejects.toThrow('requires a non-empty prompt');
    await expect(make('kling-v3.0-std-t2v', { prompt: 'test', duration: 16 }))
      .rejects.toThrow('integer between 3 and 15');
    await expect(make('kling-v3.0-pro-t2v', {
      prompt: 'test', multiPrompt: ['shot 1'],
    })).rejects.toThrow('mutually exclusive');
    await expect(make('kling-v3.0-4k-i2v', {
      prompt: 'test', image: 'data:image/webp;base64,eA==',
    })).rejects.toThrow('JPG/PNG URL or base64');
    await expect(make('kling-v3.0-std-i2v', {
      prompt: 'test', image: 'data:image/png;base64,eA==',
      endImage: 'data:image/png;base64,eQ==',
      multiPrompt: [{ prompt: 'shot', duration: 5 }],
    })).rejects.toThrow('end_image and multi_prompt');
    await expect(make('kling-v3.0-motion-control', {
      image: 'data:image/png;base64,eA==', video: 'file:///motion.mp4',
      characterOrientation: 'image',
    })).rejects.toThrow('public HTTP(S) URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes all three Veo 3.1 models as Novita native async resources', async () => {
    expect(NOVITA_VEO31_MODELS).toEqual([
      'veo-3.1-generate-001',
      'veo-3.1-fast-generate-001',
      'veo-3.1-lite-generate-001',
    ]);
    for (const model of NOVITA_VEO31_MODELS) {
      const locator = `novita:///${model}`;
      const result = await novitaProviderDefinition.describeResource({ locator });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: `/v3/veo-3.1/v1/models/${model}:predictLongRunning`,
        alternateApiEndpoint: `/v3/veo-3.1/v1beta1/models/${model}:predictLongRunning`,
        resultApiEndpoint: '/v3/async/task-result?task_id={taskId}',
        protocol: 'google-veo-3.1-native-long-running',
      });
      expect(result.formSchema.properties.image['x-component']).toBe('Upload');
      expect(result.formSchema.properties.lastFrame['x-component-props'].maxCount).toBe(1);
      expect(result.cancelable).toBe(false);
      expect(novitaProviderDefinition.getExecutionMode?.({ locator })).toBe('async');
    }
  });

  it('creates a Veo 3.1 text-to-video task with the Google native request shape', async () => {
    fetchMock.mockResolvedValue(mockResponse({ name: 'veo-task-text', done: false }));
    const result = await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///veo-3.1-fast-generate-001',
      payload: {
        prompt: 'A cinematic drone shot above a coastal road',
        aspectRatio: '9:16', resolution: '1080p', durationSeconds: 6,
        sampleCount: 2, generateAudio: true, negativePrompt: 'blur',
        personGeneration: 'disallow', enhancePrompt: false, seed: 42,
      },
      platformConfig: { apiKey: 'novita-test-key' },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      'https://api.novita.ai/v3/veo-3.1/v1/models/' +
      'veo-3.1-fast-generate-001:predictLongRunning'
    );
    expect(JSON.parse(requestInit.body as string)).toEqual({
      instances: [{ prompt: 'A cinematic drone shot above a coastal road' }],
      parameters: {
        aspectRatio: '9:16', resolution: '1080p', durationSeconds: 6,
        sampleCount: 2, generateAudio: true, negativePrompt: 'blur',
        personGeneration: 'disallow', enhancePrompt: false, seed: 42,
      },
    });
    expect(result).toMatchObject({
      taskId: 'veo-task-text', status: 'pending',
      metadata: { model: 'veo-3.1-fast-generate-001', apiVersion: 'v1' },
    });
  });

  it('creates Veo 3.1 first-and-last-frame video using local base64 uploads', async () => {
    fetchMock.mockResolvedValue(mockResponse({ name: 'veo-task-frames', done: false }));
    await novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///veo-3.1-generate-001',
      payload: {
        prompt: 'Create a smooth transition between the two frames',
        image: [{ inlineData: { mimeType: 'image/png', data: 'Zmlyc3Q=' } }],
        lastFrame: ['data:image/jpeg;base64,bGFzdA=='],
        durationSeconds: 8,
        veo31ApiVersion: 'v1beta1',
      },
      platformConfig: {
        apiKey: 'novita-test-key',
        veo31BaseUrl: 'https://proxy.example/v3/veo-3.1/',
      },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://proxy.example/v3/veo-3.1/v1beta1/models/' +
      'veo-3.1-generate-001:predictLongRunning'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      instances: [{
        prompt: 'Create a smooth transition between the two frames',
        image: { mimeType: 'image/png', bytesBase64Encoded: 'Zmlyc3Q=' },
        lastFrame: { mimeType: 'image/jpeg', bytesBase64Encoded: 'bGFzdA==' },
      }],
      parameters: {
        aspectRatio: '16:9', resolution: '720p', durationSeconds: 8,
        sampleCount: 1, generateAudio: true,
      },
    });
  });

  it('polls and returns Veo 3.1 videos through the Novita async result endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({
        task: { id: 'veo-result', status: 'TASK_STATUS_PROCESSING', progress_percent: 30 },
      }))
      .mockResolvedValueOnce(mockResponse({
        task: { id: 'veo-result', status: 'TASK_STATUS_SUCCEED', progress_percent: 100 },
        videos: [{ video_url: 'https://cdn.example.com/veo.mp4', video_type: 'mp4' }],
      }));
    const params = {
      locator: 'novita:///veo-3.1-lite-generate-001', taskId: 'veo-result',
      platformConfig: { apiKey: 'novita-test-key' },
    };
    expect(await novitaProviderDefinition.checkStatus!(params)).toMatchObject({
      status: 'running', progress: 30,
    });
    const result = await novitaProviderDefinition.getResult!(params);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.novita.ai/v3/async/task-result?task_id=veo-result'
    );
    expect(result.outputs[0]).toMatchObject({
      url: 'https://cdn.example.com/veo.mp4', type: 'video', mimeType: 'video/mp4',
    });
  });

  it('validates Veo 3.1 request constraints before sending', async () => {
    const make = (payload: Record<string, any>) => novitaProviderDefinition.createTaskAsync!({
      locator: 'novita:///veo-3.1-generate-001', payload,
      platformConfig: { apiKey: 'novita-test-key' },
    });
    await expect(make({ prompt: '' })).rejects.toThrow('requires a non-empty prompt');
    await expect(make({ prompt: 'test', durationSeconds: 5 }))
      .rejects.toThrow('must be one of: 4, 6, 8');
    await expect(make({ prompt: 'test', resolution: '4k' }))
      .rejects.toThrow('resolution must be one of: 720p, 1080p');
    await expect(make({ prompt: 'test', sampleCount: 5 }))
      .rejects.toThrow('sampleCount must be an integer between 1 and 4');
    await expect(make({
      prompt: 'test', lastFrame: 'data:image/png;base64,eA==',
    })).rejects.toThrow('lastFrame requires image');
    await expect(make({
      prompt: 'test', image: 'data:image/webp;base64,eA==',
    })).rejects.toThrow('JPEG/PNG');
    await expect(make({ prompt: 'test', veo31ApiVersion: 'v2' }))
      .rejects.toThrow('API version must be v1 or v1beta1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  function create(payload: Record<string, any>, config: Record<string, any> = {}) {
    return novitaProviderDefinition.createTaskSync!({
      locator: LOCATOR,
      payload,
      platformConfig: { apiKey: 'novita-test-key', ...config },
    });
  }
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

function mockTextResponse(body: string, contentType: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': contentType }),
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(body),
  } as Response;
}
