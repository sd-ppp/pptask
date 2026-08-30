import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateReplicateCatalog } from '../scripts/lib/generate-replicate-catalog.mjs';

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-generate-replicate-'));
}

describe('generateReplicateCatalog', () => {
  let tempRoot: string;

  afterEach(() => {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  });

  function writePage(root: string, index: number, results: unknown[]) {
    const pagesDir = resolve(root, 'catalog-data/replicate');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(
      resolve(pagesDir, `page-${String(index).padStart(4, '0')}.json`),
      JSON.stringify({ results, next: null }),
      'utf8',
    );
  }

  it('merges every page, dedupes by owner/name, and sorts the result', async () => {
    tempRoot = makeTempRoot();
    writePage(tempRoot, 0, [
      { owner: 'black-forest-labs', name: 'flux-schnell', description: 'Fast', url: 'https://x/1', latest_version: { id: 'v1', created_at: '2026-01-01T00:00:00Z' } },
      { owner: 'zeta', name: 'zed', description: 'Z model', url: 'https://x/2' },
    ]);
    writePage(tempRoot, 1, [
      { owner: 'alpha', name: 'aardvark', description: 'A model', url: 'https://x/3' },
    ]);
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');

    const result = await generateReplicateCatalog({ pagesDir, catalogOutputPath });

    expect(existsSync(catalogOutputPath)).toBe(true);
    const catalog = JSON.parse(readFileSync(catalogOutputPath, 'utf8'));
    expect(catalog.map((m: any) => `${m.owner}/${m.name}`)).toEqual([
      'alpha/aardvark',
      'black-forest-labs/flux-schnell',
      'zeta/zed',
    ]);
    expect(catalog[1]).toEqual({
      owner: 'black-forest-labs',
      name: 'flux-schnell',
      description: 'Fast',
      url: 'https://x/1',
      latest_version_id: 'v1',
      latest_version_created_at: '2026-01-01T00:00:00Z',
    });
    expect(catalog[2]).toEqual({
      owner: 'zeta',
      name: 'zed',
      description: 'Z model',
      url: 'https://x/2',
      latest_version_id: null,
      latest_version_created_at: null,
    });
    expect(result).toEqual(catalog);
  });

  it('keeps the later page as the winner when owner/name repeats across pages (deterministic last-wins merge)', async () => {
    tempRoot = makeTempRoot();
    writePage(tempRoot, 0, [{ owner: 'a', name: 'model', description: 'old', url: 'https://x/old' }]);
    writePage(tempRoot, 1, [{ owner: 'a', name: 'model', description: 'new', url: 'https://x/new' }]);
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');

    const result = await generateReplicateCatalog({ pagesDir, catalogOutputPath });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('new');
  });

  it('skips entries missing a string owner/name instead of throwing', async () => {
    tempRoot = makeTempRoot();
    writePage(tempRoot, 0, [
      { owner: 'valid', name: 'ok' },
      { owner: null, name: 'broken' },
      { name: 'no-owner' },
    ]);
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');

    const result = await generateReplicateCatalog({ pagesDir, catalogOutputPath });
    expect(result).toHaveLength(1);
    expect(result[0].owner).toBe('valid');
  });

  it('throws a clear error when no page snapshots exist, without touching an existing output', async () => {
    tempRoot = makeTempRoot();
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');
    mkdirSync(resolve(tempRoot, 'src'), { recursive: true });
    writeFileSync(catalogOutputPath, '"sentinel"', 'utf8');

    await expect(generateReplicateCatalog({ pagesDir, catalogOutputPath })).rejects.toThrow(/replicate/i);
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe('"sentinel"');
  });

  it('throws a clear error on malformed page JSON, without touching an existing output', async () => {
    tempRoot = makeTempRoot();
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(resolve(pagesDir, 'page-0000.json'), 'not json', 'utf8');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');
    mkdirSync(resolve(tempRoot, 'src'), { recursive: true });
    writeFileSync(catalogOutputPath, '"sentinel"', 'utf8');

    await expect(generateReplicateCatalog({ pagesDir, catalogOutputPath })).rejects.toThrow(/page-0000\.json/);
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe('"sentinel"');
  });

  it('throws when a page is missing its results array', async () => {
    tempRoot = makeTempRoot();
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(resolve(pagesDir, 'page-0000.json'), JSON.stringify({ next: null }), 'utf8');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');

    await expect(generateReplicateCatalog({ pagesDir, catalogOutputPath })).rejects.toThrow(/results/i);
  });

  it('is deterministic across repeated runs (byte-identical output)', async () => {
    tempRoot = makeTempRoot();
    writePage(tempRoot, 0, [{ owner: 'a', name: 'one' }, { owner: 'b', name: 'two' }]);
    writePage(tempRoot, 1, [{ owner: 'c', name: 'three' }]);
    const pagesDir = resolve(tempRoot, 'catalog-data/replicate');
    const catalogOutputPath = resolve(tempRoot, 'src/model-catalog.json');

    await generateReplicateCatalog({ pagesDir, catalogOutputPath });
    const first = readFileSync(catalogOutputPath, 'utf8');
    await generateReplicateCatalog({ pagesDir, catalogOutputPath });
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe(first);
  });
});
