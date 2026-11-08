import { describe, expect, it, vi } from 'vitest';
import { createCrunProvider } from '../../src/index.ts';
import { buildCrunGptImage26Body } from '../../src/providers/crun/gpt-image-2-6.ts';

const model = 'openai/gpt-image-2-6';
const images = Array.from({ length: 15 }, (_, index) => `https://input.test/${index}.png`);

describe('CRUN GPT Image 2.6', () => {
  it('builds the documented defaults without optional complexity or images', () => {
    expect(buildCrunGptImage26Body({ prompt: 'a cat' })).toEqual({
      model,
      input: {
        prompt: 'a cat', model_variant: 'flare', aspect_ratio: 'auto',
        resolution: '1k', quality: 'auto', output_format: 'png', n: 1,
      },
    });
  });

  it('preserves Sunburst editing parameters and callback in the official envelope', () => {
    expect(buildCrunGptImage26Body({
      prompt: 'edit product', imgUrls: images, model_variant: 'sunburst',
      aspectRatio: '4:5', resolution: '1k', quality: 'xhigh', complexity: 'medium',
      output_format: 'webp', n: 1, callbackUrl: 'https://callback.test/result',
    })).toEqual({
      model, callback_url: 'https://callback.test/result',
      input: {
        prompt: 'edit product', img_urls: images, model_variant: 'sunburst',
        aspect_ratio: '4:5', resolution: '1k', quality: 'xhigh', complexity: 'medium',
        output_format: 'webp', n: 1,
      },
    });
  });

  it.each(['png', 'jpeg', 'webp', 'svg', 'gif'])('supports %s text-to-image output', output_format => {
    expect(buildCrunGptImage26Body({ prompt: 'a cat', output_format }).input.output_format).toBe(output_format);
  });

  it('allows an explicitly automatic aspect ratio for GIF', () => {
    expect(buildCrunGptImage26Body({ prompt: 'animation', output_format: 'gif', aspect_ratio: 'auto' }).input.aspect_ratio).toBe('auto');
  });

  it('accepts the prompt length boundary and omits blank optional complexity', () => {
    expect(buildCrunGptImage26Body({ prompt: 'x'.repeat(20000), complexity: '' }).input).not.toHaveProperty('complexity');
  });

  it.each([
    [{ prompt: '' }, /prompt/],
    [{ prompt: 'x'.repeat(20001) }, /20000/],
    [{ prompt: 123 }, /prompt/],
    [{ resolution: '2k' }, /resolution/],
    [{ n: 2 }, /n/],
    [{ n: 1.5 }, /n/],
    [{ model_variant: 'unknown' }, /model_variant/],
    [{ quality: 'ultra' }, /quality/],
    [{ complexity: 'auto' }, /complexity/],
    [{ output_format: 'jpg' }, /output_format/],
    [{ aspect_ratio: '1:4' }, /aspect_ratio/],
    [{ img_urls: [...images, 'https://input.test/16.png'] }, /15/],
    [{ img_urls: ['data:image/png;base64,AQ=='] }, /HTTP/],
    [{ img_urls: ['file:///C:/image.png'] }, /HTTP/],
    [{ img_urls: 'https://input.test/image.png' }, /array/],
    [{ output_format: 'svg', img_urls: images.slice(0, 1) }, /reference/],
    [{ output_format: 'gif', img_urls: images.slice(0, 1) }, /reference/],
    [{ output_format: 'gif', aspect_ratio: '16:9' }, /aspect_ratio/],
    [{ callback_url: 'file:///C:/callback' }, /callback/],
  ])('rejects invalid input before submitting: %j', (patch, error) => {
    expect(() => buildCrunGptImage26Body({ prompt: 'a cat', ...patch })).toThrow(error);
  });

  it('describes the model with the documented options and limits', async () => {
    const provider = createCrunProvider({ apiKey: 'test-key' });
    const description = await provider.describe(provider.imageModel(model));
    expect(description.defaultInput).toMatchObject({ model_variant: 'flare', resolution: '1k', quality: 'auto', n: 1 });
    const fields = (description.inputSchema as any).properties;
    expect(fields.imgUrls.maxItems).toBe(15);
    expect(fields.prompt.maxLength).toBe(20000);
    expect(fields.n.maximum).toBe(1);
    expect(description.capabilities).toMatchObject({ supportsOutputFormat: true, supportsResolution: true });
  });

  it('submits, polls and retrieves a generated image through the public provider', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/CreateTask')) {
        expect(init?.headers).toMatchObject({ 'x-api-key': 'test-key' });
        expect(JSON.parse(String(init?.body))).toEqual(buildCrunGptImage26Body({
          prompt: 'a cat', img_urls: images, model_variant: 'sunburst', quality: 'high', complexity: 'high',
        }));
        return Response.json({ code: 200, data: { task_id: 'gpt26-task' } });
      }
      if (String(url).includes('/TaskInfo?task_id=gpt26-task')) {
        return Response.json({ code: 200, data: { status: 'success', result: { media_urls: ['https://output.test/image.png'] } } });
      }
      if (String(url) === 'https://output.test/image.png') return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
      throw new Error(`Unexpected request: ${url}`);
    });
    const provider = createCrunProvider({ apiKey: 'test-key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const job = await provider.jobs.start<any>({
      model: provider.imageModel(model),
      input: { prompt: 'a cat', n: 1, providerOptions: { crun: { input: {
        img_urls: images, model_variant: 'sunburst', quality: 'high', complexity: 'high',
      } } } },
    });
    const result = await job.wait();
    expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not submit invalid GIF editing to the upstream', async () => {
    const fetchMock = vi.fn();
    const provider = createCrunProvider({ apiKey: 'test-key', fetch: fetchMock as typeof fetch });
    await expect(provider.jobs.start({
      model: provider.imageModel(model),
      input: { prompt: 'edit', n: 1, output_format: 'gif', img_urls: images },
    })).rejects.toThrow(/reference/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml'],
    ['gif', 'GIF89a', 'image/gif'],
    ['webp', 'RIFF0000WEBP', 'image/webp'],
  ])('preserves the actual %s output type through the provider', async (format, bytes, mediaType) => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith('/CreateTask')) return Response.json({ code: 200, data: { task_id: 'format-task' } });
      if (String(url).includes('/TaskInfo')) return Response.json({ code: 200, data: { status: 'success', result: { media_urls: [`https://output.test/image.${format}`] } } });
      return new Response(new TextEncoder().encode(bytes));
    });
    const provider = createCrunProvider({ apiKey: 'test-key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const job = await provider.jobs.start<any>({ model: provider.imageModel(model), input: { prompt: 'a cat', output_format: format, n: 1 } });
    const result = await job.wait();
    expect(result.providerMetadata.crun.images[0]).toMatchObject({ mediaType });
  });
});
