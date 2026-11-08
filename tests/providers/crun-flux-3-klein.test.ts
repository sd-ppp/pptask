import { describe, expect, it, vi } from 'vitest';
import { createCrunProvider } from '../../src/index.ts';
import { buildCrunFlux3KleinBody, CRUN_FLUX_3_KLEIN_MODEL } from '../../src/providers/crun/flux-3-klein.ts';
import { buildCrunRequestBody } from '../../src/providers/crun/legacy-api.ts';

const images = Array.from({ length: 10 }, (_, index) => `https://input.test/${index}.png`);

describe('CRUN Flux 3 Klein', () => {
  it('builds the documented default request and omits unset optional fields', () => {
    expect(buildCrunFlux3KleinBody({ prompt: 'A vase on a wooden table.' })).toEqual({
      model: CRUN_FLUX_3_KLEIN_MODEL,
      input: { prompt: 'A vase on a wooden table.', aspect_ratio: 'auto', resolution: '1k', output_format: 'jpeg' },
    });
  });

  it('routes the registered model through the public CRUN request builder', () => {
    expect(buildCrunRequestBody(CRUN_FLUX_3_KLEIN_MODEL, { prompt: 'a vase' })).toEqual(
      buildCrunFlux3KleinBody({ prompt: 'a vase' }),
    );
  });

  it('supports reference editing, all resolution presets, steps, safety and callbacks', () => {
    for (const resolution of ['768sq', '1k', '1.5k', '2k', '4k']) {
      const result = buildCrunFlux3KleinBody({
        prompt: 'Change the vase color.', img_urls: images, resolution, aspect_ratio: '16:9',
        steps: 4, safety_tolerance: 2, output_format: 'png', callbackUrl: 'https://callback.test/result',
      });
      expect(result.model).toBe(CRUN_FLUX_3_KLEIN_MODEL);
      expect(result.callback_url).toBe('https://callback.test/result');
      expect(result.input).toMatchObject({ prompt: 'Change the vase color.', img_urls: images, resolution, aspect_ratio: '16:9', steps: 4, safety_tolerance: 2, output_format: 'png' });
    }
  });

  it('omits nullable optional values', () => {
    expect(buildCrunFlux3KleinBody({ prompt: 'test', steps: null, safetyTolerance: null }).input)
      .not.toHaveProperty('steps');
  });

  it.each([
    [{ prompt: '' }, /prompt/],
    [{ prompt: 'x'.repeat(10001) }, /10000/],
    [{ resolution: '1K' }, /resolution/],
    [{ resolution: '3k' }, /resolution/],
    [{ aspect_ratio: '1:4' }, /aspect_ratio/],
    [{ output_format: 'webp' }, /output_format/],
    [{ steps: 0 }, /steps/],
    [{ steps: 17 }, /steps/],
    [{ steps: 1.5 }, /steps/],
    [{ safety_tolerance: -1 }, /safety_tolerance/],
    [{ safety_tolerance: 5 }, /safety_tolerance/],
    [{ img_urls: [...images, 'https://input.test/11.png'] }, /10/],
    [{ img_urls: ['data:image/png;base64,AQ=='] }, /HTTP/],
    [{ img_urls: 'https://input.test/a.png' }, /array/],
    [{ callback_url: 'file:///callback' }, /callback_url/],
  ])('rejects invalid input before the upstream call: %j', (patch, error) => {
    expect(() => buildCrunFlux3KleinBody({ prompt: 'valid', ...patch })).toThrow(error);
  });

  it('describes Flux 3 Klein and its exact enums', async () => {
    const provider = createCrunProvider({ apiKey: 'test-key' });
    const description = await provider.describe(provider.imageModel(CRUN_FLUX_3_KLEIN_MODEL));
    expect(description.defaultInput).toMatchObject({ resolution: '1k', aspect_ratio: 'auto', output_format: 'jpeg' });
    expect((description.inputSchema as any).properties.img_urls.maxItems).toBe(10);
    expect((description.inputSchema as any).properties.resolution.enum.map((option: any) => option.value)).toEqual(['768sq', '1k', '1.5k', '2k', '4k']);
  });

  it('submits and retrieves an image through the CRUN async task API', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/CreateTask')) {
        expect(init?.headers).toMatchObject({ 'x-api-key': 'test-key' });
        expect(JSON.parse(String(init?.body))).toEqual(buildCrunFlux3KleinBody({ prompt: 'A vase.', resolution: '2k', output_format: 'jpeg', steps: 6 }));
        return Response.json({ code: 200, data: { task_id: 'flux-task' } });
      }
      if (String(url).includes('/TaskInfo?task_id=flux-task')) return Response.json({ code: 200, data: { status: 'success', result: { media_urls: ['https://output.test/vase.jpg'] } } });
      if (String(url) === 'https://output.test/vase.jpg') return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });
      throw new Error(`Unexpected request: ${url}`);
    });
    const provider = createCrunProvider({ apiKey: 'test-key', fetch: fetchMock as typeof fetch, pollIntervalMs: 1 });
    const job = await provider.jobs.start<any>({
      model: provider.imageModel(CRUN_FLUX_3_KLEIN_MODEL),
      input: { prompt: 'A vase.', n: 1, providerOptions: { crun: { input: { resolution: '2k', output_format: 'jpeg', steps: 6 } } } },
    });
    const result = await job.wait();
    expect(result.images[0]).toEqual(new Uint8Array([1, 2, 3]));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
