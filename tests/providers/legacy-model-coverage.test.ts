import { describe, expect, it, vi } from 'vitest';
import {
  CRUN_GEMINI_OMNI_MODELS,
  CRUN_GROK_IMAGINE_VIDEO_MODELS,
  CRUN_GPT56_MODELS,
  CRUN_GPT_IMAGE_MODELS,
  CRUN_HAILUO_23_MODELS,
  CRUN_HAPPYHORSE_11_MODELS,
  CRUN_IMAGE_EXPAND_MODELS,
  CRUN_IMAGE_UPSCALE_MODELS,
  CRUN_KLING_MODELS,
  CRUN_MINIMAX_H3_MODELS,
  CRUN_NANO_BANANA_MODELS,
  CRUN_PIXVERSE_V6_MODELS,
  CRUN_SEEDANCE_MODELS,
  CRUN_SEEDREAM_MODELS,
  CRUN_VEO_31_MODELS,
  CRUN_WATERMARK_REMOVE_MODELS,
  NOVITA_GPT56_MODELS,
  NOVITA_GPT_IMAGE_MODELS,
  NOVITA_KLING_V3_MODELS,
  NOVITA_SEEDANCE_OVERSEA_MODELS,
  NOVITA_VEO31_MODELS,
  PPIO_FUSION_MODEL,
  PPIO_GPT_IMAGE_MODEL,
  PPIO_HAILUO_23_MODELS,
  PPIO_KLING_V3_MODELS,
  PPIO_MINIMAX_H3_MODEL,
  PPIO_RESPONSE_MODELS,
  PPIO_SEEDANCE_CN_METERED_MODELS,
  PPIO_SEEDANCE_MODEL,
  PPIO_VEO_MODELS,
  createCrunProvider,
  createNovitaProvider,
  createPpioProvider,
  type PptaskProvider,
} from '../../src/index.ts';

const fetchMock = vi.fn(async () => Response.json({}));

function assertDescribed(provider: PptaskProvider, modelId: string, type: 'language' | 'image' | 'video') {
  const model = type === 'language' ? provider.languageModel(modelId) : type === 'image' ? provider.imageModel(modelId) : provider.videoModel(modelId);
  return provider.describe(model).then(description => {
    expect(description).toMatchObject({ providerId: provider.providerId, modelId, modelType: type });
    expect(description.inputSchema).toBeTruthy();
    expect(description.defaultInput).toBeTruthy();
  });
}

describe('migrated provider model coverage', () => {
  it('describes every CRUN model through the new modelId factory', async () => {
    const provider = createCrunProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    const images = [
      ...CRUN_NANO_BANANA_MODELS, ...CRUN_GPT_IMAGE_MODELS, ...CRUN_SEEDREAM_MODELS,
      ...CRUN_IMAGE_UPSCALE_MODELS, ...CRUN_WATERMARK_REMOVE_MODELS.filter(model => model.startsWith('image-')),
      ...CRUN_IMAGE_EXPAND_MODELS,
    ];
    const videos = [
      ...CRUN_SEEDANCE_MODELS, ...CRUN_KLING_MODELS, ...CRUN_MINIMAX_H3_MODELS,
      ...CRUN_PIXVERSE_V6_MODELS, ...CRUN_HAPPYHORSE_11_MODELS, ...CRUN_HAILUO_23_MODELS,
      ...CRUN_GROK_IMAGINE_VIDEO_MODELS, ...CRUN_GEMINI_OMNI_MODELS, ...CRUN_VEO_31_MODELS,
      'video-watermark-remove',
    ];
    await Promise.all([
      ...images.map(model => assertDescribed(provider, model, 'image')),
      ...videos.map(model => assertDescribed(provider, model, 'video')),
      ...CRUN_GPT56_MODELS.map(model => assertDescribed(provider, model, 'language')),
    ]);
  });

  it('describes every Novita model through the new modelId factory', async () => {
    const provider = createNovitaProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    await Promise.all([
      ...NOVITA_GPT_IMAGE_MODELS.map(model => assertDescribed(provider, model, 'image')),
      ...NOVITA_GPT56_MODELS.map(model => assertDescribed(provider, model, 'language')),
      ...NOVITA_SEEDANCE_OVERSEA_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...NOVITA_KLING_V3_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...NOVITA_VEO31_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image',
        'gemini-3.1-flash-lite-image-as', 'gemini-3.1-flash-image-as', 'gemini-3-pro-image-as', 'gemini-2.5-flash-image-as']
        .map(model => assertDescribed(provider, model, 'image')),
    ]);
  });

  it('describes every PPIO model through the new modelId factory', async () => {
    const provider = createPpioProvider({ apiKey: 'key', fetch: fetchMock as typeof fetch });
    await Promise.all([
      assertDescribed(provider, PPIO_GPT_IMAGE_MODEL, 'image'),
      assertDescribed(provider, PPIO_FUSION_MODEL, 'language'),
      assertDescribed(provider, PPIO_SEEDANCE_MODEL, 'video'),
      assertDescribed(provider, PPIO_MINIMAX_H3_MODEL, 'video'),
      ...PPIO_RESPONSE_MODELS.map(model => assertDescribed(provider, model, 'language')),
      ...PPIO_VEO_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...PPIO_KLING_V3_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...PPIO_HAILUO_23_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...PPIO_SEEDANCE_CN_METERED_MODELS.map(model => assertDescribed(provider, model, 'video')),
      ...['gemini-3.1-flash-image', 'gemini-3-pro-image', 'gemini-2.5-flash-image'].map(model => assertDescribed(provider, model, 'image')),
    ]);
  });
});
