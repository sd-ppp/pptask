import { describe, expect, it } from 'vitest';
import { kieProviderDefinition } from '../src/providers/kie/index.ts';
import { apiframeProviderDefinition } from '../src/providers/apiframe/index.ts';

describe('kie/apiframe canCancelTask capability', () => {
  it('kie never supports remote cancellation', () => {
    expect(kieProviderDefinition.canCancelTask?.({ locator: 'kie://market/seedream/5-pro-text-to-image' })).toBe(false);
  });

  it('apiframe never supports remote cancellation', () => {
    expect(apiframeProviderDefinition.canCancelTask?.({ locator: 'apiframe://image/flux-2-pro' })).toBe(false);
  });
});
