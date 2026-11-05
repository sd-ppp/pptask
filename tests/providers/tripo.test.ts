import { expect, it } from 'vitest';
import { buildTripoRequestBody } from '../../src/providers/crun/tripo.ts';

it('builds exactly one Tripo input mode and preserves false', () => {
  expect(buildTripoRequestBody({ prompt: 'chair', texture: false })).toEqual({ model: 'tripo-3d-3.1', input: { prompt: 'chair', texture: false } });
  expect(() => buildTripoRequestBody({})).toThrow('exactly one');
  expect(() => buildTripoRequestBody({ prompt: 'chair', image_urls: ['https://a.test/a.png'] })).toThrow('exactly one');
  expect(() => buildTripoRequestBody({ multiview_image_urls: { front: 'https://a.test/a.png' } })).toThrow('two');
  expect(() => buildTripoRequestBody({ prompt: 'chair', face_limit: 49 })).toThrow('face_limit');
});


it('runs the async job and returns file URLs without downloading model binaries', async () => {
  const { createCrunProvider } = await import('../../src/index.ts');
  const requests: string[] = [];
  const provider = createCrunProvider({ apiKey: 'test-key', pollIntervalMs: 1, fetch: async (url, init) => {
    requests.push(String(url));
    if (String(url).endsWith('/CreateTask')) {
      expect(JSON.parse(String(init?.body))).toEqual({ model: 'tripo-3d-3.1', input: { image_urls: ['https://input.test/a.png'] } });
      return Response.json({ code: 200, data: { task_id: 'tripo-1' } });
    }
    if (String(url).includes('/TaskInfo')) return Response.json({ code: 200, data: { status: 'success', result: {
      media_urls: ['https://files.test/model.glb'], media_info: { mesh: { url: 'https://files.test/model.glb' }, fbx: 'https://files.test/model.fbx' },
    } } });
    throw new Error('Unexpected binary download');
  } });
  const job = await provider.jobs.start<any>({ model: provider.imageModel('tripo-3d-3.1'), input: { prompt: '', providerOptions: { crun: { input: { image_urls: ['https://input.test/a.png'] } } } } });
  const result = await job.wait();
  expect(result.images).toEqual([]);
  expect(result.providerMetadata.crun.files.map((f: any) => f.url)).toEqual(['https://files.test/model.glb', 'https://files.test/model.fbx']);
  expect(requests).toHaveLength(2);
});
