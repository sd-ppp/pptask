import type { FormilySchema } from '../../types.ts';
import {
  isPpioResponseModel,
  isPpioVeoModel,
  isPpioKlingV3Model,
  isPpioHailuo23Model,
  isPpioMinimaxH3Model,
  isPpioSeedanceCnMeteredModel,
  PPIO_FUSION_MODEL,
  PPIO_GPT_IMAGE_MODEL,
  PPIO_SEEDANCE_MODEL,
} from './helpers.ts';

export function buildPpioFormSchema(model?: string): FormilySchema {
  if (model && isPpioResponseModel(model)) {
    return buildPpioResponseFormSchema();
  }

  if (model === PPIO_FUSION_MODEL) {
    return buildPpioFusionFormSchema();
  }

  if (model === PPIO_GPT_IMAGE_MODEL) {
    return buildPpioGptImageFormSchema();
  }

  if (model === PPIO_SEEDANCE_MODEL) {
    return buildPpioSeedanceFormSchema();
  }

  if (model && isPpioVeoModel(model)) {
    return buildPpioVeoFormSchema();
  }

  if (model && isPpioKlingV3Model(model)) {
    return buildPpioKlingV3FormSchema(model);
  }

  if (model && isPpioHailuo23Model(model)) {
    return buildPpioHailuo23FormSchema(model);
  }

  if (model && isPpioMinimaxH3Model(model)) {
    return buildPpioMinimaxH3FormSchema();
  }

  if (model && isPpioSeedanceCnMeteredModel(model)) {
    return buildPpioSeedanceCnMeteredFormSchema(model);
  }

  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Describe the image to generate or how to edit the reference image...',
          rows: 4,
        },
        required: true,
      },
      urls: {
        type: 'array',
        title: 'Reference Images (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': {
          maxCount: 4,
        },
        default: [],
      },
      aspectRatio: {
        type: 'string',
        title: 'Aspect Ratio',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '1:1 (Square)', value: '1:1' },
          { label: '4:3 (Standard)', value: '4:3' },
          { label: '16:9 (Widescreen)', value: '16:9' },
          { label: '9:16 (Portrait)', value: '9:16' },
        ],
        default: '16:9',
      },
      imageSize: {
        type: 'string',
        title: 'Image Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '1K', value: '1K' },
          { label: '2K', value: '2K' },
          { label: '4K', value: '4K' },
        ],
        default: '2K',
      },
    },
  };
}

function buildPpioSeedanceCnMeteredFormSchema(model: string): FormilySchema {
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
        'x-component-props': { rows: 6, placeholder: 'Describe the scene, character, motion and camera...' },
      },
      firstFrame: urlField('First Frame URL', 'https://... or asset://asset-id'),
      lastFrame: urlField('Last Frame URL', 'https://... or asset://asset-id'),
      referenceImages: urlList('Reference Image URLs', 'https://... or asset://asset-id'),
      referenceVideos: urlList('Reference Video URLs', 'https://... or asset://asset-id'),
      referenceAudios: urlList('Reference Audio URLs', 'https://... or asset://asset-id'),
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: resolutions.map(value => ({ label: value, value })), default: '480p',
      },
      duration: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem', 'x-component': 'Slider',
        'x-component-props': { min: 4, max: 15, step: 1, unit: 's' }, default: 5,
      },
      ratio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'].map(value => ({ label: value, value })),
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

function buildPpioMinimaxH3FormSchema(): FormilySchema {
  const urlField = (title: string, placeholder: string) => ({
    type: 'string', title, 'x-decorator': 'FormItem', 'x-component': 'Input',
    'x-component-props': { placeholder },
  });
  const urlList = (title: string, maxItems: number, placeholder: string) => ({
    type: 'array', title, maxItems, 'x-decorator': 'FormItem', 'x-component': 'ArrayItems',
    items: {
      type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Input',
      'x-component-props': { placeholder },
    },
    default: [],
  });
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string', title: 'Prompt', required: true,
        'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
        'x-component-props': { rows: 6, maxLength: 7000, placeholder: 'Describe the video to generate...' },
      },
      firstFrame: urlField('First Frame URL', 'https://example.com/first.jpg'),
      lastFrame: urlField('Last Frame URL', 'https://example.com/last.jpg'),
      referenceImages: urlList('Reference Image URLs', 9, 'https://example.com/reference.jpg'),
      referenceVideos: urlList('Reference Video URLs', 3, 'https://example.com/reference.mp4'),
      referenceAudios: urlList('Reference Audio URLs', 3, 'https://example.com/reference.mp3'),
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['768P', '2K'].map(value => ({ label: value, value })), default: '768P',
      },
      duration: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: 4, max: 15, precision: 0 }, default: 4,
      },
      ratio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'].map(value => ({ label: value, value })),
        default: '16:9',
      },
      aigcWatermark: {
        type: 'boolean', title: 'AIGC Watermark', 'x-decorator': 'FormItem',
        'x-component': 'Switch', default: false,
      },
    },
  };
}

function buildPpioHailuo23FormSchema(model: string): FormilySchema {
  const imageToVideo = model.endsWith('-i2v');
  const fast = model.includes('-fast-');
  const properties: Record<string, any> = {
    prompt: {
      type: 'string', title: 'Prompt', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
      'x-component-props': { rows: 5, maxLength: 2000, placeholder: 'Describe the video and camera motion...' },
    },
  };
  if (imageToVideo) {
    properties.image = {
      type: 'array', title: 'Input Image', required: true,
      'x-decorator': 'FormItem', 'x-component': 'Upload',
      'x-component-props': { maxCount: 1, accept: 'image/*' }, default: [],
    };
  }
  properties.duration = {
    type: 'number', title: 'Duration', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: [{ label: '6 seconds', value: 6 }, { label: '10 seconds', value: 10 }], default: 6,
  };
  properties.resolution = {
    type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: ['768P', '1080P'].map(value => ({ label: value, value })), default: '768P',
  };
  properties.enablePromptExpansion = {
    type: 'boolean', title: 'Prompt Expansion', 'x-decorator': 'FormItem',
    'x-component': 'Switch', default: true,
  };
  if (!fast) {
    properties.fastPretreatment = {
      type: 'boolean', title: 'Fast Pretreatment', 'x-decorator': 'FormItem',
      'x-component': 'Switch', default: false,
    };
  }
  properties.aigcWatermark = {
    type: 'boolean', title: 'AIGC Watermark', 'x-decorator': 'FormItem',
    'x-component': 'Switch', default: false,
  };
  return { type: 'object', properties };
}

function buildPpioKlingV3FormSchema(model: string): FormilySchema {
  const upload = (title: string) => ({
    type: 'array', title, 'x-decorator': 'FormItem', 'x-component': 'Upload',
    'x-component-props': { maxCount: 1, accept: 'image/png,image/jpeg' }, default: [],
  });
  const textArea = (title: string, placeholder: string, required = false) => ({
    type: 'string', title, required, 'x-decorator': 'FormItem', 'x-component': 'Input.TextArea',
    'x-component-props': { rows: 4, maxLength: 2500, placeholder },
  });

  if (model.endsWith('-motion-control')) {
    return {
      type: 'object',
      properties: {
        image: upload('Reference Image'),
        video: {
          type: 'string', title: 'Reference Video URL', required: true,
          'x-decorator': 'FormItem', 'x-component': 'Input',
          'x-component-props': { placeholder: 'https://example.com/motion.mp4' },
        },
        prompt: textArea('Prompt (optional)', 'Describe the scene, style and lighting...'),
        negativePrompt: textArea('Negative Prompt', 'Describe content to avoid...'),
        modelName: {
          type: 'string', title: 'Quality Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
          enum: [
            { label: 'Standard', value: 'kling-v3-0-std' },
            { label: 'Pro', value: 'kling-v3-0-pro' },
          ], default: 'kling-v3-0-std',
        },
        characterOrientation: {
          type: 'string', title: 'Character Orientation', required: true,
          'x-decorator': 'FormItem', 'x-component': 'Select',
          enum: [
            { label: 'Follow reference image (5s)', value: 'image' },
            { label: 'Follow reference video (up to 30s)', value: 'video' },
          ], default: 'image',
        },
        keepOriginalSound: {
          type: 'boolean', title: 'Keep Original Sound', 'x-decorator': 'FormItem',
          'x-component': 'Switch', default: true,
        },
      },
    };
  }

  const imageToVideo = model.endsWith('-i2v');
  const pro = model.includes('-pro-');
  const supportsMultiPrompt = pro || imageToVideo;
  const properties: Record<string, any> = {
    prompt: textArea(
      'Prompt',
      pro ? 'Required unless Multi Prompt is provided...' : 'Describe the video to generate...',
      !pro
    ),
    negativePrompt: textArea('Negative Prompt', 'Describe content to avoid...'),
  };
  if (imageToVideo) {
    properties.image = upload('First Frame');
    properties.endImage = upload('Last Frame (optional)');
  } else {
    properties.aspectRatio = {
      type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
      enum: ['16:9', '9:16', '1:1'].map(value => ({ label: value, value })), default: '16:9',
    };
  }
  if (supportsMultiPrompt) {
    properties.multiPrompt = pro ? {
      type: 'array', title: 'Multi-shot Prompts', 'x-decorator': 'FormItem', 'x-component': 'ArrayItems',
      items: { type: 'string', 'x-component': 'Input', 'x-decorator': 'FormItem' }, default: [],
    } : {
      type: 'array', title: 'Multi-shot Prompts', 'x-decorator': 'FormItem', 'x-component': 'ArrayItems',
      items: {
        type: 'object',
        properties: {
          prompt: { type: 'string', title: 'Prompt', required: true, 'x-component': 'Input', 'x-decorator': 'FormItem' },
          duration: {
            type: 'number', title: 'Duration', 'x-component': 'NumberPicker', 'x-decorator': 'FormItem',
            'x-component-props': { min: 3, max: 15, precision: 0 }, default: 5,
          },
        },
      },
      default: [],
    };
  }
  properties.duration = {
    type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
    'x-component-props': { min: 3, max: 15, precision: 0 }, default: 5,
  };
  properties.cfgScale = {
    type: 'number', title: 'CFG Scale', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
    'x-component-props': { min: 0, max: 1, step: 0.1 }, default: 0.5,
  };
  properties.sound = {
    type: 'boolean', title: 'Generate Sound', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
  };
  return { type: 'object', properties };
}

function buildPpioVeoFormSchema(): FormilySchema {
  const upload = (title: string) => ({
    type: 'array',
    title,
    'x-decorator': 'FormItem',
    'x-component': 'Upload',
    'x-component-props': { maxCount: 1, accept: 'image/png,image/jpeg,image/webp' },
    default: [],
  });

  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 5, placeholder: 'Describe the video to generate...' },
      },
      image: upload('First Frame (optional)'),
      lastFrame: upload('Last Frame (optional)'),
      negativePrompt: {
        type: 'string',
        title: 'Negative Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 3, placeholder: 'Describe content to avoid...' },
      },
      aspectRatio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['16:9', '9:16'].map(value => ({ label: value, value })), default: '16:9',
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['720p', '1080p'].map(value => ({ label: value, value })), default: '720p',
      },
      durationSeconds: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: [4, 6, 8].map(value => ({ label: `${value}s`, value })), default: 8,
      },
      sampleCount: {
        type: 'number', title: 'Video Count', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: 1, max: 4, precision: 0 }, default: 1,
      },
      seed: {
        type: 'number', title: 'Seed (optional)', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 4294967295, precision: 0 },
      },
      generateAudio: {
        type: 'boolean', title: 'Generate Audio', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: true,
      },
      enhancePrompt: {
        type: 'boolean', title: 'Enhance Prompt', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: true,
      },
      personGeneration: {
        type: 'string', title: 'Person Generation', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: [
          { label: 'Allow adults', value: 'allow_adult' },
          { label: 'Do not allow people', value: 'dont_allow' },
        ],
        default: 'allow_adult',
      },
      resizeMode: {
        type: 'string', title: 'Image Resize Mode', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['pad', 'crop'].map(value => ({ label: value, value })), default: 'pad',
      },
      compressionQuality: {
        type: 'string', title: 'Compression Quality', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['optimized', 'lossless'].map(value => ({ label: value, value })), default: 'optimized',
      },
      storageUri: {
        type: 'string', title: 'Cloud Storage URI (optional)', 'x-decorator': 'FormItem', 'x-component': 'Input',
        'x-component-props': { placeholder: 'gs://bucket/path/' },
      },
    },
  };
}

function buildPpioFusionFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      systemPrompt: {
        type: 'string',
        title: 'System Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 3, placeholder: 'Optional system instructions...' },
      },
      prompt: {
        type: 'string',
        title: 'Prompt',
        required: true,
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 6, placeholder: 'Ask Fusion a complex question...' },
      },
      maxTokens: {
        type: 'number',
        title: 'Max Tokens',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1, precision: 0 },
      },
      temperature: {
        type: 'number',
        title: 'Temperature',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 2, step: 0.1 },
      },
      topP: {
        type: 'number',
        title: 'Top P',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 1, step: 0.05 },
      },
      seed: {
        type: 'number',
        title: 'Seed',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { precision: 0 },
      },
      responseFormat: {
        type: 'string',
        title: 'Response Format',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Text', value: 'text' },
          { label: 'JSON Object', value: 'json_object' },
        ],
        default: 'text',
      },
      stream: {
        type: 'boolean',
        title: 'Stream',
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        default: true,
      },
    },
  };
}

function buildPpioSeedanceFormSchema(): FormilySchema {
  const upload = (title: string, maxCount: number, accept: string) => ({
    type: 'array',
    title,
    'x-decorator': 'FormItem',
    'x-component': 'Upload',
    'x-component-props': { maxCount, accept },
    default: [],
  });

  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': { rows: 5, placeholder: 'Describe the video to generate...' },
      },
      image: upload('First Frame (optional)', 1, 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif'),
      lastImage: upload('Last Frame (optional)', 1, 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif'),
      referenceImages: upload('Reference Images (up to 9)', 9, 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif'),
      referenceAudios: upload('Reference Audios (up to 3)', 3, 'audio/wav,audio/mpeg'),
      referenceVideos: {
        type: 'array',
        title: 'Reference Video URLs (up to 3)',
        'x-decorator': 'FormItem',
        'x-component': 'ArrayItems',
        items: { type: 'string', 'x-component': 'Input', 'x-decorator': 'FormItem' },
        default: [],
      },
      fast: {
        type: 'boolean', title: 'Fast Mode', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
      },
      resolution: {
        type: 'string', title: 'Resolution', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['480p', '720p', '1080p'].map(value => ({ label: value, value })), default: '720p',
      },
      ratio: {
        type: 'string', title: 'Aspect Ratio', 'x-decorator': 'FormItem', 'x-component': 'Select',
        enum: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'].map(value => ({ label: value, value })),
        default: '16:9',
      },
      duration: {
        type: 'number', title: 'Duration (seconds)', 'x-decorator': 'FormItem', 'x-component': 'Slider',
        'x-component-props': { min: 4, max: 15, step: 1, unit: 's' }, default: 5,
      },
      seed: {
        type: 'number', title: 'Seed', 'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
        'x-component-props': { min: -1, max: 4294967295, precision: 0 }, default: -1,
      },
      generateAudio: {
        type: 'boolean', title: 'Generate Audio', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
      },
      webSearch: {
        type: 'boolean', title: 'Web Search', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
      },
      watermark: {
        type: 'boolean', title: 'Watermark', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
      },
      returnLastFrame: {
        type: 'boolean', title: 'Return Last Frame', 'x-decorator': 'FormItem', 'x-component': 'Switch', default: false,
      },
    },
  };
}

function buildPpioResponseFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Input',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Enter a prompt for the model...',
          rows: 6,
        },
        required: true,
      },
      instructions: {
        type: 'string',
        title: 'Instructions',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Optional system or developer instructions...',
          rows: 3,
        },
      },
      urls: {
        type: 'array',
        title: 'Image Inputs (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': {
          accept: 'image/png,image/jpeg,image/webp,image/gif',
          maxCount: 500,
        },
        default: [],
      },
      reasoningEffort: {
        type: 'string',
        title: 'Reasoning Effort',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'].map(value => ({
          label: value,
          value,
        })),
        default: 'medium',
      },
      reasoningSummary: {
        type: 'string',
        title: 'Reasoning Summary',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Disabled', value: '' },
          { label: 'Auto', value: 'auto' },
          { label: 'Concise', value: 'concise' },
          { label: 'Detailed', value: 'detailed' },
        ],
        default: '',
      },
      maxOutputTokens: {
        type: 'number',
        title: 'Max Output Tokens',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1 },
      },
      temperature: {
        type: 'number',
        title: 'Temperature',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 2, step: 0.1 },
      },
      verbosity: {
        type: 'string',
        title: 'Verbosity',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: ['low', 'medium', 'high'].map(value => ({ label: value, value })),
        default: 'medium',
      },
      stream: {
        type: 'boolean',
        title: 'Stream',
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        default: false,
      },
    },
  };
}

function buildPpioGptImageFormSchema(): FormilySchema {
  const sizes = [
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
  ];

  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Describe the image to generate or how to edit the input image...',
          rows: 4,
          maxLength: 32000,
        },
        required: true,
      },
      urls: {
        type: 'array',
        title: 'Input Images (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': { maxCount: 10 },
        default: [],
      },
      mask: {
        type: 'array',
        title: 'PNG Mask (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': {
          accept: 'image/png',
          maxCount: 1,
        },
        default: [],
      },
      n: {
        type: 'number',
        title: 'Number of Images',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 1, max: 10 },
        default: 1,
      },
      size: {
        type: 'string',
        title: 'Image Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: sizes.map(value => ({ label: value, value })),
        default: '1024x1024',
      },
      quality: {
        type: 'string',
        title: 'Quality',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
        default: 'medium',
      },
      background: {
        type: 'string',
        title: 'Background',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Auto', value: 'auto' },
          { label: 'Opaque', value: 'opaque' },
        ],
        default: 'auto',
      },
      moderation: {
        type: 'string',
        title: 'Moderation',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Auto', value: 'auto' },
          { label: 'Low', value: 'low' },
        ],
        default: 'auto',
      },
      outputFormat: {
        type: 'string',
        title: 'Output Format',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'PNG', value: 'png' },
          { label: 'JPEG', value: 'jpeg' },
        ],
        default: 'png',
      },
      outputCompression: {
        type: 'number',
        title: 'JPEG Compression',
        'x-decorator': 'FormItem',
        'x-component': 'NumberPicker',
        'x-component-props': { min: 0, max: 100 },
        default: 100,
      },
    },
  };
}
