import type { FormilySchema } from '../../types.ts';
import {
  isNovitaKlingV3Model,
  isNovitaSeedanceOverseaModel,
  isNovitaVeo31Model,
} from './helpers.ts';

export function buildNovitaFormSchema(model?: string): FormilySchema {
  if (model && isNovitaVeo31Model(model)) {
    return buildNovitaVeo31FormSchema();
  }
  if (model && isNovitaKlingV3Model(model)) {
    return buildNovitaKlingV3FormSchema(model);
  }
  if (model && isNovitaSeedanceOverseaModel(model)) {
    return buildNovitaSeedanceOverseaFormSchema(model);
  }
  if (model && ['pa/gpt-5.6-terra', 'pa/gpt-5.6-luna', 'pa/gpt-5.6-sol'].includes(model)) {
    return buildNovitaGpt56FormSchema();
  }
  if (model === 'gpt-image-2' || model === 'gpt-image-2-oai') {
    return buildNovitaGptImageFormSchema();
  }
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 5,
          placeholder: 'Describe the image to generate or how to edit the reference image...',
        },
      },
      urls: {
        type: 'array',
        title: 'Reference Images (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': {
          accept: 'image/png,image/jpeg,image/webp',
          maxCount: 4,
        },
        default: [],
      },
      aspectRatio: {
        type: 'string',
        title: 'Aspect Ratio',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
          .map(value => ({ label: value, value })),
        default: '16:9',
      },
      imageSize: {
        type: 'string',
        title: 'Image Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['1K', '2K', '4K'].map(value => ({ label: value, value })),
        default: '2K',
      },
      includeTextResponse: {
        type: 'boolean',
        title: 'Also Return Text',
        description: 'Disabled by default to avoid additional thought-image/token usage.',
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        default: false,
      },
    },
  };
}

function buildNovitaVeo31FormSchema(): FormilySchema {
  const imageUpload = (title: string) => ({
    type: 'array', title, 'x-decorator': 'FormItem', 'x-component': 'Upload',
    'x-component-props': { accept: 'image/jpeg,image/png', maxCount: 1 }, default: [],
  });
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt', required: true, 'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          rows: 6,
          placeholder: 'Describe the scene, subject movement, camera movement and audio...',
        },
      },
      image: imageUpload('First Frame (optional)'),
      lastFrame: imageUpload('Last Frame (optional, requires first frame)'),
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['16:9', '9:16'].map(value => ({ label: value, value })), default: '16:9',
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['720p', '1080p'].map(value => ({ label: value, value })), default: '720p',
      },
      durationSeconds: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [4, 6, 8].map(value => ({ label: `${value}s`, value })), default: 8,
      },
      sampleCount: {
        type: 'number', title: 'Number of Videos', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1, max: 4, precision: 0 }, default: 1,
      },
      generateAudio: {
        type: 'boolean', title: 'Generate Audio', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: true,
      },
      negativePrompt: {
        type: 'string', title: 'Negative Prompt (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea', 'x-component-props': { rows: 3 },
      },
      personGeneration: {
        type: 'string', title: 'People Generation', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Allow adults', value: 'allow_adult' },
          { label: 'Disallow people', value: 'disallow' },
        ], default: 'allow_adult',
      },
      enhancePrompt: {
        type: 'boolean', title: 'Enhance Prompt', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: true,
      },
      seed: {
        type: 'number', title: 'Seed (optional)', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 4294967295, precision: 0 },
      },
      veo31ApiVersion: {
        type: 'string', title: 'API Version', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['v1', 'v1beta1'].map(value => ({ label: value, value })), default: 'v1',
      },
    },
  };
}

function buildNovitaKlingV3FormSchema(model: string): FormilySchema {
  const isMotion = model.endsWith('motion-control');
  const isImage = model.endsWith('-i2v') || isMotion;
  const supportsStringMultiPrompt = model.includes('-pro-');
  const supportsObjectMultiPrompt = model === 'kling-v3.0-std-i2v' || model === 'kling-v3.0-4k-i2v';
  const imageUpload = (title: string) => ({
    type: 'array', title, 'x-decorator': 'FormItem', 'x-component': 'Upload',
    'x-component-props': { accept: 'image/jpeg,image/png', maxCount: 1 }, default: [],
  });
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', 'x-decorator': 'FormItem',
      'x-component': 'Input.TextArea',
      'x-component-props': { rows: 6, maxLength: 2500, placeholder: 'Describe motion, camera, scene and audio...' },
    },
    negativePrompt: {
      type: 'string', title: 'Negative Prompt', 'x-decorator': 'FormItem',
      'x-component': 'Input.TextArea', 'x-component-props': { rows: 3, maxLength: 2500 },
    },
  };
  if (isImage) {
    properties.image = imageUpload(isMotion ? 'Reference Image' : 'First Frame');
    properties.imageUrl = {
      type: 'string', title: isMotion ? 'Reference Image URL' : 'First Frame URL',
      'x-decorator': 'FormItem', 'x-component': 'Input',
      'x-component-props': { placeholder: 'https://...' },
    };
  }
  if (isMotion) {
    properties.video = {
      type: 'string', title: 'Reference Motion Video URL', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Input',
      'x-component-props': { placeholder: 'https://... (.mp4 or .mov)' },
    };
    properties.modelName = {
      type: 'string', title: 'Quality Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: [
        { label: 'Standard', value: 'kling-v3-0-std' },
        { label: 'Professional', value: 'kling-v3-0-pro' },
      ], default: 'kling-v3-0-std',
    };
    properties.characterOrientation = {
      type: 'string', title: 'Output Frame Mode', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: [
        { label: 'Follow Image Composition (5s)', value: 'image' },
        { label: 'Follow Video Composition', value: 'video' },
      ], default: 'image',
    };
    properties.keepOriginalSound = {
      type: 'boolean', title: 'Keep Original Video Sound',
      'x-decorator': 'FormItem', 'x-component': 'Switch', default: true,
    };
    return { type: 'object', properties };
  }
  if (model.endsWith('-i2v')) {
    properties.endImage = imageUpload('End Frame (optional)');
    properties.endImageUrl = {
      type: 'string', title: 'End Frame URL', 'x-decorator': 'FormItem',
      'x-component': 'Input', 'x-component-props': { placeholder: 'https://...' },
    };
  }
  if (supportsStringMultiPrompt) {
    properties.multiPrompt = {
      type: 'array', title: 'Multi-shot Prompts', 'x-decorator': 'FormItem',
      'x-component': 'ArrayItems', items: {
        type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input',
        'x-component-props': { placeholder: 'One shot prompt' },
      }, default: [],
    };
  } else if (supportsObjectMultiPrompt) {
    properties.multiPrompt = {
      type: 'array', title: 'Multi-shot Prompts', 'x-decorator': 'FormItem',
      'x-component': 'ArrayItems', items: {
        type: 'object', properties: {
          prompt: { type: 'string', title: 'Prompt', 'x-component': 'Input', 'x-decorator': 'FormItem' },
          duration: {
            type: 'number', title: 'Seconds', 'x-component': 'NumberPicker',
            'x-decorator': 'FormItem', 'x-component-props': { min: 3, max: 15, precision: 0 },
            default: 5,
          },
        },
      }, default: [],
    };
  }
  properties.duration = {
    type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker', 'x-component-props': { min: 3, max: 15, precision: 0 },
    default: 5,
  };
  properties.cfgScale = {
    type: 'number', title: 'CFG Scale', 'x-decorator': 'FormItem',
    'x-component': 'NumberPicker', 'x-component-props': { min: 0, max: 1, step: 0.1 },
    default: 0.5,
  };
  if (model.endsWith('-t2v')) {
    properties.aspectRatio = {
      type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: ['16:9', '9:16', '1:1'].map(value => ({ label: value, value })),
      default: '16:9',
    };
  }
  properties.sound = {
    type: 'boolean', title: 'Generate Sound', 'x-decorator': 'FormItem',
    'x-component': 'Switch', default: false,
  };
  return { type: 'object', properties };
}

function buildNovitaSeedanceOverseaFormSchema(model: string): FormilySchema {
  const imageUpload = (title: string, maxCount: number) => ({
    type: 'array', title, 'x-decorator': 'FormItem', 'x-component': 'Upload',
    'x-component-props': {
      accept: 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif',
      maxCount,
    },
    default: [],
  });
  const urlField = (title: string, placeholder: string) => ({
    type: 'string', title, 'x-decorator': 'FormItem', 'x-component': 'Input',
    'x-component-props': { placeholder },
  });
  const urlList = (title: string, placeholder: string) => ({
    type: 'array', title, 'x-decorator': 'FormItem', 'x-component': 'ArrayItems',
    items: {
      type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input',
      'x-component-props': { placeholder },
    },
    default: [],
  });
  const resolutions = model.includes('-fast-') || model.includes('-mini-')
    ? ['480p', '720p']
    : ['480p', '720p', '1080p'];
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt',
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': { rows: 6, placeholder: 'Describe the scene, motion and camera...' },
      },
      firstFrame: urlField('First Frame URL', 'https://... or asset://asset-id'),
      firstFrameFile: imageUpload('Local First Frame (optional)', 1),
      lastFrame: urlField('Last Frame URL', 'https://... or asset://asset-id'),
      lastFrameFile: imageUpload('Local Last Frame (optional)', 1),
      referenceImages: urlList('Reference Image URLs', 'https://... or asset://asset-id'),
      referenceImageFiles: imageUpload('Local Reference Images (up to 9)', 9),
      referenceVideos: urlList('Reference Video URLs', 'https://... or asset://asset-id'),
      referenceAudios: urlList('Reference Audio URLs', 'https://... or asset://asset-id'),
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: resolutions.map(value => ({ label: value, value })), default: '480p',
      },
      duration: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem',
        'x-component': 'Slider',
        'x-component-props': { min: 4, max: 15, step: 1, unit: 's' }, default: 5,
      },
      ratio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive']
          .map(value => ({ label: value, value })),
        default: '16:9',
      },
      generateAudio: {
        type: 'boolean', title: 'Generate Audio', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: true,
      },
      returnLastFrame: {
        type: 'boolean', title: 'Return Last Frame', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
      watermark: {
        type: 'boolean', title: 'Watermark', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
      seed: {
        type: 'number', title: 'Seed', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: -1, max: 4294967295, precision: 0 }, default: -1,
      },
    },
  };
}

function buildNovitaGpt56FormSchema(): FormilySchema {
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
        type: 'array', title: 'Image Inputs (optional)', 'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': { accept: 'image/png,image/jpeg,image/webp,image/gif', maxCount: 500 },
        default: [],
      },
      reasoningEffort: {
        type: 'string', title: 'Reasoning Effort', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']
          .map(value => ({ label: value, value })), default: 'medium',
      },
      reasoningSummary: {
        type: 'string', title: 'Reasoning Summary (Responses)', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Disabled', value: '' }, { label: 'Auto', value: 'auto' },
          { label: 'Concise', value: 'concise' }, { label: 'Detailed', value: 'detailed' },
        ], default: '',
      },
      maxOutputTokens: {
        type: 'number', title: 'Max Output Tokens', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker', 'x-component-props': { min: 1, precision: 0 },
      },
      temperature: {
        type: 'number', title: 'Temperature', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker', 'x-component-props': { min: 0, max: 2, step: 0.1 },
      },
      responseFormat: {
        type: 'string', title: 'Response Format', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [{ label: 'Text', value: 'text' }, { label: 'JSON Object', value: 'json_object' }],
        default: 'text',
      },
      verbosity: {
        type: 'string', title: 'Verbosity (Responses)', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['low', 'medium', 'high'].map(value => ({ label: value, value })), default: 'medium',
      },
      stream: {
        type: 'boolean', title: 'Stream', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
    },
  };
}

function buildNovitaGptImageFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 5, maxLength: 32000 },
      },
      urls: {
        type: 'array',
        title: 'Reference Images (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': { accept: 'image/png,image/jpeg,image/webp', maxCount: 16 },
        default: [],
      },
      mask: {
        type: 'array',
        title: 'PNG Mask (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': { accept: 'image/png', maxCount: 1 },
        default: [],
      },
      n: {
        type: 'number', title: 'Number of Images', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker', 'x-component-props': { min: 1, max: 10, precision: 0 },
        default: 1,
      },
      size: {
        type: 'string', title: 'Image Size', description: 'Explicit size is recommended for cost control.',
        'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: [
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
        ].map(value => ({ label: value, value })),
        default: '1024x1024',
      },
      quality: {
        type: 'string', title: 'Quality', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['low', 'medium', 'high', 'auto'].map(value => ({ label: value, value })),
        default: 'high',
      },
      outputFormat: {
        type: 'string', title: 'Output Format', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['png', 'jpeg', 'webp'].map(value => ({ label: value.toUpperCase(), value })),
        default: 'png',
      },
      outputCompression: {
        type: 'number', title: 'JPEG/WebP Compression', 'x-decorator': 'FormItem',
        'x-component': 'NumberPicker', 'x-component-props': { min: 0, max: 100, precision: 0 },
        default: 100,
      },
      background: {
        type: 'string', title: 'Background', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['auto', 'opaque', 'transparent'].map(value => ({ label: value, value })),
        default: 'auto',
      },
      moderation: {
        type: 'string', title: 'Moderation (generation only)', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [{ label: 'Low (business recommended)', value: 'low' }, { label: 'Auto', value: 'auto' }],
        default: 'low',
      },
      inputFidelity: {
        type: 'string', title: 'Input Fidelity (editing)', 'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['high', 'low'].map(value => ({ label: value, value })), default: 'high',
      },
    },
  };
}
