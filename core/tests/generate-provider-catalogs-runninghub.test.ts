import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateRunningHubCatalog } from '../scripts/lib/generate-runninghub-catalog.mjs';

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-generate-rh-'));
}

describe('generateRunningHubCatalog', () => {
  let tempRoot: string;

  afterEach(() => {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  });

  function paths(root: string) {
    return {
      snapshotPath: resolve(root, 'catalog-data/runninghub/models_registry.json'),
      registryOutputPath: resolve(root, 'src/model-registry.json'),
      catalogOutputPath: resolve(root, 'src/model-catalog.json'),
    };
  }

  function writeSnapshot(root: string, entries: unknown) {
    const snapshotPath = resolve(root, 'catalog-data/runninghub/models_registry.json');
    mkdirSync(resolve(root, 'catalog-data/runninghub'), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify(entries, null, 2), 'utf8');
  }

  const sampleEntries = [
    {
      class_name: 'ExampleB',
      internal_name: 'RH_ExampleB',
      display_name: 'RH Example B',
      name_cn: 'B',
      name_en: 'example-b',
      endpoint: 'zzz/example-b',
      output_type: 'video',
      category: 'RunningHub/Example',
      params: [{ fieldKey: 'prompt', type: 'STRING', required: true, label: 'prompt' }],
    },
    {
      class_name: 'ExampleA',
      internal_name: 'RH_ExampleA',
      display_name: 'RH Example A',
      name_cn: 'A',
      name_en: 'example-a',
      endpoint: 'aaa/example-a',
      output_type: 'image',
      category: 'RunningHub/Example',
      params: [{ fieldKey: 'prompt', type: 'STRING', required: true, label: 'prompt' }],
    },
  ];

  it('writes a full registry (with params) and a lightweight, sorted, deduped catalog', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, sampleEntries);
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);

    const result = await generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath });

    expect(existsSync(registryOutputPath)).toBe(true);
    expect(existsSync(catalogOutputPath)).toBe(true);

    const registry = JSON.parse(readFileSync(registryOutputPath, 'utf8'));
    expect(registry).toHaveLength(2);
    expect(registry.map((entry: any) => entry.endpoint)).toEqual(['aaa/example-a', 'zzz/example-b']);
    expect(registry[0].params).toEqual(sampleEntries[1].params);

    const catalog = JSON.parse(readFileSync(catalogOutputPath, 'utf8'));
    expect(catalog).toEqual([
      {
        providerId: 'runninghub',
        locator: 'runninghub://api/aaa/example-a',
        label: 'RH Example A',
        category: 'RunningHub/Example',
        outputType: 'image',
        searchText: 'rh example a a example-a runninghub/example image aaa/example-a',
      },
      {
        providerId: 'runninghub',
        locator: 'runninghub://api/zzz/example-b',
        label: 'RH Example B',
        category: 'RunningHub/Example',
        outputType: 'video',
        searchText: 'rh example b b example-b runninghub/example video zzz/example-b',
      },
    ]);
    expect(result.registry).toHaveLength(2);
    expect(result.catalog).toHaveLength(2);
  });

  it('falls back through name_cn/name_en/endpoint when display_name is missing', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, [
      { endpoint: 'a/b', output_type: 'image', category: 'Cat', name_cn: '中文名', params: [] },
      { endpoint: 'c/d', output_type: 'image', category: 'Cat', name_en: 'english-name', params: [] },
      { endpoint: 'e/f', output_type: 'image', category: 'Cat', params: [] },
    ]);
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);

    await generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath });
    const catalog = JSON.parse(readFileSync(catalogOutputPath, 'utf8'));
    const byLocator = new Map(catalog.map((entry: any) => [entry.locator, entry]));
    expect(byLocator.get('runninghub://api/a/b').label).toBe('中文名');
    expect(byLocator.get('runninghub://api/c/d').label).toBe('english-name');
    expect(byLocator.get('runninghub://api/e/f').label).toBe('e/f');
  });

  it('throws a clear error when the catalog-data snapshot is missing, without touching existing outputs', async () => {
    tempRoot = makeTempRoot();
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);
    mkdirSync(resolve(tempRoot, 'src'), { recursive: true });
    writeFileSync(registryOutputPath, '"sentinel-registry"', 'utf8');
    writeFileSync(catalogOutputPath, '"sentinel-catalog"', 'utf8');

    await expect(generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }))
      .rejects.toThrow(/models_registry\.json/);

    expect(readFileSync(registryOutputPath, 'utf8')).toBe('"sentinel-registry"');
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe('"sentinel-catalog"');
  });

  it('throws a clear error on malformed snapshot JSON, without touching existing outputs', async () => {
    tempRoot = makeTempRoot();
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);
    mkdirSync(resolve(tempRoot, 'catalog-data/runninghub'), { recursive: true });
    mkdirSync(resolve(tempRoot, 'src'), { recursive: true });
    writeFileSync(snapshotPath, 'not json', 'utf8');
    writeFileSync(registryOutputPath, '"sentinel-registry"', 'utf8');

    await expect(generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }))
      .rejects.toThrow(/JSON/i);
    expect(readFileSync(registryOutputPath, 'utf8')).toBe('"sentinel-registry"');
  });

  it('throws when the snapshot is not an array', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, { models: [] });
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);

    await expect(generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }))
      .rejects.toThrow(/array/i);
  });

  it('throws on a missing non-empty endpoint', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, [{ output_type: 'image', category: 'Cat', params: [] }]);
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);

    await expect(generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }))
      .rejects.toThrow(/endpoint/i);
  });

  it('throws on duplicate endpoints instead of silently deduping, without touching existing outputs', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, [
      { endpoint: 'dup/one', output_type: 'image', category: 'Cat', params: [] },
      { endpoint: 'dup/one', output_type: 'video', category: 'Cat', params: [] },
    ]);
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);
    mkdirSync(resolve(tempRoot, 'src'), { recursive: true });
    writeFileSync(catalogOutputPath, '"sentinel-catalog"', 'utf8');

    await expect(generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }))
      .rejects.toThrow(/duplicate/i);
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe('"sentinel-catalog"');
  });

  it('is deterministic across repeated runs (byte-identical output)', async () => {
    tempRoot = makeTempRoot();
    writeSnapshot(tempRoot, sampleEntries);
    const { snapshotPath, registryOutputPath, catalogOutputPath } = paths(tempRoot);

    await generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath });
    const firstRegistry = readFileSync(registryOutputPath, 'utf8');
    const firstCatalog = readFileSync(catalogOutputPath, 'utf8');

    await generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath });
    expect(readFileSync(registryOutputPath, 'utf8')).toBe(firstRegistry);
    expect(readFileSync(catalogOutputPath, 'utf8')).toBe(firstCatalog);
  });
});
