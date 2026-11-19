import { expect, it } from 'vitest';
import { buildHunyuan31RequestBody } from '../../src/providers/crun/hunyuan.ts';

it('validates and builds Hunyuan 3D 3.1 requests', () => {
  expect(buildHunyuan31RequestBody({
    prompt: 'chair',
    generate_type: 'normal',
    multi_view_images: [{ view_type: 'left_front', image_url: 'https://input.test/left.png' }],
    result_format: 'glb',
  })).toEqual({
    model: 'hy-3d-3.1',
    input: {
      prompt: 'chair',
      generate_type: 'normal',
      multi_view_images: [{ view_type: 'left_front', image_url: 'https://input.test/left.png' }],
      result_format: 'glb',
    },
  });
  expect(() => buildHunyuan31RequestBody({})).toThrow('prompt or img_urls');
  expect(() => buildHunyuan31RequestBody({ prompt: 'chair', img_urls: ['https://input.test/a.png'] })).toThrow('mutually exclusive');
  expect(() => buildHunyuan31RequestBody({ prompt: 'chair', generate_type: 'low_poly' })).toThrow('generate_type');
  expect(() => buildHunyuan31RequestBody({ prompt: 'chair', generate_type: 'geometry', enable_pbr: true })).toThrow('enable_pbr');
  expect(() => buildHunyuan31RequestBody({ prompt: 'chair', face_count: 2000 })).toThrow('face_count');
  expect(() => buildHunyuan31RequestBody({ prompt: 'chair', multi_view_images: [{ view_type: 'top', image_url: 'bad' }] })).toThrow('HTTP URL');
});

it('runs Hunyuan asynchronously and exposes generated model files', async () => {
  const { createCrunProvider } = await import('../../src/index.ts');
  const requests: string[] = [];
  const provider = createCrunProvider({
    apiKey: 'test-key',
    pollIntervalMs: 1,
    fetch: async (url, init) => {
      requests.push(String(url));
      if (String(url).endsWith('/CreateTask')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          model: 'hy-3d-3.1',
          input: { prompt: 'chair', result_format: 'glb', generate_type: 'normal' },
        });
        return Response.json({ code: 200, data: { task_id: 'hunyuan-1' } });
      }
      if (String(url).includes('/TaskInfo')) return Response.json({
        code: 200,
        data: { status: 'success', result: { media_urls: ['https://files.test/model.glb'], media_info: { mesh: { url: 'https://files.test/model.glb' } } } },
      });
      throw new Error('Unexpected binary download');
    },
  });
  const job = await provider.jobs.start<any>({
    model: provider.imageModel('hy-3d-3.1'),
    input: { prompt: 'chair', providerOptions: { crun: { input: { result_format: 'glb' } } } },
  });
  const result = await job.wait();
  expect(result.images).toEqual([]);
  expect(result.providerMetadata.crun.files.map((file: any) => file.url)).toEqual(['https://files.test/model.glb']);
  expect(requests).toHaveLength(2);
});
