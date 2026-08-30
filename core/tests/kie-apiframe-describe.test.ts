import { describe, expect, it } from 'vitest';
import { describeKieResource } from '../src/providers/kie/describe.ts';
import { describeApiframeResource } from '../src/providers/apiframe/describe.ts';

describe('Kie describe registry', () => {
  it('describes whitelisted image, video, and audio models', async () => {
    const image = await describeKieResource({ locator: 'kie://market/seedream/5-pro-text-to-image' });
    const video = await describeKieResource({ locator: 'kie://market/kling-3.0/video' });
    const audio = await describeKieResource({
      locator: 'kie://market/elevenlabs/text-to-speech-multilingual-v2',
    });

    for (const result of [image, video, audio]) {
      expect(result.provider).toBe('kie');
      expect(result.recommendUploadProvider).toBe('kie');
      expect(result.cancelable).toBe(false);
      expect(result.metadata.scheme).toBe('kie');
      expect(result.metadata.source).toBeTruthy();
      expect(result.formSchema.type).toBe('object');
      expect(result.formValues).toBeTruthy();
    }

    expect(image.formSchema.properties).toHaveProperty('prompt');
    expect(image.formSchema.properties).not.toHaveProperty('model');
    expect(image.formSchema.properties).not.toHaveProperty('callBackUrl');
    expect(image.formSchema.properties).not.toHaveProperty('nsfw_checker');
    expect(image.formSchema.properties.aspect_ratio).toMatchObject({
      required: true,
      'x-component': 'Select',
    });
    expect(image.formValues.quality).toBe('basic');

    expect(video.formSchema.properties.image_urls).toMatchObject({
      'x-component': 'Upload.Dragger',
    });
    expect(video.formSchema.properties.multi_prompt).toMatchObject({
      'x-component': 'ArrayItems',
    });
    expect(video.formSchema.properties.multi_prompt.items?.properties?.prompt).toMatchObject({
      required: true,
      'x-component': 'Input.TextArea',
    });
    expect(video.formSchema.properties.kling_elements).toMatchObject({
      'x-component': 'ArrayItems',
    });
    expect(video.formSchema.properties.kling_elements.items?.properties?.element_input_urls).toMatchObject({
      'x-component': 'Upload.Dragger',
      required: true,
    });

    expect(audio.formSchema.properties.text).toMatchObject({
      required: true,
      'x-component': 'Input.TextArea',
    });
    expect(audio.formSchema.properties.voice).toMatchObject({
      'x-component': 'Select',
    });
  });

  it('rejects non-whitelisted locators', async () => {
    await expect(describeKieResource({
      locator: 'kie://market/bytedance/seedream',
    })).rejects.toThrow(/unsupported locator/i);
  });

  it('canonicalizes the locator before registry lookup so non-canonical but validly-parsed locators still resolve', async () => {
    // The raw locator below is not byte-identical to the registry key
    // (`kie://market/kling-3.0/video`) because of the doubled slash, but
    // parseKieLocator still resolves it to the same model id. Lookups must
    // canonicalize before hitting the registry map, mirroring what the
    // Apiframe describe path already does, otherwise this throws
    // "unsupported locator" despite being a supported model.
    const canonical = await describeKieResource({ locator: 'kie://market/kling-3.0/video' });
    const nonCanonical = await describeKieResource({ locator: 'kie://market//kling-3.0/video' });
    expect(nonCanonical.metadata.locator).toBe(canonical.metadata.locator);
    expect(nonCanonical.metadata.model).toBe(canonical.metadata.model);
  });
});

describe('Apiframe describe registry', () => {
  it('describes whitelisted image, video, and music models with flattened params', async () => {
    const image = await describeApiframeResource({ locator: 'apiframe://image/flux-2-pro' });
    const video = await describeApiframeResource({ locator: 'apiframe://video/kling-3.0' });
    const music = await describeApiframeResource({ locator: 'apiframe://music/suno' });

    for (const result of [image, video, music]) {
      expect(result.provider).toBe('apiframe');
      expect(result.recommendUploadProvider).toBe('apiframe');
      expect(result.cancelable).toBe(false);
      expect(result.metadata.scheme).toBe('apiframe');
      expect(result.metadata.source).toBeTruthy();
      expect(result.formSchema.type).toBe('object');
    }

    expect(image.formSchema.properties).toHaveProperty('prompt');
    expect(image.formSchema.properties).not.toHaveProperty('model');
    expect(image.formSchema.properties).not.toHaveProperty('webhookUrl');
    expect(image.formSchema.properties).not.toHaveProperty('fluxParams');
    expect(image.formSchema.properties.guidance).toMatchObject({
      'x-component': 'NumberPicker',
      minimum: 1.5,
      maximum: 10,
    });
    expect(image.formSchema.properties.input_images).toMatchObject({
      'x-component': 'Upload.Dragger',
    });
    expect(image.formSchema.properties.guidance['x-apiframe']).toMatchObject({
      wirePath: 'fluxParams',
    });
    expect(image.formValues).not.toHaveProperty('guidance');
    expect(image.formValues).not.toHaveProperty('width');
    expect(image.formValues).not.toHaveProperty('height');

    expect(video.formSchema.properties.duration).toMatchObject({
      'x-component': 'NumberPicker',
    });
    expect(video.formValues).not.toHaveProperty('duration');

    expect(music.formSchema.properties.model_version).toMatchObject({
      'x-component': 'Select',
    });
    expect(music.formSchema.properties.model_version['x-apiframe']).toMatchObject({
      wirePath: 'sunoParams',
    });
    expect(music.formValues.model_version).toBe('V4_5PLUS');
  });

  it('rejects non-whitelisted locators', async () => {
    await expect(describeApiframeResource({
      locator: 'apiframe://image/dall-e-3',
    })).rejects.toThrow(/unsupported locator/i);
  });
});
