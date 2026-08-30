import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listProviders } from '../src/index.ts';
import { ppioProviderDefinition } from '../src/providers/ppio/index.ts';
import type { DescribeParams, TaskCreateParams } from '../src/types.ts';

describe('ppio provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is registered as a default provider', () => {
    expect(listProviders()).toContain('ppio');
  });

  it('describes a supported PPIO model', async () => {
    const params: DescribeParams = {
      locator: 'ppio:///gemini-3.1-flash-image',
    };

    const result = await ppioProviderDefinition.describeResource(params);

    expect(result.provider).toBe('ppio');
    expect(result.metadata).toMatchObject({
      scheme: 'ppio',
      model: 'gemini-3.1-flash-image',
      apiEndpoint: '/v1beta1/models/gemini-3.1-flash-image:generateContent',
    });
    expect(result.formSchema.properties).toHaveProperty('prompt');
    expect(result.formSchema.properties).toHaveProperty('urls');
    expect(result.formSchema.properties).toHaveProperty('aspectRatio');
    expect(result.formSchema.properties).toHaveProperty('imageSize');
    expect(result.formValues).toEqual({
      prompt: '',
      urls: [],
      aspectRatio: '16:9',
      imageSize: '2K',
    });
    expect(result.cancelable).toBe(false);
  });

  it('describes GPT Image 2 with generation and edit settings', async () => {
    const result = await ppioProviderDefinition.describeResource({
      locator: 'ppio:///gpt-image-2',
    });

    expect(result.metadata).toMatchObject({
      scheme: 'ppio',
      model: 'gpt-image-2',
      apiEndpoint: '/gpt-image-2-text-to-image',
      editApiEndpoint: '/gpt-image-2-edit',
    });
    expect(result.formSchema.properties).toHaveProperty('n');
    expect(result.formSchema.properties).toHaveProperty('size');
    expect(result.formSchema.properties).toHaveProperty('quality');
    expect(result.formSchema.properties).toHaveProperty('mask');
    expect(result.formValues).toMatchObject({
      prompt: '',
      urls: [],
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      outputFormat: 'png',
    });
  });

  it('describes the PPIO GPT-5.6 Response API models', async () => {
    for (const model of ['pa/gpt-5.6-terra', 'pa/gpt-5.6-luna', 'pa/gpt-5.6-sol']) {
      const result = await ppioProviderDefinition.describeResource({
        locator: `ppio:///${model}`,
      });

      expect(result.metadata).toMatchObject({
        scheme: 'ppio',
        model,
        apiEndpoint: '/responses',
        protocol: 'openai-responses',
      });
      expect(result.formSchema.properties).toHaveProperty('instructions');
      expect(result.formSchema.properties).toHaveProperty('reasoningEffort');
      expect(result.formSchema.properties).toHaveProperty('stream');
      expect(result.formValues).toMatchObject({
        prompt: '',
        reasoningEffort: 'medium',
        verbosity: 'medium',
      });
    }
  });

  it('describes Fusion as an OpenAI Chat Completions model', async () => {
    const result = await ppioProviderDefinition.describeResource({
      locator: 'ppio:///pprouter/fusion',
    });

    expect(result.metadata).toMatchObject({
      scheme: 'ppio',
      model: 'pprouter/fusion',
      apiEndpoint: '/chat/completions',
      protocol: 'openai-chat-completions',
    });
    expect(result.formSchema.properties).toHaveProperty('systemPrompt');
    expect(result.formSchema.properties).toHaveProperty('maxTokens');
    expect(result.formValues).toEqual({
      systemPrompt: '',
      prompt: '',
      responseFormat: 'text',
      stream: true,
    });
    expect(ppioProviderDefinition.getExecutionMode?.({ locator: 'ppio:///pprouter/fusion' })).toBe('sync');
  });

  it('rejects non-PPIO locators and unsupported models', async () => {
    await expect(
      ppioProviderDefinition.describeResource({ locator: 'gemini:///gemini-3-pro-image' })
    ).rejects.toThrow('ppio provider received unsupported locator');

    await expect(
      ppioProviderDefinition.describeResource({ locator: 'ppio:///unknown-image-model' })
    ).rejects.toThrow('Unsupported PPIO model');
  });

  it('requires an API key', async () => {
    const params: TaskCreateParams = {
      locator: 'ppio:///gemini-2.5-flash-image',
      payload: { prompt: 'a cat' },
      platformConfig: {},
    };

    await expect(ppioProviderDefinition.createTaskSync!(params)).rejects.toThrow(
      'ppio provider requires apiKey'
    );
  });

  it('calls the PPIO REST API and normalizes image and text outputs', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        candidates: [{
          content: {
            parts: [
              { text: 'Generated an image.' },
              { inlineData: { mimeType: 'image/png', data: 'generated-base64' } },
            ],
          },
        }],
        usageMetadata: { totalTokenCount: 42 },
      })
    );

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///gemini-3-pro-image',
      payload: {
        prompt: 'Add a party hat',
        urls: ['data:image/jpeg;base64,reference-base64'],
        aspectRatio: '16:9',
        imageSize: '2K',
        responseModalities: ['TEXT', 'IMAGE'],
      },
      platformConfig: { apiKey: 'test-key' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      'https://api.ppio.com/v3/gemini-image/v1beta1/models/gemini-3-pro-image:generateContent'
    );
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Add a party hat' },
          { inlineData: { mimeType: 'image/jpeg', data: 'reference-base64' } },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
      },
    });

    expect(result.provider).toBe('ppio');
    expect(result.status).toBe('succeeded');
    expect(result.taskId).toMatch(/^ppio-/);
    expect(result.outputs).toEqual([
      {
        rawData: { text: 'Generated an image.' },
        text: 'Generated an image.',
        mimeType: 'text/plain',
      },
      {
        url: 'data:image/png;base64,generated-base64',
        rawData: { inlineData: { mimeType: 'image/png', data: 'generated-base64' } },
        mimeType: 'image/png',
      },
    ]);
    expect(result.costCoins).toBe(42);
  });

  it('calls the GPT Image 2 text-to-image endpoint and normalizes URL outputs', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      images: ['https://cdn.example.com/generated-1.png', 'https://cdn.example.com/generated-2.png'],
    }));

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///gpt-image-2',
      payload: {
        prompt: 'A translucent glass banana on a blue table',
        n: 2,
        size: '3840x2160',
        quality: 'high',
        background: 'opaque',
        moderation: 'low',
        outputFormat: 'jpeg',
        outputCompression: 82,
      },
      platformConfig: { apiKey: 'test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.ppio.com/v3/gpt-image-2-text-to-image');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      prompt: 'A translucent glass banana on a blue table',
      n: 2,
      size: '3840x2160',
      quality: 'high',
      background: 'opaque',
      moderation: 'low',
      output_format: 'jpeg',
      output_compression: 82,
    });
    expect(result.outputs).toEqual([
      { url: 'https://cdn.example.com/generated-1.png', rawData: 'https://cdn.example.com/generated-1.png' },
      { url: 'https://cdn.example.com/generated-2.png', rawData: 'https://cdn.example.com/generated-2.png' },
    ]);
  });

  it('automatically uses the GPT Image 2 edit endpoint for input images and a mask', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      images: [{ url: 'https://cdn.example.com/edited.png' }],
    }));

    await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///gpt-image-2',
      payload: {
        prompt: 'Replace the object inside the mask with a yellow banana',
        urls: [
          'https://cdn.example.com/source.png',
          { inlineData: { mimeType: 'image/webp', data: 'reference-base64' } },
        ],
        mask: ['data:image/png;base64,mask-base64'],
        size: '2048x2048',
        quality: 'medium',
        background: 'auto',
        output_format: 'png',
      },
      platformConfig: { apiKey: 'test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.ppio.com/v3/gpt-image-2-edit');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      prompt: 'Replace the object inside the mask with a yellow banana',
      n: 1,
      size: '2048x2048',
      quality: 'medium',
      background: 'auto',
      output_format: 'png',
      image: [
        'https://cdn.example.com/source.png',
        'data:image/webp;base64,reference-base64',
      ],
      mask: 'data:image/png;base64,mask-base64',
    });
  });

  it('validates GPT Image 2 limits before calling the API', async () => {
    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///gpt-image-2',
        payload: { prompt: 'test', n: 11 },
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('n must be an integer between 1 and 10');

    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///gpt-image-2',
        payload: { prompt: 'test', outputFormat: 'png', outputCompression: 80 },
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('output_compression is only supported for jpeg');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the PPIO Response API and normalizes GPT-5.6 text output', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      id: 'resp-terra-1',
      object: 'response',
      status: 'completed',
      output: [{
        type: 'message',
        role: 'assistant',
        status: 'completed',
        content: [{ type: 'output_text', text: 'Hello from Terra.', annotations: [] }],
      }],
      usage: { input_tokens: 9, output_tokens: 5, total_tokens: 14 },
    }));

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pa/gpt-5.6-terra',
      payload: { prompt: 'Hello', reasoningEffort: 'medium', verbosity: 'medium' },
      platformConfig: { apiKey: 'test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.ppio.com/openai/v1/responses');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'pa/gpt-5.6-terra',
      input: 'Hello',
      reasoning: { effort: 'medium' },
      text: { format: { type: 'text' }, verbosity: 'medium' },
      stream: false,
    });
    expect(result.taskId).toBe('resp-terra-1');
    expect(result.costCoins).toBe(14);
    expect(result.outputs).toEqual([{
      rawData: { type: 'output_text', text: 'Hello from Terra.', annotations: [] },
      text: 'Hello from Terra.',
      mimeType: 'text/plain',
    }]);
  });

  it('supports multimodal input, structured output and tools for GPT-5.6', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      id: 'resp-sol-1',
      output: [{
        type: 'function_call',
        name: 'lookup_weather',
        arguments: '{"city":"Shanghai"}',
        call_id: 'call-1',
      }],
    }));

    const schema = {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary'],
      additionalProperties: false,
    };
    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pa/gpt-5.6-sol',
      payload: {
        prompt: 'Analyze this image',
        urls: ['https://cdn.example.com/input.png'],
        instructions: 'Be precise.',
        reasoningEffort: 'xhigh',
        reasoningSummary: 'detailed',
        maxOutputTokens: 2048,
        temperature: 0.2,
        jsonSchema: schema,
        jsonSchemaName: 'analysis',
        tools: [{ type: 'function', name: 'lookup_weather', parameters: { type: 'object' } }],
        toolChoice: 'auto',
      },
      platformConfig: {
        apiKey: 'test-key',
        responseBaseUrl: 'https://proxy.example.com/openai/v1/',
      },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://proxy.example.com/openai/v1/responses');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'pa/gpt-5.6-sol',
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: 'Analyze this image' },
          { type: 'input_image', image_url: 'https://cdn.example.com/input.png' },
        ],
      }],
      instructions: 'Be precise.',
      max_output_tokens: 2048,
      temperature: 0.2,
      reasoning: { effort: 'xhigh', summary: 'detailed' },
      text: { format: { type: 'json_schema', name: 'analysis', schema } },
      tools: [{ type: 'function', name: 'lookup_weather', parameters: { type: 'object' } }],
      tool_choice: 'auto',
      stream: false,
    });
    expect(result.outputs).toEqual([{
      rawData: {
        type: 'function_call',
        name: 'lookup_weather',
        arguments: '{"city":"Shanghai"}',
        call_id: 'call-1',
      },
      type: 'function_call',
      name: 'lookup_weather',
      arguments: '{"city":"Shanghai"}',
      callId: 'call-1',
      mimeType: 'application/json',
    }]);
  });

  it('consumes GPT-5.6 SSE output into a synchronous task result', async () => {
    const sse = [
      'event: response.output_text.delta',
      'data: {"type":"response.output_text.delta","delta":"Hello "}',
      '',
      'event: response.output_text.delta',
      'data: {"type":"response.output_text.delta","delta":"world"}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      text: () => Promise.resolve(sse),
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pa/gpt-5.6-luna',
      payload: { input: 'Stream this', stream: true },
      platformConfig: { apiKey: 'test-key' },
    });

    expect(result.outputs[0]).toMatchObject({ text: 'Hello world', mimeType: 'text/plain' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      model: 'pa/gpt-5.6-luna',
      stream: true,
    });
  });

  it('validates GPT-5.6 Response API inputs before making a request', async () => {
    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///pa/gpt-5.6-terra',
        payload: { prompt: 'test', temperature: 3 },
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('temperature must be between 0 and 2');

    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///pa/gpt-5.6-terra',
        payload: { prompt: 'test', topP: 1 },
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('do not support top_p');

    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///pa/gpt-5.6-terra',
        payload: { prompt: '', urls: [] },
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('requires a non-empty input or prompt');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls Fusion Chat Completions and normalizes text output', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      id: 'chatcmpl-fusion-1',
      object: 'chat.completion',
      model: 'pprouter/fusion',
      choices: [{
        index: 0,
        finish_reason: 'stop',
        message: { role: 'assistant', content: 'Fusion answer.' },
      }],
      usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
    }));

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pprouter/fusion',
      payload: {
        systemPrompt: 'Answer carefully.',
        prompt: 'Compare three approaches.',
        maxTokens: 2048,
        temperature: 0.3,
        topP: 0.9,
        seed: 42,
        responseFormat: 'text',
        stream: false,
      },
      platformConfig: { apiKey: 'test-key' },
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.ppio.com/openai/v1/chat/completions');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: 'pprouter/fusion',
      messages: [
        { role: 'system', content: 'Answer carefully.' },
        { role: 'user', content: 'Compare three approaches.' },
      ],
      stream: false,
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.9,
      seed: 42,
      response_format: { type: 'text' },
    });
    expect(result.taskId).toBe('chatcmpl-fusion-1');
    expect(result.costCoins).toBe(17);
    expect(result.outputs[0]).toMatchObject({ text: 'Fusion answer.', mimeType: 'text/plain' });
  });

  it('accepts full Fusion messages and chat parameter aliases', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call-1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"id":1}' },
          }],
        },
      }],
    }));

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pprouter/fusion',
      payload: {
        messages: [
          { role: 'user', content: 'Look it up' },
          { role: 'assistant', content: 'Which item?' },
          { role: 'user', content: 'Item 1' },
        ],
        frequencyPenalty: 0.2,
        presence_penalty: -0.1,
        tools: [{ type: 'function', function: { name: 'lookup', parameters: { type: 'object' } } }],
        toolChoice: 'auto',
        chatExtraIgnored: true,
      },
      platformConfig: { apiKey: 'test-key', chatBaseUrl: 'https://proxy.example.com/openai/v1/' },
    });

    expect(fetchMock.mock.calls[0][0]).toBe('https://proxy.example.com/openai/v1/chat/completions');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      model: 'pprouter/fusion',
      frequency_penalty: 0.2,
      presence_penalty: -0.1,
      tool_choice: 'auto',
    });
    expect(result.outputs[0]).toMatchObject({
      type: 'function_call',
      name: 'lookup',
      arguments: '{"id":1}',
      callId: 'call-1',
    });
  });

  it('consumes Fusion Chat Completions SSE output', async () => {
    const sse = [
      'data: {"id":"chatcmpl-stream","created":123,"choices":[{"index":0,"delta":{"role":"assistant","content":"Multi-"},"finish_reason":null}]}',
      '',
      'data: {"id":"chatcmpl-stream","choices":[{"index":0,"delta":{"content":"model answer"},"finish_reason":"stop"}]}',
      '',
      'data: {"id":"chatcmpl-stream","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":4,"total_tokens":14}}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      text: () => Promise.resolve(sse),
      json: () => Promise.reject(new Error('not json')),
    } as Response);

    const result = await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pprouter/fusion',
      payload: { prompt: 'Stream it', stream: true },
      platformConfig: { apiKey: 'test-key' },
    });

    expect(result.taskId).toBe('chatcmpl-stream');
    expect(result.costCoins).toBe(14);
    expect(result.outputs[0]).toMatchObject({ text: 'Multi-model answer' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      model: 'pprouter/fusion',
      stream: true,
      stream_options: { include_usage: true },
    });
  });

  it('validates Fusion requests before making an API call', async () => {
    const make = (payload: Record<string, any>) => ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///pprouter/fusion',
      payload,
      platformConfig: { apiKey: 'test-key' },
    });

    await expect(make({ prompt: '' })).rejects.toThrow('requires a non-empty prompt or messages');
    await expect(make({ messages: [] })).rejects.toThrow('messages must be a non-empty array');
    await expect(make({ messages: [{ role: 'invalid', content: 'x' }] })).rejects.toThrow('invalid role');
    await expect(make({ prompt: 'x', topP: 2 })).rejects.toThrow('top_p must be between 0 and 1');
    await expect(make({ prompt: 'x', responseFormat: 'xml' })).rejects.toThrow('response_format must be');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports baseURL/baseUrl and API version overrides', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        candidates: [{ content: { parts: [{ inlineData: { data: 'x' } }] } }],
      })
    );

    await ppioProviderDefinition.createTaskSync!({
      locator: 'ppio:///gemini-2.5-flash-image',
      payload: { prompt: 'test' },
      platformConfig: {
        apiKey: 'test-key',
        baseUrl: 'https://proxy.example.com/gemini-image/',
        apiVersion: '/v1beta/',
      },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://proxy.example.com/gemini-image/v1beta/models/gemini-2.5-flash-image:generateContent'
    );
  });

  it('reports HTTP error details', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'invalid key' }, 401));

    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///gemini-2.5-flash-image',
        payload: { prompt: 'test' },
        platformConfig: { apiKey: 'bad-key' },
      })
    ).rejects.toThrow('PPIO API error: 401');
  });

  it('rejects an empty request and an already aborted request', async () => {
    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///gemini-2.5-flash-image',
        payload: {},
        platformConfig: { apiKey: 'test-key' },
      })
    ).rejects.toThrow('requires at least a prompt or reference image');

    const controller = new AbortController();
    controller.abort();
    await expect(
      ppioProviderDefinition.createTaskSync!({
        locator: 'ppio:///gemini-2.5-flash-image',
        payload: { prompt: 'test' },
        platformConfig: { apiKey: 'test-key' },
        options: { signal: controller.signal },
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes Seedance 2.0 as an async video model', async () => {
    const result = await ppioProviderDefinition.describeResource({
      locator: 'ppio:///seedance-2.0',
    });

    expect(result.metadata).toMatchObject({
      model: 'seedance-2.0',
      apiEndpoint: '/seedance-2.0',
      resultApiEndpoint: '/task-result',
      protocol: 'ppio-async',
    });
    expect(result.formSchema.properties).toHaveProperty('referenceVideos');
    expect(result.formSchema.properties).toHaveProperty('generateAudio');
    expect(result.formSchema.properties.duration).toMatchObject({
      'x-component': 'Slider',
      'x-component-props': { min: 4, max: 15, step: 1, unit: 's' },
    });
    expect(result.formValues).toMatchObject({ fast: false, resolution: '720p', duration: 5 });
    expect(ppioProviderDefinition.getExecutionMode?.({ locator: 'ppio:///seedance-2.0' })).toBe('async');
    expect(ppioProviderDefinition.getExecutionMode?.({ locator: 'ppio:///gpt-image-2' })).toBe('sync');
  });

  it('creates a Seedance task with normalized media and snake_case fields', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'seedance-task-1' }));

    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///seedance-2.0',
      payload: {
        prompt: 'A cinematic product reveal',
        image: [{ data: 'first-frame', mimeType: 'image/png' }],
        lastImage: ['https://cdn.example.com/last.png'],
        referenceImages: ['https://cdn.example.com/ref.png'],
        referenceVideos: ['https://cdn.example.com/ref.mp4'],
        referenceAudios: [{ data: 'audio-data', mimeType: 'audio/mpeg' }],
        fast: false,
        resolution: '1080p',
        ratio: '16:9',
        duration: 8,
        seed: 7,
        webSearch: true,
        generateAudio: true,
        returnLastFrame: true,
      },
      platformConfig: { apiKey: 'test-key' },
    });

    expect(result).toMatchObject({ taskId: 'seedance-task-1', status: 'pending' });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.ppio.com/v3/async/seedance-2.0');
    expect(requestInit.method).toBe('POST');
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      prompt: 'A cinematic product reveal',
      image: 'data:image/png;base64,first-frame',
      last_image: 'https://cdn.example.com/last.png',
      reference_images: ['https://cdn.example.com/ref.png'],
      reference_videos: ['https://cdn.example.com/ref.mp4'],
      reference_audios: ['data:audio/mpeg;base64,audio-data'],
      resolution: '1080p',
      duration: 8,
      web_search: true,
      generate_audio: true,
      return_last_frame: true,
    });
  });

  it('checks Seedance status and normalizes all returned media', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({
        task: { status: 'TASK_STATUS_PROCESSING', progress_percent: 62 },
      }))
      .mockResolvedValueOnce(mockResponse({
        task: { status: 'TASK_STATUS_SUCCEED', progress_percent: 100 },
        videos: [{ video_url: 'https://cdn.example.com/output.mp4' }],
        images: [{ image_url: 'https://cdn.example.com/last.png' }],
        audios: [{ audio_url: 'https://cdn.example.com/audio.mp3' }],
      }));

    const status = await ppioProviderDefinition.checkStatus!({
      locator: 'ppio:///seedance-2.0',
      taskId: 'task with spaces',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(status).toMatchObject({ status: 'running', progress: 62 });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.ppio.com/v3/async/task-result?task_id=task%20with%20spaces'
    );

    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///seedance-2.0',
      taskId: 'task with spaces',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/output.mp4', type: 'video' }),
      expect.objectContaining({ url: 'https://cdn.example.com/last.png', type: 'image' }),
      expect.objectContaining({ url: 'https://cdn.example.com/audio.mp3', type: 'audio' }),
    ]);
  });

  it('validates Seedance constraints before requesting the API', async () => {
    const make = (payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///seedance-2.0',
      payload,
      platformConfig: { apiKey: 'test-key' },
    });

    await expect(make({ prompt: 'test', fast: true, resolution: '1080p' })).rejects.toThrow(
      'fast mode does not support 1080p'
    );
    await expect(make({ prompt: 'test', lastImage: ['https://cdn.example.com/last.png'] })).rejects.toThrow(
      'last_image requires image'
    );
    await expect(make({ referenceAudios: ['data:audio/mpeg;base64,x'] })).rejects.toThrow(
      'reference_audios require a reference image or video'
    );
    await expect(make({ prompt: 'test', duration: 16 })).rejects.toThrow(
      'duration must be an integer between 4 and 15'
    );
    await expect(make({ prompt: 'test', referenceVideos: ['data:video/mp4;base64,x'] })).rejects.toThrow(
      'only supports HTTP(S) URLs'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes all Veo 3.1 variants as async Google video models', async () => {
    for (const model of [
      'veo-3.1-generate-001',
      'veo-3.1-fast-generate-001',
      'veo-3.1-lite-generate-001',
    ]) {
      const result = await ppioProviderDefinition.describeResource({ locator: `ppio:///${model}` });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: `/v1/models/${model}:predictLongRunning`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'google-veo-predict-long-running',
      });
      expect(result.formSchema.properties).toHaveProperty('lastFrame');
      expect(result.formSchema.properties).toHaveProperty('generateAudio');
      expect(result.formValues).toMatchObject({
        aspectRatio: '16:9',
        resolution: '720p',
        durationSeconds: 8,
        sampleCount: 1,
        generateAudio: true,
      });
      expect(ppioProviderDefinition.getExecutionMode?.({ locator: `ppio:///${model}` })).toBe('async');
    }
  });

  it('creates a Veo 3.1 text-to-video task with Google native request fields', async () => {
    fetchMock.mockResolvedValue(mockResponse({ name: 'veo-task-1', done: false }));

    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///veo-3.1-generate-001',
      payload: {
        prompt: 'A paper boat sailing through a neon city at night',
        aspectRatio: '9:16',
        resolution: '1080p',
        durationSeconds: 6,
        sampleCount: 2,
        generateAudio: true,
        negativePrompt: 'text, watermark',
        seed: 42,
        enhancePrompt: false,
        personGeneration: 'dont_allow',
        resizeMode: 'crop',
        compressionQuality: 'lossless',
        storageUri: 'gs://example/videos/',
      },
      platformConfig: { apiKey: 'test-key' },
    });

    expect(result).toMatchObject({ taskId: 'veo-task-1', status: 'pending', metadata: { model: 'veo-3.1-generate-001' } });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      'https://api.ppio.com/v3/veo-3.1/v1/models/veo-3.1-generate-001:predictLongRunning'
    );
    expect(JSON.parse(requestInit.body as string)).toEqual({
      instances: [{ prompt: 'A paper boat sailing through a neon city at night' }],
      parameters: {
        aspectRatio: '9:16',
        resolution: '1080p',
        durationSeconds: 6,
        sampleCount: 2,
        generateAudio: true,
        enhancePrompt: false,
        personGeneration: 'dont_allow',
        resizeMode: 'crop',
        compressionQuality: 'lossless',
        negativePrompt: 'text, watermark',
        seed: 42,
        storageUri: 'gs://example/videos/',
      },
    });
  });

  it('normalizes Veo 3.1 first and last frame inputs and polls the shared result API', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ name: 'veo-frames-task', done: false }))
      .mockResolvedValueOnce(mockResponse({
        status: 'TASK_STATUS_SUCCEED',
        videos: [{ video_url: 'https://cdn.example.com/veo.mp4' }],
      }));

    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///veo-3.1-fast-generate-001',
      payload: {
        prompt: 'Smoothly transition from dawn to night',
        image: ['data:image/jpeg;base64,first-frame'],
        lastFrame: [{ inlineData: { mimeType: 'image/png', data: 'last-frame' } }],
      },
      platformConfig: { apiKey: 'test-key', veoApiVersion: 'v1beta1' },
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(fetchMock.mock.calls[0][0]).toContain('/v1beta1/models/veo-3.1-fast-generate-001:predictLongRunning');
    expect(requestBody.instances[0]).toEqual({
      prompt: 'Smoothly transition from dawn to night',
      image: { mimeType: 'image/jpeg', bytesBase64Encoded: 'first-frame' },
      lastFrame: { mimeType: 'image/png', bytesBase64Encoded: 'last-frame' },
    });

    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///veo-3.1-fast-generate-001',
      taskId: 'veo-frames-task',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.ppio.com/v3/async/task-result?task_id=veo-frames-task'
    );
    expect(result.outputs).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/veo.mp4', type: 'video' }),
    ]);
  });

  it('validates Veo 3.1 constraints before requesting the API', async () => {
    const make = (payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///veo-3.1-lite-generate-001',
      payload,
      platformConfig: { apiKey: 'test-key' },
    });

    await expect(make({ prompt: '' })).rejects.toThrow('requires a non-empty prompt');
    await expect(make({ prompt: 'test', lastFrame: ['data:image/png;base64,x'] })).rejects.toThrow(
      'lastFrame requires image'
    );
    await expect(make({ prompt: 'test', durationSeconds: 5 })).rejects.toThrow('durationSeconds must be 4, 6, 8');
    await expect(make({ prompt: 'test', sampleCount: 5 })).rejects.toThrow('sampleCount must be an integer between 1 and 4');
    await expect(make({ prompt: 'test', seed: -1 })).rejects.toThrow('seed must be an integer between 0 and 4294967295');
    await expect(make({ prompt: 'test', storageUri: 'https://example.com/output' })).rejects.toThrow(
      'storageUri must start with gs://'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes all seven Kling V3.0 endpoints as async video models', async () => {
    const models = [
      'kling-v3.0-std-i2v',
      'kling-v3.0-std-t2v',
      'kling-v3.0-pro-i2v',
      'kling-v3.0-pro-t2v',
      'kling-v3.0-4k-i2v',
      'kling-v3.0-4k-t2v',
      'kling-v3.0-motion-control',
    ];
    for (const model of models) {
      const result = await ppioProviderDefinition.describeResource({ locator: `ppio:///${model}` });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'ppio-async',
      });
      expect(ppioProviderDefinition.getExecutionMode?.({ locator: `ppio:///${model}` })).toBe('async');
    }
  });

  it('creates a Kling V3.0 Standard text-to-video task', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'kling-t2v-task' }));
    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///kling-v3.0-std-t2v',
      payload: {
        prompt: 'A cinematic tracking shot through a rainy neon street',
        negativePrompt: 'text, watermark',
        duration: 8,
        cfgScale: 0.7,
        aspectRatio: '9:16',
        sound: true,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result).toMatchObject({ taskId: 'kling-t2v-task', status: 'pending' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ppio.com/v3/async/kling-v3.0-std-t2v');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      sound: true,
      duration: 8,
      cfg_scale: 0.7,
      prompt: 'A cinematic tracking shot through a rainy neon street',
      negative_prompt: 'text, watermark',
      aspect_ratio: '9:16',
    });
  });

  it('creates Kling V3.0 4K image-to-video with first frame and structured multi-shot prompts', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'kling-4k-task' }));
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///kling-v3.0-4k-i2v',
      payload: {
        image: [{ data: 'first-frame', mimeType: 'image/png' }],
        prompt: 'A luxury watch reveal in a dark studio',
        multiPrompt: [
          { prompt: 'Camera slowly approaches the watch', duration: 3 },
          { prompt: 'Light sweeps across the dial', duration: 4 },
        ],
        duration: 7,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ppio.com/v3/async/kling-v3.0-4k-i2v');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      image: 'data:image/png;base64,first-frame',
      prompt: 'A luxury watch reveal in a dark studio',
      multi_prompt: [
        { prompt: 'Camera slowly approaches the watch', duration: 3 },
        { prompt: 'Light sweeps across the dial', duration: 4 },
      ],
      duration: 7,
    });
  });

  it('creates Kling V3.0 motion control and polls the shared result endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ task_id: 'kling-motion-task' }))
      .mockResolvedValueOnce(mockResponse({
        task: { status: 'TASK_STATUS_SUCCEED', progress_percent: 100 },
        videos: [{ video_url: 'https://cdn.example.com/kling-motion.mp4' }],
      }));
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///kling-v3.0-motion-control',
      payload: {
        image: ['data:image/jpeg;base64,character-image'],
        video: 'https://cdn.example.com/motion.mov',
        prompt: 'Cinematic studio lighting',
        modelName: 'kling-v3-0-pro',
        keepOriginalSound: false,
        characterOrientation: 'video',
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      image: 'data:image/jpeg;base64,character-image',
      video: 'https://cdn.example.com/motion.mov',
      model_name: 'kling-v3-0-pro',
      keep_original_sound: false,
      character_orientation: 'video',
      prompt: 'Cinematic studio lighting',
    });
    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///kling-v3.0-motion-control',
      taskId: 'kling-motion-task',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.ppio.com/v3/async/task-result?task_id=kling-motion-task'
    );
    expect(result.outputs[0]).toMatchObject({ type: 'video', url: 'https://cdn.example.com/kling-motion.mp4' });
  });

  it('validates Kling V3.0 request constraints before calling the API', async () => {
    const make = (model: string, payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: `ppio:///${model}`,
      payload,
      platformConfig: { apiKey: 'test-key' },
    });
    await expect(make('kling-v3.0-std-t2v', { prompt: 'test', duration: 16 })).rejects.toThrow(
      'duration must be an integer between 3 and 15'
    );
    await expect(make('kling-v3.0-std-t2v', { prompt: 'test', cfgScale: 1.1 })).rejects.toThrow(
      'cfg_scale must be between 0 and 1'
    );
    await expect(make('kling-v3.0-pro-t2v', { prompt: 'test', multiPrompt: ['shot 1'] })).rejects.toThrow(
      'prompt and multi_prompt are mutually exclusive'
    );
    await expect(make('kling-v3.0-4k-i2v', {
      image: ['data:image/png;base64,x'], prompt: 'test', endImage: ['data:image/png;base64,y'],
      multiPrompt: [{ prompt: 'shot', duration: 3 }],
    })).rejects.toThrow('end_image and multi_prompt are mutually exclusive');
    await expect(make('kling-v3.0-motion-control', {
      image: ['data:image/png;base64,x'], video: 'data:video/mp4;base64,y', characterOrientation: 'image',
    })).rejects.toThrow('video must be an HTTP(S) URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes all Hailuo 2.3 variants as async video models', async () => {
    for (const model of [
      'minimax-hailuo-2.3-t2v',
      'minimax-hailuo-2.3-i2v',
      'minimax-hailuo-2.3-fast-i2v',
    ]) {
      const result = await ppioProviderDefinition.describeResource({ locator: `ppio:///${model}` });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'ppio-async',
      });
      expect(result.formValues).toMatchObject({
        prompt: '', duration: 6, resolution: '768P', enablePromptExpansion: true, aigcWatermark: false,
      });
      expect(ppioProviderDefinition.getExecutionMode?.({ locator: `ppio:///${model}` })).toBe('async');
    }
  });

  it('creates a Hailuo 2.3 text-to-video task with documented parameters', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'hailuo-t2v-task' }));
    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///minimax-hailuo-2.3-t2v',
      payload: {
        prompt: 'A panda dances on a snowy mountain at sunrise [左移,上升]',
        duration: 6,
        resolution: '1080p',
        enablePromptExpansion: true,
        fastPretreatment: true,
        aigcWatermark: false,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result).toMatchObject({ taskId: 'hailuo-t2v-task', status: 'pending' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ppio.com/v3/async/minimax-hailuo-2.3-t2v');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      prompt: 'A panda dances on a snowy mountain at sunrise [左移,上升]',
      duration: 6,
      resolution: '1080P',
      enable_prompt_expansion: true,
      aigc_watermark: false,
      fast_pretreatment: true,
    });
  });

  it('creates and polls a Hailuo 2.3 Fast image-to-video task', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ task_id: 'hailuo-fast-task' }))
      .mockResolvedValueOnce(mockResponse({
        task: { status: 'TASK_STATUS_SUCCEED', progress_percent: 100 },
        videos: [{ video_url: 'https://cdn.example.com/hailuo.mp4' }],
      }));
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///minimax-hailuo-2.3-fast-i2v',
      payload: {
        prompt: 'The camera slowly pushes toward the subject [推进]',
        image: [{ inlineData: { mimeType: 'image/jpeg', data: 'hailuo-image' } }],
        duration: 10,
        resolution: '768P',
        enablePromptExpansion: false,
        aigcWatermark: true,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      prompt: 'The camera slowly pushes toward the subject [推进]',
      duration: 10,
      resolution: '768P',
      enable_prompt_expansion: false,
      aigc_watermark: true,
      image: 'data:image/jpeg;base64,hailuo-image',
    });
    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///minimax-hailuo-2.3-fast-i2v',
      taskId: 'hailuo-fast-task',
      platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.ppio.com/v3/async/task-result?task_id=hailuo-fast-task'
    );
    expect(result.outputs[0]).toMatchObject({ type: 'video', url: 'https://cdn.example.com/hailuo.mp4' });
  });

  it('validates Hailuo 2.3 constraints before requesting the API', async () => {
    const make = (model: string, payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: `ppio:///${model}`,
      payload,
      platformConfig: { apiKey: 'test-key' },
    });
    await expect(make('minimax-hailuo-2.3-t2v', { prompt: '', duration: 6 })).rejects.toThrow(
      'requires a non-empty prompt'
    );
    await expect(make('minimax-hailuo-2.3-i2v', { prompt: 'test' })).rejects.toThrow('requires image');
    await expect(make('minimax-hailuo-2.3-t2v', { prompt: 'test', duration: 8 })).rejects.toThrow(
      'duration must be one of: 6, 10'
    );
    await expect(make('minimax-hailuo-2.3-t2v', {
      prompt: 'test', duration: 10, resolution: '1080P',
    })).rejects.toThrow('10-second videos only support 768P');
    await expect(make('minimax-hailuo-2.3-fast-i2v', {
      prompt: 'test', image: ['data:image/png;base64,x'], fastPretreatment: true,
    })).rejects.toThrow('does not support fast_pretreatment');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes official Seedance CN metered models without changing the legacy Seedance locator', async () => {
    for (const model of [
      'doubao-seedance-2-0-260128',
      'doubao-seedance-2-0-fast-260128',
      'doubao-seedance-2-0-mini-260615',
      'doubao-seedance-2-5-260628',
      'dreamina-seedance-2-5-260628',
    ]) {
      const result = await ppioProviderDefinition.describeResource({ locator: `ppio:///${model}` });
      expect(result.metadata).toMatchObject({
        model,
        apiEndpoint: '/v3/bytedance-cn/metered/contents/generations/tasks',
        resultApiEndpoint: '/v3/bytedance-cn/metered/contents/generations/tasks/{id}',
        protocol: 'bytedance-cn-content-generation-metered',
      });
      expect(result.formSchema.properties).toHaveProperty('referenceAudios');
      expect(result.formSchema.properties.duration).toMatchObject({
        'x-component': 'Slider',
        'x-component-props': { min: 4, max: 15, step: 1, unit: 's' },
      });
      expect(ppioProviderDefinition.getExecutionMode?.({ locator: `ppio:///${model}` })).toBe('async');
    }
    const legacy = await ppioProviderDefinition.describeResource({ locator: 'ppio:///seedance-2.0' });
    expect(legacy.metadata).toMatchObject({ apiEndpoint: '/seedance-2.0', protocol: 'ppio-async' });
  });

  it('creates a Seedance 2.5 CN metered text-to-video task with an official model name', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'cgt-seedance-25' }));
    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///doubao-seedance-2-5-260628',
      payload: {
        prompt: 'A cat walking through a sunny garden',
        duration: 5, resolution: '480P', ratio: '16:9', generateAudio: true,
        returnLastFrame: true, watermark: false, seed: 42,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result).toMatchObject({ taskId: 'cgt-seedance-25', status: 'pending' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.ppio.com/v3/bytedance-cn/metered/contents/generations/tasks'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      model: 'doubao-seedance-2-5-260628',
      content: [{ type: 'text', text: 'A cat walking through a sunny garden' }],
      resolution: '480p', ratio: '16:9', duration: 5,
      generate_audio: true, return_last_frame: true, watermark: false, seed: 42,
    });
  });

  it('creates Seedance CN metered reference content with HTTP and asset URLs', async () => {
    fetchMock.mockResolvedValue(mockResponse({ id: 'cgt-seedance-reference' }));
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///doubao-seedance-2-0-fast-260128',
      payload: {
        prompt: 'Use image 1 as the character and audio 1 as background music',
        referenceImages: ['asset://asset-character'],
        referenceVideos: ['https://assets.example.com/motion.mp4'],
        referenceAudios: ['asset://asset-music'],
        resolution: '720p', duration: 11, ratio: 'adaptive',
      },
      platformConfig: {
        apiKey: 'test-key',
        seedanceCnMeteredBaseUrl: 'https://custom.example/v3/bytedance-cn/metered/',
      },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://custom.example/v3/bytedance-cn/metered/contents/generations/tasks'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).content).toEqual([
      { type: 'text', text: 'Use image 1 as the character and audio 1 as background music' },
      { type: 'image_url', image_url: { url: 'asset://asset-character' }, role: 'reference_image' },
      { type: 'video_url', video_url: { url: 'https://assets.example.com/motion.mp4' }, role: 'reference_video' },
      { type: 'audio_url', audio_url: { url: 'asset://asset-music' }, role: 'reference_audio' },
    ]);
  });

  it('polls Seedance CN metered status and preserves token usage in the result', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ id: 'cgt-result', status: 'running' }))
      .mockResolvedValueOnce(mockResponse({
        id: 'cgt-result', model: 'doubao-seedance-2-5-260628', status: 'succeeded',
        content: { video_url: 'https://cdn.example.com/seedance-25.mp4' },
        usage: { completion_tokens: 108900, total_tokens: 108900 },
        resolution: '480p', duration: 5,
      }));
    const status = await ppioProviderDefinition.checkStatus!({
      locator: 'ppio:///doubao-seedance-2-5-260628',
      taskId: 'cgt-result', platformConfig: { apiKey: 'test-key' },
    });
    expect(status.status).toBe('running');
    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///doubao-seedance-2-5-260628',
      taskId: 'cgt-result', platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.ppio.com/v3/bytedance-cn/metered/contents/generations/tasks/cgt-result'
    );
    expect(result.outputs[0]).toMatchObject({ type: 'video', url: 'https://cdn.example.com/seedance-25.mp4' });
    expect(result.raw).toMatchObject({ usage: { completion_tokens: 108900, total_tokens: 108900 } });
  });

  it('validates Seedance CN metered model-specific and content constraints', async () => {
    const make = (model: string, payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: `ppio:///${model}`, payload, platformConfig: { apiKey: 'test-key' },
    });
    await expect(make('doubao-seedance-2-0-fast-260128', {
      prompt: 'test', resolution: '1080p',
    })).rejects.toThrow('does not support 1080p');
    await expect(make('doubao-seedance-2-5-260628', { prompt: 'test', duration: 16 })).rejects.toThrow(
      'integer between 4 and 15'
    );
    await expect(make('doubao-seedance-2-5-260628', { prompt: 'test', ratio: 'adaptive' })).rejects.toThrow(
      'text-to-video does not support adaptive ratio'
    );
    await expect(make('doubao-seedance-2-5-260628', {
      prompt: 'test', lastFrame: 'https://assets.example.com/last.jpg',
    })).rejects.toThrow('last_frame requires first_frame');
    await expect(make('doubao-seedance-2-5-260628', {
      prompt: 'test', referenceAudios: ['asset://asset-audio'],
    })).rejects.toThrow('requires a reference image or video');
    await expect(make('doubao-seedance-2-5-260628', {
      prompt: 'test', firstFrame: 'data:image/png;base64,x',
    })).rejects.toThrow('must be a public HTTP(S) or asset:// URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes MiniMax H3 as an async native-protocol video model', async () => {
    const result = await ppioProviderDefinition.describeResource({ locator: 'ppio:///MiniMax-H3' });
    expect(result.metadata).toMatchObject({
      model: 'MiniMax-H3',
      apiEndpoint: '/v3/minimax/v2/video_generation',
      resultApiEndpoint: '/v3/minimax/v2/query/video_generation/{task_id}',
      protocol: 'minimax-video-generation-v2',
    });
    expect(result.formSchema.properties).toHaveProperty('referenceAudios');
    expect(result.formValues).toMatchObject({
      prompt: '', resolution: '768P', duration: 4, ratio: '16:9', aigcWatermark: false,
    });
    expect(ppioProviderDefinition.getExecutionMode?.({ locator: 'ppio:///MiniMax-H3' })).toBe('async');
  });

  it('creates a MiniMax H3 text-to-video task with the native request body', async () => {
    fetchMock.mockResolvedValue(mockResponse({ task_id: 'h3-text-task' }));
    const result = await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///MiniMax-H3',
      payload: {
        prompt: 'A cinematic product video with precise studio lighting',
        resolution: '2k', duration: 8, ratio: '21:9', aigcWatermark: true,
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(result).toMatchObject({ taskId: 'h3-text-task', status: 'pending', metadata: { model: 'MiniMax-H3' } });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.ppio.com/v3/minimax/v2/video_generation');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      model: 'MiniMax-H3',
      content: [{ type: 'text', text: 'A cinematic product video with precise studio lighting' }],
      resolution: '2K', duration: 8, ratio: '21:9', aigc_watermark: true,
    });
  });

  it('creates MiniMax H3 frame and reference-material content', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ task_id: 'h3-frame-task' }))
      .mockResolvedValueOnce(mockResponse({ task_id: 'h3-reference-task' }));
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///MiniMax-H3',
      payload: {
        prompt: 'Move smoothly between the supplied frames',
        firstFrame: 'https://assets.example.com/first.jpg',
        lastFrame: 'https://assets.example.com/last.jpg',
      },
      platformConfig: { apiKey: 'test-key' },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).content).toEqual([
      { type: 'text', text: 'Move smoothly between the supplied frames' },
      { type: 'image_url', image_url: { url: 'https://assets.example.com/first.jpg' }, role: 'first_frame' },
      { type: 'image_url', image_url: { url: 'https://assets.example.com/last.jpg' }, role: 'last_frame' },
    ]);
    await ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///MiniMax-H3',
      payload: {
        prompt: 'Follow the reference character, motion and soundtrack',
        referenceImages: ['https://assets.example.com/character.png'],
        referenceVideos: ['https://assets.example.com/motion.mp4'],
        referenceAudios: ['https://assets.example.com/music.mp3'],
        resolution: '2K', duration: 6, ratio: 'adaptive',
      },
      platformConfig: { apiKey: 'test-key', minimaxBaseUrl: 'https://custom.example/v3/minimax/v2/' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe('https://custom.example/v3/minimax/v2/video_generation');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string).content).toEqual([
      { type: 'text', text: 'Follow the reference character, motion and soundtrack' },
      { type: 'image_url', image_url: { url: 'https://assets.example.com/character.png' }, role: 'reference_image' },
      { type: 'video_url', video_url: { url: 'https://assets.example.com/motion.mp4' }, role: 'reference_video' },
      { type: 'audio_url', audio_url: { url: 'https://assets.example.com/music.mp3' }, role: 'reference_audio' },
    ]);
  });

  it('polls and returns MiniMax H3 results from its dedicated query endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ task: { id: 'h3-result', status: 'running' } }))
      .mockResolvedValueOnce(mockResponse({
        task: {
          id: 'h3-result', status: 'succeeded', model: 'MiniMax-H3', resolution: '768P',
          usage: { input_seconds: 0, output_seconds: 4, input_image_count: 0, total_seconds: 4 },
          content: { video_url: 'https://cdn.example.com/h3-result.mp4' },
        },
      }));
    const status = await ppioProviderDefinition.checkStatus!({
      locator: 'ppio:///MiniMax-H3', taskId: 'h3-result', platformConfig: { apiKey: 'test-key' },
    });
    expect(status.status).toBe('running');
    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///MiniMax-H3', taskId: 'h3-result', platformConfig: { apiKey: 'test-key' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.ppio.com/v3/minimax/v2/query/video_generation/h3-result'
    );
    expect(result.outputs[0]).toMatchObject({
      type: 'video', mimeType: 'video/mp4', url: 'https://cdn.example.com/h3-result.mp4',
    });
  });

  it('accepts the actual MiniMax H3 content.url result field', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      task: {
        id: 'h3-content-url', status: 'succeeded', model: 'MiniMax-H3',
        content: { url: 'https://cdn.example.com/h3-content-url.mp4' },
      },
    }));
    const result = await ppioProviderDefinition.getResult!({
      locator: 'ppio:///MiniMax-H3', taskId: 'h3-content-url', platformConfig: { apiKey: 'test-key' },
    });
    expect(result.outputs[0]).toMatchObject({
      type: 'video', mimeType: 'video/mp4', url: 'https://cdn.example.com/h3-content-url.mp4',
    });
  });

  it('validates MiniMax H3 protocol constraints before requesting the API', async () => {
    const make = (payload: Record<string, any>) => ppioProviderDefinition.createTaskAsync!({
      locator: 'ppio:///MiniMax-H3', payload, platformConfig: { apiKey: 'test-key' },
    });
    await expect(make({ prompt: 'test', duration: 3 })).rejects.toThrow('integer between 4 and 15');
    await expect(make({ prompt: 'test', resolution: '1080P' })).rejects.toThrow('768P, 2K');
    await expect(make({ prompt: 'test', ratio: 'adaptive' })).rejects.toThrow('does not support adaptive ratio');
    await expect(make({ prompt: 'test', lastFrame: 'https://assets.example.com/last.jpg' })).rejects.toThrow(
      'last_frame requires first_frame'
    );
    await expect(make({
      prompt: 'test', firstFrame: 'https://assets.example.com/first.jpg',
      referenceImages: ['https://assets.example.com/reference.jpg'],
    })).rejects.toThrow('cannot be mixed with reference materials');
    await expect(make({
      prompt: 'test', referenceAudios: ['https://assets.example.com/audio.mp3'],
    })).rejects.toThrow('requires a reference image or video');
    await expect(make({ prompt: 'test', firstFrame: 'data:image/png;base64,x' })).rejects.toThrow(
      'must be a public HTTP(S) URL'
    );
    await expect(make({
      content: [{ type: 'video_url', video_url: { url: 'https://assets.example.com/video.mp4' }, role: 'first_frame' }],
    })).rejects.toThrow('role is invalid for video_url');
    expect(fetchMock).not.toHaveBeenCalled();
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
