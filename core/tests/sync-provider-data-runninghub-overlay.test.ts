import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeRunningHubRegistry } from '../scripts/lib/runninghub-registry-overlay.mjs';
import { syncRunningHub } from '../scripts/lib/sync-provider-data.mjs';

function makeCatalogRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-catalog-rh-overlay-'));
}

function makeOverlayFile(dir, entries) {
  const path = resolve(dir, 'overlay.json');
  writeFileSync(path, JSON.stringify(entries), 'utf8');
  return path;
}

function overlayEntry(endpoint, overrides = {}) {
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

describe('syncRunningHub with the Seedance Global / Dola Seedream overlay', () => {
  let catalogDataRoot;
  let overlayDir;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
    if (overlayDir) rmSync(overlayDir, { recursive: true, force: true });
  });

  it('applies the merge and writes the merged registry when overlay entries are missing upstream', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const upstream = [{ endpoint: 'rh/one', name_en: 'one' }];
    const overlay = [overlayEntry('seedance/global/text-to-video')];
    const overlayPath = makeOverlayFile(overlayDir, overlay);

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date('2026-01-02T03:04:05.000Z'),
    });

    expect(result.status).toBe('success');
    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const written = JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'));
    const endpoints = written.map(entry => entry.endpoint).sort();
    expect(endpoints).toEqual(['rh/one', 'seedance/global/text-to-video']);
  });

  it('keeps the upstream entry when the overlay declares a conflicting endpoint (no silent overwrite)', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const upstream = [{ endpoint: 'shared/endpoint', display_name: 'Upstream wins', name_en: 'x' }];
    const overlay = [overlayEntry('shared/endpoint', { display_name: 'Overlay loses' })];
    const overlayPath = makeOverlayFile(overlayDir, overlay);

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('success');
    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const written = JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'));
    expect(written).toHaveLength(1);
    expect(written[0].display_name).toBe('Upstream wins');
  });

  it('produces a merge result with no duplicate endpoints', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const upstream = [
      { endpoint: 'rh/a', name_en: 'a' },
      { endpoint: 'rh/b', name_en: 'b' },
    ];
    const overlay = [overlayEntry('rh/b'), overlayEntry('rh/c')];
    const overlayPath = makeOverlayFile(overlayDir, overlay);

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));
    await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const written = JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'));
    const endpoints = written.map(entry => entry.endpoint);
    expect(endpoints).toHaveLength(new Set(endpoints).size);
    expect(endpoints.sort()).toEqual(['rh/a', 'rh/b', 'rh/c']);
  });

  it('fails (without writing anything) when the overlay file has duplicate endpoints, preserving the previous snapshot', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();

    // Seed a previous successful snapshot first.
    const goodOverlayPath = makeOverlayFile(overlayDir, [overlayEntry('rh/good')]);
    const first = [{ endpoint: 'rh/keep-me', name_en: 'keep' }];
    await syncRunningHub({
      catalogDataRoot,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(first), { status: 200 })),
      overlayPath: goodOverlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const beforeContent = readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8');

    const badOverlayPath = makeOverlayFile(overlayDir, [overlayEntry('rh/dup'), overlayEntry('rh/dup')]);
    const second = [{ endpoint: 'rh/new', name_en: 'new' }];
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(second), { status: 200 })),
      overlayPath: badOverlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/duplicate/i);
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe(beforeContent);
    expect(existsSync(`${targetDir}.staging`)).toBe(false);
  });

  it('fails (without writing anything) when the overlay file has an entry with invalid schema', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const brokenOverlay = [{ ...overlayEntry('rh/broken'), params: 'not-an-array' }];
    const overlayPath = makeOverlayFile(overlayDir, brokenOverlay);

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ endpoint: 'rh/one', name_en: 'one' }]), { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/params/i);
    expect(existsSync(resolve(catalogDataRoot, 'runninghub'))).toBe(false);
  });

  it('records both the upstream URL and the overlay path in manifest.sourceUrls, and hashes the merged content', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const upstream = [{ endpoint: 'rh/one', name_en: 'one' }];
    const overlay = [overlayEntry('seedance/global/text-to-video')];
    const overlayPath = makeOverlayFile(overlayDir, overlay);

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlayPath,
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date('2026-01-02T03:04:05.000Z'),
    });

    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const manifest = JSON.parse(readFileSync(resolve(targetDir, 'manifest.json'), 'utf8'));
    expect(manifest.sourceUrls).toContain('https://example.test/registry.json');
    expect(manifest.sourceUrls.some(url => url.includes('overlay.json'))).toBe(true);

    const writtenContent = readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8');
    expect(manifest.files[0].sha256).toBeDefined();
    const { entries: expectedEntries } = mergeRunningHubRegistry(upstream, overlay);
    expect(JSON.parse(writtenContent)).toEqual(expectedEntries);
  });

  it('applying the same overlay twice in a row is idempotent (no duplicate growth)', async () => {
    catalogDataRoot = makeCatalogRoot();
    overlayDir = makeCatalogRoot();
    const upstream = [{ endpoint: 'rh/one', name_en: 'one' }];
    const overlay = [overlayEntry('seedance/global/text-to-video')];
    const overlayPath = makeOverlayFile(overlayDir, overlay);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));

    await syncRunningHub({ catalogDataRoot, fetchImpl, overlayPath, sourceUrl: 'https://example.test/registry.json', now: () => new Date() });
    const result = await syncRunningHub({ catalogDataRoot, fetchImpl, overlayPath, sourceUrl: 'https://example.test/registry.json', now: () => new Date() });

    expect(result.status).toBe('success');
    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const written = JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'));
    expect(written).toHaveLength(2);
  });
});
