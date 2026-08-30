import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildApiframeCatalogEntries,
  buildKieCatalogEntries,
  generateKieApiframeCatalogs,
  loadProviderModelWhitelist,
  writeDescribeArtifacts,
} from '../scripts/lib/generate-kie-apiframe-catalogs.mjs';
import { validateApiframeModalityConfig } from '../scripts/lib/apiframe-openapi.mjs';

const repoRoot = resolve(import.meta.dirname, '../../../../..');
const describeDataRoot = resolve(repoRoot, 'libs/domain/pptask/describe-data');
const kieDescribeRoot = resolve(describeDataRoot, 'kie');
const apiframeOpenApiPath = resolve(describeDataRoot, 'apiframe/openapi-v2.json');
const whitelistPath = resolve(repoRoot, 'libs/domain/pptask/core/scripts/provider-model-whitelist.json');

const BAD_KIE_LOCATORS = ['kie://market/waiting', 'kie://market/low', 'kie://market/type: string'];
const testOutputRoots: string[] = [];

afterEach(() => {
  for (const outputRoot of testOutputRoots.splice(0)) {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

function createTestOutputRoot(name: string) {
  const outputRoot = resolve(import.meta.dirname, '../.test-output', name);
  testOutputRoots.push(outputRoot);
  rmSync(outputRoot, { recursive: true, force: true });
  return outputRoot;
}

describe('Kie catalog generation', () => {
  it('extracts model ids from createTask YAML enums only', async () => {
    const entries = await buildKieCatalogEntries(kieDescribeRoot);
    const locators = entries.map(entry => entry.locator);

    expect(locators).toContain('kie://market/seedream/5-pro-text-to-image');
    expect(locators).toContain('kie://market/flux-2/pro-text-to-image');
    expect(locators).toContain('kie://market/kling-3.0/video');
    for (const badLocator of BAD_KIE_LOCATORS) {
      expect(locators).not.toContain(badLocator);
    }
  });

  it('returns stable sorted unique locators', async () => {
    const first = await buildKieCatalogEntries(kieDescribeRoot);
    const second = await buildKieCatalogEntries(kieDescribeRoot);
    const locators = first.map(entry => entry.locator);

    expect(locators).toEqual([...locators].sort((left, right) => left.localeCompare(right)));
    expect(new Set(locators).size).toBe(locators.length);
    expect(first).toEqual(second);
  });
});

describe('Apiframe catalog generation', () => {
  it('reads models from v2 OpenAPI snapshot', () => {
    expect(existsSync(apiframeOpenApiPath)).toBe(true);
    const openapi = JSON.parse(readFileSync(apiframeOpenApiPath, 'utf8'));
    const entries = buildApiframeCatalogEntries(openapi);
    const locators = entries.map(entry => entry.locator);

    expect(locators).toContain('apiframe://image/seedream-5-pro');
    expect(locators).toContain('apiframe://video/kling-3.0');
    expect(locators).toContain('apiframe://music/suno');
    expect(locators.some(locator => locator.startsWith('apiframe://audio/'))).toBe(false);
  });

  it('validates hardcoded modality endpoints against OpenAPI', () => {
    const openapi = JSON.parse(readFileSync(apiframeOpenApiPath, 'utf8'));
    expect(() => validateApiframeModalityConfig(openapi)).not.toThrow();
  });

  it('throws when hardcoded endpoint schema does not match OpenAPI', () => {
    const openapi = JSON.parse(readFileSync(apiframeOpenApiPath, 'utf8'));
    const broken = structuredClone(openapi);
    broken.paths['/v2/images/generate'].post.requestBody.content['application/json'].schema.$ref =
      '#/components/schemas/GenerateVideoRequest';
    expect(() => validateApiframeModalityConfig(broken)).toThrow(/\/v2\/images\/generate/i);
  });

  it('returns stable sorted unique locators', () => {
    const openapi = JSON.parse(readFileSync(apiframeOpenApiPath, 'utf8'));
    const first = buildApiframeCatalogEntries(openapi);
    const second = buildApiframeCatalogEntries(openapi);
    const locators = first.map(entry => entry.locator);

    expect(locators).toEqual([...locators].sort((left, right) => left.localeCompare(right)));
    expect(new Set(locators).size).toBe(locators.length);
    expect(first).toEqual(second);
  });
});

describe('Kie duplicate locator handling', () => {
  it('throws when duplicate locators have conflicting schemas', async () => {
    const fixtureRoot = createTestOutputRoot('kie-duplicate-conflict');
    const duplicateRoot = resolve(fixtureRoot, 'kie');
    const firstDoc = resolve(duplicateRoot, 'market', 'demo', 'alpha.md');
    const secondDoc = resolve(duplicateRoot, 'market', 'demo', 'beta.md');
    mkdirSync(dirname(firstDoc), { recursive: true });

    const yamlBlock = (modelId: string, promptMaxLength: number) => `# Demo

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/jobs/createTask:
    post:
      summary: Demo
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - ${modelId}
                input:
                  type: object
                  properties:
                    prompt:
                      type: string
                      maxLength: ${promptMaxLength}
\`\`\`
`;

    writeFileSync(firstDoc, yamlBlock('demo/conflict-model', 100));
    writeFileSync(secondDoc, yamlBlock('demo/conflict-model', 200));

    await expect(buildKieCatalogEntries(duplicateRoot)).rejects.toThrow(
      /demo\/conflict-model[\s\S]*alpha\.md[\s\S]*beta\.md/i,
    );
  });

  it('emits deterministic diagnostics for known official duplicate conflicts', async () => {
    const { entries, diagnostics } = await buildKieCatalogEntries(kieDescribeRoot, {
      collectDiagnostics: true,
    });
    const conflictDiagnostics = diagnostics.filter(entry => entry.type === 'kie-locator-conflict');
    expect(conflictDiagnostics.map(entry => entry.locator).sort()).toEqual([
      'kie://market/kling/v2-1-master-image-to-video',
      'kie://market/qwen2/image-edit',
    ]);
    expect(entries.some(entry => entry.locator === 'kie://market/kling/v2-1-master-image-to-video')).toBe(true);
    expect(entries.some(entry => entry.locator === 'kie://market/qwen2/image-edit')).toBe(true);
  });
});

describe('provider model whitelist', () => {
  it('covers all whitelist entries with exact locators', async () => {
    const whitelist = loadProviderModelWhitelist(whitelistPath);
    const kieEntries = await buildKieCatalogEntries(kieDescribeRoot);
    const apiframeEntries = buildApiframeCatalogEntries(
      JSON.parse(readFileSync(apiframeOpenApiPath, 'utf8')),
    );
    const kieByLocator = new Map(kieEntries.map(entry => [entry.locator, entry]));
    const apiframeByLocator = new Map(apiframeEntries.map(entry => [entry.locator, entry]));

    expect(whitelist.kie).toHaveLength(12);
    expect(whitelist.apiframe).toHaveLength(10);

    for (const entry of whitelist.kie) {
      expect(kieByLocator.has(entry.locator), `missing Kie whitelist locator ${entry.locator}`).toBe(true);
    }
    for (const entry of whitelist.apiframe) {
      expect(
        apiframeByLocator.has(entry.locator),
        `missing Apiframe whitelist locator ${entry.locator}`,
      ).toBe(true);
    }
  });

  it('fails when a whitelist locator is missing from snapshots', async () => {
    const whitelist = loadProviderModelWhitelist(whitelistPath);
    await expect(generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist,
      kieCatalogOutputPath: resolve(repoRoot, 'libs/domain/pptask/core/src/providers/kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(repoRoot, 'libs/domain/pptask/core/src/providers/apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(repoRoot, 'libs/domain/pptask/core/src/providers/kie/describe'),
      apiframeDescribeOutputDir: resolve(repoRoot, 'libs/domain/pptask/core/src/providers/apiframe/describe'),
      mutateWhitelist: draft => {
        draft.kie.push({
          locator: 'kie://market/does-not-exist',
          label: 'Missing',
          modelId: 'missing/model',
        });
      },
    })).rejects.toThrow(/whitelist/i);
  });
});

describe('describe artifact cleanup', () => {
  it('removes orphan describe JSON files from the output directory', async () => {
    const outputRoot = createTestOutputRoot('describe-artifact-cleanup');
    const describeOutputDir = resolve(outputRoot, 'kie/describe');
    mkdirSync(describeOutputDir, { recursive: true });
    writeFileSync(resolve(describeOutputDir, 'orphan-model.json'), '{"locator":"kie://market/orphan"}');

    await writeDescribeArtifacts(describeOutputDir, [{
      locator: 'kie://market/seedream/5-pro-text-to-image',
      modelId: 'seedream/5-pro-text-to-image',
      label: 'Seedream 5 Pro T2I',
      outputType: 'image',
    }]);

    expect(existsSync(resolve(describeOutputDir, 'orphan-model.json'))).toBe(false);
    expect(existsSync(resolve(describeOutputDir, 'market__seedream__5-pro-text-to-image.json'))).toBe(true);
    expect(existsSync(resolve(describeOutputDir, 'registry.json'))).toBe(true);
  });
});

describe('offline generator outputs', () => {
  it('produces deterministic catalog and describe artifacts', async () => {
    const outputRoot = createTestOutputRoot('kie-apiframe-catalog');
    const result = await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    expect(result.kieCatalog.length).toBeGreaterThan(0);
    expect(result.apiframeCatalog.length).toBeGreaterThan(0);
    expect(result.kieDescribe).toHaveLength(12);
    expect(result.apiframeDescribe).toHaveLength(10);

    for (const describeEntry of [...result.kieDescribe, ...result.apiframeDescribe]) {
      expect(describeEntry.endpoint?.method).toBe('POST');
      expect(describeEntry.endpoint?.path).toMatch(/^\/(api\/v\d|v\d)\//);
      expect(describeEntry.requestSchema).toBeTruthy();
      expect(describeEntry.wireMetadata).toBeTruthy();
    }

    const second = await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    expect(second).toEqual(result);
  });

  it('marks only whitelist locators as supported in generated catalogs', async () => {
    const outputRoot = createTestOutputRoot('supported-catalog');
    const whitelist = loadProviderModelWhitelist(whitelistPath);
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist,
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const kieCatalog = JSON.parse(readFileSync(resolve(outputRoot, 'kie/model-catalog.json'), 'utf8'));
    const apiframeCatalog = JSON.parse(readFileSync(resolve(outputRoot, 'apiframe/model-catalog.json'), 'utf8'));
    const whitelistKieLocators = new Set(whitelist.kie.map(entry => entry.locator));
    const whitelistApiframeLocators = new Set(whitelist.apiframe.map(entry => entry.locator));

    expect(kieCatalog.filter(entry => entry.supported).map(entry => entry.locator).sort())
      .toEqual([...whitelistKieLocators].sort());
    expect(apiframeCatalog.filter(entry => entry.supported).map(entry => entry.locator).sort())
      .toEqual([...whitelistApiframeLocators].sort());
    expect(kieCatalog.filter(entry => !entry.supported).length).toBeGreaterThan(0);
    expect(apiframeCatalog.filter(entry => !entry.supported).length).toBeGreaterThan(0);
  });

  it('writes dereferenced compact describe schemas without $ref', async () => {
    const outputRoot = createTestOutputRoot('compact-describe');
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const kieDescribe = JSON.parse(
      readFileSync(resolve(outputRoot, 'kie/describe/market__seedream__5-pro-text-to-image.json'), 'utf8'),
    );
    expect(JSON.stringify(kieDescribe.requestSchema)).not.toContain('"$ref"');
    expect(kieDescribe.requestSchema.properties).not.toHaveProperty('nsfw_checker');
  });

  it('preserves the real Seedream 5 Pro prompt help text instead of blanking folded/literal YAML descriptions', async () => {
    const outputRoot = createTestOutputRoot('seedream-prompt-description');
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const kieDescribe = JSON.parse(
      readFileSync(resolve(outputRoot, 'kie/describe/market__seedream__5-pro-text-to-image.json'), 'utf8'),
    );
    // Source markdown uses `description: >-` (folded scalar) for prompt; this
    // must survive the YAML extraction/pre-processing pipeline intact.
    expect(kieDescribe.requestSchema.properties.prompt.description).toBe(
      'A text description of the image you want to generate (Max length: 3-5000 characters)',
    );
    // aspect_ratio also uses a folded scalar description in the source markdown.
    expect(kieDescribe.requestSchema.properties.aspect_ratio.description).toBe(
      'Width-height ratio of the image, determining its visual form.',
    );
  });

  it('still parses every Kie markdown document into a catalog entry (no doc silently dropped by preprocessing)', async () => {
    const before = await buildKieCatalogEntries(kieDescribeRoot);
    // Sanity: this is a regression guard, not a hardcoded count assertion on
    // upstream doc churn - it just ensures the YAML pre-processing pipeline
    // change doesn't start silently rejecting previously-parseable documents.
    expect(before.length).toBeGreaterThan(100);
  });
});

describe('describe registry.ts generation (no hand-written import drift)', () => {
  function importFileNamesFromRegistryTs(registryTsSource: string): string[] {
    return [...registryTsSource.matchAll(/from '\.\/(.+\.json)';/g)].map(match => match[1]!).sort();
  }

  it('generates kie registry.ts whose imports exactly match registry.json / whitelist locators', async () => {
    const outputRoot = createTestOutputRoot('kie-registry-generation');
    const whitelist = loadProviderModelWhitelist(whitelistPath);
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist,
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const registryTsPath = resolve(outputRoot, 'kie/describe/registry.ts');
    expect(existsSync(registryTsPath)).toBe(true);
    const registryJson = JSON.parse(readFileSync(resolve(outputRoot, 'kie/describe/registry.json'), 'utf8'));
    const registryTsSource = readFileSync(registryTsPath, 'utf8');

    expect(importFileNamesFromRegistryTs(registryTsSource)).toEqual(
      [...registryJson.map((entry: { file: string }) => entry.file)].sort(),
    );

    const registryModule = await import(pathToFileURL(registryTsPath).href);
    expect(registryModule.listKieDescribeLocators()).toEqual(
      [...whitelist.kie.map((entry: { locator: string }) => entry.locator)].sort((a, b) => a.localeCompare(b)),
    );
    for (const entry of whitelist.kie) {
      expect(registryModule.getKieDescribeEntry(entry.locator)?.locator).toBe(entry.locator);
    }
  });

  it('generates apiframe registry.ts whose imports exactly match registry.json / whitelist locators', async () => {
    const outputRoot = createTestOutputRoot('apiframe-registry-generation');
    const whitelist = loadProviderModelWhitelist(whitelistPath);
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist,
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const registryTsPath = resolve(outputRoot, 'apiframe/describe/registry.ts');
    expect(existsSync(registryTsPath)).toBe(true);
    const registryJson = JSON.parse(readFileSync(resolve(outputRoot, 'apiframe/describe/registry.json'), 'utf8'));
    const registryTsSource = readFileSync(registryTsPath, 'utf8');

    expect(importFileNamesFromRegistryTs(registryTsSource)).toEqual(
      [...registryJson.map((entry: { file: string }) => entry.file)].sort(),
    );

    const registryModule = await import(pathToFileURL(registryTsPath).href);
    expect(registryModule.listApiframeDescribeLocators()).toEqual(
      [...whitelist.apiframe.map((entry: { locator: string }) => entry.locator)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('adding a whitelist entry produces a matching import in the regenerated registry.ts (simulated addition)', async () => {
    const outputRoot = createTestOutputRoot('kie-registry-whitelist-addition');
    const newLocator = 'kie://market/bytedance/seedance-1.5-pro';
    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: resolve(outputRoot, 'kie/describe'),
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
      mutateWhitelist: draft => {
        draft.kie.push({
          locator: newLocator,
          label: 'Bytedance Seedance 1.5 Pro (simulated)',
          modelId: 'bytedance/seedance-1.5-pro',
        });
      },
    });

    const registryTsSource = readFileSync(resolve(outputRoot, 'kie/describe/registry.ts'), 'utf8');
    expect(registryTsSource).toContain("from './market__bytedance__seedance-1.5-pro.json';");

    const registryModule = await import(pathToFileURL(resolve(outputRoot, 'kie/describe/registry.ts')).href);
    expect(registryModule.listKieDescribeLocators()).toContain(newLocator);
    expect(registryModule.getKieDescribeEntry(newLocator)?.locator).toBe(newLocator);
  });

  it('overwrites a stale hand-edited registry.ts on regeneration instead of preserving drift', async () => {
    const outputRoot = createTestOutputRoot('kie-registry-overwrite');
    const describeOutputDir = resolve(outputRoot, 'kie/describe');
    mkdirSync(describeOutputDir, { recursive: true });
    const staleRegistryTsPath = resolve(describeOutputDir, 'registry.ts');
    writeFileSync(
      staleRegistryTsPath,
      "import staleEntry from './this-file-does-not-exist-anymore.json';\nexport const DESCRIBE_ENTRIES = [staleEntry];\n",
    );

    await generateKieApiframeCatalogs({
      kieDescribeRoot,
      apiframeOpenApiPath,
      whitelist: loadProviderModelWhitelist(whitelistPath),
      kieCatalogOutputPath: resolve(outputRoot, 'kie/model-catalog.json'),
      apiframeCatalogOutputPath: resolve(outputRoot, 'apiframe/model-catalog.json'),
      kieDescribeOutputDir: describeOutputDir,
      apiframeDescribeOutputDir: resolve(outputRoot, 'apiframe/describe'),
    });

    const regenerated = readFileSync(staleRegistryTsPath, 'utf8');
    expect(regenerated).not.toContain('this-file-does-not-exist-anymore.json');
    expect(regenerated).toContain("from './market__seedream__5-pro-text-to-image.json';");
  });
});
