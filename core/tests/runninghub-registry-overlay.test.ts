import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUNNINGHUB_OVERLAY_PATH,
  loadRunningHubOverlay,
  mergeRunningHubRegistry,
} from '../scripts/lib/runninghub-registry-overlay.mjs';

function makeUpstreamEntry(endpoint: string, overrides: Record<string, unknown> = {}) {
  return {
    class_name: 'UpstreamEntry',
    internal_name: 'RH_UpstreamEntry',
    display_name: 'Upstream entry',
    name_cn: 'Upstream entry',
    name_en: 'upstream-entry',
    endpoint,
    output_type: 'image',
    category: 'RunningHub/Upstream',
    params: [],
    ...overrides,
  };
}

function makeOverlayEntry(endpoint: string, overrides: Record<string, unknown> = {}) {
  return {
    class_name: 'OverlayEntry',
    internal_name: 'RH_OverlayEntry',
    display_name: 'Overlay entry',
    name_cn: 'Overlay entry',
    name_en: 'overlay-entry',
    endpoint,
    output_type: 'video',
    category: 'RunningHub/Overlay',
    params: [],
    ...overrides,
  };
}

describe('mergeRunningHubRegistry', () => {
  it('adds overlay entries whose endpoint is missing from upstream', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlay = [makeOverlayEntry('rh/two'), makeOverlayEntry('rh/three')];

    const { entries, addedEndpoints } = mergeRunningHubRegistry(upstream, overlay);

    expect(entries.map(entry => entry.endpoint).sort()).toEqual(['rh/one', 'rh/three', 'rh/two']);
    expect(addedEndpoints.sort()).toEqual(['rh/three', 'rh/two']);
  });

  it('keeps the upstream entry untouched when overlay declares a conflicting endpoint', () => {
    const upstream = [makeUpstreamEntry('rh/shared', { display_name: 'Upstream wins' })];
    const overlay = [makeOverlayEntry('rh/shared', { display_name: 'Overlay loses' })];

    const { entries, addedEndpoints } = mergeRunningHubRegistry(upstream, overlay);

    expect(entries).toHaveLength(1);
    expect(entries[0].display_name).toBe('Upstream wins');
    expect(addedEndpoints).toEqual([]);
  });

  it('produces a deterministic endpoint-sorted order regardless of input order', () => {
    const upstream = [makeUpstreamEntry('rh/zebra'), makeUpstreamEntry('rh/alpha')];
    const overlay = [makeOverlayEntry('rh/middle')];

    const { entries } = mergeRunningHubRegistry(upstream, overlay);

    expect(entries.map(entry => entry.endpoint)).toEqual(['rh/alpha', 'rh/middle', 'rh/zebra']);
  });

  it('never produces duplicate endpoints in the merged result', () => {
    const upstream = [makeUpstreamEntry('rh/one'), makeUpstreamEntry('rh/two')];
    const overlay = [makeOverlayEntry('rh/two'), makeOverlayEntry('rh/three')];

    const { entries } = mergeRunningHubRegistry(upstream, overlay);
    const endpoints = entries.map(entry => entry.endpoint);

    expect(endpoints).toHaveLength(new Set(endpoints).size);
  });

  it('throws when the overlay itself declares the same endpoint twice', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlay = [makeOverlayEntry('rh/dup'), makeOverlayEntry('rh/dup')];

    expect(() => mergeRunningHubRegistry(upstream, overlay)).toThrow(/duplicate/i);
  });

  it('throws when an overlay entry is missing a required field', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlayMissingClassName = [{ ...makeOverlayEntry('rh/broken'), class_name: undefined }];

    expect(() => mergeRunningHubRegistry(upstream, overlayMissingClassName)).toThrow(/class_name/i);
  });

  it('throws when an overlay entry has a blank endpoint', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlay = [makeOverlayEntry('')];

    expect(() => mergeRunningHubRegistry(upstream, overlay)).toThrow(/endpoint/i);
  });

  it('throws when an overlay entry has a non-array params field', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlay = [{ ...makeOverlayEntry('rh/broken'), params: 'not-an-array' }];

    expect(() => mergeRunningHubRegistry(upstream, overlay)).toThrow(/params/i);
  });

  it('throws when upstream is not an array', () => {
    expect(() => mergeRunningHubRegistry({ not: 'an array' }, [])).toThrow(/array/i);
  });

  it('throws when overlay is not an array', () => {
    expect(() => mergeRunningHubRegistry([], { not: 'an array' })).toThrow(/array/i);
  });

  it('does not mutate the input upstream or overlay arrays', () => {
    const upstream = [makeUpstreamEntry('rh/one')];
    const overlay = [makeOverlayEntry('rh/two')];
    const upstreamSnapshot = JSON.parse(JSON.stringify(upstream));
    const overlaySnapshot = JSON.parse(JSON.stringify(overlay));

    mergeRunningHubRegistry(upstream, overlay);

    expect(upstream).toEqual(upstreamSnapshot);
    expect(overlay).toEqual(overlaySnapshot);
  });
});

describe('loadRunningHubOverlay (real Seedance Global / Dola Seedream overlay file)', () => {
  it('resolves the default overlay path next to the sync scripts', () => {
    expect(DEFAULT_RUNNINGHUB_OVERLAY_PATH).toMatch(/runninghub-registry-overlay\.json$/);
  });

  it('loads exactly the 6 Seedance Global + 2 Dola Seedream entries with valid schema', async () => {
    const overlay = await loadRunningHubOverlay(DEFAULT_RUNNINGHUB_OVERLAY_PATH);

    expect(Array.isArray(overlay)).toBe(true);
    expect(overlay).toHaveLength(8);

    const endpoints = overlay.map((entry: { endpoint: string }) => entry.endpoint).sort();
    expect(endpoints).toEqual([
      'bytedance/seedance-2.0-global-fast/image-to-video',
      'bytedance/seedance-2.0-global-fast/multimodal-video',
      'bytedance/seedance-2.0-global-fast/text-to-video',
      'bytedance/seedance-2.0-global/image-to-video',
      'bytedance/seedance-2.0-global/multimodal-video',
      'bytedance/seedance-2.0-global/text-to-video',
      'dola-Seedream-5.0-pro/image-to-image',
      'dola-Seedream-5.0-pro/text-to-image',
    ]);
  });

  it('merges cleanly against a fixture upstream that lacks Seedance Global / Dola Seedream', async () => {
    const overlay = await loadRunningHubOverlay(DEFAULT_RUNNINGHUB_OVERLAY_PATH);
    const upstream = [makeUpstreamEntry('rh/unrelated-model')];

    const { entries, addedEndpoints } = mergeRunningHubRegistry(upstream, overlay);

    expect(addedEndpoints.sort()).toEqual(overlay.map((entry: { endpoint: string }) => entry.endpoint).sort());
    expect(entries).toHaveLength(9);
  });
});
