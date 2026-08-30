import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listPPTaskLocatorOptions,
  listPPTaskLocatorProviders,
} from '../src/locator-catalog.ts';
import kieCatalog from '../src/providers/kie/model-catalog.json';
import apiframeCatalog from '../src/providers/apiframe/model-catalog.json';

const coreSrcRoot = resolve(import.meta.dirname, '../src');

describe('Kie/Apiframe locator catalog', () => {
  it('registers Kie and Apiframe providers', () => {
    expect(listPPTaskLocatorProviders()).toEqual([
      { id: 'runninghub', label: 'RunningHub' },
      { id: 'replicate', label: 'Replicate' },
      { id: 'kie', label: 'Kie' },
      { id: 'apiframe', label: 'Apiframe' },
    ]);
  });

  it('lists only supported Kie models without duplicates', () => {
    const options = listPPTaskLocatorOptions('kie');
    const supported = kieCatalog.filter(entry => entry.supported === true);
    expect(options).toHaveLength(12);
    expect(supported).toHaveLength(12);
    expect(new Set(options.map(option => option.locator)).size).toBe(12);
    expect(options.every(option => option.providerId === 'kie')).toBe(true);
    for (const entry of supported) {
      expect(options).toContainEqual(expect.objectContaining({
        locator: entry.locator,
        label: entry.label,
      }));
    }
    expect(options.some(option => option.locator === 'kie://market/bytedance/seedream')).toBe(false);
  });

  it('lists only supported Apiframe models without duplicates', () => {
    const options = listPPTaskLocatorOptions('apiframe');
    const supported = apiframeCatalog.filter(entry => entry.supported === true);
    expect(options).toHaveLength(10);
    expect(supported).toHaveLength(10);
    expect(new Set(options.map(option => option.locator)).size).toBe(10);
    expect(options.every(option => option.providerId === 'apiframe')).toBe(true);
    for (const entry of supported) {
      expect(options).toContainEqual(expect.objectContaining({
        locator: entry.locator,
        label: entry.label,
      }));
    }
    expect(options.some(option => option.locator === 'apiframe://image/dall-e-3')).toBe(false);
  });

  it('keeps locator-catalog free of describe registry and scripts imports', () => {
    const locatorCatalogSource = readFileSync(resolve(coreSrcRoot, 'locator-catalog.ts'), 'utf8');
    const kieCatalogSource = readFileSync(resolve(coreSrcRoot, 'providers/kie/model-catalog.ts'), 'utf8');
    const apiframeCatalogSource = readFileSync(resolve(coreSrcRoot, 'providers/apiframe/model-catalog.ts'), 'utf8');

    for (const source of [locatorCatalogSource, kieCatalogSource, apiframeCatalogSource]) {
      expect(source).not.toMatch(/describe\/registry/);
      expect(source).not.toMatch(/describe-data/);
      expect(source).not.toMatch(/scripts\/provider-model-whitelist/);
    }

    expect(kieCatalogSource).toMatch(/\.\/model-catalog\.json/);
    expect(apiframeCatalogSource).toMatch(/\.\/model-catalog\.json/);
  });

  it('restores static (non-dynamic) imports of the Kie and Apiframe describe registries in runtime files', () => {
    const kieDescribeSource = readFileSync(resolve(coreSrcRoot, 'providers/kie/describe.ts'), 'utf8');
    const kieHelpersSource = readFileSync(resolve(coreSrcRoot, 'providers/kie/helpers.ts'), 'utf8');
    const apiframeDescribeSource = readFileSync(resolve(coreSrcRoot, 'providers/apiframe/describe.ts'), 'utf8');
    const apiframeHelpersSource = readFileSync(resolve(coreSrcRoot, 'providers/apiframe/helpers.ts'), 'utf8');

    for (const source of [kieDescribeSource, kieHelpersSource, apiframeDescribeSource, apiframeHelpersSource]) {
      // No dynamic `import('./describe/registry.ts')` (previously used for first-paint code-splitting).
      expect(source).not.toMatch(/import\(['"]\.\/describe\/registry\.ts['"]\)/);
      // A regular static top-level import of the registry module instead.
      expect(source).toMatch(/^import(?! type\b).*from ['"]\.\/describe\/registry\.ts['"]/m);
    }
  });
});
