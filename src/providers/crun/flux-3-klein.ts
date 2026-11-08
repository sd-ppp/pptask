import type { DescribeResult } from './legacy-types.ts';

export const CRUN_FLUX_3_KLEIN_MODEL = 'flux-3-klein';
export const CRUN_FLUX_3_KLEIN_ASPECT_RATIOS = [
  '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9', '9:21', '1:2', '2:1', '5:4', '4:5', 'auto',
] as const;
export const CRUN_FLUX_3_KLEIN_RESOLUTIONS = ['768sq', '1k', '1.5k', '2k', '4k'] as const;

const qualities = ['png', 'jpeg'] as const;

export function buildCrunFlux3KleinBody(payload: Record<string, any>): Record<string, any> {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt || prompt.length > 10000) {
    throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} prompt must contain 1 to 10000 characters`);
  }
  const input: Record<string, any> = {
    prompt,
    aspect_ratio: enumValue(payload.aspect_ratio ?? payload.aspectRatio ?? 'auto', CRUN_FLUX_3_KLEIN_ASPECT_RATIOS, 'aspect_ratio'),
    resolution: enumValue(payload.resolution ?? '1k', CRUN_FLUX_3_KLEIN_RESOLUTIONS, 'resolution'),
    output_format: enumValue(payload.output_format ?? payload.outputFormat ?? 'jpeg', qualities, 'output_format'),
  };
  const images = payload.img_urls ?? payload.imgUrls ?? payload.imageUrls ?? payload.urls;
  if (images != null && images !== '') {
    if (!Array.isArray(images)) throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} img_urls must be an array`);
    if (images.length > 10) throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} supports at most 10 reference images`);
    if (images.length) input.img_urls = images.map(value => httpUrl(value, 'img_urls'));
  }
  optionalInteger(input, 'steps', payload.steps, 1, 16);
  optionalInteger(input, 'safety_tolerance', payload.safety_tolerance ?? payload.safetyTolerance, 0, 4);

  const body: Record<string, any> = { model: CRUN_FLUX_3_KLEIN_MODEL, input };
  const callback = payload.callback_url ?? payload.callbackUrl;
  if (callback != null && callback !== '') body.callback_url = httpUrl(callback, 'callback_url');
  return body;
}

export function describeCrunFlux3Klein(): DescribeResult {
  const select = (values: readonly string[], defaultValue: string) => ({
    type: 'string', default: defaultValue,
    enum: values.map(value => ({ label: value, value })),
    'x-decorator': 'FormItem', 'x-component': 'Select',
  });
  const integer = (title: string, minimum: number, maximum: number) => ({
    type: 'integer', title, minimum, maximum, nullable: true, default: null,
    'x-decorator': 'FormItem', 'x-component': 'NumberPicker',
  });
  return {
    provider: 'crun', title: 'Flux 3 Klein',
    formSchema: {
      type: 'object', required: ['prompt'], properties: {
        prompt: { type: 'string', minLength: 1, maxLength: 10000 },
        img_urls: { type: 'array', maxItems: 10, nullable: true, items: { type: 'string', format: 'uri' } },
        aspect_ratio: { ...select(CRUN_FLUX_3_KLEIN_ASPECT_RATIOS, 'auto'), title: 'Aspect Ratio' },
        resolution: { ...select(CRUN_FLUX_3_KLEIN_RESOLUTIONS, '1k'), title: 'Resolution' },
        steps: integer('Inference Steps', 1, 16),
        safety_tolerance: integer('Safety Tolerance', 0, 4),
        output_format: { ...select(qualities, 'jpeg'), title: 'Output Format' },
        callback_url: { type: 'string', format: 'uri' },
      },
    },
    formValues: { prompt: '', img_urls: [], aspect_ratio: 'auto', resolution: '1k', output_format: 'jpeg' },
    metadata: {
      mode: 'text-to-image-or-image-edit', channel: 'flux-3-klein', supportsResolution: true,
      supportsOutputFormat: true, cancel: false, upload: true,
    },
    cancelable: false,
  };
}

function enumValue(value: unknown, allowed: readonly string[], field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '');
  if (!allowed.includes(normalized)) {
    throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} ${field} must be one of: ${allowed.join(', ')}`);
  }
  return normalized;
}

function optionalInteger(input: Record<string, any>, field: string, value: unknown, min: number, max: number): void {
  if (value == null || value === '') return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} ${field} must be an integer from ${min} to ${max}`);
  }
  input[field] = parsed;
}

function httpUrl(value: unknown, field: string): string {
  try {
    if (typeof value !== 'string') throw new Error();
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return value.trim();
  } catch {
    throw new Error(`CRUN ${CRUN_FLUX_3_KLEIN_MODEL} ${field} must contain valid HTTP(S) URLs`);
  }
}
