import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getRunningHubCatalogModel, listRunningHubLocatorOptions } from '../src/providers/runninghub/api/model-catalog.ts';
import catalog from '../src/providers/runninghub/api/model-catalog.json';
import registry from '../src/providers/runninghub/api/model-registry.json';

const coreSrcRoot = resolve(import.meta.dirname, '../src');

describe('RunningHub model catalog wiring', () => {
  it('wires listRunningHubLocatorOptions() directly to the generated lightweight model-catalog.json (no runtime recomputation)', () => {
    const options = listRunningHubLocatorOptions();
    expect(options).toEqual(catalog);
    expect(options.length).toBeGreaterThan(0);
  });

  it('has no duplicate locators/endpoints in the generated lightweight catalog', () => {
    const options = listRunningHubLocatorOptions();
    const locators = options.map(option => option.locator);
    expect(new Set(locators).size).toBe(locators.length);
  });

  it('every lightweight option has providerId/locator/label/searchText', () => {
    for (const option of listRunningHubLocatorOptions()) {
      expect(option.providerId).toBe('runninghub');
      expect(option.locator.startsWith('runninghub://api/')).toBe(true);
      expect(typeof option.label).toBe('string');
      expect(typeof option.searchText).toBe('string');
    }
  });

  it('getRunningHubCatalogModel still exposes full params for runtime describe/schema building', () => {
    expect(Array.isArray(registry)).toBe(true);
    expect((registry as Array<{ endpoint: string }>).length).toBeGreaterThan(0);
    const sample = (registry as Array<{ endpoint: string; params: unknown[] }>)[0]!;
    const model = getRunningHubCatalogModel(sample.endpoint);
    expect(model).toBeDefined();
    expect(Array.isArray((model as any).params)).toBe(true);
    expect((model as any).params).toEqual(sample.params);
  });

  it('keeps model-catalog.ts free of catalog-data/describe-data imports (browser boundary rule)', () => {
    const source = readFileSync(resolve(coreSrcRoot, 'providers/runninghub/api/model-catalog.ts'), 'utf8');
    expect(source).not.toMatch(/catalog-data/);
    expect(source).not.toMatch(/describe-data/);
    expect(source).toMatch(/\.\/model-catalog\.json/);
    expect(source).toMatch(/\.\/model-registry\.json/);
  });
});
