import type { FormilySchema } from '../../types.ts';

export function buildOpenAIFormSchema(endpoint: string): FormilySchema {
  switch (endpoint) {
    case 'edits':
      return buildEditSchema();
    case 'generations':
      return buildGenerationSchema();
    case 'variations':
      return buildVariationSchema();
    default:
      return { type: 'object', properties: {} };
  }
}

function buildEditSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        title: 'Image',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Base64 encoded image or data URL',
          rows: 2,
        },
        description: 'Image to edit (must be PNG, < 4MB, square)',
        required: true,
      },
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'A sunlit indoor lounge area with a pool containing a flamingo',
          rows: 4,
        },
        description: 'Text description of desired image',
        required: true,
      },
      mask: {
        type: 'string',
        title: 'Mask (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Base64 encoded mask image',
          rows: 2,
        },
        description: 'Mask image where transparent areas indicate where to edit',
      },
      model: {
        type: 'string',
        title: 'Model',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'DALL-E 2', value: 'dall-e-2' },
        ],
        default: 'dall-e-2',
      },
      n: {
        type: 'number',
        title: 'Number of Images',
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 1,
          max: 10,
        },
        default: 1,
      },
      size: {
        type: 'string',
        title: 'Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '256x256', value: '256x256' },
          { label: '512x512', value: '512x512' },
          { label: '1024x1024', value: '1024x1024' },
        ],
        default: '1024x1024',
      },
    },
  };
}

function buildGenerationSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'A white siamese cat',
          rows: 4,
        },
        description: 'Text description of desired image',
        required: true,
      },
      model: {
        type: 'string',
        title: 'Model',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'DALL-E 2', value: 'dall-e-2' },
          { label: 'DALL-E 3', value: 'dall-e-3' },
        ],
        default: 'dall-e-3',
      },
      n: {
        type: 'number',
        title: 'Number of Images',
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 1,
          max: 10,
        },
        default: 1,
        description: 'Only supported for dall-e-2',
      },
      quality: {
        type: 'string',
        title: 'Quality',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Standard', value: 'standard' },
          { label: 'HD', value: 'hd' },
        ],
        default: 'standard',
        description: 'Only supported for dall-e-3',
      },
      size: {
        type: 'string',
        title: 'Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '256x256', value: '256x256' },
          { label: '512x512', value: '512x512' },
          { label: '1024x1024', value: '1024x1024' },
          { label: '1792x1024 (Wide)', value: '1792x1024' },
          { label: '1024x1792 (Tall)', value: '1024x1792' },
        ],
        default: '1024x1024',
      },
      style: {
        type: 'string',
        title: 'Style',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Vivid', value: 'vivid' },
          { label: 'Natural', value: 'natural' },
        ],
        default: 'vivid',
        description: 'Only supported for dall-e-3',
      },
    },
  };
}

function buildVariationSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      image: {
        type: 'string',
        title: 'Image',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Base64 encoded image or data URL',
          rows: 2,
        },
        description: 'Image to create variations from (must be PNG, < 4MB, square)',
        required: true,
      },
      model: {
        type: 'string',
        title: 'Model',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'DALL-E 2', value: 'dall-e-2' },
        ],
        default: 'dall-e-2',
      },
      n: {
        type: 'number',
        title: 'Number of Images',
        'x-decorator': 'FormItem',
        'x-component': 'InputNumber',
        'x-component-props': {
          min: 1,
          max: 10,
        },
        default: 1,
      },
      size: {
        type: 'string',
        title: 'Size',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: '256x256', value: '256x256' },
          { label: '512x512', value: '512x512' },
          { label: '1024x1024', value: '1024x1024' },
        ],
        default: '1024x1024',
      },
    },
  };
}
