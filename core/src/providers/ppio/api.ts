import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import { buildPpioFormSchema } from './formily.ts';
import {
  buildPpioEndpoint,
  buildPpioChatEndpoint,
  buildPpioGptImageEndpoint,
  buildPpioResponseEndpoint,
  buildPpioSeedanceEndpoint,
  buildPpioTaskResultEndpoint,
  buildPpioVeoEndpoint,
  buildPpioAsyncEndpoint,
  buildPpioMinimaxH3CreateEndpoint,
  buildPpioMinimaxH3QueryEndpoint,
  buildPpioSeedanceCnMeteredCreateEndpoint,
  buildPpioSeedanceCnMeteredQueryEndpoint,
  createAbortError,
  ensurePpioConfig,
  isPpioChatModel,
  isPpioResponseModel,
  isPpioAsyncModel,
  isPpioVeoModel,
  isPpioKlingV3Model,
  isPpioHailuo23Model,
  isPpioMinimaxH3Model,
  isPpioSeedanceCnMeteredModel,
  mapPpioAsyncStatus,
  normalizePpioAsyncOutputs,
  isRequestAborted,
  normalizePpioOutputs,
  PPIO_GPT_IMAGE_MODEL,
  PPIO_FUSION_MODEL,
  PPIO_SEEDANCE_MODEL,
  PPIO_MINIMAX_H3_MODEL,
  parsePpioModel,
  toAbortSignal,
} from './helpers.ts';

const PPIO_SCHEME = 'ppio';

export async function describePpio(
  url: URL,
  _platformConfig?: PlatformConfig,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parsePpioModel(url);

  if (model === PPIO_FUSION_MODEL) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/chat/completions',
        protocol: 'openai-chat-completions',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        systemPrompt: '',
        prompt: '',
        responseFormat: 'text',
        stream: true,
      },
      cancelable: false,
    };
  }

  if (model === PPIO_SEEDANCE_MODEL) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/seedance-2.0',
        resultApiEndpoint: '/task-result',
        protocol: 'ppio-async',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        image: [],
        lastImage: [],
        referenceImages: [],
        referenceVideos: [],
        referenceAudios: [],
        fast: false,
        resolution: '720p',
        ratio: '16:9',
        duration: 5,
        seed: -1,
        watermark: false,
        webSearch: false,
        generateAudio: false,
        returnLastFrame: false,
      },
      cancelable: false,
    };
  }

  if (isPpioSeedanceCnMeteredModel(model)) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/v3/bytedance-cn/metered/contents/generations/tasks',
        resultApiEndpoint: '/v3/bytedance-cn/metered/contents/generations/tasks/{id}',
        protocol: 'bytedance-cn-content-generation-metered',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        firstFrame: '',
        lastFrame: '',
        referenceImages: [],
        referenceVideos: [],
        referenceAudios: [],
        resolution: '480p',
        duration: 5,
        ratio: '16:9',
        generateAudio: true,
        returnLastFrame: false,
        watermark: false,
        seed: -1,
      },
      cancelable: false,
    };
  }

  if (isPpioVeoModel(model)) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: `/v1/models/${model}:predictLongRunning`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'google-veo-predict-long-running',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        image: [],
        lastFrame: [],
        aspectRatio: '16:9',
        resolution: '720p',
        durationSeconds: 8,
        sampleCount: 1,
        generateAudio: true,
        negativePrompt: '',
        enhancePrompt: true,
        personGeneration: 'allow_adult',
        resizeMode: 'pad',
        compressionQuality: 'optimized',
        storageUri: '',
      },
      cancelable: false,
    };
  }

  if (isPpioKlingV3Model(model)) {
    const motionControl = model.endsWith('-motion-control');
    const imageToVideo = model.endsWith('-i2v');
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'ppio-async',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: motionControl ? {
        image: [],
        video: '',
        prompt: '',
        negativePrompt: '',
        modelName: 'kling-v3-0-std',
        keepOriginalSound: true,
        characterOrientation: 'image',
      } : {
        prompt: '',
        negativePrompt: '',
        image: imageToVideo ? [] : undefined,
        endImage: imageToVideo ? [] : undefined,
        multiPrompt: [],
        duration: 5,
        cfgScale: 0.5,
        aspectRatio: imageToVideo ? undefined : '16:9',
        sound: false,
      },
      cancelable: false,
    };
  }

  if (isPpioHailuo23Model(model)) {
    const imageToVideo = model.endsWith('-i2v');
    const fast = model.includes('-fast-');
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: `/v3/async/${model}`,
        resultApiEndpoint: '/v3/async/task-result',
        protocol: 'ppio-async',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        image: imageToVideo ? [] : undefined,
        duration: 6,
        resolution: '768P',
        enablePromptExpansion: true,
        fastPretreatment: fast ? undefined : false,
        aigcWatermark: false,
      },
      cancelable: false,
    };
  }

  if (isPpioMinimaxH3Model(model)) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/v3/minimax/v2/video_generation',
        resultApiEndpoint: '/v3/minimax/v2/query/video_generation/{task_id}',
        protocol: 'minimax-video-generation-v2',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        firstFrame: '',
        lastFrame: '',
        referenceImages: [],
        referenceVideos: [],
        referenceAudios: [],
        resolution: '768P',
        duration: 4,
        ratio: '16:9',
        aigcWatermark: false,
      },
      cancelable: false,
    };
  }

  if (isPpioResponseModel(model)) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/responses',
        protocol: 'openai-responses',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        instructions: '',
        urls: [],
        reasoningEffort: 'medium',
        reasoningSummary: '',
        verbosity: 'medium',
        stream: false,
      },
      cancelable: false,
    };
  }

  if (model === PPIO_GPT_IMAGE_MODEL) {
    return {
      provider: PPIO_SCHEME,
      metadata: {
        scheme: PPIO_SCHEME,
        model,
        apiEndpoint: '/gpt-image-2-text-to-image',
        editApiEndpoint: '/gpt-image-2-edit',
      },
      formSchema: buildPpioFormSchema(model),
      formValues: {
        prompt: '',
        urls: [],
        mask: [],
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        background: 'auto',
        moderation: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
      },
      cancelable: false,
    };
  }

  return {
    provider: PPIO_SCHEME,
    metadata: {
      scheme: PPIO_SCHEME,
      model,
      apiEndpoint: `/v1beta1/models/${model}:generateContent`,
    },
    formSchema: buildPpioFormSchema(model),
    formValues: {
      prompt: '',
      urls: [],
      aspectRatio: '16:9',
      imageSize: '2K',
    },
    cancelable: false,
  };
}

export async function createPpioTaskAsync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Task creation aborted');
  }

  const model = parsePpioModel(url);
  if (!isPpioAsyncModel(model)) {
    throw new Error(`ppio model ${model} does not use asynchronous execution`);
  }

  const config = ensurePpioConfig(platformConfig);
  const isVeo = isPpioVeoModel(model);
  const isKlingV3 = isPpioKlingV3Model(model);
  const isHailuo23 = isPpioHailuo23Model(model);
  const isMinimaxH3 = isPpioMinimaxH3Model(model);
  const isSeedanceCnMetered = isPpioSeedanceCnMeteredModel(model);
  const requestBody = isVeo
    ? buildPpioVeoRequestBody(payload)
    : isKlingV3
      ? buildPpioKlingV3RequestBody(model, payload)
      : isHailuo23
        ? buildPpioHailuo23RequestBody(model, payload)
        : isMinimaxH3
          ? buildPpioMinimaxH3RequestBody(payload)
          : isSeedanceCnMetered
            ? buildPpioSeedanceCnMeteredRequestBody(model, payload)
            : buildPpioSeedanceRequestBody(payload);
  const result = await requestPpioJson(
    isVeo
      ? buildPpioVeoEndpoint(config, model)
      : isKlingV3 || isHailuo23
        ? buildPpioAsyncEndpoint(config, model)
        : isMinimaxH3
          ? buildPpioMinimaxH3CreateEndpoint(config)
          : isSeedanceCnMetered
            ? buildPpioSeedanceCnMeteredCreateEndpoint(config)
            : buildPpioSeedanceEndpoint(config),
    config.apiKey,
    { method: 'POST', body: JSON.stringify(requestBody) },
    options
  );
  const data = result?.data ?? result;
  const taskId = isVeo ? data?.name : isSeedanceCnMetered ? data?.id : data?.task_id;
  if (typeof taskId !== 'string' || !taskId) {
    const apiName = isVeo ? 'Veo' : isKlingV3 ? 'Kling V3.0' : isHailuo23 ? 'Hailuo 2.3' : isMinimaxH3 ? 'MiniMax H3' : isSeedanceCnMetered ? 'Seedance CN metered' : 'Seedance';
    const idField = isVeo ? 'name' : isSeedanceCnMetered ? 'id' : 'task_id';
    throw new Error(`PPIO ${apiName} API did not return a ${idField}`);
  }

  return {
    provider: PPIO_SCHEME,
    taskId,
    status: 'pending',
    raw: result,
    metadata: isVeo || isKlingV3 || isHailuo23 || isMinimaxH3 || isSeedanceCnMetered
      ? { model }
      : { model, fast: requestBody.fast },
  };
}

export async function checkPpioStatus(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  const model = ensurePpioAsyncModel(url);
  if (isPpioSeedanceCnMeteredModel(model)) {
    const result = await fetchPpioSeedanceCnMeteredTaskResult(taskId, platformConfig, options);
    const data = result?.data ?? result;
    return {
      provider: PPIO_SCHEME,
      taskId,
      status: mapPpioSeedanceCnMeteredStatus(data?.status),
      raw: data,
    };
  }
  if (isPpioMinimaxH3Model(model)) {
    const result = await fetchPpioMinimaxH3TaskResult(taskId, platformConfig, options);
    const data = result?.data ?? result;
    const task = data?.task ?? data;
    return {
      provider: PPIO_SCHEME,
      taskId,
      status: mapPpioMinimaxH3Status(task?.status),
      raw: data,
    };
  }
  const result = await fetchPpioTaskResult(taskId, platformConfig, options);
  const data = result?.data ?? result;
  const task = data?.task ?? data;
  const progress = Number(task?.progress_percent);

  return {
    provider: PPIO_SCHEME,
    taskId,
    status: mapPpioAsyncStatus(task?.status),
    progress: Number.isFinite(progress) ? progress : undefined,
    raw: data,
  };
}

export async function getPpioResult(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const model = ensurePpioAsyncModel(url);
  if (isPpioSeedanceCnMeteredModel(model)) {
    const result = await fetchPpioSeedanceCnMeteredTaskResult(taskId, platformConfig, options);
    const data = result?.data ?? result;
    const status = mapPpioSeedanceCnMeteredStatus(data?.status);
    if (status !== 'succeeded') {
      const reason = data?.error?.message || data?.error?.code || 'task result is not ready';
      throw new Error(`PPIO Seedance CN metered task ${taskId} is not completed (status=${status}, reason=${reason})`);
    }
    const videoUrl = data?.content?.video_url ?? data?.content?.url;
    if (typeof videoUrl !== 'string' || !videoUrl) {
      throw new Error('PPIO Seedance CN metered task succeeded but returned no content.video_url or content.url');
    }
    return {
      provider: PPIO_SCHEME,
      taskId,
      status: 'succeeded',
      outputs: [{ url: videoUrl, rawData: data.content, mimeType: 'video/mp4', type: 'video' }],
      raw: data,
    };
  }
  if (isPpioMinimaxH3Model(model)) {
    const result = await fetchPpioMinimaxH3TaskResult(taskId, platformConfig, options);
    const data = result?.data ?? result;
    const task = data?.task ?? data;
    const status = mapPpioMinimaxH3Status(task?.status);
    if (status !== 'succeeded') {
      const reason = task?.error?.message || task?.error?.code || 'task result is not ready';
      throw new Error(`PPIO MiniMax H3 task ${taskId} is not completed (status=${status}, reason=${reason})`);
    }
    const videoUrl = task?.content?.url ?? task?.content?.video_url;
    if (typeof videoUrl !== 'string' || !videoUrl) {
      throw new Error('PPIO MiniMax H3 task succeeded but returned no content.url or content.video_url');
    }
    return {
      provider: PPIO_SCHEME,
      taskId,
      status: 'succeeded',
      outputs: [{ url: videoUrl, rawData: task.content, mimeType: 'video/mp4', type: 'video' }],
      raw: data,
    };
  }
  const result = await fetchPpioTaskResult(taskId, platformConfig, options);
  const data = result?.data ?? result;
  const status = mapPpioAsyncStatus(data?.task?.status ?? data?.status);
  if (status !== 'succeeded') {
    const reason = data?.task?.reason || data?.reason || 'task result is not ready';
    throw new Error(`PPIO async task ${taskId} is not completed (status=${status}, reason=${reason})`);
  }

  const outputs = normalizePpioAsyncOutputs(data);
  if (outputs.length === 0) {
    throw new Error('PPIO async task succeeded but returned no media output');
  }

  return {
    provider: PPIO_SCHEME,
    taskId,
    status: 'succeeded',
    outputs,
    raw: data,
  };
}

async function fetchPpioTaskResult(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('ppio task result requires a taskId');
  if (isRequestAborted(options?.signal)) throw createAbortError('Task request aborted');
  const config = ensurePpioConfig(platformConfig);
  return requestPpioJson(
    buildPpioTaskResultEndpoint(config, taskId),
    config.apiKey,
    { method: 'GET' },
    options
  );
}

async function fetchPpioMinimaxH3TaskResult(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('ppio MiniMax H3 task result requires a taskId');
  if (isRequestAborted(options?.signal)) throw createAbortError('Task request aborted');
  const config = ensurePpioConfig(platformConfig);
  return requestPpioJson(
    buildPpioMinimaxH3QueryEndpoint(config, taskId),
    config.apiKey,
    { method: 'GET' },
    options
  );
}

async function fetchPpioSeedanceCnMeteredTaskResult(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('ppio Seedance CN metered task result requires a taskId');
  if (isRequestAborted(options?.signal)) throw createAbortError('Task request aborted');
  const config = ensurePpioConfig(platformConfig);
  return requestPpioJson(
    buildPpioSeedanceCnMeteredQueryEndpoint(config, taskId),
    config.apiKey,
    { method: 'GET' },
    options
  );
}

function mapPpioSeedanceCnMeteredStatus(value: unknown): 'pending' | 'running' | 'succeeded' | 'failed' {
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

function mapPpioMinimaxH3Status(value: unknown): 'pending' | 'running' | 'succeeded' | 'failed' {
  switch (String(value || '').toLowerCase()) {
    case 'queued': return 'pending';
    case 'running': return 'running';
    case 'succeeded': return 'succeeded';
    case 'failed':
    case 'cancelled': return 'failed';
    default: return 'pending';
  }
}

async function requestPpioJson(
  endpoint: string,
  apiKey: string,
  init: RequestInit,
  options?: TaskRequestOptions
): Promise<any> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(init.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: toAbortSignal(options?.signal),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`PPIO API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }
    return await response.json();
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('PPIO API')) throw error;
    const wrappedError = new Error(`PPIO API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

function ensurePpioAsyncModel(url: URL): string {
  const model = parsePpioModel(url);
  if (!isPpioAsyncModel(model)) {
    throw new Error(`ppio model ${model} does not support async task polling`);
  }
  return model;
}

function buildPpioSeedanceRequestBody(payload: Record<string, any>): Record<string, any> {
  const fast = Boolean(payload.fast);
  const resolution = normalizeSeedanceEnum(payload.resolution ?? '720p', ['480p', '720p', '1080p'], 'resolution');
  if (fast && resolution === '1080p') {
    throw new Error('ppio seedance-2.0 fast mode does not support 1080p');
  }

  const image = normalizeSeedanceSingleMedia(payload.image ?? payload.urls, 'image');
  const lastImage = normalizeSeedanceSingleMedia(payload.last_image ?? payload.lastImage, 'last_image');
  if (lastImage && !image) {
    throw new Error('ppio seedance-2.0 last_image requires image');
  }

  const referenceImages = normalizeSeedanceMediaList(
    payload.reference_images ?? payload.referenceImages,
    9,
    'reference_images'
  );
  const referenceVideos = normalizeSeedanceUrlList(
    payload.reference_videos ?? payload.referenceVideos,
    3,
    'reference_videos'
  );
  const referenceAudios = normalizeSeedanceMediaList(
    payload.reference_audios ?? payload.referenceAudios,
    3,
    'reference_audios'
  );
  if (referenceAudios.length > 0 && !image && referenceImages.length === 0 && referenceVideos.length === 0) {
    throw new Error('ppio seedance-2.0 reference_audios require a reference image or video');
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt && !image && referenceImages.length === 0 && referenceVideos.length === 0) {
    throw new Error('ppio seedance-2.0 text-to-video requires a non-empty prompt');
  }

  const body: Record<string, any> = {
    fast,
    seed: toSeedanceInteger(payload.seed ?? -1, -1, 4294967295, 'seed'),
    ratio: normalizeSeedanceEnum(
      payload.ratio ?? '16:9',
      ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'],
      'ratio'
    ),
    duration: toSeedanceInteger(payload.duration ?? 5, 4, 15, 'duration'),
    watermark: Boolean(payload.watermark),
    resolution,
    web_search: Boolean(payload.web_search ?? payload.webSearch),
    generate_audio: Boolean(payload.generate_audio ?? payload.generateAudio),
    return_last_frame: Boolean(payload.return_last_frame ?? payload.returnLastFrame),
  };
  if (prompt) body.prompt = prompt;
  if (image) body.image = image;
  if (lastImage) body.last_image = lastImage;
  if (referenceImages.length) body.reference_images = referenceImages;
  if (referenceVideos.length) body.reference_videos = referenceVideos;
  if (referenceAudios.length) body.reference_audios = referenceAudios;
  return body;
}

function normalizeSeedanceSingleMedia(value: unknown, field: string): string | undefined {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return undefined;
  const item = Array.isArray(value) ? value[0] : value;
  const normalized = normalizeSeedanceMedia(item);
  if (!normalized) throw new Error(`ppio seedance-2.0 ${field} is empty or invalid`);
  return normalized;
}

function normalizeSeedanceMediaList(value: unknown, max: number, field: string): string[] {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.length > max) throw new Error(`ppio seedance-2.0 ${field} supports at most ${max} items`);
  return values.map((item, index) => {
    const normalized = normalizeSeedanceMedia(item);
    if (!normalized) throw new Error(`ppio seedance-2.0 ${field}[${index}] is empty or invalid`);
    return normalized;
  });
}

function normalizeSeedanceUrlList(value: unknown, max: number, field: string): string[] {
  const values = normalizeSeedanceMediaList(value, max, field);
  for (const item of values) {
    if (!/^https?:\/\//i.test(item)) {
      throw new Error(`ppio seedance-2.0 ${field} only supports HTTP(S) URLs`);
    }
  }
  return values;
}

function normalizeSeedanceMedia(value: any): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value?.url === 'string' && value.url.trim()) return value.url.trim();
  if (typeof value?.data === 'string' && value.data.trim()) {
    return value.data.startsWith('data:')
      ? value.data
      : `data:${value.mimeType || 'application/octet-stream'};base64,${value.data}`;
  }
  if (typeof value?.inlineData?.data === 'string' && value.inlineData.data.trim()) {
    return `data:${value.inlineData.mimeType || 'application/octet-stream'};base64,${value.inlineData.data}`;
  }
  return undefined;
}

function normalizeSeedanceEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ppio seedance-2.0 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function toSeedanceInteger(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`ppio seedance-2.0 ${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function buildPpioSeedanceCnMeteredRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  const resolution = String(payload.resolution ?? '480p').toLowerCase();
  if (!['480p', '720p', '1080p'].includes(resolution)) {
    throw new Error(`ppio ${model} resolution must be one of: 480p, 720p, 1080p`);
  }
  if ((model.includes('-fast-') || model.includes('-mini-')) && resolution === '1080p') {
    throw new Error(`ppio ${model} does not support 1080p`);
  }
  const duration = toSeedanceCnMeteredInteger(payload.duration ?? 5, 4, 15, 'duration');
  const ratio = String(payload.ratio ?? '16:9');
  const ratios = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'];
  if (!ratios.includes(ratio)) {
    throw new Error(`ppio ${model} ratio must be one of: ${ratios.join(', ')}`);
  }

  const content = Array.isArray(payload.content)
    ? normalizePpioSeedanceCnMeteredContent(model, payload.content)
    : buildPpioSeedanceCnMeteredContent(model, payload);
  validatePpioSeedanceCnMeteredContent(model, content, ratio);

  const body: Record<string, any> = {
    model,
    content,
    resolution,
    ratio,
    duration,
    generate_audio: toVeoBoolean(payload.generate_audio ?? payload.generateAudio, true),
    return_last_frame: toVeoBoolean(payload.return_last_frame ?? payload.returnLastFrame, false),
    watermark: toVeoBoolean(payload.watermark, false),
    seed: toSeedanceCnMeteredInteger(payload.seed ?? -1, -1, 4294967295, 'seed'),
  };
  return body;
}

function buildPpioSeedanceCnMeteredContent(model: string, payload: Record<string, any>): any[] {
  const content: any[] = [];
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (prompt) content.push({ type: 'text', text: prompt });

  const firstFrame = normalizePpioSeedanceCnMeteredUrl(
    payload.first_frame ?? payload.firstFrame ?? payload.image,
    'first_frame',
    false
  );
  const lastFrame = normalizePpioSeedanceCnMeteredUrl(
    payload.last_frame ?? payload.lastFrame ?? payload.lastImage,
    'last_frame',
    false
  );
  if (firstFrame) content.push(seedanceCnMeteredMediaItem('image_url', firstFrame, 'first_frame'));
  if (lastFrame) content.push(seedanceCnMeteredMediaItem('image_url', lastFrame, 'last_frame'));

  for (const url of normalizePpioSeedanceCnMeteredUrlList(
    payload.reference_images ?? payload.referenceImages,
    'reference_images'
  )) content.push(seedanceCnMeteredMediaItem('image_url', url, 'reference_image'));
  for (const url of normalizePpioSeedanceCnMeteredUrlList(
    payload.reference_videos ?? payload.referenceVideos,
    'reference_videos'
  )) content.push(seedanceCnMeteredMediaItem('video_url', url, 'reference_video'));
  for (const url of normalizePpioSeedanceCnMeteredUrlList(
    payload.reference_audios ?? payload.referenceAudios,
    'reference_audios'
  )) content.push(seedanceCnMeteredMediaItem('audio_url', url, 'reference_audio'));

  if (content.length === 0) {
    throw new Error(`ppio ${model} requires a prompt or input material`);
  }
  return content;
}

function normalizePpioSeedanceCnMeteredContent(model: string, value: any[]): any[] {
  if (value.length === 0) throw new Error(`ppio ${model} content must not be empty`);
  return value.map((item, index) => {
    const type = String(item?.type ?? '');
    if (type === 'text') {
      if (item?.role != null) throw new Error(`ppio ${model} content[${index}] text must not have role`);
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) throw new Error(`ppio ${model} content[${index}].text must be non-empty`);
      return { type: 'text', text };
    }
    if (!['image_url', 'video_url', 'audio_url'].includes(type)) {
      throw new Error(`ppio ${model} content[${index}].type is unsupported`);
    }
    const url = normalizePpioSeedanceCnMeteredUrl(
      item?.[type]?.url,
      `content[${index}].${type}.url`,
      true
    )!;
    const allowedRoles: Record<string, string[]> = {
      image_url: ['first_frame', 'last_frame', 'reference_image'],
      video_url: ['reference_video'],
      audio_url: ['reference_audio'],
    };
    const role = item?.role == null || item.role === '' ? undefined : String(item.role);
    if (role && !allowedRoles[type].includes(role)) {
      throw new Error(`ppio ${model} content[${index}].role is invalid for ${type}`);
    }
    if (type !== 'image_url' && !role) {
      throw new Error(`ppio ${model} content[${index}].role is required for ${type}`);
    }
    const normalized: any = { type, [type]: { url } };
    if (role) normalized.role = role;
    return normalized;
  });
}

function validatePpioSeedanceCnMeteredContent(model: string, content: any[], ratio: string): void {
  const images = content.filter(item => item.type === 'image_url');
  const implicitFirstFrames = images.filter(item => !item.role).length;
  const firstFrames = images.filter(item => item.role === 'first_frame').length + implicitFirstFrames;
  const lastFrames = images.filter(item => item.role === 'last_frame').length;
  const referenceImages = images.filter(item => item.role === 'reference_image').length;
  const referenceVideos = content.filter(item => item.role === 'reference_video').length;
  const referenceAudios = content.filter(item => item.role === 'reference_audio').length;
  if (firstFrames > 1) throw new Error(`ppio ${model} supports at most one first_frame`);
  if (lastFrames > 1) throw new Error(`ppio ${model} supports at most one last_frame`);
  if (lastFrames > 0 && firstFrames === 0) throw new Error(`ppio ${model} last_frame requires first_frame`);
  const frameMode = firstFrames > 0 || lastFrames > 0;
  const referenceMode = referenceImages > 0 || referenceVideos > 0 || referenceAudios > 0;
  if (frameMode && referenceMode) {
    throw new Error(`ppio ${model} frame inputs cannot be mixed with reference materials`);
  }
  if (referenceAudios > 0 && referenceImages === 0 && referenceVideos === 0) {
    throw new Error(`ppio ${model} reference_audio requires a reference image or video`);
  }
  if (!frameMode && !referenceMode && ratio === 'adaptive') {
    throw new Error(`ppio ${model} text-to-video does not support adaptive ratio`);
  }
}

function normalizePpioSeedanceCnMeteredUrlList(value: unknown, field: string): string[] {
  if (value == null || value === '') return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter(item => item != null && item !== '')
    .map((item, index) => normalizePpioSeedanceCnMeteredUrl(item, `${field}[${index}]`, true)!);
}

function normalizePpioSeedanceCnMeteredUrl(
  value: unknown,
  field: string,
  required: boolean
): string | undefined {
  const item: any = Array.isArray(value) ? value[0] : value;
  const candidate = typeof item === 'string'
    ? item.trim()
    : typeof item?.url === 'string'
      ? item.url.trim()
      : '';
  if (!candidate) {
    if (required) throw new Error(`ppio Seedance CN metered ${field} requires a URL`);
    return undefined;
  }
  if (/^asset:\/\/[A-Za-z0-9._-]+$/.test(candidate)) return candidate;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(`ppio Seedance CN metered ${field} must be a public HTTP(S) or asset:// URL`);
  }
  return candidate;
}

function seedanceCnMeteredMediaItem(
  type: 'image_url' | 'video_url' | 'audio_url',
  url: string,
  role: string
): any {
  return { type, [type]: { url }, role };
}

function toSeedanceCnMeteredInteger(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`ppio Seedance CN metered ${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function buildPpioVeoRequestBody(payload: Record<string, any>): Record<string, any> {
  if (Array.isArray(payload.instances) && payload.instances.length > 0) {
    return {
      instances: payload.instances,
      parameters: payload.parameters && typeof payload.parameters === 'object'
        ? payload.parameters
        : {},
    };
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    throw new Error('ppio veo-3.1 requires a non-empty prompt');
  }

  const image = normalizePpioVeoImage(payload.image ?? payload.urls, 'image');
  const lastFrame = normalizePpioVeoImage(
    payload.lastFrame ?? payload.last_frame ?? payload.lastImage,
    'lastFrame'
  );
  if (lastFrame && !image) {
    throw new Error('ppio veo-3.1 lastFrame requires image');
  }

  const instance: Record<string, any> = { prompt };
  if (image) instance.image = image;
  if (lastFrame) instance.lastFrame = lastFrame;

  const parameters: Record<string, any> = {
    aspectRatio: normalizeVeoEnum(payload.aspectRatio ?? payload.aspect_ratio ?? '16:9', ['16:9', '9:16'], 'aspectRatio'),
    resolution: normalizeVeoEnum(payload.resolution ?? '720p', ['720p', '1080p'], 'resolution'),
    durationSeconds: toVeoInteger(payload.durationSeconds ?? payload.duration_seconds ?? 8, 4, 8, 'durationSeconds', [4, 6, 8]),
    sampleCount: toVeoInteger(payload.sampleCount ?? payload.sample_count ?? 1, 1, 4, 'sampleCount'),
    generateAudio: toVeoBoolean(payload.generateAudio ?? payload.generate_audio, true),
    enhancePrompt: toVeoBoolean(payload.enhancePrompt ?? payload.enhance_prompt, true),
    personGeneration: normalizeVeoEnum(
      payload.personGeneration ?? payload.person_generation ?? 'allow_adult',
      ['allow_adult', 'dont_allow', 'disallow'],
      'personGeneration'
    ),
    resizeMode: normalizeVeoEnum(payload.resizeMode ?? payload.resize_mode ?? 'pad', ['pad', 'crop'], 'resizeMode'),
    compressionQuality: normalizeVeoEnum(
      payload.compressionQuality ?? payload.compression_quality ?? 'optimized',
      ['optimized', 'lossless'],
      'compressionQuality'
    ),
  };

  const negativePrompt = typeof (payload.negativePrompt ?? payload.negative_prompt) === 'string'
    ? String(payload.negativePrompt ?? payload.negative_prompt).trim()
    : '';
  if (negativePrompt) parameters.negativePrompt = negativePrompt;

  if (payload.seed != null && payload.seed !== '') {
    parameters.seed = toVeoInteger(payload.seed, 0, 4294967295, 'seed');
  }

  const storageUri = typeof (payload.storageUri ?? payload.storage_uri) === 'string'
    ? String(payload.storageUri ?? payload.storage_uri).trim()
    : '';
  if (storageUri) {
    if (!storageUri.startsWith('gs://')) {
      throw new Error('ppio veo-3.1 storageUri must start with gs://');
    }
    parameters.storageUri = storageUri;
  }

  return { instances: [instance], parameters };
}

function normalizePpioVeoImage(value: unknown, field: string): Record<string, string> | undefined {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return undefined;
  const item: any = Array.isArray(value) ? value[0] : value;

  if (typeof item === 'string') {
    const match = item.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) return { mimeType: match[1], bytesBase64Encoded: match[2] };
    throw new Error(`ppio veo-3.1 ${field} must be a base64 data URL or image object`);
  }

  if (typeof item?.gcsUri === 'string' && item.gcsUri.startsWith('gs://')) {
    return { gcsUri: item.gcsUri, mimeType: item.mimeType || 'image/png' };
  }

  const mimeType = item?.mimeType ?? item?.inlineData?.mimeType ?? 'image/png';
  const data = item?.bytesBase64Encoded ?? item?.data ?? item?.inlineData?.data;
  if (typeof data === 'string' && data.trim()) {
    const dataUrl = data.match(/^data:([^;]+);base64,(.+)$/s);
    return dataUrl
      ? { mimeType: dataUrl[1], bytesBase64Encoded: dataUrl[2] }
      : { mimeType: String(mimeType), bytesBase64Encoded: data };
  }

  throw new Error(`ppio veo-3.1 ${field} is empty or invalid`);
}

function normalizeVeoEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ppio veo-3.1 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function toVeoInteger(
  value: unknown,
  min: number,
  max: number,
  field: string,
  allowed?: readonly number[]
): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max || (allowed && !allowed.includes(number))) {
    const requirement = allowed ? allowed.join(', ') : `an integer between ${min} and ${max}`;
    throw new Error(`ppio veo-3.1 ${field} must be ${requirement}`);
  }
  return number;
}

function toVeoBoolean(value: unknown, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return Boolean(value);
}

function buildPpioKlingV3RequestBody(model: string, payload: Record<string, any>): Record<string, any> {
  if (model.endsWith('-motion-control')) {
    return buildPpioKlingV3MotionRequestBody(payload);
  }

  const imageToVideo = model.endsWith('-i2v');
  const pro = model.includes('-pro-');
  const supportsStructuredMultiPrompt = imageToVideo && !pro;
  const supportsStringMultiPrompt = pro;
  const prompt = normalizeKlingPrompt(payload.prompt, 'prompt', false);
  const negativePrompt = normalizeKlingPrompt(
    payload.negative_prompt ?? payload.negativePrompt,
    'negative_prompt',
    true
  );
  const multiPrompt = normalizeKlingMultiPrompt(
    payload.multi_prompt ?? payload.multiPrompt,
    supportsStructuredMultiPrompt
  );

  if (supportsStringMultiPrompt) {
    if (prompt && multiPrompt.length > 0) {
      throw new Error(`ppio ${model} prompt and multi_prompt are mutually exclusive`);
    }
    if (!prompt && multiPrompt.length === 0) {
      throw new Error(`ppio ${model} requires prompt or multi_prompt`);
    }
  } else if (!prompt) {
    throw new Error(`ppio ${model} requires a non-empty prompt`);
  }

  if (!supportsStructuredMultiPrompt && !supportsStringMultiPrompt && multiPrompt.length > 0) {
    throw new Error(`ppio ${model} does not support multi_prompt`);
  }

  const body: Record<string, any> = {
    sound: toVeoBoolean(payload.sound, false),
    duration: toKlingNumber(payload.duration ?? 5, 3, 15, 'duration', true),
    cfg_scale: toKlingNumber(payload.cfg_scale ?? payload.cfgScale ?? 0.5, 0, 1, 'cfg_scale'),
  };
  if (prompt) body.prompt = prompt;
  if (negativePrompt) body.negative_prompt = negativePrompt;
  if (multiPrompt.length > 0) body.multi_prompt = multiPrompt;

  if (imageToVideo) {
    const image = normalizeKlingMedia(payload.image ?? payload.urls, 'image', true);
    const endImage = normalizeKlingMedia(
      payload.end_image ?? payload.endImage ?? payload.lastImage,
      'end_image',
      false
    );
    if (endImage && multiPrompt.length > 0) {
      throw new Error(`ppio ${model} end_image and multi_prompt are mutually exclusive`);
    }
    body.image = image;
    if (endImage) body.end_image = endImage;
  } else {
    body.aspect_ratio = normalizeKlingEnum(
      payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
      ['16:9', '9:16', '1:1'],
      'aspect_ratio',
      model
    );
  }

  return body;
}

function buildPpioKlingV3MotionRequestBody(payload: Record<string, any>): Record<string, any> {
  const model = 'kling-v3.0-motion-control';
  const image = normalizeKlingMedia(payload.image ?? payload.urls, 'image', true);
  const video = normalizeKlingMedia(payload.video ?? payload.videoUrl, 'video', true);
  if (!/^https?:\/\//i.test(video)) {
    throw new Error(`ppio ${model} video must be an HTTP(S) URL`);
  }
  const prompt = normalizeKlingPrompt(payload.prompt, 'prompt', true);
  const negativePrompt = normalizeKlingPrompt(
    payload.negative_prompt ?? payload.negativePrompt,
    'negative_prompt',
    true
  );
  const body: Record<string, any> = {
    image,
    video,
    model_name: normalizeKlingEnum(
      payload.model_name ?? payload.modelName ?? 'kling-v3-0-std',
      ['kling-v3-0-std', 'kling-v3-0-pro'],
      'model_name',
      model
    ),
    keep_original_sound: toVeoBoolean(
      payload.keep_original_sound ?? payload.keepOriginalSound,
      true
    ),
    character_orientation: normalizeKlingEnum(
      payload.character_orientation ?? payload.characterOrientation ?? 'image',
      ['image', 'video'],
      'character_orientation',
      model
    ),
  };
  if (prompt) body.prompt = prompt;
  if (negativePrompt) body.negative_prompt = negativePrompt;
  return body;
}

function normalizeKlingPrompt(value: unknown, field: string, optional: boolean): string {
  const prompt = typeof value === 'string' ? value.trim() : '';
  if (!prompt && !optional) return '';
  if (prompt.length > 2500) {
    throw new Error(`ppio kling-v3.0 ${field} must not exceed 2500 characters`);
  }
  return prompt;
}

function normalizeKlingMultiPrompt(value: unknown, structured: boolean): any[] {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return [];
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
      : [value];
  return values.map((item, index) => {
    const prompt = normalizeKlingPrompt(
      typeof item === 'string' ? item : item?.prompt,
      `multi_prompt[${index}].prompt`,
      false
    );
    if (!prompt) throw new Error(`ppio kling-v3.0 multi_prompt[${index}] requires prompt`);
    if (!structured) return prompt;
    return {
      prompt,
      duration: toKlingNumber(item?.duration ?? 5, 3, 15, `multi_prompt[${index}].duration`, true),
    };
  });
}

function normalizeKlingMedia(value: unknown, field: string, required: boolean): string {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    if (required) throw new Error(`ppio kling-v3.0 requires ${field}`);
    return '';
  }
  const item = Array.isArray(value) ? value[0] : value;
  const normalized = normalizeSeedanceMedia(item);
  if (!normalized) throw new Error(`ppio kling-v3.0 ${field} is empty or invalid`);
  return normalized;
}

function normalizeKlingEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  model = 'kling-v3.0'
): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ppio ${model} ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function toKlingNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
  integer = false
): number {
  const number = Number(value);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number)) || number < min || number > max) {
    throw new Error(`ppio kling-v3.0 ${field} must be ${integer ? 'an integer ' : ''}between ${min} and ${max}`);
  }
  return number;
}

function buildPpioHailuo23RequestBody(model: string, payload: Record<string, any>): Record<string, any> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) throw new Error(`ppio ${model} requires a non-empty prompt`);
  if (prompt.length > 2000) throw new Error(`ppio ${model} prompt must not exceed 2000 characters`);

  const duration = Number(payload.duration ?? 6);
  if (![6, 10].includes(duration)) {
    throw new Error(`ppio ${model} duration must be one of: 6, 10`);
  }
  const resolution = String(payload.resolution ?? '768P').toUpperCase();
  if (!['768P', '1080P'].includes(resolution)) {
    throw new Error(`ppio ${model} resolution must be one of: 768P, 1080P`);
  }
  if (duration === 10 && resolution === '1080P') {
    throw new Error(`ppio ${model} 10-second videos only support 768P`);
  }

  const fast = model.includes('-fast-');
  const body: Record<string, any> = {
    prompt,
    duration,
    resolution,
    enable_prompt_expansion: toVeoBoolean(
      payload.enable_prompt_expansion ?? payload.enablePromptExpansion,
      true
    ),
    aigc_watermark: toVeoBoolean(payload.aigc_watermark ?? payload.aigcWatermark, false),
  };

  if (model.endsWith('-i2v')) {
    body.image = normalizeHailuoImage(model, payload.image ?? payload.urls);
  }

  const fastPretreatment = payload.fast_pretreatment ?? payload.fastPretreatment;
  if (fast) {
    if (fastPretreatment != null && fastPretreatment !== '' && toVeoBoolean(fastPretreatment, false)) {
      throw new Error(`ppio ${model} does not support fast_pretreatment`);
    }
  } else {
    body.fast_pretreatment = toVeoBoolean(fastPretreatment, false);
  }

  return body;
}

function normalizeHailuoImage(model: string, value: unknown): string {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`ppio ${model} requires image`);
  }
  const item = Array.isArray(value) ? value[0] : value;
  const normalized = normalizeSeedanceMedia(item);
  if (!normalized) throw new Error(`ppio ${model} image is empty or invalid`);
  return normalized;
}

function buildPpioMinimaxH3RequestBody(payload: Record<string, any>): Record<string, any> {
  const resolution = String(payload.resolution ?? '768P').toUpperCase();
  if (!['768P', '2K'].includes(resolution)) {
    throw new Error('ppio MiniMax-H3 resolution must be one of: 768P, 2K');
  }
  const duration = Number(payload.duration ?? 4);
  if (!Number.isInteger(duration) || duration < 4 || duration > 15) {
    throw new Error('ppio MiniMax-H3 duration must be an integer between 4 and 15');
  }
  const ratio = String(payload.ratio ?? '16:9');
  const ratios = ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
  if (!ratios.includes(ratio)) {
    throw new Error(`ppio MiniMax-H3 ratio must be one of: ${ratios.join(', ')}`);
  }

  const content = Array.isArray(payload.content)
    ? normalizePpioMinimaxH3Content(payload.content)
    : buildPpioMinimaxH3Content(payload);
  validatePpioMinimaxH3Content(content, ratio);

  return {
    model: PPIO_MINIMAX_H3_MODEL,
    content,
    resolution,
    duration,
    ratio,
    aigc_watermark: toVeoBoolean(payload.aigc_watermark ?? payload.aigcWatermark, false),
  };
}

function buildPpioMinimaxH3Content(payload: Record<string, any>): any[] {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) throw new Error('ppio MiniMax-H3 requires a non-empty text prompt');
  if (prompt.length > 7000) throw new Error('ppio MiniMax-H3 prompt must not exceed 7000 characters');

  const content: any[] = [{ type: 'text', text: prompt }];
  const firstFrame = normalizePpioMinimaxH3Url(payload.first_frame ?? payload.firstFrame, 'first_frame', false);
  const lastFrame = normalizePpioMinimaxH3Url(payload.last_frame ?? payload.lastFrame, 'last_frame', false);
  if (firstFrame) content.push(minimaxH3MediaItem('image_url', firstFrame, 'first_frame'));
  if (lastFrame) content.push(minimaxH3MediaItem('image_url', lastFrame, 'last_frame'));

  for (const url of normalizePpioMinimaxH3UrlList(
    payload.reference_images ?? payload.referenceImages,
    9,
    'reference_images'
  )) content.push(minimaxH3MediaItem('image_url', url, 'reference_image'));
  for (const url of normalizePpioMinimaxH3UrlList(
    payload.reference_videos ?? payload.referenceVideos,
    3,
    'reference_videos'
  )) content.push(minimaxH3MediaItem('video_url', url, 'reference_video'));
  for (const url of normalizePpioMinimaxH3UrlList(
    payload.reference_audios ?? payload.referenceAudios,
    3,
    'reference_audios'
  )) content.push(minimaxH3MediaItem('audio_url', url, 'reference_audio'));
  return content;
}

function normalizePpioMinimaxH3Content(value: any[]): any[] {
  if (value.length === 0) throw new Error('ppio MiniMax-H3 content must not be empty');
  return value.map((item, index) => {
    const type = String(item?.type ?? '');
    if (type === 'text') {
      if (item?.role != null) throw new Error(`ppio MiniMax-H3 content[${index}] text must not have role`);
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) throw new Error(`ppio MiniMax-H3 content[${index}].text must be non-empty`);
      if (text.length > 7000) throw new Error('ppio MiniMax-H3 prompt must not exceed 7000 characters');
      return { type: 'text', text };
    }
    if (!['image_url', 'video_url', 'audio_url'].includes(type)) {
      throw new Error(`ppio MiniMax-H3 content[${index}].type is unsupported`);
    }
    const rawUrl = item?.[type]?.url;
    const url = normalizePpioMinimaxH3Url(rawUrl, `content[${index}].${type}.url`, true)!;
    const allowedRoles: Record<string, string[]> = {
      image_url: ['first_frame', 'last_frame', 'reference_image'],
      video_url: ['reference_video'],
      audio_url: ['reference_audio'],
    };
    const role = item?.role == null || item.role === ''
      ? (type === 'image_url' ? undefined : '')
      : String(item.role);
    if ((type !== 'image_url' && !role) || (role && !allowedRoles[type].includes(role))) {
      throw new Error(`ppio MiniMax-H3 content[${index}].role is invalid for ${type}`);
    }
    const normalized: any = { type, [type]: { url } };
    if (role) normalized.role = role;
    return normalized;
  });
}

function validatePpioMinimaxH3Content(content: any[], ratio: string): void {
  const textItems = content.filter(item => item.type === 'text' && item.text);
  if (textItems.length === 0) throw new Error('ppio MiniMax-H3 content requires at least one non-empty text item');

  const images = content.filter(item => item.type === 'image_url');
  const implicitFrames = images.filter(item => !item.role);
  const firstFrames = images.filter(item => item.role === 'first_frame').length + implicitFrames.length;
  const lastFrames = images.filter(item => item.role === 'last_frame').length;
  const referenceImages = images.filter(item => item.role === 'reference_image').length;
  const referenceVideos = content.filter(item => item.role === 'reference_video').length;
  const referenceAudios = content.filter(item => item.role === 'reference_audio').length;

  if (firstFrames > 1) throw new Error('ppio MiniMax-H3 supports at most one first_frame');
  if (lastFrames > 1) throw new Error('ppio MiniMax-H3 supports at most one last_frame');
  if (lastFrames > 0 && firstFrames === 0) throw new Error('ppio MiniMax-H3 last_frame requires first_frame');
  if (referenceImages > 9) throw new Error('ppio MiniMax-H3 reference_images supports at most 9 URLs');
  if (referenceVideos > 3) throw new Error('ppio MiniMax-H3 reference_videos supports at most 3 URLs');
  if (referenceAudios > 3) throw new Error('ppio MiniMax-H3 reference_audios supports at most 3 URLs');

  const frameMode = firstFrames > 0 || lastFrames > 0;
  const referenceMode = referenceImages > 0 || referenceVideos > 0 || referenceAudios > 0;
  if (frameMode && referenceMode) {
    throw new Error('ppio MiniMax-H3 frame inputs cannot be mixed with reference materials');
  }
  if (referenceAudios > 0 && referenceImages === 0 && referenceVideos === 0) {
    throw new Error('ppio MiniMax-H3 reference_audio requires a reference image or video');
  }
  if (!frameMode && !referenceMode && ratio === 'adaptive') {
    throw new Error('ppio MiniMax-H3 text-to-video does not support adaptive ratio');
  }
}

function normalizePpioMinimaxH3UrlList(value: unknown, max: number, field: string): string[] {
  if (value == null || value === '') return [];
  const items = Array.isArray(value) ? value : [value];
  if (items.length > max) throw new Error(`ppio MiniMax-H3 ${field} supports at most ${max} URLs`);
  return items
    .filter(item => item != null && item !== '')
    .map((item, index) => normalizePpioMinimaxH3Url(item, `${field}[${index}]`, true)!);
}

function normalizePpioMinimaxH3Url(value: unknown, field: string, required: boolean): string | undefined {
  const candidate = typeof value === 'string'
    ? value.trim()
    : typeof (value as any)?.url === 'string'
      ? (value as any).url.trim()
      : '';
  if (!candidate) {
    if (required) throw new Error(`ppio MiniMax-H3 ${field} requires a URL`);
    return undefined;
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(`ppio MiniMax-H3 ${field} must be a public HTTP(S) URL`);
  }
  return candidate;
}

function minimaxH3MediaItem(type: 'image_url' | 'video_url' | 'audio_url', url: string, role: string): any {
  return { type, [type]: { url }, role };
}

export async function createPpioTaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (isRequestAborted(options?.signal)) {
    throw createAbortError('Task aborted before execution');
  }

  const config = ensurePpioConfig(platformConfig);
  const model = parsePpioModel(url);

  if (isPpioAsyncModel(model)) {
    throw new Error(`ppio ${model} uses asynchronous execution`);
  }

  if (isPpioChatModel(model)) {
    return createPpioChatTask(model, payload, config, options);
  }

  if (isPpioResponseModel(model)) {
    return createPpioResponseTask(model, payload, config, options);
  }

  if (model === PPIO_GPT_IMAGE_MODEL) {
    return createPpioGptImageTask(payload, config, options);
  }

  const parts = buildPpioParts(payload);

  if (parts.length === 0) {
    throw new Error('ppio provider requires at least a prompt or reference image');
  }

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: normalizeResponseModalities(payload.responseModalities),
      imageConfig: {
        aspectRatio: payload.aspectRatio || '16:9',
        imageSize: payload.imageSize || '2K',
      },
    },
  };

  try {
    const response = await fetch(buildPpioEndpoint(config, model), {
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
      throw new Error(
        `PPIO API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`
      );
    }

    const result = await response.json();
    const outputs = normalizePpioOutputs(result);
    if (outputs.length === 0) {
      throw new Error('PPIO API returned no image or text output');
    }

    return {
      provider: PPIO_SCHEME,
      taskId: `ppio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: result?.usageMetadata?.totalTokenCount,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    if (error?.message?.startsWith('PPIO API')) {
      throw error;
    }

    const wrappedError = new Error(`PPIO API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

async function createPpioChatTask(
  model: string,
  payload: Record<string, any>,
  config: ReturnType<typeof ensurePpioConfig>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const requestBody = buildPpioChatRequestBody(model, payload);

  try {
    const response = await fetch(buildPpioChatEndpoint(config), {
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
      throw new Error(`PPIO API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const result = requestBody.stream || contentType.includes('text/event-stream')
      ? parsePpioChatSse(await response.text(), model)
      : await response.json();
    const outputs = normalizePpioChatOutputs(result);
    if (outputs.length === 0) {
      throw new Error('PPIO Fusion API returned no text or tool-call output');
    }

    return {
      provider: PPIO_SCHEME,
      taskId: result?.id || `ppio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: result?.usage?.total_tokens,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('PPIO API')) throw error;
    const wrappedError = new Error(`PPIO API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

function buildPpioChatRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  const messages = normalizePpioChatMessages(payload);
  const body: Record<string, any> = {
    model,
    messages,
    stream: Boolean(payload.stream),
  };

  const maxTokens = payload.max_tokens ?? payload.maxTokens;
  if (maxTokens !== undefined && maxTokens !== null && maxTokens !== '') {
    body.max_tokens = toPpioChatInteger(maxTokens, 1, Number.MAX_SAFE_INTEGER, 'max_tokens');
  }
  if (payload.temperature !== undefined && payload.temperature !== '') {
    body.temperature = toPpioChatNumber(payload.temperature, 0, 2, 'temperature');
  }
  const topP = payload.top_p ?? payload.topP;
  if (topP !== undefined && topP !== '') {
    body.top_p = toPpioChatNumber(topP, 0, 1, 'top_p');
  }
  if (payload.seed !== undefined && payload.seed !== '') {
    body.seed = toPpioChatInteger(payload.seed, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 'seed');
  }
  if (payload.n !== undefined && payload.n !== '') {
    body.n = toPpioChatInteger(payload.n, 1, 128, 'n');
  }

  copyPpioChatNumber(payload, body, 'frequency_penalty', 'frequencyPenalty', -2, 2);
  copyPpioChatNumber(payload, body, 'presence_penalty', 'presencePenalty', -2, 2);
  copyPpioChatNumber(payload, body, 'repetition_penalty', 'repetitionPenalty');
  copyPpioChatNumber(payload, body, 'top_k', 'topK');
  copyPpioChatNumber(payload, body, 'min_p', 'minP');

  const stop = payload.stop;
  if (typeof stop === 'string' && stop.length > 0) body.stop = stop;
  else if (Array.isArray(stop) && stop.length > 0) body.stop = stop.map(String);

  const responseFormat = payload.response_format ?? payload.responseFormat;
  if (typeof responseFormat === 'string') {
    if (!['text', 'json_object'].includes(responseFormat)) {
      throw new Error('ppio Fusion response_format must be text, json_object, or an object');
    }
    body.response_format = { type: responseFormat };
  } else if (responseFormat && typeof responseFormat === 'object') {
    body.response_format = responseFormat;
  }

  if (Array.isArray(payload.tools)) body.tools = payload.tools;
  if (payload.tool_choice !== undefined || payload.toolChoice !== undefined) {
    body.tool_choice = payload.tool_choice ?? payload.toolChoice;
  }
  if (payload.logprobs !== undefined) body.logprobs = Boolean(payload.logprobs);
  if (payload.top_logprobs !== undefined || payload.topLogprobs !== undefined) {
    body.top_logprobs = toPpioChatInteger(
      payload.top_logprobs ?? payload.topLogprobs,
      0,
      20,
      'top_logprobs'
    );
  }
  if (payload.separate_reasoning !== undefined || payload.separateReasoning !== undefined) {
    body.separate_reasoning = Boolean(payload.separate_reasoning ?? payload.separateReasoning);
  }
  if (payload.enable_thinking !== undefined || payload.enableThinking !== undefined) {
    body.enable_thinking = Boolean(payload.enable_thinking ?? payload.enableThinking);
  }
  if (body.stream) {
    body.stream_options = payload.stream_options ?? payload.streamOptions ?? { include_usage: true };
  }
  return body;
}

function normalizePpioChatMessages(payload: Record<string, any>): any[] {
  if (payload.messages !== undefined) {
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      throw new Error('ppio Fusion messages must be a non-empty array');
    }
    return payload.messages.map((message: any, index: number) => {
      if (!message || !['system', 'user', 'assistant', 'tool'].includes(message.role)) {
        throw new Error(`ppio Fusion messages[${index}] has an invalid role`);
      }
      if (message.content === undefined && !message.tool_calls) {
        throw new Error(`ppio Fusion messages[${index}] requires content or tool_calls`);
      }
      return message;
    });
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) throw new Error('ppio Fusion requires a non-empty prompt or messages');
  const messages: any[] = [];
  const systemPrompt = payload.systemPrompt ?? payload.system_prompt ?? payload.system;
  if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

function copyPpioChatNumber(
  source: Record<string, any>,
  target: Record<string, any>,
  snakeKey: string,
  camelKey: string,
  min = -Number.MAX_VALUE,
  max = Number.MAX_VALUE
): void {
  const value = source[snakeKey] ?? source[camelKey];
  if (value !== undefined && value !== '') {
    target[snakeKey] = toPpioChatNumber(value, min, max, snakeKey);
  }
}

function toPpioChatNumber(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`ppio Fusion ${field} must be between ${min} and ${max}`);
  }
  return number;
}

function toPpioChatInteger(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`ppio Fusion ${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function parsePpioChatSse(text: string, model: string): any {
  const events: any[] = [];
  let content = '';
  let reasoningContent = '';
  let id: string | undefined;
  let created: number | undefined;
  let usage: any;
  let finishReason: string | null = null;
  const toolCalls: any[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    let event: any;
    try {
      event = JSON.parse(data);
    } catch {
      continue;
    }
    if (event?.error) {
      throw new Error(event.error.message || 'PPIO Fusion stream failed');
    }
    events.push(event);
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
        const current = toolCalls[index] ?? { index, type: 'function', function: { name: '', arguments: '' } };
        if (call.id) current.id = call.id;
        if (call.type) current.type = call.type;
        if (call.function?.name) current.function.name += call.function.name;
        if (call.function?.arguments) current.function.arguments += call.function.arguments;
        toolCalls[index] = current;
      }
    }
  }

  if (!content && !reasoningContent && toolCalls.length === 0) {
    throw new Error('PPIO Fusion stream ended without output');
  }
  const message: Record<string, any> = { role: 'assistant', content: content || null };
  if (reasoningContent) message.reasoning_content = reasoningContent;
  if (toolCalls.length) message.tool_calls = toolCalls;
  return {
    id,
    created,
    model,
    object: 'chat.completion',
    choices: [{ index: 0, finish_reason: finishReason, message }],
    usage,
    stream_events: events,
  };
}

function normalizePpioChatOutputs(response: any): any[] {
  const outputs: any[] = [];
  for (const choice of response?.choices ?? []) {
    const message = choice?.message ?? {};
    const content = normalizePpioChatContent(message.content);
    if (content) {
      outputs.push({
        rawData: choice,
        text: content,
        mimeType: 'text/plain',
        finishReason: choice.finish_reason,
      });
    } else if (typeof message.reasoning_content === 'string' && message.reasoning_content) {
      outputs.push({ rawData: choice, text: message.reasoning_content, mimeType: 'text/plain', type: 'reasoning' });
    }
    for (const call of message.tool_calls ?? []) {
      outputs.push({
        rawData: call,
        type: 'function_call',
        name: call?.function?.name,
        arguments: call?.function?.arguments,
        callId: call?.id,
        mimeType: 'application/json',
      });
    }
  }
  return outputs;
}

function normalizePpioChatContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map(part => typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('');
}

async function createPpioResponseTask(
  model: string,
  payload: Record<string, any>,
  config: ReturnType<typeof ensurePpioConfig>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const requestBody = buildPpioResponseRequestBody(model, payload);

  try {
    const response = await fetch(buildPpioResponseEndpoint(config), {
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
      throw new Error(
        `PPIO API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const result = requestBody.stream || contentType.includes('text/event-stream')
      ? parsePpioResponseSse(await response.text())
      : await response.json();
    const outputs = normalizePpioOutputs(result);
    if (outputs.length === 0) {
      throw new Error('PPIO Response API returned no text or tool-call output');
    }

    return {
      provider: PPIO_SCHEME,
      taskId: result?.id || `ppio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: result?.usage?.total_tokens,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('PPIO API')) {
      throw error;
    }

    const wrappedError = new Error(`PPIO API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

function buildPpioResponseRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  const input = normalizePpioResponseInput(payload);
  if (typeof input === 'string' ? !input.trim() : !Array.isArray(input) || input.length === 0) {
    throw new Error('ppio Response API requires a non-empty input or prompt');
  }

  const body: Record<string, any> = { model, input };
  const instructions = payload.instructions;
  if (typeof instructions === 'string' && instructions.trim()) {
    body.instructions = instructions.trim();
  }

  const maxOutputTokens = payload.max_output_tokens ?? payload.maxOutputTokens;
  if (maxOutputTokens !== undefined && maxOutputTokens !== null && maxOutputTokens !== '') {
    body.max_output_tokens = toPositiveInteger(maxOutputTokens, 'max_output_tokens');
  }

  const temperature = payload.temperature;
  if (temperature !== undefined) {
    body.temperature = toNumberInRange(temperature, 0, 2, 'temperature');
  }
  const topP = payload.top_p ?? payload.topP;
  if (topP !== undefined) {
    throw new Error(
      'ppio GPT-5.6 models do not support top_p; omit it and use reasoning effort instead'
    );
  }

  const reasoningEffort = payload.reasoning?.effort ?? payload.reasoning_effort ?? payload.reasoningEffort;
  const reasoningSummary = payload.reasoning?.summary ?? payload.reasoning_summary ?? payload.reasoningSummary;
  if (reasoningEffort || reasoningSummary) {
    body.reasoning = {};
    if (reasoningEffort) {
      body.reasoning.effort = normalizeEnum(
        reasoningEffort,
        ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
        'reasoning.effort'
      );
    }
    if (reasoningSummary) {
      body.reasoning.summary = normalizeEnum(
        reasoningSummary,
        ['auto', 'concise', 'detailed'],
        'reasoning.summary'
      );
    }
  }

  if (payload.text && typeof payload.text === 'object') {
    body.text = payload.text;
  } else if (payload.jsonSchema) {
    body.text = {
      format: {
        type: 'json_schema',
        name: payload.jsonSchemaName || 'response',
        schema: payload.jsonSchema,
      },
    };
  } else if (payload.verbosity) {
    body.text = {
      format: { type: 'text' },
      verbosity: normalizeEnum(payload.verbosity, ['low', 'medium', 'high'], 'text.verbosity'),
    };
  }

  if (Array.isArray(payload.tools)) body.tools = payload.tools;
  if (payload.tool_choice !== undefined || payload.toolChoice !== undefined) {
    body.tool_choice = payload.tool_choice ?? payload.toolChoice;
  }
  if (payload.previous_response_id || payload.previousResponseId) {
    body.previous_response_id = payload.previous_response_id ?? payload.previousResponseId;
  }
  if (payload.max_tool_calls !== undefined || payload.maxToolCalls !== undefined) {
    body.max_tool_calls = toPositiveInteger(
      payload.max_tool_calls ?? payload.maxToolCalls,
      'max_tool_calls'
    );
  }
  if (payload.parallel_tool_calls !== undefined || payload.parallelToolCalls !== undefined) {
    body.parallel_tool_calls = Boolean(
      payload.parallel_tool_calls ?? payload.parallelToolCalls
    );
  }
  if (payload.store !== undefined) body.store = Boolean(payload.store);
  if (payload.metadata && typeof payload.metadata === 'object') body.metadata = payload.metadata;
  body.stream = Boolean(payload.stream);

  return body;
}

function normalizePpioResponseInput(payload: Record<string, any>): string | any[] {
  if (payload.input !== undefined && payload.input !== null) {
    return payload.input;
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const images = normalizePpioResponseImages(payload.urls ?? payload.images);
  if (images.length === 0) return prompt;

  const content: any[] = [];
  if (prompt) content.push({ type: 'input_text', text: prompt });
  for (const imageUrl of images) {
    content.push({ type: 'input_image', image_url: imageUrl });
  }
  return [{ role: 'user', content }];
}

function normalizePpioResponseImages(value: unknown): string[] {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.length > 500) {
    throw new Error('ppio Response API supports at most 500 image inputs per request');
  }

  return values.map((item, index) => {
    if (typeof item === 'string' && item.trim()) return item;
    if (typeof item?.url === 'string' && item.url.trim()) return item.url;
    if (typeof item?.data === 'string' && item.data.trim()) {
      return item.data.startsWith('data:')
        ? item.data
        : `data:${item.mimeType || 'image/png'};base64,${item.data}`;
    }
    if (typeof item?.inlineData?.data === 'string' && item.inlineData.data.trim()) {
      return `data:${item.inlineData.mimeType || 'image/png'};base64,${item.inlineData.data}`;
    }
    throw new Error(`ppio Response API image at index ${index} is empty or invalid`);
  });
}

function parsePpioResponseSse(text: string): any {
  const events: any[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      // Ignore SSE heartbeats or non-JSON diagnostic lines.
    }
  }

  const failed = [...events].reverse().find(event => event?.type === 'response.failed');
  if (failed) {
    throw new Error(failed?.response?.error?.message || failed?.error?.message || 'Response stream failed');
  }
  const completed = [...events].reverse().find(event => event?.type === 'response.completed');
  if (completed?.response) return completed.response;

  const deltas = events
    .filter(event => event?.type === 'response.output_text.delta' && typeof event.delta === 'string')
    .map(event => event.delta)
    .join('');
  if (!deltas) {
    throw new Error('PPIO Response API stream ended without a completed response');
  }
  return {
    object: 'response',
    status: 'completed',
    output: [{
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [{ type: 'output_text', text: deltas, annotations: [] }],
    }],
    stream_events: events,
  };
}

function toNumberInRange(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`ppio Response API ${field} must be between ${min} and ${max}`);
  }
  return number;
}

function toPositiveInteger(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`ppio Response API ${field} must be a positive integer`);
  }
  return number;
}

async function createPpioGptImageTask(
  payload: Record<string, any>,
  config: ReturnType<typeof ensurePpioConfig>,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    throw new Error('ppio gpt-image-2 requires a non-empty prompt');
  }
  if (prompt.length > 32000) {
    throw new Error('ppio gpt-image-2 prompt must not exceed 32000 characters');
  }

  const images = normalizeGptImageInputs(payload.image ?? payload.urls);
  const mask = normalizeGptMask(payload.mask);
  const edit = images.length > 0;
  if (mask && !edit) {
    throw new Error('ppio gpt-image-2 mask requires at least one input image');
  }

  const requestBody = buildGptImageRequestBody(payload, prompt, images, mask, edit);

  try {
    const response = await fetch(buildPpioGptImageEndpoint(config, edit), {
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
      throw new Error(
        `PPIO API error: ${response.status}${errorBody ? ` ${errorBody}` : ''}`
      );
    }

    const result = await response.json();
    const outputs = normalizePpioOutputs(result);
    if (outputs.length === 0) {
      throw new Error('PPIO API returned no image output');
    }

    return {
      provider: PPIO_SCHEME,
      taskId: `ppio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: 'succeeded',
      outputs,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('PPIO API')) {
      throw error;
    }

    const wrappedError = new Error(`PPIO API error: ${error?.message ?? String(error)}`);
    (wrappedError as any).cause = error;
    throw wrappedError;
  }
}

function buildGptImageRequestBody(
  payload: Record<string, any>,
  prompt: string,
  images: string[],
  mask: string | undefined,
  edit: boolean
): Record<string, any> {
  const n = toIntegerInRange(payload.n ?? 1, 1, 10, 'n');
  const size = normalizeEnum(
    payload.size ?? '1024x1024',
    GPT_IMAGE_SIZES,
    'size'
  );
  const quality = normalizeEnum(payload.quality ?? 'medium', ['low', 'medium', 'high'], 'quality');
  const background = normalizeEnum(payload.background ?? 'auto', ['opaque', 'auto'], 'background');
  const outputFormat = normalizeEnum(
    payload.output_format ?? payload.outputFormat ?? 'png',
    ['png', 'jpeg'],
    'output_format'
  );

  const body: Record<string, any> = {
    prompt,
    n,
    size,
    quality,
    background,
    output_format: outputFormat,
  };

  if (edit) {
    body.image = images.length === 1 ? images[0] : images;
    if (mask) body.mask = mask;
  } else {
    body.moderation = normalizeEnum(payload.moderation ?? 'auto', ['low', 'auto'], 'moderation');
  }

  const compressionValue = payload.output_compression ?? payload.outputCompression;
  if (outputFormat === 'jpeg') {
    body.output_compression = toIntegerInRange(compressionValue ?? 100, 0, 100, 'output_compression');
  } else if (compressionValue !== undefined && Number(compressionValue) !== 100) {
    throw new Error('ppio gpt-image-2 output_compression is only supported for jpeg');
  }

  return body;
}

function normalizeGptImageInputs(value: unknown): string[] {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];

  return values.map((item, index) => {
    const normalized = normalizeGptImageString(item);
    if (!normalized) {
      throw new Error(`ppio gpt-image-2 image at index ${index} is empty or invalid`);
    }
    return normalized;
  });
}

function normalizeGptMask(value: unknown): string | undefined {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }
  const item = Array.isArray(value) ? value[0] : value;
  const normalized = normalizeGptImageString(item);
  if (!normalized) {
    throw new Error('ppio gpt-image-2 mask is empty or invalid');
  }
  return normalized;
}

function normalizeGptImageString(value: any): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value?.url === 'string' && value.url.trim()) return value.url;
  if (typeof value?.data === 'string' && value.data.trim()) {
    if (value.data.startsWith('data:')) return value.data;
    return `data:${value.mimeType || 'image/png'};base64,${value.data}`;
  }
  if (typeof value?.inlineData?.data === 'string' && value.inlineData.data.trim()) {
    return `data:${value.inlineData.mimeType || 'image/png'};base64,${value.inlineData.data}`;
  }
  return undefined;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const normalized = String(value) as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`ppio gpt-image-2 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function toIntegerInRange(value: unknown, min: number, max: number, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`ppio gpt-image-2 ${field} must be an integer between ${min} and ${max}`);
  }
  return number;
}

const GPT_IMAGE_SIZES = [
  'auto',
  '1024x1024',
  '1024x1536',
  '1536x1024',
  '2048x2048',
  '2048x1152',
  '3840x2160',
  '2160x3840',
  '2048x1360',
  '1360x2048',
  '1152x2048',
  '2048x1536',
  '1536x2048',
  '2048x880',
  '880x2048',
  '688x2048',
  '2048x688',
  '2048x1024',
  '1024x2048',
] as const;

function buildPpioParts(payload: Record<string, any>): any[] {
  const parts: any[] = [];

  if (typeof payload.prompt === 'string' && payload.prompt.trim()) {
    parts.push({ text: payload.prompt });
  }

  if (Array.isArray(payload.urls)) {
    for (const image of payload.urls) {
      parts.push({ inlineData: normalizeImageInput(image) });
    }
  }

  return parts;
}

function normalizeImageInput(image: any): { mimeType: string; data: string } {
  if (typeof image === 'string') {
    const dataUrl = image.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrl) {
      return { mimeType: dataUrl[1], data: dataUrl[2] };
    }
    if (!image.trim()) {
      throw new Error('ppio provider received an empty reference image');
    }
    return { mimeType: 'image/png', data: image };
  }

  const inlineData = image?.inlineData ?? image;
  if (typeof inlineData?.data === 'string' && inlineData.data.length > 0) {
    return {
      mimeType: inlineData.mimeType || 'image/png',
      data: inlineData.data,
    };
  }

  throw new Error('ppio reference images must be base64 strings, data URLs, or inlineData objects');
}

function normalizeResponseModalities(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return ['IMAGE'];
  }

  return value.map(item => String(item).toUpperCase());
}
