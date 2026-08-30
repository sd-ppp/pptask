import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PROVIDERS,
  generateProviderCatalogs,
  formatGenerateCatalogsSummary,
} from '../scripts/lib/generate-provider-catalogs.mjs';
import { loadProviderModelWhitelist } from '../scripts/lib/generate-kie-apiframe-catalogs.mjs';

const repoRoot = resolve(import.meta.dirname, '../../../../..');
const describeDataRoot = resolve(repoRoot, 'libs/domain/pptask/describe-data');
const kieDescribeRoot = resolve(describeDataRoot, 'kie');
const apiframeOpenApiPath = resolve(describeDataRoot, 'apiframe/openapi-v2.json');
const whitelistPath = resolve(repoRoot, 'libs/domain/pptask/core/scripts/provider-model-whitelist.json');

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-generate-provider-catalogs-'));
}

function writeRunningHubSnapshot(root: string) {
  const snapshotPath = resolve(root, 'catalog-data/runninghub/models_registry.json');
  mkdirSync(resolve(root, 'catalog-data/runninghub'), { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify([
    { endpoint: 'a/one', output_type: 'image', category: 'Cat', display_name: 'One', params: [] },
  ]), 'utf8');
  return snapshotPath;
}

function writeReplicatePages(root: string) {
  const pagesDir = resolve(root, 'catalog-data/replicate');
  mkdirSync(pagesDir, { recursive: true });
  writeFileSync(resolve(pagesDir, 'page-0000.json'), JSON.stringify({
    results: [{ owner: 'owner', name: 'model', description: 'desc' }],
    next: null,
  }), 'utf8');
  return pagesDir;
}

function buildOptions(root: string, overrides: Record<string, unknown> = {}) {
  return {
    runninghub: {
      snapshotPath: writeRunningHubSnapshot(root),
      registryOutputPath: resolve(root, 'out/runninghub/model-registry.json'),
      catalogOutputPath: resolve(root, 'out/runninghub/model-catalog.json'),
    },
    replicate: {
      pagesDir: writeReplicatePages(root),
      catalogOutputPath: resolve(root, 'out/replicate/model-catalog.json'),
    },
    kieApiframe: {
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(root, 'out/kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(root, 'out/apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(root, 'out/kie/describe'),
      apiframeDescribeOutputDir: resolve(root, 'out/apiframe/describe'),
    },
    ...overrides,
  };
}

describe('generateProviderCatalogs (unified offline entry point)', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = makeTempRoot();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  });

  it('generates all four providers offline and reports success for each', async () => {
    const options = buildOptions(tempRoot);
    const summary = await generateProviderCatalogs(options);

    expect(summary.success).toBe(true);
    expect(summary.results.map(r => r.provider).sort()).toEqual([...DEFAULT_PROVIDERS].sort());
    expect(summary.results.every(r => r.status === 'success')).toBe(true);

    expect(existsSync(resolve(tempRoot, 'out/runninghub/model-registry.json'))).toBe(true);
    expect(existsSync(resolve(tempRoot, 'out/runninghub/model-catalog.json'))).toBe(true);
    expect(existsSync(resolve(tempRoot, 'out/replicate/model-catalog.json'))).toBe(true);
    expect(existsSync(resolve(tempRoot, 'out/kie/model-catalog.json'))).toBe(true);
    expect(existsSync(resolve(tempRoot, 'out/apiframe/model-catalog.json'))).toBe(true);

    const formatted = formatGenerateCatalogsSummary(summary);
    expect(formatted).toMatch(/runninghub.*OK/i);
    expect(formatted).toMatch(/replicate.*OK/i);
    expect(formatted).toMatch(/kie.*OK/i);
    expect(formatted).toMatch(/apiframe.*OK/i);
  });

  it('never calls the network - generation succeeds even when global fetch is stubbed to throw', async () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('network disabled in tests');
    }));

    const options = buildOptions(tempRoot);
    const summary = await generateProviderCatalogs(options);

    expect(summary.success).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('isolates a failing provider: other providers still succeed and the failing provider does not overwrite its previous output', async () => {
    const options = buildOptions(tempRoot);
    // Break only RunningHub by pointing at a snapshot that does not exist.
    (options.runninghub as any).snapshotPath = resolve(tempRoot, 'catalog-data/runninghub/does-not-exist.json');
    mkdirSync(resolve(tempRoot, 'out/runninghub'), { recursive: true });
    writeFileSync(resolve(tempRoot, 'out/runninghub/model-registry.json'), '"sentinel-registry"', 'utf8');
    writeFileSync(resolve(tempRoot, 'out/runninghub/model-catalog.json'), '"sentinel-catalog"', 'utf8');

    const summary = await generateProviderCatalogs(options);

    expect(summary.success).toBe(false);
    const byProvider = new Map(summary.results.map(r => [r.provider, r]));
    expect(byProvider.get('runninghub')?.status).toBe('failed');
    expect(byProvider.get('replicate')?.status).toBe('success');
    expect(byProvider.get('kie')?.status).toBe('success');
    expect(byProvider.get('apiframe')?.status).toBe('success');

    expect(readFileSync(resolve(tempRoot, 'out/runninghub/model-registry.json'), 'utf8')).toBe('"sentinel-registry"');
    expect(readFileSync(resolve(tempRoot, 'out/runninghub/model-catalog.json'), 'utf8')).toBe('"sentinel-catalog"');
    expect(existsSync(resolve(tempRoot, 'out/replicate/model-catalog.json'))).toBe(true);
  });

  it('supports generating a subset of providers (e.g. kie+apiframe only)', async () => {
    const options = buildOptions(tempRoot, { providers: ['kie', 'apiframe'] });
    const summary = await generateProviderCatalogs(options);

    expect(summary.results.map(r => r.provider).sort()).toEqual(['apiframe', 'kie']);
    expect(existsSync(resolve(tempRoot, 'out/runninghub/model-registry.json'))).toBe(false);
    expect(existsSync(resolve(tempRoot, 'out/replicate/model-catalog.json'))).toBe(false);
  });

  it('is deterministic across repeated runs (byte-identical output for every provider) and never leaks a syncedAt timestamp into generated bundles', async () => {
    const options = buildOptions(tempRoot);
    await generateProviderCatalogs(options);

    const files = [
      'out/runninghub/model-registry.json',
      'out/runninghub/model-catalog.json',
      'out/replicate/model-catalog.json',
      'out/kie/model-catalog.json',
      'out/apiframe/model-catalog.json',
    ];
    const firstContents = files.map(file => readFileSync(resolve(tempRoot, file), 'utf8'));

    await generateProviderCatalogs(options);
    files.forEach((file, index) => {
      expect(readFileSync(resolve(tempRoot, file), 'utf8')).toBe(firstContents[index]);
    });
    firstContents.forEach(content => {
      expect(content).not.toContain('syncedAt');
    });
  });
});
