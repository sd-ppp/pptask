import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRUN_GPT56_MODELS,
  CRUN_SUPPORTED_MODELS,
  buildCrunGpt56ChatBody,
  buildCrunGpt56ResponsesBody,
  crunProviderDefinition,
} from '../src/providers/crun/index.ts';

const SOL = 'gpt-5.6-sol';
const TERRA = 'gpt-5.6-terra';
const LUNA = 'gpt-5.6-luna';
const locator = (model: string) => `crun:///${model}`;

describe('crun GPT-5.6 provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('registers all three GPT-5.6 models as synchronous models', () => {
    expect(CRUN_GPT56_MODELS).toEqual([SOL, TERRA, LUNA]);
    expect(CRUN_SUPPORTED_MODELS).toEqual(expect.arrayContaining([SOL, TERRA, LUNA]));
    expect(crunProviderDefinition.getExecutionMode!({ locator: locator(SOL) })).toBe('sync');
    expect(crunProviderDefinition.getExecutionMode!({ locator: 'crun:///image-upscale' })).toBe('async');
  });

  it('describes the dual-protocol form and automatic image upload', async () => {
    const result = await crunProviderDefinition.describeResource({ locator: locator(TERRA) });
    expect(result.metadata).toMatchObject({
      model: TERRA,
      protocol: 'openai-responses-or-chat-completions',
      mode: 'language-model',
      channel: 'gpt-5.6',
      apiEndpoint: '/api/v1/responses',
      alternateApiEndpoint: '/api/v1/chat/completions',
      supportedApiModes: ['responses', 'chat_completions'],
      supportsOutputFormat: false,
    });
    expect(result.formValues).toMatchObject({
      apiMode: 'responses', reasoningEffort: 'medium', stream: false,
    });
    expect(result.formSchema.properties.urls['x-component-props']).toMatchObject({
      multiple: true, maxCount: 5,
    });
    expect(result.recommendUploadProvider).toBe('crun');
  });

  it('builds Responses input with text and images without default sampling fields', () => {
    const body = buildCrunGpt56ResponsesBody(TERRA, {
      systemPrompt: 'Be concise.',
      prompt: 'Describe the image.',
      urls: ['https://assets.example.com/reference.png'],
      reasoningEffort: 'high',
      maxOutputTokens: 2048,
      responseFormat: 'json_object',
    });
    expect(body).toEqual({
      model: TERRA,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Describe the image.' },
        { type: 'input_image', image_url: 'https://assets.example.com/reference.png' },
      ] }],
      instructions: 'Be concise.',
      max_output_tokens: 2048,
      reasoning: { effort: 'high' },
      text: { format: { type: 'json_object' } },
      stream: false,
    });
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
  });

  it('calls Responses API and normalizes text and token usage', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      id: 'resp_crun_1',
      output: [{
        type: 'message', content: [{ type: 'output_text', text: 'CRUN response text' }],
      }],
      usage: { total_tokens: 88 },
    }));
    const result = await crunProviderDefinition.createTaskSync!({
      locator: locator(SOL),
      payload: { prompt: 'Hello', reasoningEffort: 'low' },
      platformConfig: { apiKey: 'crun-test-key' },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://api.crun.ai/api/v1/responses');
    expect(requestInit.headers).toMatchObject({
      Authorization: 'Bearer crun-test-key', 'Content-Type': 'application/json',
    });
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      model: SOL, input: 'Hello', reasoning: { effort: 'low' }, stream: false,
    });
    expect(result).toMatchObject({ taskId: 'resp_crun_1', status: 'succeeded', costCoins: 88 });
    expect(result.outputs[0]).toMatchObject({ text: 'CRUN response text' });
  });

  it('calls Chat Completions and keeps multimodal message structure', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({
      id: 'chat_crun_1',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Chat result' } }],
      usage: { total_tokens: 45 },
    }));
    const result = await crunProviderDefinition.createTaskSync!({
      locator: locator(LUNA),
      payload: {
        apiMode: 'chat_completions', systemPrompt: 'Use Chinese.', prompt: '看图回答',
        urls: ['data:image/png;base64,AAAA'], maxCompletionTokens: 512,
        reasoningEffort: 'none', responseFormat: 'text',
      },
      platformConfig: { apiKey: 'crun-test-key', baseURL: 'https://gateway.example/v1/' },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('https://gateway.example/v1/chat/completions');
    expect(JSON.parse(requestInit.body as string)).toEqual({
      model: LUNA,
      messages: [
        { role: 'system', content: 'Use Chinese.' },
        { role: 'user', content: [
          { type: 'text', text: '看图回答' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
        ] },
      ],
      stream: false,
      max_completion_tokens: 512,
      reasoning_effort: 'none',
      response_format: { type: 'text' },
    });
    expect(result.outputs[0]).toMatchObject({ text: 'Chat result' });
  });

  it('merges Responses SSE deltas', async () => {
    fetchMock.mockResolvedValueOnce(mockSseResponse([
      { type: 'response.output_text.delta', delta: 'Hello ' },
      { type: 'response.output_text.delta', delta: 'stream' },
    ]));
    const result = await crunProviderDefinition.createTaskSync!({
      locator: locator(TERRA), payload: { prompt: 'Stream', stream: true },
      platformConfig: { apiKey: 'crun-test-key' },
    });
    expect(result.outputs[0]).toMatchObject({ text: 'Hello stream' });
  });

  it('validates protocol, reasoning, images, and token limits', () => {
    expect(() => buildCrunGpt56ResponsesBody(SOL, { prompt: 'x', reasoningEffort: 'xhigh' }))
      .toThrow('reasoning.effort must be one of: none, low, medium, high');
    expect(() => buildCrunGpt56ChatBody(TERRA, {
      prompt: 'x', urls: Array.from({ length: 6 }, (_, i) => `https://e.test/${i}.png`),
    })).toThrow('supports at most 5 image inputs');
    expect(() => buildCrunGpt56ResponsesBody(LUNA, {
      prompt: 'x', maxOutputTokens: 128001,
    })).toThrow('must be an integer from 1 to 128000');
    expect(() => buildCrunGpt56ChatBody(SOL, { prompt: 'x', topP: 1.2 }))
      .toThrow('top_p must be between 0 and 1');
  });
});

function mockResponse(body: any, status = 200): Response {
  const serialized = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(serialized),
    json: () => Promise.resolve(body),
  } as Response;
}

function mockSseResponse(events: any[]): Response {
  const body = `${events.map(event => `data: ${JSON.stringify(event)}`).join('\n\n')}\n\ndata: [DONE]\n`;
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    text: () => Promise.resolve(body),
  } as Response;
}
