import type { FormilySchema } from '../../types.ts';
import {
  getCrunHailuo23Profile,
  getCrunImageUpscaleProfile,
  getCrunHappyHorse11Profile,
  getCrunKlingProfile,
  getCrunMinimaxH3Profile,
  getCrunPixverseV6Profile,
  getCrunSeedanceProfile,
  getCrunVeo31Profile,
  isCrunGptImage2Premium,
  isCrunGptImage2Stable,
  isCrunNanoBanana2,
  isCrunNanoBanana2Lite,
  isCrunNanoBananaPro,
  isCrunV2Channel,
  isCrunWatermarkRemoveModel,
} from './helpers.ts';

const ASPECT_RATIOS = [
  'auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4',
  '9:16', '16:9', '21:9', '1:4', '4:1', '1:8', '8:1',
];

function imageUploadField(title = 'Reference Images', description?: string): Record<string, any> {
  return {
    type: 'array',
    title,
    description: description ??
      'Select local images to upload to CRUN, or reuse HTTP(S) resource URLs.',
    'x-decorator': 'FormItem',
    'x-component': 'Upload',
    'x-component-props': {
      accept: 'image/*',
      multiple: true,
      listType: 'picture-card',
    },
    items: { type: 'string' },
    default: [],
  };
}

function mediaUploadField(
  title: string,
  accept: string,
  description: string,
  multiple = true
): Record<string, any> {
  return {
    type: 'array', title, description,
    'x-decorator': 'FormItem', 'x-component': 'Upload',
    'x-component-props': { accept, multiple, listType: 'text' },
    items: { type: 'string' }, default: [],
  };
}

export function buildCrunSeedreamFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt / Editing Instructions', required: true,
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6,
          placeholder: 'Describe the image to generate, or how to edit the reference images...',
        },
      },
      imgUrls: imageUploadField(
        'Reference Images (optional, up to 10)',
        'Select up to 10 local images to upload to CRUN, or reuse public HTTP(S) URLs.'
      ),
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          'match_input_image', '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9',
        ].map(value => ({ label: value, value })),
        default: '1:1',
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['1K', '2K'].map(value => ({ label: value, value })), default: '2K',
      },
      outputFormat: {
        type: 'string', title: 'Output Format', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['png', 'jpeg'].map(value => ({ label: value.toUpperCase(), value })),
        default: 'png',
      },
      callbackUrl: {
        type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': { placeholder: 'https://your-domain.com/callback' },
      },
    },
  };
}

export function buildCrunMinimaxH3FormSchema(model: string): FormilySchema {
  const profile = getCrunMinimaxH3Profile(model);
  const callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };

  if (profile.operation === 'video-regeneration') {
    return {
      type: 'object',
      properties: {
        h3TaskId: {
          type: 'string', title: 'Successful 768P H3 Task ID', required: true,
          'x-decorator': 'FormItem', 'x-component': 'Input',
          description: 'The source task must be a successful 768P H3 T2V, I2V, or R2V task.',
        },
        callbackUrl,
      },
    };
  }

  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': {
        rows: 6, placeholder: 'Describe the scene, motion, dialogue, sound, and camera...',
      },
    },
  };
  if (profile.operation === 'image-to-video') {
    properties.imgUrls = mediaUploadField(
      'First / Last Frame Images', 'image/*',
      'Upload one first-frame image, or two images for first and last frames.'
    );
  }
  if (profile.operation === 'reference-to-video') {
    properties.referenceImages = mediaUploadField(
      'Reference Images (up to 9)', 'image/*',
      'Multimodal image references used by the prompt.'
    );
    properties.referenceVideos = mediaUploadField(
      'Reference Videos (up to 3)', 'video/*',
      'Each reference video must be 2 to 15 seconds; total video duration is at most 15 seconds.'
    );
    properties.referenceAudios = mediaUploadField(
      'Reference Audios (up to 3)', 'audio/*',
      'Supplemental audio guidance. Audio cannot be the only reference type.'
    );
  }
  properties.duration = {
    type: 'number', title: 'Duration (4-15s)', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker',
    'x-component-props': { min: 4, max: 15, step: 1 }, default: 5,
  };
  properties.resolution = {
    type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: ['768P', '2K'].map(value => ({ label: value, value })), default: '768P',
  };
  properties.aspectRatio = {
    type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: (profile.operation === 'image-to-video'
      ? ['auto'] : ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'])
      .map(value => ({ label: value, value })),
    default: profile.operation === 'image-to-video' ? 'auto' : '16:9',
  };
  properties.callbackUrl = callbackUrl;
  return { type: 'object', properties };
}

export function buildCrunPixverseV6FormSchema(model: string): FormilySchema {
  const profile = getCrunPixverseV6Profile(model);
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': {
        rows: 6,
        placeholder: profile.operation === 'reference-to-video'
          ? 'Describe the video; use @reference_name to identify named references...'
          : 'Describe the scene, motion, camera, dialogue, and sound...',
      },
    },
  };

  if (profile.operation === 'image-to-video') {
    properties.image = mediaUploadField(
      'Starting Image', 'image/*',
      'Upload exactly one PNG, JPEG, JPG, or WebP image. The output inherits its aspect ratio.',
      false
    );
    properties.templateId = {
      type: 'number', title: 'Effect Template ID (optional)', 'x-decorator': 'FormItem',
      'x-component': 'NumberPicker',
      'x-component-props': { min: 0, step: 1 },
    };
  }

  if (profile.operation === 'reference-to-video') {
    properties.referenceImages = mediaUploadField(
      'Reference Images (1-7)', 'image/*',
      'Upload 1 to 7 references. Names and roles below match the image order.'
    );
    properties.referenceNames = {
      type: 'array', title: 'Reference Names (optional)', 'x-decorator': 'FormItem',
      'x-component': 'ArrayItems', description: 'Use these names as @name in the prompt.',
      items: {
        type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input',
        'x-component-props': { maxLength: 30, placeholder: 'hero' },
      },
      default: [],
    };
    properties.referenceTypes = {
      type: 'array', title: 'Reference Roles (optional)', 'x-decorator': 'FormItem',
      'x-component': 'ArrayItems', description: 'Each role matches the reference image order.',
      items: {
        type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: [
          { label: 'Subject', value: 'subject' },
          { label: 'Background', value: 'background' },
        ],
      },
      default: [],
    };
  }

  properties.duration = {
    type: 'number', title: 'Duration (1-15s)', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker',
    'x-component-props': { min: 1, max: 15, step: 1 }, default: 5,
  };
  properties.quality = {
    type: 'string', title: 'Quality', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: ['360p', '540p', '720p', '1080p'].map(value => ({ label: value, value })),
    default: '720p',
  };
  if (profile.supportsAspectRatio) {
    properties.aspectRatio = {
      type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: ['16:9', '9:16', '1:1', '3:4', '4:3', '2:3', '3:2', '21:9']
        .map(value => ({ label: value, value })),
      default: '16:9',
    };
  }
  properties.generateAudio = {
    type: 'boolean', title: 'Generate Native Audio', 'x-decorator': 'FormItem',
    'x-component': 'Switch', default: true,
  };
  if (profile.supportsMultiClip) {
    properties.generateMultiClip = {
      type: 'boolean', title: 'Generate Multi-clip Video', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  properties.seed = {
    type: 'number', title: 'Seed (optional)', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker',
    'x-component-props': { min: 0, max: 2147483647, step: 1 },
  };
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input', 'x-component-props': {
      placeholder: 'https://your-domain.com/callback',
    },
  };
  return { type: 'object', properties };
}

export function buildCrunHappyHorse11FormSchema(model: string): FormilySchema {
  const profile = getCrunHappyHorse11Profile(model);
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      description: 'Describe the scene, motion, camera, dialogue, voices, and sound.',
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': {
        rows: 6,
        placeholder: profile.operation === 'reference-to-video'
          ? 'Describe the video and identify the subjects shown in the reference images...'
          : 'Describe the scene, motion, camera, dialogue, voices, and sound...'
      },
    },
  };

  if (profile.operation === 'image-to-video') {
    properties.imgUrls = mediaUploadField(
      'First Frame Image', 'image/*',
      'Upload exactly one local image; it is automatically uploaded to CRUN.', false
    );
  } else if (profile.operation === 'reference-to-video') {
    properties.imgUrls = mediaUploadField(
      'Reference Images (1-9)', 'image/*',
      'Upload 1 to 9 subject or style reference images; local files are uploaded to CRUN.'
    );
  }

  properties.resolution = {
    type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: ['480P', '720P', '1080P'].map(value => ({ label: value, value })),
    default: '720P',
  };
  properties.duration = {
    type: 'number', title: 'Duration (3-15s)', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker',
    'x-component-props': { min: 3, max: 15, step: 1 }, default: 5,
  };
  if (profile.supportsAspectRatio) {
    properties.aspectRatio = {
      type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: ['16:9', '9:16', '3:4', '4:3', '4:5', '5:4', '1:1', '9:21', '21:9']
        .map(value => ({ label: value, value })),
      default: '16:9',
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunHailuo23FormSchema(model: string): FormilySchema {
  const profile = getCrunHailuo23Profile(model);
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt', required: true,
        description: 'Leave the reference image empty for text-to-video, or upload one image for image-to-video.',
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6, placeholder: 'Describe the scene, motion, subject, lighting, and camera...'
        },
      },
      imgUrls: mediaUploadField(
        'Reference Image (optional, max 1)', 'image/*',
        'Selecting a local image uploads it to CRUN automatically and enables image-to-video.', false
      ),
      mode: {
        type: 'string', title: 'Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: profile.modes.map(value => ({
          label: value === 'std' ? 'Standard' : 'Professional', value,
        })),
        default: 'std',
      },
      duration: {
        type: 'number', title: 'Duration', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: profile.durations.map(value => ({ label: `${value}s`, value })), default: 6,
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: profile.resolutions.map(value => ({ label: value, value })), default: '1080P',
      },
      callbackUrl: {
        type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Input', 'x-component-props': {
          placeholder: 'https://your-domain.com/callback',
        },
      },
    },
  };
}

export function buildCrunImageUpscaleFormSchema(model: string): FormilySchema {
  const profile = getCrunImageUpscaleProfile(model);
  const properties: Record<string, any> = {
    imgUrls: mediaUploadField(
      'Source Image', 'image/*',
      'Upload exactly one local image; it is automatically uploaded to CRUN.', false
    ),
  };
  if (profile.channel === 'basic') {
    properties.scaleFactor = {
      type: 'string', title: 'Scale Factor', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: [
        { label: 'Auto', value: 'auto' },
        ...profile.scaleFactors.map(value => ({ label: `${value}×`, value: String(value) })),
      ],
      default: 'auto',
    };
    properties.mode = {
      type: 'string', title: 'Enhancement Mode', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: profile.modes.map(value => ({
        label: value === 'clean' ? 'Clean / General' : 'Face', value,
      })),
      default: 'clean',
    };
    properties.outputFormat = {
      type: 'string', title: 'Output Format', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: profile.outputFormats.map(value => ({ label: value.toUpperCase(), value })),
      default: 'png',
    };
  } else {
    properties.clarity = {
      type: 'string', title: 'Clarity', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: profile.clarityLevels.map(value => ({
        label: value === 'high' ? 'High' : 'Ultra', value,
      })),
      default: 'high',
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input', 'x-component-props': {
      placeholder: 'https://your-domain.com/callback',
    },
  };
  return { type: 'object', properties };
}

export function buildCrunImageExpandFormSchema(): FormilySchema {
  const visibleIn = (mode: string) => ({
    dependencies: ['expandMode'],
    fulfill: { state: { visible: `{{$deps[0] === '${mode}'}}` } },
  });
  const source = mediaUploadField(
    'Source Image / Prepared Canvas', 'image/jpeg,image/png',
    'Exactly one JPG/PNG, at most 5 MB; each side 64–4090 px. ' +
    'Canvas mode requires the prepared expanded layout, not the original image.', false
  );
  source.required = true;
  source.minItems = 1;
  source.maxItems = 1;
  source['x-component-props'].maxCount = 1;
  const mask = mediaUploadField(
    'Canvas Mask', 'image/png',
    'Same dimensions as the prepared canvas. Black preserves the original region; white is generated.',
    false
  );
  mask.maxItems = 1;
  mask['x-component-props'].maxCount = 1;
  mask['x-reactions'] = visibleIn('canvas');
  const properties: Record<string, any> = {
    imgUrls: source,
    expandMode: {
      type: 'string', title: 'Expansion Mode', 'x-decorator': 'FormItem',
      'x-component': 'Select', default: 'sides',
      enum: [{ label: 'Four Sides', value: 'sides' }, { label: 'Canvas + Mask', value: 'canvas' }],
    },
    maskUrl: mask,
  };
  for (const side of ['top', 'bottom', 'left', 'right']) {
    properties[side] = {
      type: 'number', title: `${side[0].toUpperCase()}${side.slice(1)} Expansion Ratio`,
      'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
      'x-component-props': { min: 0, max: 1, step: 0.05 }, default: 0.25,
      description: '0–1; 0.25 means 25% of the original corresponding dimension.',
      'x-reactions': visibleIn('sides'),
    };
  }
  properties.prompt = {
    type: 'string', title: 'Expansion Instructions (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input.TextArea', 'x-component-props': { rows: 3 },
  };
  properties.outputFormat = {
    type: 'string', title: 'Output Format', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: ['png', 'jpg'].map(value => ({ label: value.toUpperCase(), value })), default: 'png',
  };
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input', 'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunWatermarkRemoveFormSchema(model: string): FormilySchema {
  if (!isCrunWatermarkRemoveModel(model)) {
    throw new Error(`Unsupported CRUN watermark removal model: ${model}`);
  }
  const video = model === 'video-watermark-remove';
  const media = mediaUploadField(
    video ? 'Source Video' : 'Source Image',
    video ? 'video/*' : 'image/jpeg,image/png,image/bmp,image/webp',
    video
      ? 'Upload exactly one video to CRUN, or reuse a public HTTP(S) URL.'
      : 'Exactly one image. Basic: JPG/PNG/BMP, 20–10000 px per side, up to 50 MB. ' +
        'Pro: JPG/PNG/WebP, less than 50 MB.',
    false
  );
  media.required = true;
  media.minItems = 1;
  media.maxItems = 1;
  media['x-component-props'].maxCount = 1;
  const properties: Record<string, any> = { [video ? 'videoUrl' : 'imgUrls']: media };
  if (!video) {
    properties.mode = {
      type: 'string', title: 'Removal Mode', 'x-decorator': 'FormItem',
      'x-component': 'Select', default: 'basic',
      enum: [
        { label: 'Basic', value: 'basic' },
        { label: 'Pro', value: 'pro' },
      ],
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunGpt56FormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      apiMode: {
        type: 'string', title: 'API Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: [
          { label: 'Responses API', value: 'responses' },
          { label: 'Chat Completions API', value: 'chat_completions' },
        ],
        default: 'responses',
      },
      systemPrompt: {
        type: 'string', title: 'System / Instructions', 'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea', 'x-component-props': { rows: 3 },
      },
      prompt: {
        type: 'string', title: 'Prompt', required: true, 'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea', 'x-component-props': { rows: 6 },
      },
      urls: {
        type: 'array', title: 'Image Inputs (optional, up to 5)',
        description: 'Local images are uploaded to CRUN automatically.',
        'x-decorator': 'FormItem', 'x-component': 'Upload',
        'x-component-props': {
          accept: 'image/jpeg,image/png,image/gif,image/webp', multiple: true,
          maxCount: 5, listType: 'picture-card',
        },
        items: { type: 'string' }, default: [],
      },
      reasoningEffort: {
        type: 'string', title: 'Reasoning Effort', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['none', 'low', 'medium', 'high'].map(value => ({ label: value, value })),
        default: 'medium',
      },
      maxOutputTokens: {
        type: 'number', title: 'Max Output Tokens (optional)', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1, max: 128000, precision: 0 },
      },
      temperature: {
        type: 'number', title: 'Temperature (optional)', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        description: 'Leave empty to use the model default.',
        'x-component-props': { min: 0, max: 2, step: 0.1 },
      },
      responseFormat: {
        type: 'string', title: 'Response Format', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Text', value: 'text' },
          { label: 'JSON Object', value: 'json_object' },
        ],
        default: 'text',
      },
      stream: {
        type: 'boolean', title: 'Stream', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
    },
  };
}

export function buildCrunGrokImagineVideoFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt', required: true,
        description: 'Describe motion, camera, dialogue, sound effects, ambience, and music.',
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6,
          placeholder: 'Animate the image with cinematic motion and synchronized audio...',
        },
      },
      imgUrls: mediaUploadField(
        'Reference Image', 'image/*',
        'Upload exactly one reference image; local files are automatically uploaded to CRUN.',
        false
      ),
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [{ label: 'Auto (follow input image)', value: 'auto' }], default: 'auto',
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['480p', '720p'].map(value => ({ label: value, value })), default: '720p',
      },
      duration: {
        type: 'number', title: 'Duration (1-15s)', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1, max: 15, step: 1 }, default: 6,
      },
      callbackUrl: {
        type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': { placeholder: 'https://your-domain.com/callback' },
      },
    },
  };
}

export function buildCrunGeminiOmniFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt', required: true,
        description: 'Describe the subject, scene, motion, camera, dialogue, ambience, and sound.',
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6,
          placeholder: 'Create a cohesive cinematic video using the supplied image and video references...',
        },
      },
      referenceImages: mediaUploadField(
        'Reference Images (up to 7)', 'image/*',
        'Upload up to 7 images. Together with the optional video, at most 8 reference assets are allowed.'
      ),
      referenceVideos: mediaUploadField(
        'Reference Video (optional)', 'video/*',
        'Upload at most one video. Local files are automatically uploaded to CRUN.', false
      ),
      videoStart: {
        type: 'number', title: 'Video Start Time (seconds)',
        description: 'The trim start time for the optional reference video.',
        'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: 0, step: 0.1 }, default: 0,
      },
      videoEnd: {
        type: 'number', title: 'Video End Time (seconds)',
        description: 'The trim end time must be later than the start time.',
        'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: 0.1, step: 0.1 }, default: 6,
      },
      duration: {
        type: 'number', title: 'Duration', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [4, 6, 8, 10].map(value => ({ label: `${value}s`, value })), default: 6,
      },
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['16:9', '9:16'].map(value => ({ label: value, value })), default: '16:9',
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['720p', '1080p', '4k'].map(value => ({ label: value, value })), default: '720p',
      },
      callbackUrl: {
        type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': { placeholder: 'https://your-domain.com/callback' },
      },
    },
  };
}

export function buildCrunVeo31FormSchema(model: string): FormilySchema {
  const profile = getCrunVeo31Profile(model);
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      description: 'Describe the scene, camera, dialogue, sound effects, ambience, and music.',
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': {
        rows: 6,
        placeholder: 'A cinematic shot with synchronized native audio...',
      },
    },
  };
  if (profile.operation === 'image-to-video') {
    properties.imgUrls = mediaUploadField(
      'First / Last Frame Images (1-2)', 'image/*',
      'Upload a first frame and optionally a last frame; local images are uploaded to CRUN.'
    );
  } else if (profile.operation === 'reference-to-video') {
    properties.imgUrls = mediaUploadField(
      'Reference Images (1-3)', 'image/*',
      'Upload 1 to 3 subject or style reference images; local images are uploaded to CRUN.'
    );
  }
  properties.duration = {
    type: 'number', title: 'Duration', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: profile.durations.map(value => ({ label: `${value}s`, value })), default: 8,
  };
  properties.resolution = {
    type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: ['720p', '1080p'].map(value => ({ label: value, value })), default: '720p',
  };
  properties.aspectRatio = {
    type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
    'x-component': 'Select',
    enum: ['16:9', '9:16'].map(value => ({ label: value, value })), default: '16:9',
  };
  properties.translatePrompt = {
    type: 'boolean', title: 'Translate / Enhance Prompt', 'x-decorator': 'FormItem',
    'x-component': 'Switch', default: true,
  };
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunSeedanceFormSchema(model: string): FormilySchema {
  const profile = getCrunSeedanceProfile(model);
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': {
        rows: 6,
        placeholder: profile.supportsAudio
          ? 'Describe the video, motion, and audio...'
          : 'Describe the video scene, motion, and camera...'
      },
    },
  };

  if (profile.operation === 'image-to-video') {
    properties.imgUrls = mediaUploadField(
      'Start / End Frame Images', 'image/*',
      'Upload one start frame and optionally one end frame, or reuse HTTP(S) resource URLs.'
    );
  }
  if (profile.operation === 'reference-to-video') {
    properties.referenceImages = mediaUploadField(
      'Reference Images', 'image/*', 'Reference images used as [Image1], [Image2], ...'
    );
    properties.referenceVideos = mediaUploadField(
      'Reference Videos', 'video/*', 'Reference videos used as [Video1], [Video2], ...'
    );
    properties.referenceAudios = mediaUploadField(
      'Reference Audios', 'audio/*', 'Reference audio used as [Audio1], [Audio2], ...'
    );
  }

  properties.resolution = {
    type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: profile.resolutions.map(value => ({ label: value, value })), default: '720p',
  };
  properties.aspectRatio = {
    type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9']
      .map(value => ({ label: value, value })),
    default: profile.operation === 'image-to-video' ? 'auto' : '16:9',
  };
  properties.duration = {
    type: 'number', title: `Duration (4-${profile.maxDuration}s)`,
    'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
    'x-component-props': { min: 4, max: profile.maxDuration, step: 1 }, default: 5,
  };
  if (profile.supportsAudio) {
    properties.audio = {
      type: 'boolean', title: 'Generate Audio', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: true,
    };
  }
  if (profile.supportsCameraFixed) {
    properties.cameraFixed = {
      type: 'boolean', title: 'Camera Fixed', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  if (profile.supportsByteplusFallback) {
    properties.byteplusFallback = {
      type: 'boolean', title: 'BytePlus Fallback', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  if (profile.supportsReturnLastFrame) {
    properties.returnLastFrame = {
      type: 'boolean', title: 'Return Last Frame', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunKlingFormSchema(model: string): FormilySchema {
  const profile = getCrunKlingProfile(model);
  const callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  const prompt = {
    type: 'string', title: 'Prompt', 'x-decorator': 'FormItem',
    'x-component': 'Input.TextArea',
    'x-component-props': { rows: 6, placeholder: 'Describe the scene, motion, and sound...' },
  };
  const mode = {
    type: 'string', title: 'Quality Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: [
      { label: 'Standard', value: 'std' },
      { label: 'Pro', value: 'pro' },
    ],
    default: 'pro',
  };
  const compliance = (title: string) => ({
    type: 'string', title, 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: ['enabled', 'disabled'].map(value => ({ label: value, value })),
    default: 'enabled',
  });

  if (model === 'kling/v2-6-motion-control') {
    return {
      type: 'object',
      properties: {
        prompt: {
          ...prompt,
          title: 'Motion Prompt (optional)',
          'x-component-props': {
            rows: 5, placeholder: 'Describe how the character should perform the motion...'
          },
        },
        imgUrls: mediaUploadField(
          'Character Image', 'image/*', 'Upload exactly one character reference image.', false
        ),
        videoUrls: mediaUploadField(
          'Motion Reference Video', 'video/*', 'Upload exactly one motion reference video.', false
        ),
        characterOrientation: {
          type: 'string', title: 'Composition Source', 'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: [
            { label: 'Follow Character Image', value: 'image' },
            { label: 'Follow Reference Video', value: 'video' },
          ],
          default: 'image',
        },
        mode,
        callbackUrl,
      },
    };
  }

  if (model === 'kling/v2-6') {
    return {
      type: 'object',
      properties: {
        prompt: { ...prompt, required: true },
        mode: { ...mode, default: 'std' },
        imgUrls: mediaUploadField(
          'Start / End Frame Images (optional)', 'image/*',
          'Leave empty for text-to-video. One image is the start frame; two images enable first/last frame control in Standard mode.'
        ),
        duration: {
          type: 'number', title: 'Duration', 'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: [5, 10].map(value => ({ label: `${value}s`, value })), default: 5,
        },
        aspectRatio: {
          type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: ['16:9', '9:16', '1:1'].map(value => ({ label: value, value })),
          default: '16:9',
        },
        audio: {
          type: 'boolean', title: 'Generate Native Audio (Pro only)',
          'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
        },
        inputCompliance: compliance('Input Compliance'),
        outputCompliance: compliance('Output Compliance'),
        callbackUrl,
      },
    };
  }

  if (profile.operation === 'motion-control') {
    return {
      type: 'object',
      properties: {
        prompt,
        imgUrls: mediaUploadField(
          'Character Image', 'image/*', 'Upload exactly one character reference image.', false
        ),
        videoUrls: mediaUploadField(
          'Motion Reference Video', 'video/*', 'Upload exactly one motion reference video.', false
        ),
        characterOrientation: {
          type: 'string', title: 'Composition Source', 'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: [
            { label: 'Follow Reference Video', value: 'video' },
            { label: 'Follow Character Image', value: 'image' },
          ],
          default: 'video',
        },
        mode,
        keepOriginalSound: {
          type: 'boolean', title: 'Keep Original Video Sound', 'x-decorator': 'FormItem',
          'x-component': 'Switch', default: true,
        },
        inputCompliance: compliance('Input Compliance'),
        outputCompliance: compliance('Output Compliance'),
        callbackUrl,
      },
    };
  }

  if (profile.operation === 'talking-avatar') {
    return {
      type: 'object',
      properties: {
        prompt: {
          ...prompt,
          title: 'Motion Prompt (optional)',
          'x-component-props': { rows: 4, placeholder: 'Describe gestures and expressions...' },
        },
        imageUrl: mediaUploadField(
          'Avatar Image', 'image/*', 'Upload exactly one clear, front-facing portrait.', false
        ),
        audioUrl: mediaUploadField(
          'Speech Audio', 'audio/*', 'Upload exactly one speech audio file.', false
        ),
        mode,
        callbackUrl,
      },
    };
  }

  if (model === 'kling/v3-turbo') {
    return {
      type: 'object',
      properties: {
        prompt: { ...prompt, required: true },
        imgUrls: mediaUploadField(
          'Start Image (optional)', 'image/*',
          'Leave empty for text-to-video, or upload one start image for image-to-video.', false
        ),
        resolution: {
          type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
          enum: ['720p', '1080p'].map(value => ({ label: value, value })), default: '720p',
        },
        duration: {
          type: 'number', title: 'Duration (3-15s)', 'x-decorator': 'FormItem',
          'x-component': 'NumberPicker', 'x-component-props': { min: 3, max: 15, step: 1 },
          default: 5,
        },
        aspectRatio: {
          type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
          'x-component': 'Select',
          enum: ['16:9', '9:16', '1:1'].map(value => ({ label: value, value })),
          default: '16:9',
        },
        inputCompliance: compliance('Input Compliance'),
        outputCompliance: compliance('Output Compliance'),
        callbackUrl,
      },
    };
  }

  return {
    type: 'object',
    properties: {
      prompt,
      mode,
      multiShots: {
        type: 'boolean', title: 'Multi-shot', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
      shotType: {
        type: 'string', title: 'Multi-shot Mode', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Intelligent Storyboard', value: 'intelligence' },
          { label: 'Custom Shots', value: 'customize' },
        ],
        default: 'intelligence',
      },
      imgUrls: mediaUploadField(
        'Start / End Frame Images', 'image/*',
        'Single-shot accepts a start image and optional end image. Multi-shot uses one start image.'
      ),
      multiPrompt: {
        type: 'array', title: 'Custom Shot Prompts', 'x-decorator': 'FormItem',
        'x-component': 'ArrayItems', items: {
          type: 'object', properties: {
            prompt: {
              type: 'string', title: 'Shot Prompt', 'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            duration: {
              type: 'number', title: 'Seconds', 'x-decorator': 'FormItem',
              'x-component': 'NumberPicker',
              'x-component-props': { min: 1, max: 15, step: 1 }, default: 3,
            },
          },
        },
        default: [],
      },
      elementList: {
        type: 'array', title: 'Character / Element References', 'x-decorator': 'FormItem',
        'x-component': 'ArrayItems', description: 'Up to 3 elements; use @name in prompts.',
        items: {
          type: 'object', properties: {
            name: {
              type: 'string', title: 'Reference Name', 'x-decorator': 'FormItem',
              'x-component': 'Input', 'x-component-props': { placeholder: 'hero' },
            },
            description: {
              type: 'string', title: 'Description', 'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            elementImageUrls: mediaUploadField(
              'Reference Images (1-4)', 'image/*', 'Upload 1 to 4 images for this element.'
            ),
          },
        },
        default: [],
      },
      duration: {
        type: 'number', title: 'Duration (3-15s)', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker', 'x-component-props': { min: 3, max: 15, step: 1 },
        default: 5,
      },
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['16:9', '9:16', '1:1'].map(value => ({ label: value, value })),
        default: '16:9',
      },
      audio: {
        type: 'boolean', title: 'Generate Native Audio', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: true,
      },
      inputCompliance: compliance('Input Compliance'),
      outputCompliance: compliance('Output Compliance'),
      callbackUrl,
    },
  };
}

export function buildCrunGptImage2FormSchema(
  model = 'openai/gpt-image-2'
): FormilySchema {
  const isStable = isCrunGptImage2Stable(model);
  const isPremium = isCrunGptImage2Premium(model);
  const properties: Record<string, any> = {
      prompt: {
        type: 'string',
        title: 'Prompt / Editing Instructions',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6,
          placeholder: 'Describe the image to generate, or how to edit the reference images...',
        },
      },
      imgUrls: imageUploadField(
        'Reference Images',
        isPremium
          ? 'Select up to 14 local images to upload to CRUN, or reuse HTTP(S) resource URLs.'
          : undefined
      ),
      aspectRatio: {
        type: 'string',
        title: 'Aspect Ratio',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ASPECT_RATIOS.map(value => ({ label: value, value })),
        default: '1:1',
      },
  };

  if (isStable || isPremium) {
    properties.quality = {
      type: 'string', title: 'Quality', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['low', 'medium', 'high'].map(value => ({ label: value, value })),
      default: isPremium ? 'high' : 'medium',
    };
  }
  if (isStable) {
    properties.background = {
      type: 'string', title: 'Background', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['auto', 'opaque', 'transparent'].map(value => ({ label: value, value })),
      default: 'auto',
    };
    properties.outputFormat = {
      type: 'string', title: 'Output Format', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['png', 'jpeg', 'webp'].map(value => ({ label: value.toUpperCase(), value })),
      default: 'png',
    };
    properties.moderation = {
      type: 'string', title: 'Moderation', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['auto', 'low'].map(value => ({ label: value, value })), default: 'low',
    };
  }
  if (isPremium) {
    properties.resolution = {
      type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['1K', '2K', '4K'].map(value => ({ label: value, value })), default: '2K',
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input',
    'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}

export function buildCrunNanoBananaFormSchema(model: string): FormilySchema {
  const isV2 = isCrunV2Channel(model);
  const isLite = isCrunNanoBanana2Lite(model);
  const supportsResolution = isCrunNanoBanana2(model) || isCrunNanoBananaPro(model);
  const properties: Record<string, any> = {
    prompt: {
      type: 'string',
      title: 'Prompt',
      required: true,
      'x-decorator': 'FormItem',
      'x-component': 'Input.TextArea',
      'x-component-props': { rows: 6, placeholder: 'Describe the image or editing instructions...' },
    },
    imgUrls: imageUploadField(),
    aspectRatio: {
      type: 'string',
      title: 'Aspect Ratio',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: ASPECT_RATIOS.map(value => ({ label: value, value })),
      default: isCrunNanoBanana2(model) ? 'auto' : '1:1',
    },
  };

  if (supportsResolution) {
    properties.resolution = {
      type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['1K', '2K', '4K'].map(value => ({ label: value, value })), default: '2K',
    };
  }
  if (!isV2 && !isLite) {
    const formats = model.startsWith('google/nano-banana-2') || isCrunNanoBananaPro(model)
      ? ['png', 'jpg'] : ['png', 'jpeg'];
    properties.outputFormat = {
      type: 'string', title: 'Output Format', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: formats.map(value => ({ label: value.toUpperCase(), value })), default: 'png',
    };
  }
  if (model === 'google/nano-banana-2') {
    properties.googleSearch = {
      type: 'boolean', title: 'Google Search Grounding', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  properties.callbackUrl = {
    type: 'string', title: 'Callback URL (optional)', 'x-decorator': 'FormItem',
    'x-component': 'Input', 'x-component-props': { placeholder: 'https://your-domain.com/callback' },
  };
  return { type: 'object', properties };
}
