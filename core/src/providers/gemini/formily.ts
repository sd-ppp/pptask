import type { FormilySchema } from '../../types.ts';

export function buildGeminiFormSchema(): FormilySchema {
  return {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt',
        'x-decorator': 'FormItem',
        'x-component': 'Input.TextArea',
        'x-component-props': {
          placeholder: 'Enter your image generation prompt...',
          rows: 4,
        },
        required: true,
      },
      urls: {
        type: 'array',
        title: 'Reference Images (optional)',
        'x-decorator': 'FormItem',
        'x-component': 'ArrayItems',
        description: 'Base64 encoded images or image URLs',
        items: {
          type: 'string',
          'x-component': 'Input.TextArea',
          'x-component-props': {
            placeholder: 'data:image/png;base64,... or http://...',
            rows: 2,
          },
        },
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
          { label: '1K (Low)', value: '1K' },
          { label: '2K (Medium)', value: '2K' },
          { label: '4K (High)', value: '4K' },
        ],
        default: '2K',
      },
    },
  };
}
