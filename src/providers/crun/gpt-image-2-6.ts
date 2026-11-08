import { imageResult } from '../shared/output.ts';

const MODEL = 'openai/gpt-image-2-6';
const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'];
const QUALITIES = ['low', 'medium', 'high', 'xhigh', 'max', 'auto'];
const FORMATS = ['png', 'jpeg', 'webp', 'svg', 'gif'];

export function buildCrunGptImage26Body(payload: Record<string, any>): Record<string, any> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt || prompt.length > 20000) throw new Error(`CRUN ${MODEL} prompt must contain 1 to 20000 characters`);
  const input: Record<string, any> = {
    prompt,
    model_variant: enumValue(payload.model_variant ?? payload.modelVariant ?? 'flare', ['flare', 'sunburst'], 'model_variant'),
    aspect_ratio: enumValue(payload.aspect_ratio ?? payload.aspectRatio ?? 'auto', ASPECT_RATIOS, 'aspect_ratio'),
    resolution: enumValue(payload.resolution ?? '1k', ['1k'], 'resolution'),
    quality: enumValue(payload.quality ?? 'auto', QUALITIES, 'quality'),
    output_format: enumValue(payload.output_format ?? payload.outputFormat ?? 'png', FORMATS, 'output_format'),
    n: payload.n ?? 1,
  };
  if (input.n !== 1) throw new Error(`CRUN ${MODEL} n must be 1`);
  const images = payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.urls ?? [];
  if (!Array.isArray(images)) throw new Error(`CRUN ${MODEL} img_urls must be an array`);
  if (images.length > 15) throw new Error(`CRUN ${MODEL} supports at most 15 reference images`);
  if (images.length) input.img_urls = images.map(value => httpUrl(value, 'img_urls'));
  if (payload.complexity != null && payload.complexity !== '') {
    input.complexity = enumValue(payload.complexity, ['low', 'medium', 'high'], 'complexity');
  }
  if (['svg', 'gif'].includes(input.output_format) && images.length) {
    throw new Error(`CRUN ${MODEL} ${input.output_format} does not support reference images`);
  }
  if (input.output_format === 'gif' && input.aspect_ratio !== 'auto') {
    throw new Error(`CRUN ${MODEL} GIF aspect_ratio must be auto or omitted`);
  }
  const body: Record<string, any> = { model: MODEL, input };
  const callback = payload.callback_url ?? payload.callbackUrl;
  if (callback != null && callback !== '') body.callback_url = httpUrl(callback, 'callback_url');
  return body;
}

function enumValue(value: unknown, allowed: string[], field: string): string {
  const normalized = String(value).trim().toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`CRUN ${MODEL} ${field} must be one of: ${allowed.join(', ')}`);
  return normalized;
}

function httpUrl(value: unknown, field: string): string {
  try {
    if (typeof value !== 'string') throw new Error();
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return value.trim();
  } catch {
    throw new Error(`CRUN ${MODEL} ${field} must contain valid HTTP(S) URLs`);
  }
}

/** Keep non-PNG outputs typed correctly without changing older CRUN models. */
export async function gptImage26Result(
  output: unknown, fetchImpl: typeof globalThis.fetch,
  signal?: AbortSignal, metadata: Parameters<typeof imageResult>[5] = {},
) {
  const result = await imageResult('crun', MODEL, output, fetchImpl, signal, metadata);
  const entries = result.providerMetadata!.crun!.images as Array<Record<string, any>>;
  result.images.forEach((image, index) => {
    if (!(image instanceof Uint8Array)) return;
    const prefix = new TextDecoder().decode(image.subarray(0, 512));
    const mediaType = /^GIF8[79]a/.test(prefix) ? 'image/gif'
      : /<svg(?:\s|>)/i.test(prefix) ? 'image/svg+xml'
      : image[0] === 0xff && image[1] === 0xd8 ? 'image/jpeg'
      : prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP' ? 'image/webp'
      : image[0] === 0x89 && prefix.slice(1, 4) === 'PNG' ? 'image/png' : undefined;
    if (mediaType) entries[index] = { ...entries[index], mediaType };
  });
  return result;
}

export function describeCrunGptImage26() {
  const select = (values: string[], defaultValue?: string) => ({
    type: 'string', 'x-decorator': 'FormItem', 'x-component': 'Select',
    enum: values.map(value => ({ label: value, value })),
    ...(defaultValue === undefined ? {} : { default: defaultValue }),
  });
  return {
    provider: 'crun',
    metadata: {
      scheme: 'crun', model: MODEL, channel: 'gpt-image-2-6',
      apiEndpoint: '/api/v1/client/job/CreateTask',
      resultApiEndpoint: '/api/v1/client/job/TaskInfo?task_id={taskId}',
      protocol: 'crun-unified-async-task', mode: 'text-to-image-or-image-edit',
      supportsResolution: true, supportsOutputFormat: true,
    },
    formValues: {
      prompt: '', imgUrls: [], model_variant: 'flare', aspectRatio: 'auto',
      resolution: '1k', quality: 'auto', output_format: 'png', n: 1,
    },
    formSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', title: 'Prompt', required: true, minLength: 1, maxLength: 20000, 'x-decorator': 'FormItem', 'x-component': 'Input.TextArea' },
        imgUrls: {
          type: 'array', title: 'Reference Images', maxItems: 15, items: { type: 'string', format: 'uri' },
          'x-decorator': 'FormItem', 'x-component': 'Upload', default: [],
          'x-component-props': { maxCount: 15, accept: 'image/*', listType: 'picture-card' },
        },
        model_variant: { ...select(['flare', 'sunburst'], 'flare'), title: 'Model Variant' },
        aspectRatio: { ...select(ASPECT_RATIOS, 'auto'), title: 'Aspect Ratio' },
        resolution: { ...select(['1k'], '1k'), title: 'Resolution' },
        quality: { ...select(QUALITIES, 'auto'), title: 'Quality' },
        complexity: { ...select(['low', 'medium', 'high']), title: 'Complexity (optional)' },
        output_format: { ...select(FORMATS, 'png'), title: 'Output Format' },
        n: { type: 'integer', title: 'Image Count', minimum: 1, maximum: 1, default: 1, 'x-decorator': 'FormItem', 'x-component': 'NumberPicker' },
        callbackUrl: { type: 'string', title: 'Callback URL (optional)', format: 'uri', 'x-decorator': 'FormItem', 'x-component': 'Input' },
      },
    },
    recommendUploadProvider: 'crun',
    cancelable: false,
  };
}
