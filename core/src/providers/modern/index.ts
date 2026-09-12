import { parseLocator } from '../../resource.ts';
import { buildFormilySchemaFromJsonSchema, type JsonSchemaObject } from '../../common/json-schema-formily.ts';
import { parse as parseYaml } from 'yaml';
import type {
  DescribeParams, DescribeResult, PlatformConfig, ProviderDefinition,
  TaskCreateParams, TaskExecutionResult, TaskResult, TaskStatusResult,
} from '../../types.ts';

export type ModernProvider =
  | 'fish' | 'deepinfra' | 'openrouter' | 'tavus' | 'scenario' | 'xai'
  | 'cloudflare' | 'vertex' | 'bedrock' | 'azure' | 'nvidia' | 'leonardo'
  | 'heygen' | 'did' | 'cartesia' | 'deepgram' | 'fireworks';

export type ModernCatalogItem = {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  raw: any;
};

export type ModernProviderMetadata = {
  catalogSource: 'dynamic' | 'openapi' | 'docs' | 'account' | 'none';
  describeGranularity: 'resource' | 'operation' | 'task-family';
  media: Array<'image' | 'video' | 'audio' | 'avatar' | 'workflow'>;
};

export const MODERN_PROVIDER_METADATA: Record<ModernProvider, ModernProviderMetadata> = {
  fish: { catalogSource: 'dynamic', describeGranularity: 'operation', media: ['audio'] },
  deepinfra: { catalogSource: 'dynamic', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  openrouter: { catalogSource: 'dynamic', describeGranularity: 'task-family', media: ['image', 'audio'] },
  tavus: { catalogSource: 'openapi', describeGranularity: 'operation', media: ['video', 'avatar'] },
  scenario: { catalogSource: 'account', describeGranularity: 'operation', media: ['image', 'video', 'workflow'] },
  xai: { catalogSource: 'account', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  cloudflare: { catalogSource: 'account', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  vertex: { catalogSource: 'account', describeGranularity: 'operation', media: ['image', 'video', 'audio'] },
  bedrock: { catalogSource: 'account', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  azure: { catalogSource: 'account', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  nvidia: { catalogSource: 'dynamic', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
  leonardo: { catalogSource: 'account', describeGranularity: 'operation', media: ['image', 'video'] },
  heygen: { catalogSource: 'account', describeGranularity: 'resource', media: ['video', 'avatar', 'audio'] },
  did: { catalogSource: 'account', describeGranularity: 'resource', media: ['video', 'avatar', 'audio'] },
  cartesia: { catalogSource: 'account', describeGranularity: 'operation', media: ['audio'] },
  deepgram: { catalogSource: 'docs', describeGranularity: 'task-family', media: ['audio'] },
  fireworks: { catalogSource: 'account', describeGranularity: 'task-family', media: ['image', 'video', 'audio'] },
};

type AsyncSpec = {
  createPath: string;
  statusPath: (id: string) => string;
  idFields: string[];
  outputFields: string[];
};

const asyncSpecs: Partial<Record<ModernProvider, AsyncSpec>> = {
  tavus: { createPath: '/v2/videos', statusPath: id => `/v2/videos/${encodeURIComponent(id)}`, idFields: ['video_id', 'id'], outputFields: ['download_url', 'video_url'] },
  heygen: { createPath: '/v2/video/generate', statusPath: id => `/v1/video_status.get?video_id=${encodeURIComponent(id)}`, idFields: ['video_id', 'id'], outputFields: ['video_url', 'url'] },
  did: { createPath: '/talks', statusPath: id => `/talks/${encodeURIComponent(id)}`, idFields: ['id', 'talk_id'], outputFields: ['result_url', 'url'] },
  leonardo: { createPath: '/api/rest/v1/generations', statusPath: id => `/api/rest/v1/generations/${encodeURIComponent(id)}`, idFields: ['generationId', 'generation_id', 'id'], outputFields: ['url', 'downloadUrl'] },
};

const catalogUrls: Partial<Record<ModernProvider, string>> = {
  fish: 'https://api.fish.audio/model',
  deepinfra: 'https://api.deepinfra.com/models/list',
  openrouter: 'https://openrouter.ai/api/v1/models',
  nvidia: 'https://integrate.api.nvidia.com/v1/models',
  fireworks: 'https://api.fireworks.ai/inference/v1/models',
  scenario: 'https://api.cloud.scenario.com/v1/models',
  tavus: 'https://tavusapi.com/v2/faces',
  heygen: 'https://api.heygen.com/v2/avatars',
  deepgram: 'https://api.deepgram.com/v1/models',
  cartesia: 'https://api.cartesia.ai/voices',
};

const openapiUrls: Partial<Record<ModernProvider, string>> = {
  fish: 'https://api.fish.audio/openapi.json',
  tavus: 'https://docs.tavus.io/openapi.yaml',
};

/** Fetches a provider's machine-readable model/resource catalog when one exists. */
export async function listModernCatalog(
  provider: ModernProvider,
  platformConfig?: PlatformConfig,
): Promise<ModernCatalogItem[]> {
  let endpoint = platformConfig?.catalogURL ?? catalogUrls[provider];
  if (!endpoint && provider === 'cloudflare' && platformConfig?.accountId) {
    endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(platformConfig.accountId)}/ai/models/search`;
  }
  if (!endpoint) throw new Error(`${provider} does not expose a standard public catalog endpoint; pass platformConfig.catalogURL`);
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders(platformConfig) };
  const response = await fetch(endpoint, { headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider} catalog error: ${response.status} ${text.slice(0, 500)}`);
  let raw: any; try { raw = JSON.parse(text); } catch { throw new Error(`${provider} catalog response was not JSON`); }
  const items = Array.isArray(raw) ? raw
    : Array.isArray(raw?.data) ? raw.data
      : Array.isArray(raw?.data?.avatars) ? raw.data.avatars
        : Array.isArray(raw?.data?.voices) ? raw.data.voices
          : Array.isArray(raw?.models) ? raw.models
            : Array.isArray(raw?.stt) ? raw.stt
              : Array.isArray(raw?.tts) ? raw.tts
                : Array.isArray(raw?.voices) ? raw.voices
                  : Array.isArray(raw?.items) ? raw.items
                    : Array.isArray(raw?.result?.models) ? raw.result.models
                      : Array.isArray(raw?.result) ? raw.result : [];
  return items.map((item: any) => ({
    id: String(item.id ?? item.model_name ?? item.model ?? item.avatar_id ?? item.voice_id ?? item.face_id ?? item.name ?? ''),
    name: item.name ?? item.model_name ?? item.id,
    description: item.description,
    type: item.type ?? item.task,
    raw: item,
  })).filter((item: ModernCatalogItem) => item.id);
}

const genericSchema: JsonSchemaObject = {
  type: 'object', properties: {
    prompt: { type: 'string', title: 'Prompt' },
    input: { type: 'object', title: 'Input' },
    model: { type: 'string', title: 'Model' },
  },
};

const schemas: Record<ModernProvider, JsonSchemaObject> = {
  fish: {
    type: 'object', required: ['text'], properties: {
      text: { type: 'string', title: 'Text' },
      reference_id: { type: 'string', title: 'Voice ID' },
      format: { type: 'string', enum: ['mp3', 'wav', 'pcm'] },
      mp3_bitrate: { type: 'number', enum: [64, 128, 192, 320], default: 128 },
    },
  },
  deepinfra: {
    type: 'object', required: ['prompt'], properties: {
      prompt: { type: 'string', title: 'Prompt' },
      image: { type: 'string', format: 'uri', title: 'Image URL' },
      negative_prompt: { type: 'string' },
      num_inference_steps: { type: 'number', minimum: 1, maximum: 100 },
      width: { type: 'number', minimum: 64 }, height: { type: 'number', minimum: 64 },
    },
  },
  openrouter: {
    type: 'object', required: ['messages'], properties: {
      model: { type: 'string' },
      messages: { type: 'array', items: { type: 'object' } },
      modalities: { type: 'array', items: { type: 'string', enum: ['text', 'audio'] } },
      stream: { type: 'boolean', default: false },
    },
  },
  tavus: genericSchema, scenario: genericSchema, xai: genericSchema,
  cloudflare: genericSchema, vertex: genericSchema, bedrock: genericSchema,
  azure: genericSchema, nvidia: genericSchema, leonardo: genericSchema,
  heygen: genericSchema, did: genericSchema, cartesia: genericSchema,
  deepgram: genericSchema, fireworks: genericSchema,
};

function config(platformConfig: PlatformConfig | undefined, defaults: { baseURL: string }): { apiKey: string; baseURL: string } {
  const apiKey = platformConfig?.apiKey;
  if (!apiKey) throw new Error('provider requires apiKey in platformConfig');
  return { apiKey, baseURL: platformConfig?.baseURL ?? defaults.baseURL };
}

function authHeaders(platformConfig: PlatformConfig | undefined): Record<string, string> {
  if (platformConfig?.headers && typeof platformConfig.headers === 'object') return { ...platformConfig.headers };
  const apiKey = platformConfig?.apiKey;
  if (!apiKey) return {};
  if (platformConfig?.authScheme === 'basic') {
    return { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` };
  }
  return { Authorization: `Bearer ${apiKey}` };
}

function ensureScheme(locator: string, scheme: ModernProvider): URL {
  const parsed = parseLocator(locator);
  if (parsed.scheme !== scheme) throw new Error(`${scheme} provider received unsupported locator: ${locator}`);
  return parsed.url;
}

function jsonSchemaResult(provider: ModernProvider, url: URL): DescribeResult {
  const built = buildFormilySchemaFromJsonSchema(schemas[provider]);
  return { provider, metadata: { scheme: provider, locator: url.toString(), ...MODERN_PROVIDER_METADATA[provider] }, formSchema: built.schema, formValues: built.values, cancelable: false };
}

function openApiRequestSchema(document: any, path: string, method = 'post'): JsonSchemaObject | undefined {
  const operation = document?.paths?.[path]?.[method.toLowerCase()] ?? document?.paths?.[path]?.[method.toUpperCase()];
  const body = operation?.requestBody?.content;
  if (!body || typeof body !== 'object') return undefined;
  const media = body['application/json'] ?? body['application/*+json'] ?? Object.values(body)[0];
  return (media as any)?.schema as JsonSchemaObject | undefined;
}

async function describeWithOpenApi(provider: ModernProvider, url: URL, platformConfig?: PlatformConfig): Promise<DescribeResult | undefined> {
  const openapiURL = platformConfig?.openapiURL ?? openapiUrls[provider];
  if (!openapiURL) return undefined;
  const response = await fetch(openapiURL, { headers: { Accept: 'application/json, application/yaml', ...authHeaders(platformConfig) } });
  if (!response.ok) throw new Error(`${provider} OpenAPI error: ${response.status}`);
  const text = await response.text();
  let document: any;
  try { document = JSON.parse(text); } catch { try { document = parseYaml(text); } catch { return undefined; } }
  const schema = openApiRequestSchema(document, url.pathname, platformConfig?.method ?? 'post');
  if (!schema) return undefined;
  const built = buildFormilySchemaFromJsonSchema(schema, {
    resolveRef: ref => {
      const match = /^#\/components\/schemas\/(.+)$/.exec(ref);
      return match ? document?.components?.schemas?.[match[1]] : undefined;
    },
  });
  return {
    provider,
    metadata: { scheme: provider, locator: url.toString(), describeGranularity: 'operation', openapiURL },
    formSchema: built.schema,
    formValues: built.values,
    cancelable: false,
  };
}

function outputs(value: any): Array<{ url?: string; rawData: any }> {
  const source = value?.output ?? value?.images ?? value?.data ?? value?.choices ?? value;
  const list = Array.isArray(source) ? source : [source];
  return list.filter(item => item != null).map(item => {
    if (typeof item === 'string' && /^https?:\/\//.test(item)) return { url: item, rawData: item };
    if (item?.url) return { url: item.url, rawData: item };
    if (item?.audio_url?.url) return { url: item.audio_url.url, rawData: item };
    return { rawData: item };
  });
}

async function post(provider: ModernProvider, url: URL, payload: Record<string, any>, platformConfig?: PlatformConfig): Promise<TaskResult> {
  const defaultBases: Record<ModernProvider, string> = {
    fish: 'https://api.fish.audio', deepinfra: 'https://api.deepinfra.com', openrouter: 'https://openrouter.ai',
    tavus: 'https://tavusapi.com', scenario: 'https://api.cloud.scenario.com', xai: 'https://api.x.ai',
    cloudflare: '', vertex: '', bedrock: '', azure: '', nvidia: 'https://integrate.api.nvidia.com',
    leonardo: 'https://cloud.leonardo.ai', heygen: 'https://api.heygen.com', did: 'https://api.d-id.com',
    cartesia: 'https://api.cartesia.ai', deepgram: 'https://api.deepgram.com', fireworks: 'https://api.fireworks.ai',
  };
  const defaults = { baseURL: defaultBases[provider] };
  const cfg = config(platformConfig, defaults);
  let endpoint: string;
  let body = payload;
  if (provider === 'fish') endpoint = '/v1/tts';
  else if (provider === 'deepinfra') {
    const model = url.pathname.replace(/^\/+model\//, '').replace(/^\/+/, '');
    if (!model) throw new Error('deepinfra locator must include /model/{owner}/{name}');
    endpoint = `/v1/inference/${model}`;
  } else endpoint = url.pathname.replace(/^\/+/, '') ? `/${url.pathname.replace(/^\/+/, '')}` : (provider === 'openrouter' || provider === 'xai' ? '/v1/chat/completions' : '');
  if (!endpoint) throw new Error(`${provider} locator must include an API operation path`);
  if ((provider === 'openrouter' || provider === 'xai') && !body.model && url.hostname) body = { ...body, model: url.hostname };
  const response = await fetch(`${cfg.baseURL.replace(/\/$/, '')}${endpoint}`, { method: 'POST', headers: { ...authHeaders(platformConfig), 'Content-Type': 'application/json', ...(provider === 'openrouter' ? { 'HTTP-Referer': platformConfig?.referer ?? 'https://github.com/sd-ppp/pptask' } : {}) }, body: JSON.stringify(body) });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider} API error: ${response.status} ${errorText.slice(0, 500)}`);
  }
  let raw: any;
  if (/^(audio|video|image)\//i.test(contentType) || contentType.includes('octet-stream')) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    const encoded = Buffer.from(bytes).toString('base64');
    raw = { url: `data:${contentType || 'application/octet-stream'};base64,${encoded}`, contentType };
  } else {
    const text = await response.text();
    try { raw = JSON.parse(text); } catch { raw = text; }
  }
  return { provider, taskId: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: 'succeeded', outputs: outputs(raw), raw };
}

function extractField(value: any, fields: string[]): any {
  for (const field of fields) if (value?.[field] != null) return value[field];
  if (value?.data && typeof value.data === 'object') {
    for (const field of fields) if (value.data[field] != null) return value.data[field];
  }
  return undefined;
}

function taskState(value: any): string {
  return String(value?.status ?? value?.state ?? value?.data?.status ?? value?.data?.state ?? '').toLowerCase();
}

async function requestJson(provider: ModernProvider, endpoint: string, method: string, payload: Record<string, any> | undefined, platformConfig?: PlatformConfig): Promise<any> {
  const defaultBases: Record<string, string> = { tavus: 'https://tavusapi.com', heygen: 'https://api.heygen.com', did: 'https://api.d-id.com', leonardo: 'https://cloud.leonardo.ai' };
  const cfg = config(platformConfig, { baseURL: platformConfig?.baseURL ?? defaultBases[provider] ?? '' });
  const response = await fetch(`${cfg.baseURL.replace(/\/$/, '')}${endpoint}`, { method, headers: { ...authHeaders(platformConfig), 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
  const text = await response.text();
  let raw: any; try { raw = JSON.parse(text); } catch { raw = text; }
  if (!response.ok) throw new Error(`${provider} API error: ${response.status} ${text.slice(0, 500)}`);
  return raw;
}

async function createAsync(provider: ModernProvider, payload: Record<string, any>, platformConfig?: PlatformConfig): Promise<import('../../types.ts').TaskCreateResult> {
  const spec = asyncSpecs[provider];
  if (!spec) throw new Error(`${provider} does not expose an async task adapter`);
  const raw = await requestJson(provider, spec.createPath, 'POST', payload, platformConfig);
  const taskId = extractField(raw, spec.idFields);
  if (!taskId) throw new Error(`${provider} create response did not include a task id`);
  return { provider, taskId: String(taskId), status: 'pending', raw };
}

async function checkAsync(provider: ModernProvider, taskId: string, platformConfig?: PlatformConfig): Promise<TaskStatusResult> {
  const spec = asyncSpecs[provider];
  if (!spec) throw new Error(`${provider} does not expose an async task adapter`);
  const raw = await requestJson(provider, spec.statusPath(taskId), 'GET', undefined, platformConfig);
  const state = taskState(raw);
  const status = state.includes('fail') || state.includes('error') ? 'failed' : state.includes('complete') || state.includes('success') || state.includes('done') || state.includes('ready') ? 'succeeded' : 'running';
  return { provider, taskId, status, raw };
}

async function resultAsync(provider: ModernProvider, taskId: string, platformConfig?: PlatformConfig): Promise<TaskResult> {
  const spec = asyncSpecs[provider];
  if (!spec) throw new Error(`${provider} does not expose an async task adapter`);
  const raw = await requestJson(provider, spec.statusPath(taskId), 'GET', undefined, platformConfig);
  const state = taskState(raw);
  if (!(state.includes('complete') || state.includes('success') || state.includes('done') || state.includes('ready'))) throw new Error(`${provider} task ${taskId} is not completed (status=${raw?.status ?? 'unknown'})`);
  const output = extractField(raw, spec.outputFields);
  return { provider, taskId, status: 'succeeded', outputs: output ? [{ url: output, rawData: raw }] : outputs(raw), raw };
}

function definition(provider: ModernProvider): ProviderDefinition {
  return {
    async describeResource(params: DescribeParams) {
      const url = ensureScheme(params.locator, provider);
      return (await describeWithOpenApi(provider, url, params.platformConfig)) ?? jsonSchemaResult(provider, url);
    },
    async createTask(params: TaskCreateParams): Promise<TaskExecutionResult> {
      if (asyncSpecs[provider]) return { mode: 'async', task: await createAsync(provider, params.payload ?? {}, params.platformConfig) };
      return { mode: 'sync', result: await post(provider, ensureScheme(params.locator, provider), params.payload ?? {}, params.platformConfig) };
    },
    ...(asyncSpecs[provider] ? {
      async checkStatus(params: any) { return checkAsync(provider, params.taskId, params.platformConfig); },
      async getResult(params: any) { return resultAsync(provider, params.taskId, params.platformConfig); },
    } : {}),
  };
}

export const fishProviderDefinition = definition('fish');
export const deepinfraProviderDefinition = definition('deepinfra');
export const openrouterProviderDefinition = definition('openrouter');
export const tavusProviderDefinition = definition('tavus');
export const scenarioProviderDefinition = definition('scenario');
export const xaiProviderDefinition = definition('xai');
export const cloudflareProviderDefinition = definition('cloudflare');
export const vertexProviderDefinition = definition('vertex');
export const bedrockProviderDefinition = definition('bedrock');
export const azureProviderDefinition = definition('azure');
export const nvidiaProviderDefinition = definition('nvidia');
export const leonardoProviderDefinition = definition('leonardo');
export const heygenProviderDefinition = definition('heygen');
export const didProviderDefinition = definition('did');
export const cartesiaProviderDefinition = definition('cartesia');
export const deepgramProviderDefinition = definition('deepgram');
export const fireworksProviderDefinition = definition('fireworks');
