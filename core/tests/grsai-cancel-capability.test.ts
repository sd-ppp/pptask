import { describe, expect, it } from 'vitest';

import { getProvider } from '../src/index.ts';

describe('grsai cancellation capability', () => {
  it('does not advertise the no-op cancel implementation as real cancellation', () => {
    const provider = getProvider('grsai');

    expect(provider?.canCancelTask?.({ locator: 'grsai:///model' })).toBe(false);
  });
});
