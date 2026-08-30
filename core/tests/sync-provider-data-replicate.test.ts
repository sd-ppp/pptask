import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPLICATE_MODELS_URL, syncReplicate } from '../scripts/lib/sync-provider-data.mjs';

function makeCatalogRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-catalog-replicate-'));
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200 });
}

describe('syncReplicate', () => {
  let catalogDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
  });

  it('fails immediately without calling fetch when REPLICATE_API_KEY is missing', async () => {
    catalogDataRoot = makeCatalogRoot();
    const fetchImpl = vi.fn();
    const result = await syncReplicate({ catalogDataRoot, fetchImpl, env: {} });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/REPLICATE_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(existsSync(resolve(catalogDataRoot, 'replicate'))).toBe(false);
  });

  it('follows pagination via `next` and mirrors every page as its own raw snapshot file', async () => {
    catalogDataRoot = makeCatalogRoot();
    const page0 = { results: [{ owner: 'a', name: 'one' }], next: 'https://api.replicate.com/v1/models?cursor=2' };
    const page1 = { results: [{ owner: 'b', name: 'two' }], next: 'https://api.replicate.com/v1/models?cursor=3' };
    const page2 = { results: [{ owner: 'c', name: 'three' }], next: null };
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      if (url === REPLICATE_MODELS_URL) return jsonResponse(page0);
      if (url === page0.next) return jsonResponse(page1);
      if (url === page1.next) return jsonResponse(page2);
      throw new Error(`unexpected url ${url}`);
    });

    const result = await syncReplicate({
      catalogDataRoot,
      fetchImpl,
      env: { REPLICATE_API_KEY: 'test-key-123' },
      now: () => new Date('2026-02-01T00:00:00.000Z'),
    });

    expect(result.status).toBe('success');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    // Auth header must be sent, but never leaked into the URL.
    const firstCallHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined;
    expect(firstCallHeaders?.Authorization).toBe('Bearer test-key-123');

    const targetDir = resolve(catalogDataRoot, 'replicate');
    expect(JSON.parse(readFileSync(resolve(targetDir, 'page-0000.json'), 'utf8'))).toEqual(page0);
    expect(JSON.parse(readFileSync(resolve(targetDir, 'page-0001.json'), 'utf8'))).toEqual(page1);
    expect(JSON.parse(readFileSync(resolve(targetDir, 'page-0002.json'), 'utf8'))).toEqual(page2);

    const manifest = JSON.parse(readFileSync(resolve(targetDir, 'manifest.json'), 'utf8'));
    expect(manifest.fileCount).toBe(3);
    expect(manifest.sourceUrls).toEqual([REPLICATE_MODELS_URL, page0.next, page1.next]);
    // The API key must never appear in the manifest or any written file.
    expect(JSON.stringify(manifest)).not.toContain('test-key-123');
  });

  it('deletes stale page files left over from a previous run with more pages', async () => {
    catalogDataRoot = makeCatalogRoot();
    const env = { REPLICATE_API_KEY: 'test-key-123' };

    const firstFetch = vi.fn(async (url: string) => {
      if (url === REPLICATE_MODELS_URL) {
        return jsonResponse({ results: [{ owner: 'a', name: 'one' }], next: 'https://api.replicate.com/v1/models?cursor=2' });
      }
      return jsonResponse({ results: [{ owner: 'b', name: 'two' }], next: null });
    });
    await syncReplicate({ catalogDataRoot, fetchImpl: firstFetch, env, now: () => new Date() });
    const targetDir = resolve(catalogDataRoot, 'replicate');
    expect(existsSync(resolve(targetDir, 'page-0001.json'))).toBe(true);

    const secondFetch = vi.fn(async () => jsonResponse({ results: [{ owner: 'only', name: 'page' }], next: null }));
    const result = await syncReplicate({ catalogDataRoot, fetchImpl: secondFetch, env, now: () => new Date() });

    expect(result.status).toBe('success');
    expect(existsSync(resolve(targetDir, 'page-0000.json'))).toBe(true);
    expect(existsSync(resolve(targetDir, 'page-0001.json'))).toBe(false);
  });

  it('keeps the previous snapshot when a later page request fails, and redacts the API key from the error', async () => {
    catalogDataRoot = makeCatalogRoot();
    const env = { REPLICATE_API_KEY: 'super-secret-key' };
    const goodFetch = vi.fn(async () => jsonResponse({ results: [{ owner: 'a', name: 'one' }], next: null }));
    await syncReplicate({ catalogDataRoot, fetchImpl: goodFetch, env, now: () => new Date() });

    const targetDir = resolve(catalogDataRoot, 'replicate');
    const before = readFileSync(resolve(targetDir, 'page-0000.json'), 'utf8');

    const failingFetch = vi.fn(async (url: string) =>
      new Response(`server exploded while using super-secret-key for ${url}`, { status: 500 }),
    );
    const result = await syncReplicate({ catalogDataRoot, fetchImpl: failingFetch, env, now: () => new Date() });

    expect(result.status).toBe('failed');
    expect(result.error).not.toContain('super-secret-key');
    expect(result.error).toContain('REDACTED');
    expect(readFileSync(resolve(targetDir, 'page-0000.json'), 'utf8')).toBe(before);
  });

  it('fails when pagination would loop back to an already-fetched URL', async () => {
    catalogDataRoot = makeCatalogRoot();
    const env = { REPLICATE_API_KEY: 'test-key-123' };
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ results: [{ owner: 'a', name: 'one' }], next: REPLICATE_MODELS_URL }),
    );
    const result = await syncReplicate({ catalogDataRoot, fetchImpl, env, now: () => new Date() });
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/repeated URL/i);
  });
});
