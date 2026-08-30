import { describe, expect, it } from 'vitest';
import { runninghubProviderDefinition } from '../src/providers/runninghub/index.ts';

describe('runninghub provider canCancelTask capability', () => {
  it('reports the new runninghub://api locator as not cancelable', () => {
    expect(
      runninghubProviderDefinition.canCancelTask?.({ locator: 'runninghub://api/rhart-image-n-pro/text-to-image' })
    ).toBe(false);
  });

  it('reports the legacy runninghub://app locator as cancelable', () => {
    expect(
      runninghubProviderDefinition.canCancelTask?.({ locator: 'runninghub://app/12345' })
    ).toBe(true);
  });

  it('still exposes cancelTask as a function even though api/ cannot actually cancel remotely', () => {
    // cancelTask remains defined for both so callers that bypass canCancelTask
    // still get a rejected promise (see api.ts: "cancel not yet implemented")
    // instead of a silent no-op.
    expect(typeof runninghubProviderDefinition.cancelTask).toBe('function');
  });
});
