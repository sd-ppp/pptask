import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import { buildNovitaFormSchema } from './formily.ts';
import {
  buildNovitaEndpoint,
  buildNovitaAsyncCreateEndpoint,
  buildNovitaAsyncTaskResultEndpoint,
  buildNovitaChatCompletionsEndpoint,
  buildNovitaOpenAIImagesEndpoint,
  buildNovitaResponsesEndpoint,
  buildNovitaSeedanceOverseaCreateEndpoint,
  buildNovitaSeedanceOverseaTaskEndpoint,
  buildNovitaVeo31CreateEndpoint,
  ensureNovitaConfig,
  isNovitaAsyncModel,
  isNovitaGpt56Model,
  isNovitaGptImageModel,
  isNovitaKlingV3Model,
  isNovitaSeedanceOverseaModel,
  isNovitaVeo31Model,
  normalizeNovitaGptImageOutputs,
  normalizeNovitaOutputs,
  parseNovitaModel,
} from './helpers.ts';

const NOVITA_SCHEME = 'novita';

export async function describeNovita(
  url: URL,
  _platformConfig?: PlatformConfig,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parseNovitaModel(url);
  if (isNovitaVeo31Model(model)) {
    return {
      provider: NOVITA_SCHEME,
      metadata: {
        scheme: NOVITA_SCHEME,
        model,
        apiEndpoint: `/v3/veo-3.1/v1/models/${model}:predictLongRunning`,
        alternateApiEndpoint: `/v3/veo-3.1/v1beta1/models/${model}:predictLongRunning`,
        resultApiEndpoint: '/v3/async/task-result?task_id={taskId}',
        protocol: 'google-veo-3.1-native-long-running',
        mode: 'text-image-first-last-frame-to-video',
      },
      formSchema: buildNovitaFormSchema(model),
      formValues: {
        prompt: '', image: [], lastFrame: [], aspectRatio: '16:9', resolution: '720p',
        durationSeconds: 8, sampleCount: 1, generateAudio: true, negativePrompt: '',
        personGeneration: 'allow_adult', enhancePrompt: true, veo31ApiVersion: 'v1',
      },
      cancelable: false,
    };
  }
  if (isNovitaKlingV3Model(model)) {
    const motion = model.endsWith('motion-control');
    const imageToVideo = model.endsWith('-i2v');
    return {
      provider: NOVITA_SCHEME,
      metadata: {
        scheme: NOVITA_SCHEME,
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result?task_id={taskId}',
        protocol: 'novita-v3-async-kling-v3',
        mode: motion ? 'motion-control' : imageToVideo ? 'image-to-video' : 'text-to-video',
      },
      formSchema: buildNovitaFormSchema(model),
      formValues: motion ? {
        prompt: '', negativePrompt: '', image: [], imageUrl: '', video: '',
        modelName: 'kling-v3-0-std', characterOrientation: 'image', keepOriginalSound: true,
      } : {
        prompt: '', negativePrompt: '', image: [], imageUrl: '', endImage: [], endImageUrl: '',
        multiPrompt: [], duration: 5, cfgScale: 0.5, aspectRatio: '16:9', sound: false,
      },
      cancelable: false,
    };
  }
  if (isNovitaSeedanceOverseaModel(model)) {
    return {
      provider: NOVITA_SCHEME,
      metadata: {
        scheme: NOVITA_SCHEME,
        model,
        apiEndpoint: '/v3/bytedance/metered/contents/generations/tasks',
        resultApiEndpoint: '/v3/bytedance/metered/contents/generations/tasks/{id}',
        protocol: 'bytedance-oversea-content-generation-metered',
        billing: 'tokens',
      },
      formSchema: buildNovitaFormSchema(model),
      formValues: {
        prompt: '', firstFrame: '', firstFrameFile: [], lastFrame: '', lastFrameFile: [],
        referenceImages: [], referenceImageFiles: [],
        referenceVideos: [], referenceAudios: [], resolution: '480p', duration: 5,
        ratio: '16:9', generateAudio: true, returnLastFrame: false,
        watermark: false, seed: -1,
      },
      cancelable: true,
    };
  }
  if (isNovitaGpt56Model(model)) {
    return {
      provider: NOVITA_SCHEME,
      metadata: {
        scheme: NOVITA_SCHEME,
        model,
        apiEndpoint: '/openai/v1/responses',
        alternateApiEndpoint: '/openai/v1/chat/completions',
        protocol: 'openai-responses-or-chat-completions',
        supportedApiModes: ['responses', 'chat_completions'],
        defaultApiMode: 'responses',
      },
      formSchema: buildNovitaFormSchema(model),
      formValues: {
        apiMode: 'responses', systemPrompt: '', prompt: '', urls: [],
        reasoningEffort: 'medium', reasoningSummary: '', responseFormat: 'text',
        verbosity: 'medium', stream: false,
      },
      cancelable: false,
    };
  }
  if (isNovitaGptImageModel(model)) {
    return {
      provider: NOVITA_SCHEME,
      metadata: {
        scheme: NOVITA_SCHEME,
        model,
        apiEndpoint: '/openai/v1/images/generations',
        editApiEndpoint: '/openai/v1/images/edits',
        protocol: 'openai-images-token-billing',
        billing: 'tokens',
        requestModes: { generation: 'application/json', editing: 'multipart/form-data' },
      },
      formSchema: buildNovitaFormSchema(model),
      formValues: {
        prompt: '', urls: [], mask: [], n: 1, size: '1024x1024', quality: 'high',
        outputFormat: 'png', outputCompression: 100, background: 'auto', moderation: 'low',
        inputFidelity: 'high',
      },
      cancelable: false,
    };
  }
  return {
    provider: NOVITA_SCHEME,
    metadata: {
      scheme: NOVITA_SCHEME,
      model,
      apiEndpoint: `/v1/models/${model}:generateContent`,
      protocol: 'google-gemini-generate-content-token-billing',
      billing: 'tokens',
      responseModalitiesDefault: ['IMAGE'],
    },
    formSchema: buildNovitaFormSchema(model),
    formValues: {
      prompt: '',
      urls: [],
      aspectRatio: '16:9',
      imageSize: '2K',
      includeTextResponse: false,
    },
    cancelable: false,
  };
}

export async function createNovitaTaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (options?.signal?.aborted) throw createAbortError('Novita task aborted before execution');

  const model = parseNovitaModel(url);
  if (isNovitaAsyncModel(model)) {
    throw new Error(`novita model ${model} uses asynchronous execution`);
  }
  const config = ensureNovitaConfig(platformConfig);
  if (isNovitaGpt56Model(model)) {
    return createNovitaGpt56Task(model, payload, config, platformConfig, options);
  }
  if (isNovitaGptImageModel(model)) {
    return createNovitaGptImageTask(model, payload, config, options);
  }
  const requestBody = buildNovitaRequestBody(payload);

  try {
    const response = await fetch(buildNovitaEndpoint(config, model), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: toAbortSignal(options?.signal),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Novita API error: HTTP ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }

    const result = await response.json();
    const outputs = normalizeNovitaOutputs(result);
    if (outputs.length === 0) {
      const detail = result?.error?.message || result?.error?.code || 'candidates contain no output parts';
      throw new Error(`Novita API returned no image or text output: ${detail}`);
    }

    const totalTokens = result?.usageMetadata?.totalTokenCount ?? result?.usage_metadata?.total_token_count;
    return {
      provider: NOVITA_SCHEME,
      taskId: `novita-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: typeof totalTokens === 'number' ? totalTokens : undefined,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('Novita API')) throw error;
    const wrappedError = new Error(`Novita API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

export async function createNovitaTaskAsync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  if (options?.signal?.aborted) throw createAbortError('Novita task creation aborted');
  const model = parseNovitaModel(url);
  if (!isNovitaAsyncModel(model)) {
    throw new Error(`novita model ${model} does not use asynchronous execution`);
  }
  const config = ensureNovitaConfig(platformConfig);
  if (isNovitaVeo31Model(model)) {
    const requestBody = buildNovitaVeo31RequestBody(model, payload);
    const apiVersion = normalizeNovitaVeo31ApiVersion(
      payload.veo31ApiVersion ?? payload.veo31_api_version ??
      platformConfig?.veo31ApiVersion ?? platformConfig?.veo31_api_version
    );
    const result = await requestNovitaSeedanceJson(
      buildNovitaVeo31CreateEndpoint(config, model, apiVersion),
      config.apiKey,
      { method: 'POST', body: JSON.stringify(requestBody) },
      options
    );
    const taskId = result?.name ?? result?.data?.name;
    if (typeof taskId !== 'string' || !taskId) {
      throw new Error('Novita Veo 3.1 API did not return a task name');
    }
    return {
      provider: NOVITA_SCHEME,
      taskId,
      status: 'pending',
      raw: result,
      metadata: { model, apiVersion },
    };
  }
  if (isNovitaKlingV3Model(model)) {
    const requestBody = buildNovitaKlingV3RequestBody(model, payload);
    const result = await requestNovitaSeedanceJson(
      buildNovitaAsyncCreateEndpoint(config, model),
      config.apiKey,
      { method: 'POST', body: JSON.stringify(requestBody) },
      options
    );
    const taskId = result?.task_id ?? result?.data?.task_id;
    if (typeof taskId !== 'string' || !taskId) {
      throw new Error('Novita Kling v3 API did not return a task_id');
    }
    return {
      provider: NOVITA_SCHEME,
      taskId,
      status: 'pending',
      raw: result,
      metadata: { model },
    };
  }
  const requestBody = buildNovitaSeedanceOverseaRequestBody(model, payload);
  const result = await requestNovitaSeedanceJson(
    buildNovitaSeedanceOverseaCreateEndpoint(config),
    config.apiKey,
    { method: 'POST', body: JSON.stringify(requestBody) },
    options
  );
  const data = result?.data ?? result;
  const taskId = data?.id;
  if (typeof taskId !== 'string' || !taskId) {
    throw new Error('Novita Seedance oversea API did not return an id');
  }
  return {
    provider: NOVITA_SCHEME,
    taskId,
    status: 'pending',
    raw: result,
    metadata: { model },
  };
}

export async function checkNovitaStatus(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  const model = parseNovitaModel(url);
  if (isNovitaKlingV3Model(model) || isNovitaVeo31Model(model)) {
    const data = await fetchNovitaAsyncTask(taskId, platformConfig, options);
    return {
      provider: NOVITA_SCHEME,
      taskId,
      status: mapNovitaAsyncStatus(data?.task?.status),
      progress: typeof data?.task?.progress_percent === 'number'
        ? data.task.progress_percent
        : undefined,
      raw: data,
    };
  }
  ensureNovitaSeedanceOverseaModel(url);
  const data = await fetchNovitaSeedanceOverseaTask(taskId, platformConfig, options);
  return {
    provider: NOVITA_SCHEME,
    taskId,
    status: mapNovitaSeedanceOverseaStatus(data?.status),
    raw: data,
  };
}

export async function getNovitaResult(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const model = parseNovitaModel(url);
  if (isNovitaKlingV3Model(model) || isNovitaVeo31Model(model)) {
    const data = await fetchNovitaAsyncTask(taskId, platformConfig, options);
    const status = mapNovitaAsyncStatus(data?.task?.status);
    if (status !== 'succeeded') {
      throw new Error(
        `Novita ${isNovitaVeo31Model(model) ? 'Veo 3.1' : 'Kling v3'} task ${taskId} is not completed ` +
        `(status=${status}, reason=${data?.task?.reason || 'task result is not ready'})`
      );
    }
    const videoItems = Array.isArray(data?.videos) ? data.videos
      : Array.isArray(data?.task?.videos) ? data.task.videos
        : Array.isArray(data?.response?.videos) ? data.response.videos : [];
    const outputs = videoItems
      .filter((item: any) => typeof item?.video_url === 'string' && item.video_url)
      .map((item: any) => ({
        url: item.video_url,
        rawData: item,
        mimeType: item.video_type === 'gif' ? 'image/gif' : 'video/mp4',
        type: 'video',
      }));
    if (!outputs.length) {
      throw new Error(
        `Novita ${isNovitaVeo31Model(model) ? 'Veo 3.1' : 'Kling v3'} task succeeded ` +
        'but returned no videos[].video_url'
      );
    }
    return { provider: NOVITA_SCHEME, taskId, status: 'succeeded', outputs, raw: data };
  }
  ensureNovitaSeedanceOverseaModel(url);
  const data = await fetchNovitaSeedanceOverseaTask(taskId, platformConfig, options);
  const status = mapNovitaSeedanceOverseaStatus(data?.status);
  if (status !== 'succeeded') {
    const reason = data?.error?.message || data?.error?.code || 'task result is not ready';
    throw new Error(
      `Novita Seedance oversea task ${taskId} is not completed (status=${status}, reason=${reason})`
    );
  }
  const videoUrl = data?.content?.video_url ?? data?.content?.url;
  if (typeof videoUrl !== 'string' || !videoUrl) {
    throw new Error(
      'Novita Seedance oversea task succeeded but returned no content.video_url or content.url'
    );
  }
  const totalTokens = data?.usage?.total_tokens ?? data?.usage?.totalTokens;
  return {
    provider: NOVITA_SCHEME,
    taskId,
    status: 'succeeded',
    outputs: [{ url: videoUrl, rawData: data.content, mimeType: 'video/mp4', type: 'video' }],
    costCoins: typeof totalTokens === 'number' ? totalTokens : undefined,
    raw: data,
  };
}

export async function cancelNovitaTask(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<void> {
  const model = parseNovitaModel(url);
  if (isNovitaKlingV3Model(model) || isNovitaVeo31Model(model)) {
    throw new Error(
      `Novita ${isNovitaVeo31Model(model) ? 'Veo 3.1' : 'Kling v3'} tasks ` +
      'do not expose a cancellation endpoint'
    );
  }
  ensureNovitaSeedanceOverseaModel(url);
  if (!taskId) throw new Error('novita Seedance oversea cancellation requires a taskId');
  if (options?.signal?.aborted) throw createAbortError('Novita task cancellation aborted');
  const config = ensureNovitaConfig(platformConfig);
  await requestNovitaSeedanceJson(
    buildNovitaSeedanceOverseaTaskEndpoint(config, taskId),
    config.apiKey,
    { method: 'DELETE' },
    options
  );
}

async function fetchNovitaSeedanceOverseaTask(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('novita Seedance oversea task result requires a taskId');
  if (options?.signal?.aborted) throw createAbortError('Novita task request aborted');
  const config = ensureNovitaConfig(platformConfig);
  const result = await requestNovitaSeedanceJson(
    buildNovitaSeedanceOverseaTaskEndpoint(config, taskId),
    config.apiKey,
    { method: 'GET' },
    options
  );
  return result?.data ?? result;
}

async function fetchNovitaAsyncTask(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('novita async task result requires a taskId');
  if (options?.signal?.aborted) throw createAbortError('Novita task request aborted');
  const config = ensureNovitaConfig(platformConfig);
  return requestNovitaSeedanceJson(
    buildNovitaAsyncTaskResultEndpoint(config, taskId),
    config.apiKey,
    { method: 'GET' },
    options
  );
}

async function requestNovitaSeedanceJson(
  endpoint: string,
  apiKey: string,
  init: RequestInit,
  options?: TaskRequestOptions
): Promise<any> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    signal: toAbortSignal(options?.signal),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Novita API error: HTTP ${response.status}${text ? ` ${text}` : ''}`);
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Novita Seedance oversea API returned invalid JSON');
  }
}

function ensureNovitaSeedanceOverseaModel(url: URL): string {
  const model = parseNovitaModel(url);
  if (!isNovitaSeedanceOverseaModel(model)) {
    throw new Error(`novita model ${model} does not use asynchronous execution`);
  }
  return model;
}

export function mapNovitaSeedanceOverseaStatus(
  value: unknown
): 'pending' | 'running' | 'succeeded' | 'failed' {
  switch (String(value || '').toLowerCase()) {
    case 'queued':
    case 'pending': return 'pending';
    case 'running':
    case 'processing': return 'running';
    case 'succeeded': return 'succeeded';
    case 'failed':
    case 'cancelled':
    case 'expired': return 'failed';
    default: return 'pending';
  }
}

export function mapNovitaAsyncStatus(
  value: unknown
): 'pending' | 'running' | 'succeeded' | 'failed' {
  switch (String(value || '').toUpperCase()) {
    case 'TASK_STATUS_QUEUED': return 'pending';
    case 'TASK_STATUS_PROCESSING': return 'running';
    case 'TASK_STATUS_SUCCEED': return 'succeeded';
    case 'TASK_STATUS_FAILED': return 'failed';
    default: return 'pending';
  }
}

export function buildNovitaVeo31RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isNovitaVeo31Model(model)) {
    throw new Error(`novita ${model} is not a supported Veo 3.1 model`);
  }
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) throw new Error(`novita ${model} requires a non-empty prompt`);

  const image = normalizeNovitaVeo31Image(
    payload.image ?? payload.firstFrame ?? payload.first_frame,
    'image'
  );
  const lastFrame = normalizeNovitaVeo31Image(
    payload.lastFrame ?? payload.last_frame,
    'lastFrame'
  );
  if (lastFrame && !image) {
    throw new Error(`novita ${model} lastFrame requires image (the first frame)`);
  }

  const aspectRatio = normalizeNovitaVeo31Enum(
    payload.aspectRatio ?? payload.aspect_ratio ?? '16:9',
    ['16:9', '9:16'],
    'aspectRatio'
  );
  const resolution = normalizeNovitaVeo31Enum(
    payload.resolution ?? '720p',
    ['720p', '1080p'],
    'resolution'
  );
  const durationSeconds = normalizeNovitaSeedanceInteger(
    payload.durationSeconds ?? payload.duration_seconds ?? 8,
    4,
    8,
    'durationSeconds'
  );
  if (![4, 6, 8].includes(durationSeconds)) {
    throw new Error(`novita ${model} durationSeconds must be one of: 4, 6, 8`);
  }
  const sampleCount = normalizeNovitaSeedanceInteger(
    payload.sampleCount ?? payload.sample_count ?? 1,
    1,
    4,
    'sampleCount'
  );

  const instance: Record<string, any> = { prompt };
  if (image) instance.image = image;
  if (lastFrame) instance.lastFrame = lastFrame;
  const parameters: Record<string, any> = {
    aspectRatio,
    resolution,
    durationSeconds,
    sampleCount,
    generateAudio: normalizeNovitaSeedanceBoolean(
      payload.generateAudio ?? payload.generate_audio,
      true
    ),
  };
  const negativePrompt = typeof (payload.negativePrompt ?? payload.negative_prompt) === 'string'
    ? String(payload.negativePrompt ?? payload.negative_prompt).trim()
    : '';
  if (negativePrompt) parameters.negativePrompt = negativePrompt;
  const personGeneration = payload.personGeneration ?? payload.person_generation;
  if (personGeneration != null && personGeneration !== '') {
    parameters.personGeneration = normalizeNovitaVeo31Enum(
      personGeneration,
      ['allow_adult', 'disallow'],
      'personGeneration'
    );
  }
  if (payload.enhancePrompt != null || payload.enhance_prompt != null) {
    parameters.enhancePrompt = normalizeNovitaSeedanceBoolean(
      payload.enhancePrompt ?? payload.enhance_prompt,
      true
    );
  }
  if (payload.seed != null && payload.seed !== '') {
    parameters.seed = normalizeNovitaSeedanceInteger(
      payload.seed,
      0,
      4294967295,
      'seed'
    );
  }
  return { instances: [instance], parameters };
}

function normalizeNovitaVeo31Image(
  value: unknown,
  field: string
): { mimeType: string; bytesBase64Encoded: string } | undefined {
  const item: any = Array.isArray(value) ? value[0] : value;
  if (item == null || item === '') return undefined;
  const inline = item?.inlineData ?? item?.inline_data;
  let mimeType = String(
    item?.mimeType ?? item?.mime_type ?? inline?.mimeType ?? inline?.mime_type ?? ''
  ).toLowerCase();
  let data = typeof item === 'string'
    ? item.trim()
    : String(
      item?.bytesBase64Encoded ?? item?.bytes_base64_encoded ?? item?.data ?? inline?.data ?? ''
    ).trim();
  const dataUrl = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=\s]+)$/i.exec(data);
  if (dataUrl) {
    mimeType = dataUrl[1].toLowerCase();
    data = dataUrl[2].replace(/\s/g, '');
  } else {
    data = data.replace(/\s/g, '');
  }
  if (!['image/jpeg', 'image/png'].includes(mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new Error(
      `novita Veo 3.1 ${field} must be a JPEG/PNG base64 data URL or native image object`
    );
  }
  const approximateBytes = Math.floor(data.length * 0.75);
  if (approximateBytes > 20 * 1024 * 1024) {
    throw new Error(`novita Veo 3.1 ${field} must not exceed 20MB`);
  }
  return { mimeType, bytesBase64Encoded: data };
}

function normalizeNovitaVeo31Enum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`novita Veo 3.1 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function normalizeNovitaVeo31ApiVersion(value: unknown): 'v1' | 'v1beta1' {
  const normalized = String(value ?? 'v1').replace(/^\/+|\/+$/g, '');
  if (normalized !== 'v1' && normalized !== 'v1beta1') {
    throw new Error('novita Veo 3.1 API version must be v1 or v1beta1');
  }
  return normalized;
}

export function buildNovitaKlingV3RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isNovitaKlingV3Model(model)) {
    throw new Error(`novita ${model} is not a supported Kling v3 model`);
  }
  const prompt = normalizeNovitaKlingText(payload.prompt, 'prompt');
  const negativePrompt = normalizeNovitaKlingText(
    payload.negative_prompt ?? payload.negativePrompt,
    'negative_prompt'
  );
  if (model.endsWith('motion-control')) {
    const image = chooseNovitaKlingImage(
      payload.imageUrl ?? payload.image_url,
      payload.image,
      'image',
      true
    )!;
    const video = normalizeNovitaKlingHttpUrl(payload.video, 'video', true)!;
    const modelName = normalizeNovitaKlingEnum(
      payload.model_name ?? payload.modelName ?? 'kling-v3-0-std',
      ['kling-v3-0-std', 'kling-v3-0-pro'],
      'model_name'
    );
    const characterOrientation = normalizeNovitaKlingEnum(
      payload.character_orientation ?? payload.characterOrientation,
      ['image', 'video'],
      'character_orientation'
    );
    const body: Record<string, any> = {
      image,
      video,
      model_name: modelName,
      keep_original_sound: normalizeNovitaSeedanceBoolean(
        payload.keep_original_sound ?? payload.keepOriginalSound,
        true
      ),
      character_orientation: characterOrientation,
    };
    if (prompt) body.prompt = prompt;
    if (negativePrompt) body.negative_prompt = negativePrompt;
    return body;
  }

  const imageToVideo = model.endsWith('-i2v');
  const pro = model.includes('-pro-');
  const supportsObjectMultiPrompt = model === 'kling-v3.0-std-i2v' || model === 'kling-v3.0-4k-i2v';
  const supportsMultiPrompt = pro || supportsObjectMultiPrompt;
  const multiPrompt = normalizeNovitaKlingMultiPrompt(
    payload.multi_prompt ?? payload.multiPrompt,
    supportsObjectMultiPrompt
  );
  if (!supportsMultiPrompt && multiPrompt.length) {
    throw new Error(`novita ${model} does not support multi_prompt`);
  }
  if (pro && prompt && multiPrompt.length) {
    throw new Error(`novita ${model} prompt and multi_prompt are mutually exclusive`);
  }
  if (!prompt && !(pro && multiPrompt.length)) {
    throw new Error(`novita ${model} requires a non-empty prompt`);
  }
  const duration = normalizeNovitaSeedanceInteger(payload.duration ?? 5, 3, 15, 'duration');
  const cfgScale = normalizeNovitaKlingNumber(
    payload.cfg_scale ?? payload.cfgScale ?? 0.5,
    0,
    1,
    'cfg_scale'
  );
  const body: Record<string, any> = {
    sound: normalizeNovitaSeedanceBoolean(payload.sound, false),
    duration,
    cfg_scale: cfgScale,
  };
  if (prompt) body.prompt = prompt;
  if (negativePrompt) body.negative_prompt = negativePrompt;
  if (multiPrompt.length) body.multi_prompt = multiPrompt;
  if (imageToVideo) {
    body.image = chooseNovitaKlingImage(
      payload.imageUrl ?? payload.image_url,
      payload.image,
      'image',
      true
    );
    const endImage = chooseNovitaKlingImage(
      payload.endImageUrl ?? payload.end_image_url,
      payload.end_image ?? payload.endImage,
      'end_image',
      false
    );
    if (endImage && multiPrompt.length) {
      throw new Error(`novita ${model} end_image and multi_prompt cannot be used together`);
    }
    if (endImage) body.end_image = endImage;
  } else {
    body.aspect_ratio = normalizeNovitaKlingEnum(
      payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
      ['16:9', '9:16', '1:1'],
      'aspect_ratio'
    );
  }
  return body;
}

function normalizeNovitaKlingText(value: unknown, field: string): string {
  if (value == null) return '';
  const text = String(value).trim();
  if (text.length > 2500) throw new Error(`novita Kling v3 ${field} must not exceed 2500 characters`);
  return text;
}

function chooseNovitaKlingImage(
  urlValue: unknown,
  uploadValue: unknown,
  field: string,
  required: boolean
): string | undefined {
  const url = normalizeNovitaKlingImage(urlValue, `${field}Url`, false);
  const upload = normalizeNovitaKlingImage(uploadValue, field, false);
  if (url && upload) throw new Error(`novita Kling v3 accepts either ${field} URL or upload, not both`);
  const selected = upload ?? url;
  if (!selected && required) throw new Error(`novita Kling v3 ${field} is required`);
  return selected;
}

function normalizeNovitaKlingImage(
  value: unknown,
  field: string,
  required: boolean
): string | undefined {
  const item: any = Array.isArray(value) ? value[0] : value;
  const inline = item?.inlineData ?? item?.inline_data;
  const candidate = typeof item === 'string'
    ? item.trim()
    : typeof item?.url === 'string'
      ? item.url.trim()
      : typeof item?.data === 'string' && item.data.trim()
        ? (item.data.startsWith('data:')
          ? item.data.trim()
          : `data:${item.mimeType ?? item.mime_type ?? 'image/png'};base64,${item.data.trim()}`)
        : typeof inline?.data === 'string' && inline.data.trim()
          ? `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data.trim()}`
          : '';
  if (!candidate) {
    if (required) throw new Error(`novita Kling v3 ${field} is required`);
    return undefined;
  }
  if (/^https?:\/\//i.test(candidate)) return candidate;
  const match = candidate.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error(`novita Kling v3 ${field} must be a JPG/PNG URL or base64 data URL`);
  }
  const approximateBytes = Math.floor(match[2].replace(/\s/g, '').length * 0.75);
  if (approximateBytes > 10 * 1024 * 1024) {
    throw new Error(`novita Kling v3 ${field} must not exceed 10MB`);
  }
  return candidate;
}

function normalizeNovitaKlingHttpUrl(
  value: unknown,
  field: string,
  required: boolean
): string | undefined {
  const candidate = typeof value === 'string'
    ? value.trim()
    : typeof (value as any)?.url === 'string' ? (value as any).url.trim() : '';
  if (!candidate) {
    if (required) throw new Error(`novita Kling v3 ${field} URL is required`);
    return undefined;
  }
  if (!/^https?:\/\//i.test(candidate)) {
    throw new Error(`novita Kling v3 ${field} must be a public HTTP(S) URL`);
  }
  return candidate;
}

function normalizeNovitaKlingMultiPrompt(value: unknown, objectMode: boolean): any[] {
  if (value == null || value === '') return [];
  const items = Array.isArray(value) ? value : [value];
  return items.filter(item => item != null && item !== '').map((item, index) => {
    if (objectMode) {
      const prompt = normalizeNovitaKlingText((item as any)?.prompt, `multi_prompt[${index}].prompt`);
      if (!prompt) throw new Error(`novita Kling v3 multi_prompt[${index}].prompt is required`);
      return {
        prompt,
        duration: normalizeNovitaSeedanceInteger(
          (item as any)?.duration ?? 5,
          3,
          15,
          `multi_prompt[${index}].duration`
        ),
      };
    }
    const prompt = normalizeNovitaKlingText(item, `multi_prompt[${index}]`);
    if (!prompt) throw new Error(`novita Kling v3 multi_prompt[${index}] is required`);
    return prompt;
  });
}

function normalizeNovitaKlingNumber(
  value: unknown,
  min: number,
  max: number,
  field: string
): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`novita Kling v3 ${field} must be between ${min} and ${max}`);
  }
  return number;
}

function normalizeNovitaKlingEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`novita Kling v3 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

export function buildNovitaSeedanceOverseaRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isNovitaSeedanceOverseaModel(model)) {
    throw new Error(`novita ${model} is not a supported Seedance oversea model`);
  }
  const resolution = String(payload.resolution ?? '480p').toLowerCase();
  if (!['480p', '720p', '1080p'].includes(resolution)) {
    throw new Error(`novita ${model} resolution must be one of: 480p, 720p, 1080p`);
  }
  if ((model.includes('-fast-') || model.includes('-mini-')) && resolution === '1080p') {
    throw new Error(`novita ${model} does not support 1080p`);
  }
  const duration = normalizeNovitaSeedanceInteger(payload.duration ?? 5, 4, 15, 'duration');
  const ratio = String(payload.ratio ?? '16:9');
  const ratios = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'];
  if (!ratios.includes(ratio)) {
    throw new Error(`novita ${model} ratio must be one of: ${ratios.join(', ')}`);
  }
  const content = Array.isArray(payload.content)
    ? normalizeNovitaSeedanceContent(model, payload.content)
    : buildNovitaSeedanceContent(model, payload);
  validateNovitaSeedanceContent(model, content, ratio);
  return {
    model,
    content,
    resolution,
    ratio,
    duration,
    generate_audio: normalizeNovitaSeedanceBoolean(
      payload.generate_audio ?? payload.generateAudio, true
    ),
    return_last_frame: normalizeNovitaSeedanceBoolean(
      payload.return_last_frame ?? payload.returnLastFrame, false
    ),
    watermark: normalizeNovitaSeedanceBoolean(payload.watermark, false),
    seed: normalizeNovitaSeedanceInteger(payload.seed ?? -1, -1, 4294967295, 'seed'),
  };
}

function buildNovitaSeedanceContent(model: string, payload: Record<string, any>): any[] {
  const content: any[] = [];
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (prompt) content.push({ type: 'text', text: prompt });
  const firstFrameUrl = normalizeNovitaSeedanceUrl(
    payload.first_frame ?? payload.firstFrame, 'first_frame', false, true
  );
  const firstFrameFile = normalizeNovitaSeedanceUrl(
    payload.first_frame_file ?? payload.firstFrameFile ?? payload.image,
    'first_frame_file', false, true
  );
  if (firstFrameUrl && firstFrameFile) {
    throw new Error(`novita ${model} accepts either firstFrame or firstFrameFile, not both`);
  }
  const firstFrame = firstFrameFile ?? firstFrameUrl;
  const lastFrameUrl = normalizeNovitaSeedanceUrl(
    payload.last_frame ?? payload.lastFrame, 'last_frame', false, true
  );
  const lastFrameFile = normalizeNovitaSeedanceUrl(
    payload.last_frame_file ?? payload.lastFrameFile ?? payload.lastImage,
    'last_frame_file', false, true
  );
  if (lastFrameUrl && lastFrameFile) {
    throw new Error(`novita ${model} accepts either lastFrame or lastFrameFile, not both`);
  }
  const lastFrame = lastFrameFile ?? lastFrameUrl;
  if (firstFrame) content.push(novitaSeedanceMediaItem('image_url', firstFrame, 'first_frame'));
  if (lastFrame) content.push(novitaSeedanceMediaItem('image_url', lastFrame, 'last_frame'));
  const referenceImages = [
    ...normalizeNovitaSeedanceUrlList(
      payload.reference_images ?? payload.referenceImages, 'reference_images', true
    ),
    ...normalizeNovitaSeedanceUrlList(
      payload.reference_image_files ?? payload.referenceImageFiles,
      'reference_image_files', true
    ),
  ];
  if (referenceImages.length > 9) {
    throw new Error(`novita ${model} supports at most 9 reference images`);
  }
  for (const mediaUrl of referenceImages) {
    content.push(novitaSeedanceMediaItem('image_url', mediaUrl, 'reference_image'));
  }
  for (const mediaUrl of normalizeNovitaSeedanceUrlList(
    payload.reference_videos ?? payload.referenceVideos, 'reference_videos'
  )) content.push(novitaSeedanceMediaItem('video_url', mediaUrl, 'reference_video'));
  for (const mediaUrl of normalizeNovitaSeedanceUrlList(
    payload.reference_audios ?? payload.referenceAudios, 'reference_audios'
  )) content.push(novitaSeedanceMediaItem('audio_url', mediaUrl, 'reference_audio'));
  if (content.length === 0) {
    throw new Error(`novita ${model} requires a prompt or input material`);
  }
  return content;
}

function normalizeNovitaSeedanceContent(model: string, value: any[]): any[] {
  if (value.length === 0) throw new Error(`novita ${model} content must not be empty`);
  return value.map((item, index) => {
    const type = String(item?.type ?? '');
    if (type === 'text') {
      if (item?.role != null) {
        throw new Error(`novita ${model} content[${index}] text must not have role`);
      }
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) throw new Error(`novita ${model} content[${index}].text must be non-empty`);
      return { type: 'text', text };
    }
    if (!['image_url', 'video_url', 'audio_url'].includes(type)) {
      throw new Error(`novita ${model} content[${index}].type is unsupported`);
    }
    const mediaUrl = normalizeNovitaSeedanceUrl(
      item?.[type]?.url, `content[${index}].${type}.url`, true, type === 'image_url'
    )!;
    const allowedRoles: Record<string, string[]> = {
      image_url: ['first_frame', 'last_frame', 'reference_image'],
      video_url: ['reference_video'],
      audio_url: ['reference_audio'],
    };
    const role = item?.role == null || item.role === '' ? undefined : String(item.role);
    if (role && !allowedRoles[type].includes(role)) {
      throw new Error(`novita ${model} content[${index}].role is invalid for ${type}`);
    }
    if (type !== 'image_url' && !role) {
      throw new Error(`novita ${model} content[${index}].role is required for ${type}`);
    }
    const normalized: any = { type, [type]: { url: mediaUrl } };
    if (role) normalized.role = role;
    return normalized;
  });
}

function validateNovitaSeedanceContent(model: string, content: any[], ratio: string): void {
  const images = content.filter(item => item.type === 'image_url');
  const firstFrames = images.filter(item => !item.role || item.role === 'first_frame').length;
  const lastFrames = images.filter(item => item.role === 'last_frame').length;
  const referenceImages = images.filter(item => item.role === 'reference_image').length;
  const referenceVideos = content.filter(item => item.role === 'reference_video').length;
  const referenceAudios = content.filter(item => item.role === 'reference_audio').length;
  if (firstFrames > 1) throw new Error(`novita ${model} supports at most one first_frame`);
  if (lastFrames > 1) throw new Error(`novita ${model} supports at most one last_frame`);
  if (referenceImages > 9) {
    throw new Error(`novita ${model} supports at most 9 reference images`);
  }
  if (lastFrames > 0 && firstFrames === 0) {
    throw new Error(`novita ${model} last_frame requires first_frame`);
  }
  const frameMode = firstFrames > 0 || lastFrames > 0;
  const referenceMode = referenceImages > 0 || referenceVideos > 0 || referenceAudios > 0;
  if (frameMode && referenceMode) {
    throw new Error(`novita ${model} frame inputs cannot be mixed with reference materials`);
  }
  if (referenceAudios > 0 && referenceImages === 0 && referenceVideos === 0) {
    throw new Error(`novita ${model} reference_audio requires a reference image or video`);
  }
  if (!frameMode && !referenceMode && ratio === 'adaptive') {
    throw new Error(`novita ${model} text-to-video does not support adaptive ratio`);
  }
}

function normalizeNovitaSeedanceUrlList(
  value: unknown,
  field: string,
  allowImageData = false
): string[] {
  if (value == null || value === '') return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter(item => item != null && item !== '')
    .map((item, index) => normalizeNovitaSeedanceUrl(
      item, `${field}[${index}]`, true, allowImageData
    )!);
}

function normalizeNovitaSeedanceUrl(
  value: unknown,
  field: string,
  required: boolean,
  allowImageData = false
): string | undefined {
  const item: any = Array.isArray(value) ? value[0] : value;
  const inlineData = item?.inlineData ?? item?.inline_data;
  const candidate = typeof item === 'string'
    ? item.trim()
    : typeof item?.url === 'string'
      ? item.url.trim()
      : typeof item?.data === 'string' && item.data.trim()
        ? (item.data.startsWith('data:')
          ? item.data.trim()
          : `data:${item.mimeType ?? item.mime_type ?? 'image/png'};base64,${item.data.trim()}`)
        : typeof inlineData?.data === 'string' && inlineData.data.trim()
          ? `data:${inlineData.mimeType ?? inlineData.mime_type ?? 'image/png'};base64,${inlineData.data.trim()}`
          : '';
  if (!candidate) {
    if (required) throw new Error(`novita Seedance oversea ${field} requires a URL`);
    return undefined;
  }
  if (/^asset:\/\/[A-Za-z0-9._-]+$/.test(candidate)) return candidate;
  if (candidate.startsWith('data:')) {
    if (allowImageData && /^data:image\/(?:jpeg|png|webp|bmp|tiff|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(candidate)) {
      return candidate;
    }
    throw new Error(
      `novita Seedance oversea ${field} must be a supported base64 image data URL`
    );
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(
      `novita Seedance oversea ${field} must be a public HTTP(S), asset://, or image data URL`
    );
  }
  return candidate;
}

function novitaSeedanceMediaItem(
  type: 'image_url' | 'video_url' | 'audio_url',
  mediaUrl: string,
  role: string
): any {
  return { type, [type]: { url: mediaUrl }, role };
}

function normalizeNovitaSeedanceInteger(
  value: unknown,
  min: number,
  max: number,
  field: string
): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(
      `novita Seedance oversea ${field} must be an integer between ${min} and ${max}`
    );
  }
  return number;
}

function normalizeNovitaSeedanceBoolean(value: unknown, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 1 || String(value).toLowerCase() === 'true') return true;
  if (value === 0 || String(value).toLowerCase() === 'false') return false;
  throw new Error('novita Seedance oversea boolean fields must be true or false');
}

async function createNovitaGpt56Task(
  model: string,
  payload: Record<string, any>,
  config: ReturnType<typeof ensureNovitaConfig>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const apiMode = normalizeNovitaGpt56Mode(
    payload.apiMode ?? payload.api_mode ?? payload.wireApi ?? payload.wire_api ??
    platformConfig?.wireApi ?? platformConfig?.wire_api ?? 'responses'
  );
  const requestBody = apiMode === 'responses'
    ? buildNovitaGpt56ResponsesBody(model, payload)
    : buildNovitaGpt56ChatBody(model, payload);
  const endpoint = apiMode === 'responses'
    ? buildNovitaResponsesEndpoint(config)
    : buildNovitaChatCompletionsEndpoint(config);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: toAbortSignal(options?.signal),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Novita API error: HTTP ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }
    const contentType = response.headers.get('content-type') || '';
    const result = requestBody.stream || contentType.includes('text/event-stream')
      ? apiMode === 'responses'
        ? parseNovitaResponsesSse(await response.text())
        : parseNovitaChatSse(await response.text(), model)
      : await response.json();
    const outputs = apiMode === 'responses'
      ? normalizeNovitaResponsesOutputs(result)
      : normalizeNovitaChatOutputs(result);
    if (outputs.length === 0) {
      throw new Error(`Novita GPT-5.6 ${apiMode} API returned no text or tool-call output`);
    }
    const totalTokens = result?.usage?.total_tokens ?? result?.usage?.totalTokens;
    return {
      provider: NOVITA_SCHEME,
      taskId: result?.id || `novita-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: typeof totalTokens === 'number' ? totalTokens : undefined,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('Novita API')) throw error;
    const wrappedError = new Error(`Novita API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

export function buildNovitaGpt56ResponsesBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  rejectNovitaGpt56TopP(payload);
  const input = normalizeNovitaResponsesInput(payload);
  if (typeof input === 'string' ? !input.trim() : !Array.isArray(input) || input.length === 0) {
    throw new Error('novita GPT-5.6 Responses API requires a non-empty input or prompt');
  }
  const body: Record<string, any> = { model, input };
  const instructions = payload.instructions ?? payload.systemPrompt ?? payload.system_prompt;
  if (typeof instructions === 'string' && instructions.trim()) body.instructions = instructions.trim();
  const maxTokens = payload.max_output_tokens ?? payload.maxOutputTokens;
  if (maxTokens != null && maxTokens !== '') {
    body.max_output_tokens = normalizeNovitaGpt56Integer(maxTokens, 1, 'max_output_tokens');
  }
  if (payload.temperature != null && payload.temperature !== '') {
    body.temperature = normalizeNovitaGpt56Number(payload.temperature, 0, 2, 'temperature');
  }
  const effort = payload.reasoning?.effort ?? payload.reasoning_effort ?? payload.reasoningEffort;
  const summary = payload.reasoning?.summary ?? payload.reasoning_summary ?? payload.reasoningSummary;
  if (effort || summary) {
    body.reasoning = {};
    if (effort) body.reasoning.effort = normalizeNovitaGpt56Enum(
      effort, ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const, 'reasoning.effort'
    );
    if (summary) body.reasoning.summary = normalizeNovitaGpt56Enum(
      summary, ['auto', 'concise', 'detailed'] as const, 'reasoning.summary'
    );
  }
  if (payload.text && typeof payload.text === 'object') {
    body.text = payload.text;
  } else {
    const responseFormat = payload.response_format ?? payload.responseFormat;
    const verbosity = payload.verbosity;
    if (payload.jsonSchema) {
      body.text = { format: {
        type: 'json_schema', name: payload.jsonSchemaName || 'response', schema: payload.jsonSchema,
      } };
    } else if (responseFormat === 'json_object') {
      body.text = { format: { type: 'json_object' } };
    } else if (responseFormat && responseFormat !== 'text') {
      throw new Error('novita GPT-5.6 Responses responseFormat must be text or json_object');
    }
    if (verbosity) {
      body.text ??= { format: { type: 'text' } };
      body.text.verbosity = normalizeNovitaGpt56Enum(
        verbosity, ['low', 'medium', 'high'] as const, 'text.verbosity'
      );
    }
  }
  copyNovitaGpt56CommonTools(payload, body);
  if (payload.previous_response_id || payload.previousResponseId) {
    body.previous_response_id = payload.previous_response_id ?? payload.previousResponseId;
  }
  const maxToolCalls = payload.max_tool_calls ?? payload.maxToolCalls;
  if (maxToolCalls != null && maxToolCalls !== '') {
    body.max_tool_calls = normalizeNovitaGpt56Integer(maxToolCalls, 1, 'max_tool_calls');
  }
  if (payload.parallel_tool_calls != null || payload.parallelToolCalls != null) {
    body.parallel_tool_calls = Boolean(payload.parallel_tool_calls ?? payload.parallelToolCalls);
  }
  if (payload.store != null) body.store = Boolean(payload.store);
  if (payload.metadata && typeof payload.metadata === 'object') body.metadata = payload.metadata;
  body.stream = Boolean(payload.stream);
  return body;
}

export function buildNovitaGpt56ChatBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  rejectNovitaGpt56TopP(payload);
  const messages = normalizeNovitaChatMessages(payload);
  const body: Record<string, any> = { model, messages, stream: Boolean(payload.stream) };
  const maxTokens = payload.max_completion_tokens ?? payload.maxCompletionTokens ??
    payload.max_output_tokens ?? payload.maxOutputTokens;
  if (maxTokens != null && maxTokens !== '') {
    body.max_completion_tokens = normalizeNovitaGpt56Integer(maxTokens, 1, 'max_completion_tokens');
  }
  if (payload.temperature != null && payload.temperature !== '') {
    body.temperature = normalizeNovitaGpt56Number(payload.temperature, 0, 2, 'temperature');
  }
  const frequencyPenalty = payload.frequency_penalty ?? payload.frequencyPenalty;
  if (frequencyPenalty != null && frequencyPenalty !== '') {
    body.frequency_penalty = normalizeNovitaGpt56Number(
      frequencyPenalty, -2, 2, 'frequency_penalty'
    );
  }
  const effort = payload.reasoning_effort ?? payload.reasoningEffort;
  if (effort) body.reasoning_effort = normalizeNovitaGpt56Enum(
    effort, ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const, 'reasoning_effort'
  );
  const responseFormat = payload.response_format ?? payload.responseFormat;
  if (typeof responseFormat === 'string') {
    if (!['text', 'json_object'].includes(responseFormat)) {
      throw new Error('novita GPT-5.6 Chat responseFormat must be text, json_object, or an object');
    }
    body.response_format = { type: responseFormat };
  } else if (responseFormat && typeof responseFormat === 'object') {
    body.response_format = responseFormat;
  }
  copyNovitaGpt56CommonTools(payload, body);
  if (body.stream) {
    body.stream_options = payload.stream_options ?? payload.streamOptions ?? { include_usage: true };
  }
  return body;
}

function normalizeNovitaGpt56Mode(value: unknown): 'responses' | 'chat_completions' {
  const mode = String(value).trim().toLowerCase().replace(/[/-]/g, '_');
  if (mode === 'response' || mode === 'responses') return 'responses';
  if (mode === 'chat' || mode === 'chat_completion' || mode === 'chat_completions') {
    return 'chat_completions';
  }
  throw new Error('novita GPT-5.6 apiMode must be responses or chat_completions');
}

function normalizeNovitaResponsesInput(payload: Record<string, any>): string | any[] {
  if (payload.input != null) return payload.input;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const images = normalizeNovitaGpt56Images(payload.urls ?? payload.images);
  if (images.length === 0) return prompt;
  const content: any[] = [];
  if (prompt) content.push({ type: 'input_text', text: prompt });
  for (const imageUrl of images) content.push({ type: 'input_image', image_url: imageUrl });
  return [{ role: 'user', content }];
}

function normalizeNovitaChatMessages(payload: Record<string, any>): any[] {
  if (payload.messages != null) {
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      throw new Error('novita GPT-5.6 Chat messages must be a non-empty array');
    }
    return payload.messages.map((message: any, index: number) => {
      if (!message || !['system', 'developer', 'user', 'assistant', 'tool'].includes(message.role)) {
        throw new Error(`novita GPT-5.6 Chat messages[${index}] has an invalid role`);
      }
      if (message.content == null && !message.tool_calls) {
        throw new Error(`novita GPT-5.6 Chat messages[${index}] requires content or tool_calls`);
      }
      return message;
    });
  }
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const images = normalizeNovitaGpt56Images(payload.urls ?? payload.images);
  if (!prompt && images.length === 0) {
    throw new Error('novita GPT-5.6 Chat requires a non-empty prompt, messages, or image');
  }
  const messages: any[] = [];
  const systemPrompt = payload.systemPrompt ?? payload.system_prompt ?? payload.instructions;
  if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  if (images.length === 0) {
    messages.push({ role: 'user', content: prompt });
  } else {
    const content: any[] = [];
    if (prompt) content.push({ type: 'text', text: prompt });
    for (const imageUrl of images) content.push({ type: 'image_url', image_url: { url: imageUrl } });
    messages.push({ role: 'user', content });
  }
  return messages;
}

function normalizeNovitaGpt56Images(value: unknown): string[] {
  const values = normalizeArray(value);
  if (values.length > 500) {
    throw new Error('novita GPT-5.6 supports at most 500 image inputs per request');
  }
  return values.map((item: any, index: number) => {
    if (typeof item === 'string' && item.trim()) return item.trim();
    if (typeof item?.url === 'string' && item.url.trim()) return item.url.trim();
    const inline = item?.inlineData ?? item?.inline_data ?? item;
    if (typeof inline?.data === 'string' && inline.data.trim()) {
      return inline.data.startsWith('data:')
        ? inline.data
        : `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data}`;
    }
    throw new Error(`novita GPT-5.6 image[${index}] is empty or invalid`);
  });
}

function copyNovitaGpt56CommonTools(payload: Record<string, any>, body: Record<string, any>): void {
  if (Array.isArray(payload.tools)) body.tools = payload.tools;
  if (payload.tool_choice != null || payload.toolChoice != null) {
    body.tool_choice = payload.tool_choice ?? payload.toolChoice;
  }
}

function rejectNovitaGpt56TopP(payload: Record<string, any>): void {
  if (payload.top_p != null || payload.topP != null) {
    throw new Error(
      'novita GPT-5.6 models do not support top_p; omit it and use reasoning effort instead'
    );
  }
}

function normalizeNovitaGpt56Enum<T extends string>(
  value: unknown, allowed: readonly T[], field: string
): T {
  const normalized = String(value).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`novita GPT-5.6 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function normalizeNovitaGpt56Number(
  value: unknown, min: number, max: number, field: string
): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`novita GPT-5.6 ${field} must be between ${min} and ${max}`);
  }
  return number;
}

function normalizeNovitaGpt56Integer(value: unknown, min: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    throw new Error(`novita GPT-5.6 ${field} must be an integer greater than or equal to ${min}`);
  }
  return number;
}

function normalizeNovitaResponsesOutputs(response: any): any[] {
  const outputs: any[] = [];
  for (const item of response?.output ?? []) {
    if (item?.type === 'message') {
      for (const content of item?.content ?? []) {
        if (typeof content?.text === 'string' && content.text) {
          outputs.push({ rawData: content, text: content.text, mimeType: 'text/plain' });
        }
      }
    } else if (item?.type === 'function_call' || item?.type === 'custom_tool_call') {
      outputs.push({
        rawData: item, type: item.type, name: item.name,
        arguments: item.arguments ?? item.input, callId: item.call_id,
        mimeType: 'application/json',
      });
    }
  }
  return outputs;
}

function normalizeNovitaChatOutputs(response: any): any[] {
  const outputs: any[] = [];
  for (const choice of response?.choices ?? []) {
    const message = choice?.message ?? {};
    const content = typeof message.content === 'string'
      ? message.content
      : Array.isArray(message.content)
        ? message.content.map((part: any) => part?.text ?? '').join('') : '';
    if (content) {
      outputs.push({
        rawData: choice, text: content, mimeType: 'text/plain',
        finishReason: choice.finish_reason,
      });
    } else if (typeof message.reasoning_content === 'string' && message.reasoning_content) {
      outputs.push({
        rawData: choice, text: message.reasoning_content,
        mimeType: 'text/plain', type: 'reasoning',
      });
    }
    for (const call of message.tool_calls ?? []) {
      outputs.push({
        rawData: call, type: 'function_call', name: call?.function?.name,
        arguments: call?.function?.arguments, callId: call?.id,
        mimeType: 'application/json',
      });
    }
  }
  return outputs;
}

function parseNovitaResponsesSse(text: string): any {
  const events = parseNovitaSseEvents(text);
  const failed = [...events].reverse().find(event => event?.type === 'response.failed');
  if (failed) {
    throw new Error(failed?.response?.error?.message || failed?.error?.message || 'Responses stream failed');
  }
  const completed = [...events].reverse().find(event => event?.type === 'response.completed');
  if (completed?.response) return completed.response;
  const outputText = events
    .filter(event => event?.type === 'response.output_text.delta' && typeof event.delta === 'string')
    .map(event => event.delta).join('');
  if (!outputText) throw new Error('novita GPT-5.6 Responses stream ended without output');
  return {
    object: 'response', status: 'completed',
    output: [{
      type: 'message', status: 'completed', role: 'assistant',
      content: [{ type: 'output_text', text: outputText, annotations: [] }],
    }],
    stream_events: events,
  };
}

function parseNovitaChatSse(text: string, model: string): any {
  const events = parseNovitaSseEvents(text);
  let content = '';
  let reasoningContent = '';
  let id: string | undefined;
  let created: number | undefined;
  let usage: any;
  let finishReason: string | null = null;
  const toolCalls: any[] = [];
  for (const event of events) {
    if (event?.error) throw new Error(event.error.message || 'Chat stream failed');
    id ||= event.id;
    created ||= event.created;
    if (event.usage) usage = event.usage;
    for (const choice of event.choices ?? []) {
      const delta = choice.delta ?? {};
      if (typeof delta.content === 'string') content += delta.content;
      if (typeof delta.reasoning_content === 'string') reasoningContent += delta.reasoning_content;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      for (const call of delta.tool_calls ?? []) {
        const index = Number.isInteger(call.index) ? call.index : toolCalls.length;
        const current = toolCalls[index] ?? {
          index, type: 'function', function: { name: '', arguments: '' },
        };
        if (call.id) current.id = call.id;
        if (call.function?.name) current.function.name += call.function.name;
        if (call.function?.arguments) current.function.arguments += call.function.arguments;
        toolCalls[index] = current;
      }
    }
  }
  if (!content && !reasoningContent && toolCalls.length === 0) {
    throw new Error('novita GPT-5.6 Chat stream ended without output');
  }
  const message: Record<string, any> = { role: 'assistant', content: content || null };
  if (reasoningContent) message.reasoning_content = reasoningContent;
  if (toolCalls.length) message.tool_calls = toolCalls;
  return {
    id, created, model, object: 'chat.completion',
    choices: [{ index: 0, finish_reason: finishReason, message }],
    usage, stream_events: events,
  };
}

function parseNovitaSseEvents(text: string): any[] {
  const events: any[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try { events.push(JSON.parse(data)); } catch { /* Ignore heartbeat lines. */ }
  }
  return events;
}

async function createNovitaGptImageTask(
  model: string,
  payload: Record<string, any>,
  config: ReturnType<typeof ensureNovitaConfig>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const images = normalizeArray(payload.urls ?? payload.images ?? payload.image);
  const mask = firstValue(payload.mask);
  const edit = images.length > 0 || mask != null;
  const outputFormat = normalizeGptImageEnum(
    payload.output_format ?? payload.outputFormat ?? 'png',
    ['png', 'jpeg', 'webp'] as const,
    'output_format'
  );
  const requestBody = edit
    ? await buildNovitaGptImageEditFormData(model, payload, images, mask, outputFormat)
    : buildNovitaGptImageGenerationBody(model, payload, outputFormat);

  try {
    const response = await fetch(buildNovitaOpenAIImagesEndpoint(config, edit), {
      method: 'POST',
      headers: edit
        ? { Authorization: `Bearer ${config.apiKey}` }
        : { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: edit ? requestBody as FormData : JSON.stringify(requestBody),
      signal: toAbortSignal(options?.signal),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Novita API error: HTTP ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }
    const result = await response.json();
    const outputs = normalizeNovitaGptImageOutputs(result, outputFormat);
    if (outputs.length === 0) {
      const detail = result?.error?.message || result?.error?.code || 'response data is empty';
      throw new Error(`Novita GPT Image 2 API returned no image output: ${detail}`);
    }
    const totalTokens = result?.usage?.total_tokens ?? result?.usage?.totalTokens;
    return {
      provider: NOVITA_SCHEME,
      taskId: `novita-${result?.created ?? Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: typeof totalTokens === 'number' ? totalTokens : undefined,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('Novita API')) throw error;
    const wrappedError = new Error(`Novita API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

export function buildNovitaGptImageGenerationBody(
  model: string,
  payload: Record<string, any>,
  normalizedOutputFormat?: 'png' | 'jpeg' | 'webp'
): Record<string, any> {
  const prompt = requireGptImagePrompt(payload.prompt);
  const outputFormat = normalizedOutputFormat ?? normalizeGptImageEnum(
    payload.output_format ?? payload.outputFormat ?? 'png',
    ['png', 'jpeg', 'webp'] as const,
    'output_format'
  );
  const body = buildGptImageCommonBody(model, payload, prompt, outputFormat);
  body.moderation = normalizeGptImageEnum(
    payload.moderation ?? 'low', ['low', 'auto'] as const, 'moderation'
  );
  return body;
}

export async function buildNovitaGptImageEditFormData(
  model: string,
  payload: Record<string, any>,
  normalizedImages?: any[],
  normalizedMask?: any,
  normalizedOutputFormat?: 'png' | 'jpeg' | 'webp'
): Promise<FormData> {
  const prompt = requireGptImagePrompt(payload.prompt);
  const images = normalizedImages ?? normalizeArray(payload.urls ?? payload.images ?? payload.image);
  if (images.length === 0) {
    throw new Error('novita GPT Image 2 editing requires at least one source image');
  }
  if (images.length > 16) {
    throw new Error('novita GPT Image 2 editing supports at most 16 source images');
  }
  const outputFormat = normalizedOutputFormat ?? normalizeGptImageEnum(
    payload.output_format ?? payload.outputFormat ?? 'png',
    ['png', 'jpeg', 'webp'] as const,
    'output_format'
  );
  const values = buildGptImageCommonBody(model, payload, prompt, outputFormat);

  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value != null) form.append(key, String(value));
  }
  for (let index = 0; index < images.length; index += 1) {
    const file = await normalizeGptImageFile(images[index], index, 'image');
    form.append('image[]', file.blob, file.name);
  }
  const mask = normalizedMask ?? firstValue(payload.mask);
  if (mask != null) {
    const file = await normalizeGptImageFile(mask, 0, 'mask');
    if (file.blob.type !== 'image/png') {
      throw new Error('novita GPT Image 2 mask must be a PNG image');
    }
    form.append('mask', file.blob, file.name);
  }
  const inputFidelity = payload.input_fidelity ?? payload.inputFidelity;
  if (inputFidelity != null && inputFidelity !== '') {
    form.append('input_fidelity', normalizeGptImageEnum(
      inputFidelity, ['high', 'low'] as const, 'input_fidelity'
    ));
  }
  return form;
}

function buildGptImageCommonBody(
  model: string,
  payload: Record<string, any>,
  prompt: string,
  outputFormat: 'png' | 'jpeg' | 'webp'
): Record<string, any> {
  const size = normalizeGptImageSize(payload.size ?? '1024x1024');
  const quality = normalizeGptImageEnum(
    payload.quality ?? 'high', ['low', 'medium', 'high', 'auto'] as const, 'quality'
  );
  const n = normalizeInteger(payload.n ?? 1, 1, 10, 'n');
  const background = normalizeGptImageEnum(
    payload.background ?? 'auto', ['auto', 'opaque', 'transparent'] as const, 'background'
  );
  if (background === 'transparent' && outputFormat === 'jpeg') {
    throw new Error('novita GPT Image 2 transparent background requires output_format=png or webp');
  }

  const body: Record<string, any> = {
    model, prompt, size, quality, output_format: outputFormat, n, background,
  };
  if (outputFormat === 'jpeg' || outputFormat === 'webp') {
    body.output_compression = normalizeInteger(
      payload.output_compression ?? payload.outputCompression ?? 100,
      0, 100, 'output_compression'
    );
  }
  if (payload.user != null && String(payload.user).trim()) body.user = String(payload.user).trim();
  return body;
}

function requireGptImagePrompt(value: unknown): string {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt) throw new Error('novita GPT Image 2 requires a non-empty prompt');
  if (prompt.length > 32000) throw new Error('novita GPT Image 2 prompt must not exceed 32000 characters');
  return prompt;
}

function normalizeGptImageSize(value: unknown): string {
  const size = String(value).trim().toLowerCase();
  if (size === 'auto') return size;
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) throw new Error('novita GPT Image 2 size must be auto or WIDTHxHEIGHT');
  const width = Number(match[1]);
  const height = Number(match[2]);
  const longer = Math.max(width, height);
  const shorter = Math.min(width, height);
  const ratio = width / height;
  if (width % 16 !== 0 || height % 16 !== 0) {
    throw new Error('novita GPT Image 2 width and height must both be divisible by 16');
  }
  if (ratio < 1 / 3 || ratio > 3 || longer > 3840 || shorter > 2160) {
    throw new Error('novita GPT Image 2 size must use a 1:3 to 3:1 ratio and not exceed 3840x2160');
  }
  return `${width}x${height}`;
}

function normalizeGptImageEnum<T extends string>(
  value: unknown, allowed: readonly T[], field: string
): T {
  const normalized = String(value).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`novita GPT Image 2 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function normalizeInteger(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`novita GPT Image 2 ${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function normalizeArray(value: unknown): any[] {
  return value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
}

function firstValue(value: unknown): any {
  return Array.isArray(value) ? value[0] : value == null || value === '' ? undefined : value;
}

async function normalizeGptImageFile(
  value: any,
  index: number,
  field: 'image' | 'mask'
): Promise<{ blob: Blob; name: string }> {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return { blob: value, name: (value as any).name || `${field}-${index + 1}.${extensionForMime(value.type)}` };
  }
  const candidate = typeof value === 'string'
    ? value.trim()
    : value?.inlineData ?? value?.inline_data ?? value;
  if (typeof candidate === 'string') {
    if (/^https?:\/\//i.test(candidate)) {
      const response = await fetch(candidate);
      if (!response.ok) throw new Error(`novita GPT Image 2 could not download ${field}[${index}]`);
      const blob = await response.blob();
      return { blob, name: `${field}-${index + 1}.${extensionForMime(blob.type)}` };
    }
    const match = /^data:([^;]+);base64,(.+)$/s.exec(candidate);
    return blobFromBase64(match?.[2] ?? candidate, match?.[1] ?? 'image/png', field, index);
  }
  const data = typeof candidate?.data === 'string' ? candidate.data.trim() : '';
  if (data) {
    return blobFromBase64(
      data, candidate.mimeType ?? candidate.mime_type ?? 'image/png', field, index,
      candidate.name
    );
  }
  throw new Error(
    `novita GPT Image 2 ${field}[${index}] must be a Blob, base64 string, data URL, URL, or inlineData object`
  );
}

function blobFromBase64(
  data: string,
  mimeType: string,
  field: string,
  index: number,
  name?: string
): { blob: Blob; name: string } {
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return {
      blob: new Blob([bytes], { type: mimeType }),
      name: name || `${field}-${index + 1}.${extensionForMime(mimeType)}`,
    };
  } catch {
    throw new Error(`novita GPT Image 2 ${field}[${index}] contains invalid base64 data`);
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

export function buildNovitaRequestBody(payload: Record<string, any>): Record<string, any> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const imageValues = payload.urls ?? payload.images ?? payload.image;
  const images = imageValues == null || imageValues === ''
    ? []
    : Array.isArray(imageValues) ? imageValues : [imageValues];
  if (!prompt && images.length === 0) {
    throw new Error('novita image generation requires a prompt or at least one reference image');
  }

  const parts: Record<string, any>[] = [];
  if (prompt) parts.push({ text: prompt });
  images.forEach((image: any, index: number) => {
    parts.push({ inlineData: normalizeNovitaImage(image, index) });
  });

  const generationConfig: Record<string, any> = {
    responseModalities: normalizeResponseModalities(payload),
  };
  const aspectRatio = payload.imageConfig?.aspectRatio ?? payload.aspect_ratio ?? payload.aspectRatio;
  const imageSize = payload.imageConfig?.imageSize ?? payload.image_size ?? payload.imageSize;
  if (aspectRatio || imageSize) {
    generationConfig.imageConfig = {};
    if (aspectRatio) generationConfig.imageConfig.aspectRatio = String(aspectRatio);
    if (imageSize) generationConfig.imageConfig.imageSize = normalizeImageSize(imageSize);
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig,
  };
}

function normalizeNovitaImage(value: any, index: number): { mimeType: string; data: string } {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dataUrl = /^data:([^;]+);base64,(.+)$/s.exec(trimmed);
    if (dataUrl) return { mimeType: dataUrl[1], data: dataUrl[2] };
    if (trimmed && !/^https?:\/\//i.test(trimmed)) return { mimeType: 'image/png', data: trimmed };
  }

  const inlineData = value?.inlineData ?? value?.inline_data ?? value;
  const data = typeof inlineData?.data === 'string' ? inlineData.data.trim() : '';
  if (data) {
    return {
      mimeType: inlineData.mimeType ?? inlineData.mime_type ?? 'image/png',
      data,
    };
  }
  throw new Error(
    `novita reference image[${index}] must be a base64 string, image data URL, or inlineData object`
  );
}

function normalizeResponseModalities(payload: Record<string, any>): ('TEXT' | 'IMAGE')[] {
  const configured = payload.responseModalities ?? payload.response_modalities;
  const values = configured == null
    ? (payload.includeTextResponse ? ['TEXT', 'IMAGE'] : ['IMAGE'])
    : Array.isArray(configured) ? configured : [configured];
  if (values.length === 0) return ['IMAGE'];

  return values.map((value: unknown) => {
    const normalized = String(value).toUpperCase();
    if (normalized !== 'TEXT' && normalized !== 'IMAGE') {
      throw new Error('novita responseModalities only supports TEXT and IMAGE');
    }
    return normalized;
  });
}

function normalizeImageSize(value: unknown): string {
  const imageSize = String(value).toUpperCase();
  if (!['1K', '2K', '4K'].includes(imageSize)) {
    throw new Error('novita imageSize must be one of: 1K, 2K, 4K');
  }
  return imageSize;
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function toAbortSignal(signal: TaskRequestOptions['signal']): AbortSignal | undefined {
  if (!signal) return undefined;
  if (typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal) return signal;
  return undefined;
}
