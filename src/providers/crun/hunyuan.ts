import { HUNYUAN_31_MODEL } from './tripo.ts';

const views = ['left', 'right', 'back', 'top', 'bottom', 'left_front', 'right_front'];
const formats = ['obj', 'glb', 'stl', 'usdz', 'fbx'];

function httpUrls(value: unknown, field: string): string[] {
  const values = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  if (values.some(url => typeof url !== 'string' || !/^https?:\/\//i.test(url))) {
    throw new Error(`CRUN hy-3d-3.1 ${field} requires HTTP URLs`);
  }
  return values as string[];
}

export function buildHunyuan31RequestBody(payload: Record<string, any>) {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (prompt.length > 1024) throw new Error('CRUN hy-3d-3.1 prompt exceeds 1024 characters');
  const imgUrls = httpUrls(payload.img_urls ?? payload.imgUrls ?? payload.image_urls ?? payload.images, 'img_urls');
  if (imgUrls.length > 1) throw new Error('CRUN hy-3d-3.1 accepts at most one img_urls image');
  if (prompt && imgUrls.length) throw new Error('CRUN hy-3d-3.1 prompt and img_urls are mutually exclusive');
  if (!prompt && !imgUrls.length) throw new Error('CRUN hy-3d-3.1 requires prompt or img_urls');

  const input: Record<string, any> = prompt ? { prompt } : { img_urls: imgUrls };
  const generateType = String(payload.generate_type ?? 'normal').trim().toLowerCase();
  if (!['normal', 'geometry'].includes(generateType)) throw new Error('CRUN hy-3d-3.1 generate_type must be normal or geometry');
  input.generate_type = generateType;

  const enablePbr = payload.enable_pbr ?? false;
  if (typeof enablePbr !== 'boolean') throw new Error('CRUN hy-3d-3.1 enable_pbr must be boolean');
  if (generateType === 'geometry' && enablePbr) throw new Error('CRUN hy-3d-3.1 geometry cannot enable enable_pbr');
  if (enablePbr) input.enable_pbr = true;

  if (payload.face_count !== undefined && payload.face_count !== '') {
    const faceCount = Number(payload.face_count);
    if (!Number.isInteger(faceCount) || faceCount < 3000 || faceCount > 1_500_000) {
      throw new Error('CRUN hy-3d-3.1 face_count must be from 3000 to 1500000');
    }
    input.face_count = faceCount;
  }
  if (payload.result_format !== undefined && payload.result_format !== '') {
    const resultFormat = String(payload.result_format).trim().toLowerCase();
    if (!formats.includes(resultFormat)) throw new Error('CRUN hy-3d-3.1 result_format must be obj, glb, stl, usdz or fbx');
    input.result_format = resultFormat;
  }

  const rawViews = payload.multi_view_images ?? payload.multiViewImages;
  if (rawViews !== undefined) {
    if (!Array.isArray(rawViews) || rawViews.length > 7) throw new Error('CRUN hy-3d-3.1 multi_view_images accepts at most seven views');
    const seen = new Set<string>();
    input.multi_view_images = rawViews.map((item: any) => {
      const viewType = String(item?.view_type ?? item?.viewType ?? '');
      if (!views.includes(viewType)) throw new Error(`CRUN hy-3d-3.1 invalid view_type: ${viewType}`);
      if (seen.has(viewType)) throw new Error(`CRUN hy-3d-3.1 duplicate view_type: ${viewType}`);
      seen.add(viewType);
      const urls = httpUrls(item.image_url ?? item.imageUrl, 'multi_view_images.image_url');
      if (urls.length !== 1) throw new Error('CRUN hy-3d-3.1 multi_view_images requires one image per view');
      return { view_type: viewType, image_url: urls[0] };
    });
  }

  const body: Record<string, any> = { model: HUNYUAN_31_MODEL, input };
  if (typeof payload.callback_url === 'string' && payload.callback_url.trim()) {
    body.callback_url = payload.callback_url.trim();
  }
  return body;
}
