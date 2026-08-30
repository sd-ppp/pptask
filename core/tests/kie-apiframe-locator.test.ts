import { describe, expect, it } from 'vitest';
import { parseKieLocator } from '../src/providers/kie/locator.ts';
import { parseApiframeLocator } from '../src/providers/apiframe/locator.ts';

describe('parseKieLocator', () => {
  it('parses market model locators', () => {
    expect(parseKieLocator('kie://market/seedream/5-pro-text-to-image')).toEqual({
      model: 'seedream/5-pro-text-to-image',
    });
    expect(parseKieLocator('kie://market/kling-3.0/video')).toEqual({
      model: 'kling-3.0/video',
    });
  });

  it('rejects invalid kie locators', () => {
    const invalid = [
      'kie://app/seedream/5-pro-text-to-image',
      'kie://market/',
      'kie://market',
      'kie://market/seedream/5-pro-text-to-image?foo=bar',
      'kie://market/seedream/5-pro-text-to-image#frag',
      'kie://user@market/seedream/5-pro-text-to-image',
      'replicate:///owner/model',
    ];
    for (const locator of invalid) {
      expect(() => parseKieLocator(locator)).toThrow();
    }
  });
});

describe('parseApiframeLocator', () => {
  it('parses image, video, and music locators', () => {
    expect(parseApiframeLocator('apiframe://image/flux-2-pro')).toEqual({
      modality: 'image',
      model: 'flux-2-pro',
    });
    expect(parseApiframeLocator('apiframe://video/kling-3.0')).toEqual({
      modality: 'video',
      model: 'kling-3.0',
    });
    expect(parseApiframeLocator('apiframe://music/suno')).toEqual({
      modality: 'music',
      model: 'suno',
    });
  });

  it('normalizes legacy audio modality to music', () => {
    expect(parseApiframeLocator('apiframe://audio/suno')).toEqual({
      modality: 'music',
      model: 'suno',
    });
  });

  it('rejects invalid apiframe locators', () => {
    const invalid = [
      'apiframe://text/suno',
      'apiframe://music/',
      'apiframe://image/flux-2-pro?x=1',
      'apiframe://image/flux-2-pro#x',
      'apiframe://user@image/flux-2-pro',
      'kie://market/seedream/5-pro-text-to-image',
    ];
    for (const locator of invalid) {
      expect(() => parseApiframeLocator(locator)).toThrow();
    }
  });
});
