import { describe, expect, it } from 'vitest';
import { buildReplicateLocatorOptions } from '../src/providers/replicate/model-catalog.ts';

describe('Replicate model catalog', () => {
  it('maps public model records to PPTask locators', () => {
    expect(buildReplicateLocatorOptions([{
      owner: 'black-forest-labs',
      name: 'flux-schnell',
      description: 'Fast image generation',
      url: 'https://replicate.com/black-forest-labs/flux-schnell',
      latest_version_id: 'version-1',
    }])).toEqual([{
      providerId: 'replicate',
      locator: 'replicate:///black-forest-labs/flux-schnell',
      label: 'black-forest-labs/flux-schnell',
      category: 'Replicate',
      searchText: 'black-forest-labs flux-schnell fast image generation',
    }]);
  });
});
