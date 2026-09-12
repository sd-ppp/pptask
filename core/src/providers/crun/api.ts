import type {
  DescribeResult,
  PlatformConfig,
  TaskCreateResult,
  TaskRequestOptions,
  TaskResult,
  TaskStatusResult,
} from '../../types.ts';
import {
  buildCrunHailuo23FormSchema,
  buildCrunGpt56FormSchema,
  buildCrunImageUpscaleFormSchema,
  buildCrunWatermarkRemoveFormSchema,
  buildCrunImageExpandFormSchema,
  buildCrunHappyHorse11FormSchema,
  buildCrunGeminiOmniFormSchema,
  buildCrunGrokImagineVideoFormSchema,
  buildCrunGptImage2FormSchema,
  buildCrunKlingFormSchema,
  buildCrunMinimaxH3FormSchema,
  buildCrunNanoBananaFormSchema,
  buildCrunPixverseV6FormSchema,
  buildCrunSeedreamFormSchema,
  buildCrunSeedanceFormSchema,
  buildCrunVeo31FormSchema,
} from './formily.ts';
import {
  buildCrunCreateTaskEndpoint,
  buildCrunChatCompletionsEndpoint,
  buildCrunResponsesEndpoint,
  buildCrunTaskInfoEndpoint,
  ensureCrunConfig,
  getCrunHailuo23Profile,
  getCrunImageUpscaleProfile,
  getCrunHappyHorse11Profile,
  getCrunKlingProfile,
  getCrunMinimaxH3Profile,
  getCrunPixverseV6Profile,
  getCrunSeedanceProfile,
  getCrunVeo31Profile,
  isCrunNanoBanana2,
  isCrunNanoBanana2Lite,
  isCrunNanoBananaPro,
  isCrunGptImage2,
  isCrunGptImage2Premium,
  isCrunGptImage2Stable,
  isCrunGpt56Model,
  isCrunHailuo23Model,
  isCrunImageUpscaleModel,
  isCrunWatermarkRemoveModel,
  isCrunImageExpandModel,
  isCrunHappyHorse11Model,
  isCrunGeminiOmniModel,
  isCrunGrokImagineVideoModel,
  isCrunKlingModel,
  isCrunMinimaxH3Model,
  isCrunPixverseV6Model,
  isCrunSeedreamModel,
  isCrunSeedanceModel,
  isCrunV2Channel,
  isCrunVeo31Model,
  mapCrunTaskStatus,
  normalizeCrunMediaOutputs,
  parseCrunModel,
} from './helpers.ts';

const CRUN_SCHEME = 'crun';

export async function describeCrun(
  url: URL,
  _platformConfig?: PlatformConfig,
  _options?: TaskRequestOptions
): Promise<DescribeResult> {
  const model = parseCrunModel(url);
  const isV2 = isCrunV2Channel(model);
  const isLite = isCrunNanoBanana2Lite(model);
  const isGptImage2 = isCrunGptImage2(model);
  const isGptImage2Stable = isCrunGptImage2Stable(model);
  const isGptImage2Premium = isCrunGptImage2Premium(model);
  const isGpt56 = isCrunGpt56Model(model);
  const isSeedream = isCrunSeedreamModel(model);
  const isSeedance = isCrunSeedanceModel(model);
  const isKling = isCrunKlingModel(model);
  const isMinimaxH3 = isCrunMinimaxH3Model(model);
  const isPixverseV6 = isCrunPixverseV6Model(model);
  const isHappyHorse11 = isCrunHappyHorse11Model(model);
  const isHailuo23 = isCrunHailuo23Model(model);
  const isImageUpscale = isCrunImageUpscaleModel(model);
  const isWatermarkRemove = isCrunWatermarkRemoveModel(model);
  const isImageExpand = isCrunImageExpandModel(model);
  const isGrokImagineVideo = isCrunGrokImagineVideoModel(model);
  const isGeminiOmni = isCrunGeminiOmniModel(model);
  const isVeo31 = isCrunVeo31Model(model);
  const seedanceProfile = isSeedance ? getCrunSeedanceProfile(model) : undefined;
  const klingProfile = isKling ? getCrunKlingProfile(model) : undefined;
  const minimaxH3Profile = isMinimaxH3 ? getCrunMinimaxH3Profile(model) : undefined;
  const pixverseV6Profile = isPixverseV6 ? getCrunPixverseV6Profile(model) : undefined;
  const happyHorse11Profile = isHappyHorse11 ? getCrunHappyHorse11Profile(model) : undefined;
  const hailuo23Profile = isHailuo23 ? getCrunHailuo23Profile(model) : undefined;
  const imageUpscaleProfile = isImageUpscale ? getCrunImageUpscaleProfile(model) : undefined;
  const veo31Profile = isVeo31 ? getCrunVeo31Profile(model) : undefined;
  const formValues = isImageExpand ? {
    imgUrls: [], expandMode: 'sides', maskUrl: [],
    top: 0.25, bottom: 0.25, left: 0.25, right: 0.25,
    prompt: '', outputFormat: 'png', callbackUrl: '',
  } : isWatermarkRemove ? {
    ...(model === 'video-watermark-remove' ? { videoUrl: [] } : { imgUrls: [], mode: 'basic' }),
    callbackUrl: '',
  } : isGpt56 ? {
    apiMode: 'responses', systemPrompt: '', prompt: '', urls: [],
    reasoningEffort: 'medium', responseFormat: 'text', stream: false,
  } : imageUpscaleProfile ? {
    imgUrls: [],
    ...(imageUpscaleProfile.channel === 'basic'
      ? { scaleFactor: 'auto', mode: 'clean', outputFormat: 'png' }
      : { clarity: 'high' }),
    callbackUrl: '',
  } : hailuo23Profile ? {
    prompt: '', imgUrls: [], mode: 'std', duration: 6, resolution: '1080P', callbackUrl: '',
  } : veo31Profile ? {
    prompt: '',
    ...(veo31Profile.operation !== 'text-to-video' ? { imgUrls: [] } : {}),
    duration: 8, resolution: '720p', aspectRatio: '16:9',
    translatePrompt: true, callbackUrl: '',
  } : isGeminiOmni ? {
    prompt: '', referenceImages: [], referenceVideos: [], videoStart: 0, videoEnd: 6,
    duration: 6, aspectRatio: '16:9', resolution: '720p', callbackUrl: '',
  } : isGrokImagineVideo ? {
    prompt: '', imgUrls: [], aspectRatio: 'auto', resolution: '720p',
    duration: 6, callbackUrl: '',
  } : happyHorse11Profile ? {
    prompt: '',
    ...(happyHorse11Profile.requiresImage ? { imgUrls: [] } : {}),
    resolution: '720P',
    duration: 5,
    ...(happyHorse11Profile.supportsAspectRatio ? { aspectRatio: '16:9' } : {}),
    callbackUrl: '',
  } : pixverseV6Profile ? {
    prompt: '',
    ...(pixverseV6Profile.operation === 'image-to-video' ? { image: [] } : {}),
    ...(pixverseV6Profile.operation === 'reference-to-video' ? {
      referenceImages: [], referenceNames: [], referenceTypes: [],
    } : {}),
    duration: 5,
    quality: '720p',
    ...(pixverseV6Profile.supportsAspectRatio ? { aspectRatio: '16:9' } : {}),
    generateAudio: true,
    ...(pixverseV6Profile.supportsMultiClip ? { generateMultiClip: false } : {}),
    callbackUrl: '',
  } : minimaxH3Profile?.operation === 'video-regeneration' ? {
    h3TaskId: '', callbackUrl: '',
  } : minimaxH3Profile ? {
    prompt: '',
    ...(minimaxH3Profile.operation === 'image-to-video' ? { imgUrls: [] } : {}),
    ...(minimaxH3Profile.operation === 'reference-to-video' ? {
      referenceImages: [], referenceVideos: [], referenceAudios: [],
    } : {}),
    duration: 5,
    resolution: '768P',
    aspectRatio: minimaxH3Profile.operation === 'image-to-video' ? 'auto' : '16:9',
    callbackUrl: '',
  } : klingProfile ? buildCrunKlingFormValues(model) : seedanceProfile ? {
    prompt: '',
    ...(seedanceProfile.operation === 'image-to-video' ? { imgUrls: [] } : {}),
    ...(seedanceProfile.operation === 'reference-to-video' ? {
      referenceImages: [], referenceVideos: [], referenceAudios: [],
    } : {}),
    resolution: '720p',
    aspectRatio: seedanceProfile.operation === 'image-to-video' ? 'auto' : '16:9',
    duration: 5,
    ...(seedanceProfile.supportsAudio ? { audio: true } : {}),
    ...(seedanceProfile.supportsCameraFixed ? { cameraFixed: false } : {}),
    ...(seedanceProfile.supportsByteplusFallback ? { byteplusFallback: false } : {}),
    ...(seedanceProfile.supportsReturnLastFrame ? { returnLastFrame: false } : {}),
    callbackUrl: '',
  } : isSeedream ? {
    prompt: '', imgUrls: [], aspectRatio: '1:1', resolution: '2K',
    outputFormat: 'png', callbackUrl: '',
  } : {
    prompt: '',
    imgUrls: [],
    aspectRatio: !isGptImage2 && isCrunNanoBanana2(model) ? 'auto' : '1:1',
    ...(isGptImage2Stable ? {
      quality: 'medium', background: 'auto', outputFormat: 'png', moderation: 'low',
    } : {}),
    ...(isGptImage2Premium ? { quality: 'high', resolution: '2K' } : {}),
    ...(!isGptImage2 && (isCrunNanoBanana2(model) || isCrunNanoBananaPro(model))
      ? { resolution: '2K' } : {}),
    ...(!isGptImage2 && !isV2 && !isLite ? { outputFormat: 'png' } : {}),
    ...(!isGptImage2 && model === 'google/nano-banana-2' ? { googleSearch: false } : {}),
    callbackUrl: '',
  };
  return {
    provider: CRUN_SCHEME,
    metadata: {
      scheme: CRUN_SCHEME,
      model,
      apiEndpoint: isGpt56 ? '/api/v1/responses' : '/api/v1/client/job/CreateTask',
      ...(isGpt56 ? {
        alternateApiEndpoint: '/api/v1/chat/completions',
        supportedApiModes: ['responses', 'chat_completions'],
        defaultApiMode: 'responses',
      } : { resultApiEndpoint: '/api/v1/client/job/TaskInfo?task_id={taskId}' }),
      protocol: isGpt56
        ? 'openai-responses-or-chat-completions'
        : 'crun-unified-async-task',
      mode: isImageExpand ? 'image-expand' : isWatermarkRemove ? model : veo31Profile?.operation ??
        (isGpt56 ? 'language-model' : imageUpscaleProfile ? 'image-upscale' :
        hailuo23Profile ? hailuo23Profile.operation :
        (isGeminiOmni ? 'multimodal-video-generation' :
        isGrokImagineVideo ? 'image-to-video' :
        happyHorse11Profile?.operation ?? pixverseV6Profile?.operation ??
        minimaxH3Profile?.operation ?? klingProfile?.operation ??
        seedanceProfile?.operation ?? 'text-to-image-or-image-edit')),
      channel: isImageExpand ? 'image-expand' : isWatermarkRemove ? 'watermark-remove' :
        veo31Profile ? `veo-3.1-${veo31Profile.channel}` :
        isGpt56 ? 'gpt-5.6' :
        imageUpscaleProfile ? `image-upscale-${imageUpscaleProfile.channel}` :
        isHailuo23 ? 'hailuo-2.3' :
        isGeminiOmni ? 'gemini-omni' :
        isGrokImagineVideo ? 'grok-imagine-video-1.5-preview' :
        isHappyHorse11 ? 'happyhorse-1.1' : isPixverseV6 ? 'pixverse-v6' :
        isMinimaxH3 ? 'minimax-h3' :
        klingProfile?.channel ?? seedanceProfile?.series ??
        (isSeedream ? 'seedream-5-pro'
        : isGptImage2Premium ? 'premium'
        : isGptImage2Stable ? 'stable'
          : isV2 ? 'cost-optimized-v2' : isLite ? 'lite' : 'standard'),
      supportsResolution: isHailuo23 || isVeo31 || isGeminiOmni || isGrokImagineVideo || isHappyHorse11 || isPixverseV6 ||
        (isMinimaxH3 && minimaxH3Profile?.operation !== 'video-regeneration') ||
        isSeedream || isSeedance || model === 'kling/v3-turbo' || isGptImage2Premium ||
        (!isGptImage2 && (isCrunNanoBanana2(model) || isCrunNanoBananaPro(model))),
      supportsOutputFormat: isImageExpand || imageUpscaleProfile?.channel === 'basic' || isSeedream || isGptImage2Stable ||
        (!isImageUpscale && !isHailuo23 && !isVeo31 && !isGeminiOmni && !isGrokImagineVideo && !isHappyHorse11 && !isPixverseV6 && !isKling && !isSeedance &&
          !isWatermarkRemove && !isGpt56 && !isGptImage2 && !isV2 && !isLite),
      supportsGoogleSearch: !isGptImage2 && model === 'google/nano-banana-2',
      ...(isImageExpand ? { supportedExpandModes: ['sides', 'canvas'] } : {}),
    },
    formSchema: isImageExpand
      ? buildCrunImageExpandFormSchema()
      : isWatermarkRemove
      ? buildCrunWatermarkRemoveFormSchema(model)
      : isGpt56
      ? buildCrunGpt56FormSchema()
      : isImageUpscale
      ? buildCrunImageUpscaleFormSchema(model)
      : isHailuo23
      ? buildCrunHailuo23FormSchema(model)
      : isVeo31
      ? buildCrunVeo31FormSchema(model)
      : isGeminiOmni
      ? buildCrunGeminiOmniFormSchema()
      : isGrokImagineVideo
      ? buildCrunGrokImagineVideoFormSchema()
      : isHappyHorse11
      ? buildCrunHappyHorse11FormSchema(model)
      : isPixverseV6
      ? buildCrunPixverseV6FormSchema(model)
      : isMinimaxH3
      ? buildCrunMinimaxH3FormSchema(model)
      : isKling
      ? buildCrunKlingFormSchema(model)
      : isSeedance ? buildCrunSeedanceFormSchema(model)
      : isSeedream ? buildCrunSeedreamFormSchema()
      : isGptImage2 ? buildCrunGptImage2FormSchema(model)
        : buildCrunNanoBananaFormSchema(model),
    formValues,
    recommendUploadProvider: 'crun',
    cancelable: false,
  };
}

function buildCrunKlingFormValues(model: string): Record<string, any> {
  if (model === 'kling/v3') {
    return {
      prompt: '', mode: 'pro', multiShots: false, shotType: 'intelligence',
      imgUrls: [], multiPrompt: [], elementList: [], duration: 5,
      aspectRatio: '16:9', audio: true,
      inputCompliance: 'enabled', outputCompliance: 'enabled', callbackUrl: '',
    };
  }
  if (model === 'kling/v3-turbo') {
    return {
      prompt: '', imgUrls: [], resolution: '720p', duration: 5, aspectRatio: '16:9',
      inputCompliance: 'enabled', outputCompliance: 'enabled', callbackUrl: '',
    };
  }
  if (model === 'kling/v2-6') {
    return {
      prompt: '', mode: 'std', imgUrls: [], duration: 5, aspectRatio: '16:9',
      audio: false, inputCompliance: 'enabled', outputCompliance: 'enabled',
      callbackUrl: '',
    };
  }
  if (model === 'kling/v2-6-motion-control') {
    return {
      prompt: '', imgUrls: [], videoUrls: [], characterOrientation: 'image', mode: 'pro',
      callbackUrl: '',
    };
  }
  if (model === 'kling/v3-motion-control') {
    return {
      prompt: '', imgUrls: [], videoUrls: [], characterOrientation: 'video', mode: 'pro',
      keepOriginalSound: true, inputCompliance: 'enabled', outputCompliance: 'enabled',
      callbackUrl: '',
    };
  }
  return { prompt: '', imageUrl: [], audioUrl: [], mode: 'pro', callbackUrl: '' };
}

export function buildCrunGptImage2RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  if (!isCrunGptImage2(model)) {
    throw new Error(`CRUN GPT Image 2 builder received unsupported model: ${model}`);
  }
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const input: Record<string, any> = { prompt };
  const imgUrls = normalizeCrunImageUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.urls
  );
  if (isCrunGptImage2Premium(model) && imgUrls.length > 14) {
    throw new Error(`CRUN ${model} supports at most 14 reference images`);
  }
  if (imgUrls.length) input.img_urls = imgUrls;

  const aspectRatio = String(payload.aspect_ratio ?? payload.aspectRatio ?? '1:1').trim();
  if (aspectRatio) input.aspect_ratio = aspectRatio;

  if (isCrunGptImage2Stable(model)) {
    addOptionalEnum(input, 'quality', payload.quality, ['low', 'medium', 'high'], model);
    addOptionalEnum(
      input, 'background', payload.background, ['auto', 'opaque', 'transparent'], model
    );
    addOptionalEnum(
      input, 'output_format', payload.output_format ?? payload.outputFormat,
      ['png', 'jpeg', 'webp'], model
    );
    addOptionalEnum(input, 'moderation', payload.moderation, ['auto', 'low'], model);
  }

  if (isCrunGptImage2Premium(model)) {
    addOptionalEnum(input, 'quality', payload.quality, ['low', 'medium', 'high'], model);
    const resolution = String(payload.resolution ?? '').trim().toUpperCase();
    if (resolution) {
      if (!['1K', '2K', '4K'].includes(resolution)) {
        throw new Error(`CRUN ${model} resolution must be one of: 1K, 2K, 4K`);
      }
      input.resolution = resolution;
    }
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  return isCrunImageExpandModel(model)
    ? buildCrunImageExpandRequestBody(model, payload)
    : isCrunWatermarkRemoveModel(model)
    ? buildCrunWatermarkRemoveRequestBody(model, payload)
    : isCrunImageUpscaleModel(model)
    ? buildCrunImageUpscaleRequestBody(model, payload)
    : isCrunHailuo23Model(model)
    ? buildCrunHailuo23RequestBody(model, payload)
    : isCrunKlingModel(model)
    ? buildCrunKlingRequestBody(model, payload)
    : isCrunVeo31Model(model) ? buildCrunVeo31RequestBody(model, payload)
    : isCrunGeminiOmniModel(model) ? buildCrunGeminiOmniRequestBody(model, payload)
    : isCrunGrokImagineVideoModel(model) ? buildCrunGrokImagineVideoRequestBody(model, payload)
    : isCrunHappyHorse11Model(model) ? buildCrunHappyHorse11RequestBody(model, payload)
    : isCrunPixverseV6Model(model) ? buildCrunPixverseV6RequestBody(model, payload)
    : isCrunMinimaxH3Model(model) ? buildCrunMinimaxH3RequestBody(model, payload)
    : isCrunSeedanceModel(model) ? buildCrunSeedanceRequestBody(model, payload)
    : isCrunSeedreamModel(model) ? buildCrunSeedreamRequestBody(model, payload)
    : isCrunGptImage2(model) ? buildCrunGptImage2RequestBody(model, payload)
      : buildCrunNanoBananaRequestBody(model, payload);
}

export function buildCrunImageExpandRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isCrunImageExpandModel(model)) throw new Error(`Unsupported CRUN image expand model: ${model}`);
  const imgUrls = normalizeCrunHttpUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image ?? payload.urls,
    'img_urls'
  );
  if (imgUrls.length !== 1) throw new Error('CRUN image-expand requires exactly one source image');
  const rawMask = payload.mask_url ?? payload.maskUrl ?? payload.mask;
  const hasMask = Array.isArray(rawMask) ? rawMask.length > 0 : rawMask != null && rawMask !== '';
  const mode = normalizeCrunEnum(
    payload.expand_mode ?? payload.expandMode ?? (hasMask ? 'canvas' : 'sides'),
    ['sides', 'canvas'], model, 'expandMode'
  );
  const input: Record<string, any> = { img_urls: imgUrls };
  if (mode === 'canvas') {
    const masks = normalizeCrunHttpUrls(rawMask, 'mask_url');
    if (masks.length !== 1) throw new Error('CRUN image-expand canvas mode requires exactly one mask');
    input.mask_url = masks[0];
  } else {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      const value = payload[side];
      if (value == null || value === '') continue;
      const ratio = Number(value);
      if (!['number', 'string'].includes(typeof value) ||
          (typeof value === 'string' && !value.trim()) ||
          !Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
        throw new Error(`CRUN image-expand ${side} must be a number from 0 to 1`);
      }
      input[side] = ratio;
    }
  }
  if (payload.prompt != null && typeof payload.prompt !== 'string') {
    throw new Error('CRUN image-expand prompt must be a string');
  }
  const prompt = String(payload.prompt ?? '').trim();
  if (prompt) input.prompt = prompt;
  input.output_format = normalizeCrunEnum(
    payload.output_format ?? payload.outputFormat ?? 'png', ['png', 'jpg'], model, 'output_format'
  );
  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunWatermarkRemoveRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isCrunWatermarkRemoveModel(model)) {
    throw new Error(`Unsupported CRUN watermark removal model: ${model}`);
  }
  const video = model === 'video-watermark-remove';
  const urls = normalizeCrunHttpUrls(
    video
      ? payload.video_url ?? payload.videoUrl ?? payload.video ?? payload.urls
      : payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image ?? payload.urls,
    video ? 'video_url' : 'img_urls'
  );
  if (urls.length !== 1) {
    throw new Error(`CRUN ${model} requires exactly one source ${video ? 'video' : 'image'}`);
  }
  const input: Record<string, any> = video ? { video_url: urls[0] } : {
    img_urls: urls,
    mode: normalizeCrunEnum(payload.mode ?? 'basic', ['basic', 'pro'], model, 'mode'),
  };
  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunImageUpscaleRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunImageUpscaleProfile(model);
  const imgUrls = normalizeCrunHttpUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image,
    'img_urls'
  );
  if (imgUrls.length !== 1) {
    throw new Error(`CRUN ${model} requires exactly one source image`);
  }
  const input: Record<string, any> = { img_urls: imgUrls };
  if (profile.channel === 'basic') {
    const rawScale = payload.scale_factor ?? payload.scaleFactor ?? 'auto';
    if (rawScale !== 'auto' && rawScale !== '' && rawScale !== undefined && rawScale !== null) {
      const scaleFactor = Number(rawScale);
      if (!profile.scaleFactors.includes(scaleFactor)) {
        throw new Error(
          `CRUN ${model} scale_factor must be auto or one of: ${profile.scaleFactors.join(', ')}`
        );
      }
      input.scale_factor = scaleFactor;
    }
    const mode = String(payload.mode ?? 'clean').trim().toLowerCase();
    if (!profile.modes.includes(mode)) {
      throw new Error(`CRUN ${model} mode must be one of: ${profile.modes.join(', ')}`);
    }
    input.mode = mode;
    const outputFormat = String(
      payload.output_format ?? payload.outputFormat ?? 'png'
    ).trim().toLowerCase();
    if (!profile.outputFormats.includes(outputFormat)) {
      throw new Error(
        `CRUN ${model} output_format must be one of: ${profile.outputFormats.join(', ')}`
      );
    }
    input.output_format = outputFormat;
  } else {
    const clarity = String(payload.clarity ?? 'high').trim().toLowerCase();
    if (!profile.clarityLevels.includes(clarity)) {
      throw new Error(
        `CRUN ${model} clarity must be one of: ${profile.clarityLevels.join(', ')}`
      );
    }
    input.clarity = clarity;
  }
  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunHailuo23RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunHailuo23Profile(model);
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const mode = String(payload.mode ?? 'std').trim().toLowerCase();
  if (!(profile.modes as readonly string[]).includes(mode)) {
    throw new Error(`CRUN ${model} mode must be one of: ${profile.modes.join(', ')}`);
  }
  const duration = Number(payload.duration ?? 6);
  if (!(profile.durations as readonly number[]).includes(duration)) {
    throw new Error(`CRUN ${model} duration must be one of: ${profile.durations.join(', ')}`);
  }
  const resolution = String(payload.resolution ?? '1080P').trim().toUpperCase();
  if (!(profile.resolutions as readonly string[]).includes(resolution)) {
    throw new Error(
      `CRUN ${model} resolution must be one of: ${profile.resolutions.join(', ')}`
    );
  }
  if (resolution === '1080P' && duration !== 6) {
    throw new Error(`CRUN ${model} 1080P resolution only supports 6-second duration`);
  }

  const imgUrls = normalizeCrunHttpUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image,
    'img_urls'
  );
  if (imgUrls.length > profile.maxImages) {
    throw new Error(`CRUN ${model} accepts at most one reference image`);
  }

  const input: Record<string, any> = { mode, prompt };
  if (imgUrls.length) input.img_urls = imgUrls;
  input.duration = duration;
  input.resolution = resolution;
  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunVeo31RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunVeo31Profile(model);
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const duration = Number(payload.duration ?? 8);
  if (!profile.durations.includes(duration)) {
    throw new Error(
      `CRUN ${model} duration must be one of: ${profile.durations.join(', ')}`
    );
  }
  const resolution = normalizeCrunEnum(
    payload.resolution ?? '720p', ['720p', '1080p'], model, 'resolution'
  );
  const aspectRatio = normalizeCrunEnum(
    payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
    ['16:9', '9:16'], model, 'aspect_ratio'
  );
  const translatePrompt = normalizeCrunBoolean(
    payload.translate_prompt ?? payload.translatePrompt, true
  );

  const input: Record<string, any> = {
    prompt,
    duration,
    resolution,
    translate_prompt: translatePrompt,
    aspect_ratio: aspectRatio,
  };
  if (profile.operation !== 'text-to-video') {
    const imgUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.referenceImages,
      'img_urls'
    );
    if (imgUrls.length < profile.minImages || imgUrls.length > profile.maxImages) {
      throw new Error(
        `CRUN ${model} requires ${profile.minImages} to ${profile.maxImages} images`
      );
    }
    input.img_urls = imgUrls;
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunGeminiOmniRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  if (!isCrunGeminiOmniModel(model)) {
    throw new Error(`CRUN Gemini Omni builder received unsupported model: ${model}`);
  }

  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const imgUrls = normalizeCrunHttpUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.referenceImages,
    'img_urls'
  );
  if (imgUrls.length > 7) {
    throw new Error(`CRUN ${model} supports at most 7 reference images`);
  }

  const rawVideoList = payload.video_list ?? payload.videoList;
  let videoList: Array<{ url: string; start: number; ends: number }> = [];
  if (rawVideoList != null && rawVideoList !== '') {
    const items = Array.isArray(rawVideoList) ? rawVideoList : [rawVideoList];
    videoList = items.map((item: any, index: number) =>
      normalizeCrunGeminiOmniVideo(item, index, model));
  } else {
    const videoUrls = normalizeCrunHttpUrls(
      payload.referenceVideos ?? payload.video_urls ?? payload.videoUrls,
      'video_list'
    );
    const starts = normalizeCrunNumberArray(
      payload.videoStarts ?? payload.video_starts ?? payload.videoStart ?? payload.video_start
    );
    const ends = normalizeCrunNumberArray(
      payload.videoEnds ?? payload.video_ends ?? payload.videoEnd ?? payload.video_end
    );
    videoList = videoUrls.map((url, index) => normalizeCrunGeminiOmniVideo({
      url,
      start: starts[index] ?? 0,
      ends: ends[index],
    }, index, model));
  }
  if (videoList.length > 1) {
    throw new Error(`CRUN ${model} supports at most one reference video`);
  }
  if (imgUrls.length + videoList.length > 8) {
    throw new Error(`CRUN ${model} supports at most 8 total reference assets`);
  }

  const duration = Number(payload.duration ?? 6);
  if (![4, 6, 8, 10].includes(duration)) {
    throw new Error(`CRUN ${model} duration must be one of: 4, 6, 8, 10`);
  }
  const aspectRatio = normalizeCrunEnum(
    payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
    ['16:9', '9:16'], model, 'aspect_ratio'
  );
  const resolution = normalizeCrunEnum(
    payload.resolution ?? '720p', ['720p', '1080p', '4k'], model, 'resolution'
  );

  const input: Record<string, any> = {
    prompt,
    duration,
    aspect_ratio: aspectRatio,
    resolution,
  };
  if (imgUrls.length) input.img_urls = imgUrls;
  if (videoList.length) input.video_list = videoList;

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunGrokImagineVideoRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  if (!isCrunGrokImagineVideoModel(model)) {
    throw new Error(`CRUN Grok Imagine video builder received unsupported model: ${model}`);
  }
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const imgUrls = normalizeCrunHttpUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image,
    'img_urls'
  );
  if (imgUrls.length !== 1) {
    throw new Error(`CRUN ${model} requires exactly one reference image`);
  }

  const aspectRatio = String(payload.aspect_ratio ?? payload.aspectRatio ?? 'auto')
    .trim().toLowerCase();
  if (aspectRatio !== 'auto') {
    throw new Error(`CRUN ${model} aspect_ratio must be auto`);
  }
  const resolution = String(payload.resolution ?? '720p').trim().toLowerCase();
  if (!['480p', '720p'].includes(resolution)) {
    throw new Error(`CRUN ${model} resolution must be one of: 480p, 720p`);
  }
  const duration = Number(payload.duration ?? 6);
  if (!Number.isInteger(duration) || duration < 1 || duration > 15) {
    throw new Error(`CRUN ${model} duration must be an integer from 1 to 15`);
  }

  const body: Record<string, any> = {
    model,
    input: { prompt, img_urls: imgUrls, aspect_ratio: aspectRatio, resolution, duration },
  };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunHappyHorse11RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunHappyHorse11Profile(model);
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const resolution = String(payload.resolution ?? '720P').trim().toUpperCase();
  const resolutions = ['480P', '720P', '1080P'];
  if (!resolutions.includes(resolution)) {
    throw new Error(`CRUN ${model} resolution must be one of: ${resolutions.join(', ')}`);
  }
  const duration = Number(payload.duration ?? 5);
  if (!Number.isInteger(duration) || duration < 3 || duration > 15) {
    throw new Error(`CRUN ${model} duration must be an integer from 3 to 15`);
  }

  const input: Record<string, any> = {
    prompt,
    resolution,
    duration,
  };
  if (profile.supportsAspectRatio) {
    const aspectRatio = String(payload.aspect_ratio ?? payload.aspectRatio ?? '16:9').trim();
    const ratios = ['16:9', '9:16', '3:4', '4:3', '4:5', '5:4', '1:1', '9:21', '21:9'];
    if (!ratios.includes(aspectRatio)) {
      throw new Error(`CRUN ${model} aspect_ratio must be one of: ${ratios.join(', ')}`);
    }
    input.aspect_ratio = aspectRatio;
  }

  if (profile.requiresImage) {
    const imgUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.referenceImages,
      'img_urls'
    );
    if (profile.operation === 'image-to-video' && imgUrls.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one first-frame image`);
    }
    if (profile.operation === 'reference-to-video' &&
      (imgUrls.length < 1 || imgUrls.length > 9)) {
      throw new Error(`CRUN ${model} requires 1 to 9 reference images`);
    }
    input.img_urls = imgUrls;
  }

  input.region = 'global';
  input.input_compliance = 'enable';
  input.output_compliance = 'enable';
  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunPixverseV6RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunPixverseV6Profile(model);
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const input: Record<string, any> = { prompt };
  const duration = Number(payload.duration ?? 5);
  if (!Number.isInteger(duration) || duration < 1 || duration > 15) {
    throw new Error(`CRUN ${model} duration must be an integer from 1 to 15`);
  }
  input.duration = duration;

  const quality = String(payload.quality ?? payload.resolution ?? '720p').trim().toLowerCase();
  const qualities = ['360p', '540p', '720p', '1080p'];
  if (!qualities.includes(quality)) {
    throw new Error(`CRUN ${model} quality must be one of: ${qualities.join(', ')}`);
  }
  input.quality = quality;

  if (profile.supportsAspectRatio) {
    const aspectRatio = String(payload.aspect_ratio ?? payload.aspectRatio ?? '16:9').trim();
    const ratios = ['16:9', '9:16', '1:1', '3:4', '4:3', '2:3', '3:2', '21:9'];
    if (!ratios.includes(aspectRatio)) {
      throw new Error(`CRUN ${model} aspect_ratio must be one of: ${ratios.join(', ')}`);
    }
    input.aspect_ratio = aspectRatio;
  }

  if (profile.operation === 'image-to-video') {
    const images = normalizeCrunHttpUrls(
      payload.image ?? payload.image_url ?? payload.imageUrl ?? payload.img_urls ??
        payload.imgUrls ?? payload.imageUrls,
      'image'
    );
    if (images.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one starting image`);
    }
    input.image = images[0];
    const templateIdValue = payload.template_id ?? payload.templateId;
    if (templateIdValue !== undefined && templateIdValue !== null && templateIdValue !== '') {
      const templateId = Number(templateIdValue);
      if (!Number.isInteger(templateId) || templateId < 0) {
        throw new Error(`CRUN ${model} template_id must be a non-negative integer`);
      }
      input.template_id = templateId;
    }
  }

  if (profile.operation === 'reference-to-video') {
    input.reference_images = normalizeCrunPixverseReferences(payload);
  }

  input.generate_audio_switch = Boolean(
    payload.generate_audio_switch ?? payload.generateAudio ?? true
  );
  if (profile.supportsMultiClip) {
    input.generate_multi_clip_switch = Boolean(
      payload.generate_multi_clip_switch ?? payload.generateMultiClip ?? false
    );
  }

  const seedValue = payload.seed;
  if (seedValue !== undefined && seedValue !== null && seedValue !== '') {
    const seed = Number(seedValue);
    if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
      throw new Error(`CRUN ${model} seed must be an integer from 0 to 2147483647`);
    }
    input.seed = seed;
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

function normalizeCrunPixverseReferences(payload: Record<string, any>): Record<string, any>[] {
  const raw = payload.reference_images ?? payload.referenceImages;
  const values = raw == null || raw === '' ? [] : Array.isArray(raw) ? raw : [raw];
  if (values.length < 1 || values.length > 7) {
    throw new Error('CRUN pixverse/v6-r2v requires 1 to 7 reference images');
  }
  const names = Array.isArray(payload.reference_names ?? payload.referenceNames)
    ? payload.reference_names ?? payload.referenceNames : [];
  const types = Array.isArray(payload.reference_types ?? payload.referenceTypes)
    ? payload.reference_types ?? payload.referenceTypes : [];
  return values.map((item: any, index: number) => {
    const url = typeof item === 'string' ? item.trim() : String(item?.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`CRUN reference_images[${index}].url must be an HTTP(S) URL`);
    }
    const refName = String(item?.ref_name ?? item?.refName ?? names[index] ?? '').trim();
    if (refName.length > 30) {
      throw new Error(`CRUN reference_images[${index}].ref_name must be at most 30 characters`);
    }
    const type = String(item?.type ?? types[index] ?? '').trim().toLowerCase();
    if (type && !['subject', 'background'].includes(type)) {
      throw new Error(`CRUN reference_images[${index}].type must be subject or background`);
    }
    return {
      url,
      ...(refName ? { ref_name: refName } : {}),
      ...(type ? { type } : {}),
    };
  });
}

export function buildCrunMinimaxH3RequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunMinimaxH3Profile(model);

  if (profile.operation === 'video-regeneration') {
    const h3TaskId = String(payload.h3_task_id ?? payload.h3TaskId ?? '').trim();
    if (!h3TaskId) throw new Error(`CRUN ${model} requires h3_task_id`);
    const body: Record<string, any> = { model, input: { h3_task_id: h3TaskId } };
    addCrunCallbackUrl(body, model, payload);
    return body;
  }

  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);
  const input: Record<string, any> = { prompt };

  if (profile.operation === 'image-to-video') {
    const imgUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls,
      'img_urls'
    );
    if (imgUrls.length < 1 || imgUrls.length > 2) {
      throw new Error(`CRUN ${model} requires one or two first/last frame images`);
    }
    input.img_urls = imgUrls;
  }

  if (profile.operation === 'reference-to-video') {
    const referenceImages = normalizeCrunHttpUrls(
      payload.reference_images ?? payload.referenceImages, 'reference_images'
    );
    const referenceVideos = normalizeCrunHttpUrls(
      payload.reference_videos ?? payload.referenceVideos, 'reference_videos'
    );
    const referenceAudios = normalizeCrunHttpUrls(
      payload.reference_audios ?? payload.referenceAudios, 'reference_audios'
    );
    if (!referenceImages.length && !referenceVideos.length) {
      throw new Error(`CRUN ${model} requires reference_images or reference_videos`);
    }
    if (referenceImages.length > 9) {
      throw new Error(`CRUN ${model} supports at most 9 reference images`);
    }
    if (referenceVideos.length > 3) {
      throw new Error(`CRUN ${model} supports at most 3 reference videos`);
    }
    if (referenceAudios.length > 3) {
      throw new Error(`CRUN ${model} supports at most 3 reference audios`);
    }
    if (referenceImages.length + referenceVideos.length + referenceAudios.length > 12) {
      throw new Error(`CRUN ${model} supports at most 12 reference files in total`);
    }
    if (referenceImages.length) input.reference_images = referenceImages;
    if (referenceVideos.length) input.reference_videos = referenceVideos;
    if (referenceAudios.length) input.reference_audios = referenceAudios;
  }

  const duration = Number(payload.duration ?? 5);
  if (!Number.isInteger(duration) || duration < 4 || duration > 15) {
    throw new Error(`CRUN ${model} duration must be an integer from 4 to 15`);
  }
  input.duration = duration;

  const resolution = String(payload.resolution ?? '768P').trim().toUpperCase();
  if (!['768P', '2K'].includes(resolution)) {
    throw new Error(`CRUN ${model} resolution must be one of: 768P, 2K`);
  }
  input.resolution = resolution;

  const aspectRatio = String(
    payload.aspect_ratio ?? payload.aspectRatio ??
      (profile.operation === 'image-to-video' ? 'auto' : '16:9')
  ).trim().toLowerCase();
  if (profile.operation === 'image-to-video') {
    if (aspectRatio !== 'auto') {
      throw new Error(`CRUN ${model} aspect_ratio must be auto`);
    }
  } else {
    const allowedRatios = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
    if (!allowedRatios.includes(aspectRatio)) {
      throw new Error(`CRUN ${model} aspect_ratio must be one of: ${allowedRatios.join(', ')}`);
    }
  }
  input.aspect_ratio = aspectRatio;

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunSeedreamRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  if (!isCrunSeedreamModel(model)) {
    throw new Error(`CRUN Seedream builder received unsupported model: ${model}`);
  }
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const input: Record<string, any> = { prompt };
  const imgUrls = normalizeCrunImageUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.urls
  );
  if (imgUrls.length > 10) {
    throw new Error(`CRUN ${model} supports at most 10 reference images`);
  }
  if (imgUrls.length) input.img_urls = imgUrls;

  const aspectRatio = String(
    payload.aspect_ratio ?? payload.aspectRatio ?? '1:1'
  ).trim().toLowerCase();
  const allowedRatios = [
    'match_input_image', '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9',
  ];
  if (!allowedRatios.includes(aspectRatio)) {
    throw new Error(`CRUN ${model} aspect_ratio must be one of: ${allowedRatios.join(', ')}`);
  }
  if (aspectRatio === 'match_input_image' && !imgUrls.length) {
    throw new Error(`CRUN ${model} aspect_ratio=match_input_image requires a reference image`);
  }
  input.aspect_ratio = aspectRatio;

  const resolution = String(payload.resolution ?? '2K').trim().toUpperCase();
  if (!['1K', '2K'].includes(resolution)) {
    throw new Error(`CRUN ${model} resolution must be one of: 1K, 2K`);
  }
  input.resolution = resolution;

  let outputFormat = String(
    payload.output_format ?? payload.outputFormat ?? 'png'
  ).trim().toLowerCase();
  if (outputFormat === 'jpg') outputFormat = 'jpeg';
  if (!['png', 'jpeg'].includes(outputFormat)) {
    throw new Error(`CRUN ${model} output_format must be one of: png, jpeg`);
  }
  input.output_format = outputFormat;

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunSeedanceRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunSeedanceProfile(model);
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const input: Record<string, any> = { prompt };
  if (profile.operation === 'image-to-video') {
    const imgUrls = normalizeCrunAssetUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls
    );
    if (!imgUrls.length) throw new Error(`CRUN ${model} requires at least one input image`);
    if (imgUrls.length > 2) throw new Error(`CRUN ${model} supports at most two frame images`);
    input.img_urls = imgUrls;
  }
  if (profile.operation === 'reference-to-video') {
    const referenceImages = normalizeCrunAssetUrls(
      payload.reference_images ?? payload.referenceImages
    );
    const referenceVideos = normalizeCrunAssetUrls(
      payload.reference_videos ?? payload.referenceVideos
    );
    const referenceAudios = normalizeCrunAssetUrls(
      payload.reference_audios ?? payload.referenceAudios
    );
    if (!referenceImages.length && !referenceVideos.length) {
      throw new Error(`CRUN ${model} requires reference_images or reference_videos`);
    }
    if (referenceImages.length) input.reference_images = referenceImages;
    if (referenceVideos.length) input.reference_videos = referenceVideos;
    if (referenceAudios.length) input.reference_audios = referenceAudios;
    if (profile.series === '2.5') input.task_type = 'reference';
  }

  const resolution = String(payload.resolution ?? '720p').trim().toLowerCase();
  if (!profile.resolutions.includes(resolution)) {
    throw new Error(
      `CRUN ${model} resolution must be one of: ${profile.resolutions.join(', ')}`
    );
  }
  input.resolution = resolution;
  input.aspect_ratio = String(
    payload.aspect_ratio ?? payload.aspectRatio ??
      (profile.operation === 'image-to-video' ? 'auto' : '16:9')
  ).trim();

  const duration = Number(payload.duration ?? 5);
  const allowsEditDuration = profile.series === '2.5' &&
    profile.operation === 'reference-to-video' && duration === -1;
  if (!allowsEditDuration &&
      (!Number.isInteger(duration) || duration < 4 || duration > profile.maxDuration)) {
    throw new Error(
      `CRUN ${model} duration must be an integer from 4 to ${profile.maxDuration}`
    );
  }
  input.duration = duration;
  if (profile.supportsAudio) input.audio = Boolean(payload.audio ?? true);
  if (profile.supportsCameraFixed) {
    input.camera_fixed = Boolean(payload.camera_fixed ?? payload.cameraFixed);
  }
  if (profile.supportsByteplusFallback) {
    input.byteplus_fallback = Boolean(
      payload.byteplus_fallback ?? payload.byteplusFallback
    );
  }
  if (profile.supportsReturnLastFrame) {
    input.return_last_frame = Boolean(
      payload.return_last_frame ?? payload.returnLastFrame
    );
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunKlingRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const profile = getCrunKlingProfile(model);
  const prompt = String(payload.prompt ?? '').trim();
  const input: Record<string, any> = {};

  if (profile.operation === 'talking-avatar') {
    const imageUrls = normalizeCrunHttpUrls(
      payload.image_url ?? payload.imageUrl ?? payload.image, 'avatar image'
    );
    const audioUrls = normalizeCrunHttpUrls(
      payload.audio_url ?? payload.audioUrl ?? payload.audio, 'avatar audio'
    );
    if (imageUrls.length !== 1) throw new Error(`CRUN ${model} requires exactly one avatar image`);
    if (audioUrls.length !== 1) throw new Error(`CRUN ${model} requires exactly one speech audio`);
    input.mode = normalizeCrunEnum(payload.mode ?? 'pro', ['std', 'pro'], model, 'mode');
    input.image_url = imageUrls[0];
    input.audio_url = audioUrls[0];
    if (prompt) input.prompt = prompt;
  } else if (model === 'kling/v2-6-motion-control') {
    const imageUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image,
      'motion-control image'
    );
    const videoUrls = normalizeCrunHttpUrls(
      payload.video_urls ?? payload.videoUrls ?? payload.videos ?? payload.video,
      'motion-control video'
    );
    if (imageUrls.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one character image`);
    }
    if (videoUrls.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one motion reference video`);
    }
    input.img_urls = imageUrls;
    input.video_urls = videoUrls;
    input.character_orientation = normalizeCrunEnum(
      payload.character_orientation ?? payload.characterOrientation ?? 'image',
      ['image', 'video'], model, 'character_orientation'
    );
    input.mode = normalizeCrunEnum(payload.mode ?? 'pro', ['std', 'pro'], model, 'mode');
    if (prompt) input.prompt = prompt;
  } else if (profile.operation === 'motion-control') {
    const imageUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.image,
      'motion-control image'
    );
    const videoUrls = normalizeCrunHttpUrls(
      payload.video_urls ?? payload.videoUrls ?? payload.videos ?? payload.video,
      'motion-control video'
    );
    if (imageUrls.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one character image`);
    }
    if (videoUrls.length !== 1) {
      throw new Error(`CRUN ${model} requires exactly one motion reference video`);
    }
    input.img_urls = imageUrls;
    input.video_urls = videoUrls;
    input.character_orientation = normalizeCrunEnum(
      payload.character_orientation ?? payload.characterOrientation ?? 'video',
      ['image', 'video'], model, 'character_orientation'
    );
    input.mode = normalizeCrunEnum(payload.mode ?? 'pro', ['std', 'pro'], model, 'mode');
    input.keep_original_sound = Boolean(
      payload.keep_original_sound ?? payload.keepOriginalSound ?? true
    );
    if (prompt) input.prompt = prompt;
    addCrunComplianceFields(input, model, payload);
  } else if (model === 'kling/v2-6') {
    if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);
    const imageUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls, 'frame image'
    );
    if (imageUrls.length > 2) {
      throw new Error(`CRUN ${model} supports at most two frame images`);
    }
    const mode = normalizeCrunEnum(payload.mode ?? 'std', ['std', 'pro'], model, 'mode');
    if (imageUrls.length === 2 && mode !== 'std') {
      throw new Error(`CRUN ${model} first/last frame generation requires std mode`);
    }
    const audio = Boolean(payload.audio ?? false);
    if (mode === 'std' && audio) {
      throw new Error(`CRUN ${model} audio must be false in std mode`);
    }
    const duration = normalizeCrunInteger(payload.duration ?? 5, 5, 10, model, 'duration');
    if (![5, 10].includes(duration)) {
      throw new Error(`CRUN ${model} duration must be one of: 5, 10`);
    }
    input.mode = mode;
    input.prompt = prompt;
    if (imageUrls.length) input.img_urls = imageUrls;
    input.duration = duration;
    input.aspect_ratio = normalizeCrunEnum(
      payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
      ['16:9', '9:16', '1:1'], model, 'aspect_ratio'
    );
    input.audio = audio;
    addCrunComplianceFields(input, model, payload);
  } else if (model === 'kling/v3-turbo') {
    if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);
    input.prompt = prompt;
    const imageUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls, 'start image'
    );
    if (imageUrls.length > 1) throw new Error(`CRUN ${model} supports at most one start image`);
    if (imageUrls.length) input.img_urls = imageUrls;
    input.resolution = normalizeCrunEnum(
      payload.resolution ?? '720p', ['720p', '1080p'], model, 'resolution'
    );
    input.duration = normalizeCrunInteger(payload.duration ?? 5, 3, 15, model, 'duration');
    if (!imageUrls.length) {
      input.aspect_ratio = normalizeCrunEnum(
        payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
        ['16:9', '9:16', '1:1'], model, 'aspect_ratio'
      );
    }
    addCrunComplianceFields(input, model, payload);
  } else {
    const multiShots = Boolean(payload.multi_shots ?? payload.multiShots);
    const imageUrls = normalizeCrunHttpUrls(
      payload.img_urls ?? payload.imgUrls ?? payload.imageUrls, 'frame image'
    );
    input.mode = normalizeCrunEnum(payload.mode ?? 'pro', ['std', 'pro'], model, 'mode');
    input.multi_shots = multiShots;
    const duration = normalizeCrunInteger(payload.duration ?? 5, 3, 15, model, 'duration');
    input.duration = duration;

    if (multiShots) {
      if (imageUrls.length !== 1) {
        throw new Error(`CRUN ${model} multi-shot mode requires exactly one start image`);
      }
      input.img_urls = imageUrls;
      const shotType = normalizeCrunEnum(
        payload.shot_type ?? payload.shotType ?? 'intelligence',
        ['intelligence', 'customize'], model, 'shot_type'
      );
      input.shot_type = shotType;
      if (shotType === 'intelligence') {
        if (!prompt) throw new Error(`CRUN ${model} intelligent multi-shot mode requires a prompt`);
        input.prompt = prompt;
      } else {
        const multiPrompt = normalizeCrunKlingMultiPrompt(
          payload.multi_prompt ?? payload.multiPrompt, model
        );
        if (!multiPrompt.length) {
          throw new Error(`CRUN ${model} custom multi-shot mode requires multi_prompt`);
        }
        const totalDuration = multiPrompt.reduce((sum, shot) => sum + shot.duration, 0);
        if (totalDuration !== duration) {
          throw new Error(`CRUN ${model} multi_prompt durations must add up to duration (${duration})`);
        }
        input.multi_prompt = multiPrompt;
      }
      input.audio = true;
    } else {
      if (!prompt) throw new Error(`CRUN ${model} single-shot mode requires a prompt`);
      if (imageUrls.length > 2) {
        throw new Error(`CRUN ${model} single-shot mode supports at most two frame images`);
      }
      input.prompt = prompt;
      if (imageUrls.length) input.img_urls = imageUrls;
      input.audio = Boolean(payload.audio ?? true);
      if (!imageUrls.length) {
        input.aspect_ratio = normalizeCrunEnum(
          payload.aspect_ratio ?? payload.aspectRatio ?? '16:9',
          ['16:9', '9:16', '1:1'], model, 'aspect_ratio'
        );
      }
    }

    const elementList = normalizeCrunKlingElements(
      payload.element_list ?? payload.elementList, model
    );
    if (elementList.length) input.element_list = elementList;
    addCrunComplianceFields(input, model, payload);
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunNanoBananaRequestBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  parseCrunModel(new URL(`crun:///${model}`));
  const prompt = String(payload.prompt ?? '').trim();
  if (!prompt) throw new Error(`CRUN ${model} requires a non-empty prompt`);

  const input: Record<string, any> = { prompt };
  const imgUrls = normalizeCrunImageUrls(
    payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.urls
  );
  if (imgUrls.length) input.img_urls = imgUrls;

  const aspectRatio = String(payload.aspect_ratio ?? payload.aspectRatio ?? '').trim();
  if (aspectRatio) input.aspect_ratio = aspectRatio;

  const supportsResolution = isCrunNanoBanana2(model) || isCrunNanoBananaPro(model);
  if (supportsResolution) {
    const resolution = String(payload.resolution ?? '2K').trim().toUpperCase();
    if (!['1K', '2K', '4K'].includes(resolution)) {
      throw new Error(`CRUN ${model} resolution must be one of: 1K, 2K, 4K`);
    }
    input.resolution = resolution;
  }

  const isV2 = isCrunV2Channel(model);
  const isLite = isCrunNanoBanana2Lite(model);
  if (!isV2 && !isLite) {
    const classic = model === 'google/nano-banana';
    const allowedFormats = classic ? ['png', 'jpeg'] : ['png', 'jpg'];
    let outputFormat = String(payload.output_format ?? payload.outputFormat ?? 'png')
      .trim().toLowerCase();
    if (classic && outputFormat === 'jpg') outputFormat = 'jpeg';
    if (!classic && outputFormat === 'jpeg') outputFormat = 'jpg';
    if (!allowedFormats.includes(outputFormat)) {
      throw new Error(`CRUN ${model} output_format must be one of: ${allowedFormats.join(', ')}`);
    }
    input.output_format = outputFormat;
  }

  if (model === 'google/nano-banana-2') {
    input.google_search = Boolean(payload.google_search ?? payload.googleSearch);
  }

  const body: Record<string, any> = { model, input };
  addCrunCallbackUrl(body, model, payload);
  return body;
}

export function buildCrunGpt56ResponsesBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isCrunGpt56Model(model)) throw new Error(`Unsupported CRUN GPT-5.6 model: ${model}`);
  const input = normalizeCrunGpt56ResponsesInput(payload);
  if (typeof input === 'string' ? !input.trim() : !Array.isArray(input) || input.length === 0) {
    throw new Error('CRUN GPT-5.6 Responses API requires a non-empty input, prompt, or image');
  }

  const body: Record<string, any> = { model, input };
  const instructions = payload.instructions ?? payload.systemPrompt ?? payload.system_prompt;
  if (typeof instructions === 'string' && instructions.trim()) {
    body.instructions = instructions.trim();
  }
  const maxTokens = payload.max_output_tokens ?? payload.maxOutputTokens;
  if (maxTokens != null && maxTokens !== '') {
    body.max_output_tokens = normalizeCrunGpt56Integer(
      maxTokens, 1, 128000, 'max_output_tokens'
    );
  }
  copyCrunGpt56Sampling(payload, body);

  const effort = payload.reasoning?.effort ?? payload.reasoning_effort ?? payload.reasoningEffort;
  if (effort) {
    body.reasoning = {
      effort: normalizeCrunGpt56Enum(
        effort, ['none', 'low', 'medium', 'high'] as const, 'reasoning.effort'
      ),
    };
  }
  if (payload.text && typeof payload.text === 'object') {
    body.text = payload.text;
  } else {
    const responseFormat = payload.response_format ?? payload.responseFormat;
    if (responseFormat === 'json_object') {
      body.text = { format: { type: 'json_object' } };
    } else if (responseFormat && responseFormat !== 'text') {
      throw new Error('CRUN GPT-5.6 Responses responseFormat must be text or json_object');
    }
  }
  copyCrunGpt56Tools(payload, body);
  if (payload.previous_response_id || payload.previousResponseId) {
    body.previous_response_id = payload.previous_response_id ?? payload.previousResponseId;
  }
  if (payload.store != null) body.store = Boolean(payload.store);
  if (payload.metadata && typeof payload.metadata === 'object') body.metadata = payload.metadata;
  body.stream = Boolean(payload.stream);
  return body;
}

export function buildCrunGpt56ChatBody(
  model: string,
  payload: Record<string, any>
): Record<string, any> {
  if (!isCrunGpt56Model(model)) throw new Error(`Unsupported CRUN GPT-5.6 model: ${model}`);
  const body: Record<string, any> = {
    model,
    messages: normalizeCrunGpt56ChatMessages(payload),
    stream: Boolean(payload.stream),
  };
  const maxTokens = payload.max_completion_tokens ?? payload.maxCompletionTokens ??
    payload.max_output_tokens ?? payload.maxOutputTokens;
  if (maxTokens != null && maxTokens !== '') {
    body.max_completion_tokens = normalizeCrunGpt56Integer(
      maxTokens, 1, 128000, 'max_completion_tokens'
    );
  }
  copyCrunGpt56Sampling(payload, body);
  const effort = payload.reasoning_effort ?? payload.reasoningEffort;
  if (effort) {
    body.reasoning_effort = normalizeCrunGpt56Enum(
      effort, ['none', 'low', 'medium', 'high'] as const, 'reasoning_effort'
    );
  }
  const responseFormat = payload.response_format ?? payload.responseFormat;
  if (typeof responseFormat === 'string') {
    if (!['text', 'json_object'].includes(responseFormat)) {
      throw new Error('CRUN GPT-5.6 Chat responseFormat must be text, json_object, or an object');
    }
    body.response_format = { type: responseFormat };
  } else if (responseFormat && typeof responseFormat === 'object') {
    body.response_format = responseFormat;
  }
  copyCrunGpt56Tools(payload, body);
  if (body.stream) {
    body.stream_options = payload.stream_options ?? payload.streamOptions ?? { include_usage: true };
  }
  return body;
}

export async function createCrunTaskSync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  if (options?.signal?.aborted) throw createAbortError('CRUN task creation aborted');
  const model = parseCrunModel(url);
  if (!isCrunGpt56Model(model)) {
    throw new Error(`CRUN synchronous execution is not supported for model: ${model}`);
  }
  const config = ensureCrunConfig(platformConfig);
  const apiMode = normalizeCrunGpt56Mode(
    payload.apiMode ?? payload.api_mode ?? payload.wireApi ?? payload.wire_api ??
    platformConfig?.wireApi ?? platformConfig?.wire_api ?? 'responses'
  );
  const requestBody = apiMode === 'responses'
    ? buildCrunGpt56ResponsesBody(model, payload)
    : buildCrunGpt56ChatBody(model, payload);
  const endpoint = apiMode === 'responses'
    ? buildCrunResponsesEndpoint(config)
    : buildCrunChatCompletionsEndpoint(config);

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
      throw new Error(`CRUN API error: HTTP ${response.status}${errorBody ? ` ${errorBody}` : ''}`);
    }
    const contentType = response.headers.get('content-type') || '';
    const result = requestBody.stream || contentType.includes('text/event-stream')
      ? apiMode === 'responses'
        ? parseCrunGpt56ResponsesSse(await response.text())
        : parseCrunGpt56ChatSse(await response.text(), model)
      : await response.json();
    const outputs = apiMode === 'responses'
      ? normalizeCrunGpt56ResponsesOutputs(result)
      : normalizeCrunGpt56ChatOutputs(result);
    if (!outputs.length) {
      throw new Error(`CRUN GPT-5.6 ${apiMode} API returned no text or tool-call output`);
    }
    const totalTokens = result?.usage?.total_tokens ?? result?.usage?.totalTokens;
    return {
      provider: CRUN_SCHEME,
      taskId: result?.id || `crun-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'succeeded',
      outputs,
      costCoins: typeof totalTokens === 'number' ? totalTokens : undefined,
      raw: result,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('CRUN API')) throw error;
    const wrapped = new Error(`CRUN API error: ${error?.message ?? String(error)}`);
    (wrapped as any).cause = error;
    throw wrapped;
  }
}

function normalizeCrunGpt56Mode(value: unknown): 'responses' | 'chat_completions' {
  const mode = String(value).trim().toLowerCase().replace(/[/-]/g, '_');
  if (mode === 'response' || mode === 'responses') return 'responses';
  if (mode === 'chat' || mode === 'chat_completion' || mode === 'chat_completions') {
    return 'chat_completions';
  }
  throw new Error('CRUN GPT-5.6 apiMode must be responses or chat_completions');
}

function normalizeCrunGpt56ResponsesInput(payload: Record<string, any>): string | any[] {
  if (payload.input != null) return payload.input;
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const images = normalizeCrunGpt56Images(payload.urls ?? payload.images ?? payload.image);
  if (!images.length) return prompt;
  const content: any[] = [];
  if (prompt) content.push({ type: 'input_text', text: prompt });
  for (const imageUrl of images) content.push({ type: 'input_image', image_url: imageUrl });
  return [{ role: 'user', content }];
}

function normalizeCrunGpt56ChatMessages(payload: Record<string, any>): any[] {
  if (payload.messages != null) {
    if (!Array.isArray(payload.messages) || !payload.messages.length) {
      throw new Error('CRUN GPT-5.6 Chat messages must be a non-empty array');
    }
    return payload.messages.map((message: any, index: number) => {
      if (!message || !['system', 'developer', 'user', 'assistant', 'tool'].includes(message.role)) {
        throw new Error(`CRUN GPT-5.6 Chat messages[${index}] has an invalid role`);
      }
      if (message.content == null && !message.tool_calls) {
        throw new Error(`CRUN GPT-5.6 Chat messages[${index}] requires content or tool_calls`);
      }
      return message;
    });
  }
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const images = normalizeCrunGpt56Images(payload.urls ?? payload.images ?? payload.image);
  if (!prompt && !images.length) {
    throw new Error('CRUN GPT-5.6 Chat requires a non-empty prompt, messages, or image');
  }
  const messages: any[] = [];
  const systemPrompt = payload.systemPrompt ?? payload.system_prompt ?? payload.instructions;
  if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }
  if (!images.length) {
    messages.push({ role: 'user', content: prompt });
  } else {
    const content: any[] = [];
    if (prompt) content.push({ type: 'text', text: prompt });
    for (const imageUrl of images) {
      content.push({ type: 'image_url', image_url: { url: imageUrl } });
    }
    messages.push({ role: 'user', content });
  }
  return messages;
}

function normalizeCrunGpt56Images(value: unknown): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  if (values.length > 5) throw new Error('CRUN GPT-5.6 supports at most 5 image inputs');
  return values.map((item: any, index: number) => {
    let imageUrl = typeof item === 'string' ? item.trim() : String(item?.url ?? '').trim();
    if (!imageUrl) {
      const inline = item?.inlineData ?? item?.inline_data ?? item;
      if (typeof inline?.data === 'string' && inline.data.trim()) {
        imageUrl = inline.data.startsWith('data:')
          ? inline.data
          : `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data}`;
      }
    }
    if (!/^(https?:\/\/|data:image\/(jpeg|png|gif|webp);base64,)/i.test(imageUrl)) {
      throw new Error(
        `CRUN GPT-5.6 image[${index}] must be an HTTP(S) URL or JPG/PNG/GIF/WebP data URL`
      );
    }
    return imageUrl;
  });
}

function copyCrunGpt56Sampling(payload: Record<string, any>, body: Record<string, any>): void {
  if (payload.temperature != null && payload.temperature !== '') {
    body.temperature = normalizeCrunGpt56Number(payload.temperature, 0, 2, 'temperature');
  }
  const topP = payload.top_p ?? payload.topP;
  if (topP != null && topP !== '') {
    body.top_p = normalizeCrunGpt56Number(topP, 0, 1, 'top_p');
  }
}

function copyCrunGpt56Tools(payload: Record<string, any>, body: Record<string, any>): void {
  if (Array.isArray(payload.tools)) body.tools = payload.tools;
  if (payload.tool_choice != null || payload.toolChoice != null) {
    body.tool_choice = payload.tool_choice ?? payload.toolChoice;
  }
}

function normalizeCrunGpt56Enum<T extends string>(
  value: unknown, allowed: readonly T[], field: string
): T {
  const normalized = String(value).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new Error(`CRUN GPT-5.6 ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function normalizeCrunGpt56Number(
  value: unknown, min: number, max: number, field: string
): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`CRUN GPT-5.6 ${field} must be between ${min} and ${max}`);
  }
  return number;
}

function normalizeCrunGpt56Integer(
  value: unknown, min: number, max: number, field: string
): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`CRUN GPT-5.6 ${field} must be an integer from ${min} to ${max}`);
  }
  return number;
}

function normalizeCrunGpt56ResponsesOutputs(response: any): any[] {
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
  if (!outputs.length && typeof response?.output_text === 'string' && response.output_text) {
    outputs.push({ rawData: response, text: response.output_text, mimeType: 'text/plain' });
  }
  return outputs;
}

function normalizeCrunGpt56ChatOutputs(response: any): any[] {
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

function parseCrunGpt56ResponsesSse(text: string): any {
  const events = parseCrunGpt56SseEvents(text);
  const failed = [...events].reverse().find(event => event?.type === 'response.failed');
  if (failed) {
    throw new Error(failed?.response?.error?.message || failed?.error?.message || 'Responses stream failed');
  }
  const completed = [...events].reverse().find(event => event?.type === 'response.completed');
  if (completed?.response) return completed.response;
  const outputText = events
    .filter(event => event?.type === 'response.output_text.delta' && typeof event.delta === 'string')
    .map(event => event.delta).join('');
  if (!outputText) throw new Error('CRUN GPT-5.6 Responses stream ended without output');
  return {
    object: 'response', status: 'completed',
    output: [{
      type: 'message', status: 'completed', role: 'assistant',
      content: [{ type: 'output_text', text: outputText, annotations: [] }],
    }],
    stream_events: events,
  };
}

function parseCrunGpt56ChatSse(text: string, model: string): any {
  const events = parseCrunGpt56SseEvents(text);
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
  if (!content && !reasoningContent && !toolCalls.length) {
    throw new Error('CRUN GPT-5.6 Chat stream ended without output');
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

function parseCrunGpt56SseEvents(text: string): any[] {
  const events: any[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try { events.push(JSON.parse(data)); } catch { /* Ignore heartbeat lines. */ }
  }
  return events;
}

export async function createCrunTaskAsync(
  url: URL,
  payload: Record<string, any>,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskCreateResult> {
  if (options?.signal?.aborted) throw createAbortError('CRUN task creation aborted');
  const model = parseCrunModel(url);
  const config = ensureCrunConfig(platformConfig);
  const result = await requestCrunJson(
    buildCrunCreateTaskEndpoint(config),
    config.apiKey,
    { method: 'POST', body: JSON.stringify(buildCrunRequestBody(model, payload)) },
    options
  );
  const taskId = result?.data?.task_id ?? result?.task_id;
  if (typeof taskId !== 'string' || !taskId) {
    throw new Error('CRUN API did not return data.task_id');
  }
  return {
    provider: CRUN_SCHEME,
    taskId,
    status: 'pending',
    raw: result,
    metadata: { model },
  };
}

function addCrunCallbackUrl(
  body: Record<string, any>,
  model: string,
  payload: Record<string, any>
): void {
  const callbackUrl = String(payload.callback_url ?? payload.callbackUrl ?? '').trim();
  if (!callbackUrl) return;
  if (!/^https:\/\//i.test(callbackUrl)) {
    throw new Error(`CRUN ${model} callback_url must be a public HTTPS URL`);
  }
  body.callback_url = callbackUrl;
}

function addOptionalEnum(
  target: Record<string, any>,
  field: string,
  value: unknown,
  allowed: string[],
  model: string
): void {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return;
  if (!allowed.includes(normalized)) {
    throw new Error(`CRUN ${model} ${field} must be one of: ${allowed.join(', ')}`);
  }
  target[field] = normalized;
}

export async function checkCrunStatus(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskStatusResult> {
  parseCrunModel(url);
  const data = await fetchCrunTask(taskId, platformConfig, options);
  return {
    provider: CRUN_SCHEME,
    taskId,
    status: mapCrunTaskStatus(data?.status),
    raw: data,
  };
}

export async function getCrunResult(
  url: URL,
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<TaskResult> {
  const model = parseCrunModel(url);
  const data = await fetchCrunTask(taskId, platformConfig, options);
  const status = mapCrunTaskStatus(data?.status);
  if (status !== 'succeeded') {
    const reason = data?.result?.message ?? data?.message ?? 'task result is not ready';
    throw new Error(`CRUN task ${taskId} is not completed (status=${status}, reason=${reason})`);
  }
  const outputs = normalizeCrunMediaOutputs(
    data, model === 'video-watermark-remove' || isCrunHailuo23Model(model) || isCrunSeedanceModel(model) || isCrunKlingModel(model) ||
      isCrunMinimaxH3Model(model) || isCrunPixverseV6Model(model) ||
      isCrunHappyHorse11Model(model) || isCrunGrokImagineVideoModel(model) ||
      isCrunGeminiOmniModel(model) || isCrunVeo31Model(model) ? 'video' : 'image'
  );
  if (!outputs.length) {
    throw new Error('CRUN task succeeded but returned no result.media_urls');
  }
  return {
    provider: CRUN_SCHEME,
    taskId,
    status: 'succeeded',
    outputs,
    costCoins: typeof data?.credits === 'number' ? data.credits : undefined,
    raw: data,
  };
}

async function fetchCrunTask(
  taskId: string,
  platformConfig?: PlatformConfig,
  options?: TaskRequestOptions
): Promise<any> {
  if (!taskId) throw new Error('CRUN task query requires a taskId');
  if (options?.signal?.aborted) throw createAbortError('CRUN task request aborted');
  const config = ensureCrunConfig(platformConfig);
  const result = await requestCrunJson(
    buildCrunTaskInfoEndpoint(config, taskId), config.apiKey, { method: 'GET' }, options
  );
  return result?.data ?? result;
}

async function requestCrunJson(
  endpoint: string,
  apiKey: string,
  init: RequestInit,
  options?: TaskRequestOptions
): Promise<any> {
  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: toAbortSignal(options?.signal),
    });
    const text = await response.text();
    let result: any = {};
    if (text) {
      try { result = JSON.parse(text); } catch { result = { message: text }; }
    }
    if (!response.ok || result?.code !== 200) {
      const detail = result?.message ?? result?.msg ?? result?.errors?.join?.('; ') ?? text;
      throw new Error(`CRUN API error: HTTP ${response.status}${detail ? ` ${detail}` : ''}`);
    }
    return result;
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.startsWith('CRUN API')) throw error;
    throw new Error(`CRUN API error: ${error?.message ?? String(error)}`);
  }
}

function normalizeCrunImageUrls(value: unknown): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    const url = typeof item === 'string'
      ? item.trim()
      : typeof (item as any)?.url === 'string' ? (item as any).url.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`CRUN image[${index}] must be an HTTP(S) URL; upload local files to CRUN first`);
    }
    return url;
  });
}

function normalizeCrunAssetUrls(value: unknown): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    const url = typeof item === 'string'
      ? item.trim()
      : typeof (item as any)?.url === 'string' ? (item as any).url.trim() : '';
    if (!/^(https?:\/\/|asset:\/\/)/i.test(url)) {
      throw new Error(
        `CRUN asset[${index}] must be an HTTP(S) URL or Seedance asset:// identifier`
      );
    }
    return url;
  });
}

function normalizeCrunHttpUrls(value: unknown, field: string): string[] {
  const values = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    const url = typeof item === 'string'
      ? item.trim()
      : typeof (item as any)?.url === 'string' ? (item as any).url.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(
        `CRUN ${field}[${index}] must be an HTTP(S) URL; upload local files to CRUN first`
      );
    }
    return url;
  });
}

function normalizeCrunGeminiOmniVideo(
  item: any,
  index: number,
  model: string
): { url: string; start: number; ends: number } {
  const url = typeof item === 'string' ? item.trim() : String(item?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `CRUN ${model} video_list[${index}].url must be an HTTP(S) URL; upload local files to CRUN first`
    );
  }
  const start = Number(typeof item === 'string' ? 0 : item?.start ?? 0);
  const ends = Number(typeof item === 'string' ? Number.NaN : item?.ends ?? item?.end);
  if (!Number.isFinite(start) || start < 0) {
    throw new Error(`CRUN ${model} video_list[${index}].start must be 0 or greater`);
  }
  if (!Number.isFinite(ends) || ends <= start) {
    throw new Error(`CRUN ${model} video_list[${index}].ends must be later than start`);
  }
  return { url, start, ends };
}

function normalizeCrunNumberArray(value: unknown): number[] {
  if (value == null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map(item => Number(item));
}

function normalizeCrunBoolean(value: unknown, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return Boolean(value);
}

function normalizeCrunEnum(
  value: unknown,
  allowed: string[],
  model: string,
  field: string
): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new Error(`CRUN ${model} ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function normalizeCrunInteger(
  value: unknown,
  min: number,
  max: number,
  model: string,
  field: string
): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new Error(`CRUN ${model} ${field} must be an integer from ${min} to ${max}`);
  }
  return normalized;
}

function normalizeCrunKlingMultiPrompt(
  value: unknown,
  model: string
): Array<{ prompt: string; duration: number }> {
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  if (items.length > 6) throw new Error(`CRUN ${model} supports at most 6 custom shots`);
  return items.map((item: any, index) => {
    const prompt = String(item?.prompt ?? '').trim();
    if (!prompt) throw new Error(`CRUN ${model} multi_prompt[${index}].prompt is required`);
    const duration = normalizeCrunInteger(
      item?.duration, 1, 15, model, `multi_prompt[${index}].duration`
    );
    return { prompt, duration };
  });
}

function normalizeCrunKlingElements(
  value: unknown,
  model: string
): Array<{ name: string; description: string; element_image_urls: string[] }> {
  const items = value == null || value === '' ? [] : Array.isArray(value) ? value : [value];
  if (items.length > 3) throw new Error(`CRUN ${model} supports at most 3 elements`);
  return items.map((item: any, index) => {
    const name = String(item?.name ?? '').trim();
    if (!name) throw new Error(`CRUN ${model} element_list[${index}].name is required`);
    const description = String(item?.description ?? '').trim();
    const imageUrls = normalizeCrunHttpUrls(
      item?.element_image_urls ?? item?.elementImageUrls ?? item?.imageUrls,
      `element_list[${index}].element_image_urls`
    );
    if (imageUrls.length < 1 || imageUrls.length > 4) {
      throw new Error(`CRUN ${model} element ${name} requires 1 to 4 reference images`);
    }
    return { name, description, element_image_urls: imageUrls };
  });
}

function addCrunComplianceFields(
  input: Record<string, any>,
  model: string,
  payload: Record<string, any>
): void {
  input.input_compliance = normalizeCrunEnum(
    payload.input_compliance ?? payload.inputCompliance ?? 'enabled',
    ['enabled', 'disabled'], model, 'input_compliance'
  );
  input.output_compliance = normalizeCrunEnum(
    payload.output_compliance ?? payload.outputCompliance ?? 'enabled',
    ['enabled', 'disabled'], model, 'output_compliance'
  );
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
