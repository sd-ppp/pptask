import type { FormilySchema } from '../../types.ts';

export function buildArkFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt / Layer Instructions',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Describe the image to generate, or specify which elements to split into layers...',
          rows: 5,
        },
      },
      image: {
        type: 'array',
        title: 'Reference / Source Images',
        'x-decorator': 'FormItem',
        'x-component': 'Upload',
        'x-component-props': {
          accept: 'image/*',
          maxCount: 10,
        },
        default: [],
      },
      layerDecomposition: {
        type: 'boolean',
        title: 'Layer Decomposition',
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        default: false,
      },
      size: {
        type: 'string',
        title: 'Image Size',
        description: 'Use 1K, 1.5K, 2K, auto (layers only), or a valid WIDTHxHEIGHT value.',
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          placeholder: '2K or 2048x1024',
        },
        default: '2K',
      },
      optimizePromptMode: {
        type: 'string',
        title: 'Prompt Optimization',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Standard', value: 'standard' },
          { label: 'Fast', value: 'fast' },
        ],
        default: 'standard',
      },
      outputFormat: {
        type: 'string',
        title: 'Output Format',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'JPEG', value: 'jpeg' },
          { label: 'PNG', value: 'png' },
        ],
        default: 'jpeg',
      },
      background: {
        type: 'string',
        title: 'Background',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'Opaque', value: 'opaque' },
          { label: 'Transparent', value: 'transparent' },
        ],
        default: 'opaque',
      },
      responseFormat: {
        type: 'string',
        title: 'Response Format',
        'x-decorator': 'FormItem',
        'x-component': 'Select',
        enum: [
          { label: 'URL', value: 'url' },
          { label: 'Base64 JSON', value: 'b64_json' },
        ],
        default: 'url',
      },
      watermark: {
        type: 'boolean',
        title: 'Watermark',
        'x-decorator': 'FormItem',
        'x-component': 'Switch',
        default: true,
      },
    },
  };
}
