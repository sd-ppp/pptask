import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUNNINGHUB_REGISTRY_URL, syncRunningHub } from '../scripts/lib/sync-provider-data.mjs';

function makeCatalogRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-catalog-rh-'));
}

describe('syncRunningHub', () => {
  let catalogDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
  });

  // These tests exercise the generic fetch/atomic-swap/manifest mechanics
  // shared by every provider sync, so they pass `overlay: []` to disable the
  // real Seedance Global / Dola Seedream overlay merge (covered separately
  // by sync-provider-data-runninghub-overlay.test.ts) and keep their content
  // assertions scoped to upstream-only data.

  it('fetches the official RunningHub raw registry URL by default', async () => {
    catalogDataRoot = makeCatalogRoot();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ endpoint: 'a' }]), { status: 200 }));
    await syncRunningHub({ catalogDataRoot, fetchImpl, overlay: [], now: () => new Date('2026-01-01T00:00:00.000Z') });
    expect(fetchImpl).toHaveBeenCalledWith(RUNNINGHUB_REGISTRY_URL, expect.anything());
  });

  it('mirrors the registry snapshot (merged with the overlay) and writes a manifest with the injected sync time', async () => {
    catalogDataRoot = makeCatalogRoot();
    const upstream = [{ endpoint: 'rh/one', name: 'One' }];
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(upstream), { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date('2026-01-02T03:04:05.000Z'),
    });

    expect(result.status).toBe('success');
    const targetDir = resolve(catalogDataRoot, 'runninghub');
    expect(JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'))).toEqual(upstream);

    const manifest = JSON.parse(readFileSync(resolve(targetDir, 'manifest.json'), 'utf8'));
    expect(manifest.provider).toBe('runninghub');
    expect(manifest.sourceUrls).toEqual(['https://example.test/registry.json', 'inline-overlay']);
    expect(manifest.fileCount).toBe(1);
    expect(manifest.syncedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(manifest.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(typeof manifest.transactionId).toBe('string');
  });

  it('replaces the previous snapshot entirely and deletes stale files not present upstream anymore', async () => {
    catalogDataRoot = makeCatalogRoot();
    const first = [{ endpoint: 'rh/legacy' }];
    await syncRunningHub({
      catalogDataRoot,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(first), { status: 200 })),
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    const targetDir = resolve(catalogDataRoot, 'runninghub');
    // Simulate a stray leftover file from a previous format; a full mirror
    // replace must remove it even though nothing re-fetches it.
    writeFileSync(resolve(targetDir, 'stale-extra.json'), '{}');

    const second = [{ endpoint: 'rh/new' }];
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(second), { status: 200 })),
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('success');
    expect(JSON.parse(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8'))).toEqual(second);
    expect(existsSync(resolve(targetDir, 'stale-extra.json'))).toBe(false);
  });

  it('keeps the previous snapshot untouched when the fetch fails', async () => {
    catalogDataRoot = makeCatalogRoot();
    const first = [{ endpoint: 'rh/keep-me' }];
    await syncRunningHub({
      catalogDataRoot,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify(first), { status: 200 })),
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    const targetDir = resolve(catalogDataRoot, 'runninghub');
    const firstContent = readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8');

    const failingFetch = vi.fn(async () => new Response('boom', { status: 500 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl: failingFetch,
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    expect(readFileSync(resolve(targetDir, 'models_registry.json'), 'utf8')).toBe(firstContent);
    // No leftover staging/rollback directories next to the target.
    expect(existsSync(`${targetDir}.staging`)).toBe(false);
  });

  it('fails (and does not write anything) when the response body is not valid JSON', async () => {
    catalogDataRoot = makeCatalogRoot();
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 200 }));
    const result = await syncRunningHub({
      catalogDataRoot,
      fetchImpl,
      overlay: [],
      sourceUrl: 'https://example.test/registry.json',
      now: () => new Date(),
    });
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/JSON/i);
    expect(existsSync(resolve(catalogDataRoot, 'runninghub'))).toBe(false);
  });
});
