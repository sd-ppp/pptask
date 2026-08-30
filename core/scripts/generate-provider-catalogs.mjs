import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROVIDERS,
  runGenerateProviderCatalogsCli,
} from './lib/generate-provider-catalogs.mjs';
import { defaultWhitelistPath, loadProviderModelWhitelist } from './lib/generate-kie-apiframe-catalogs.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, '../../../../..');
const pptaskRoot = resolve(repoRoot, 'libs/domain/pptask');
const catalogDataRoot = resolve(pptaskRoot, 'catalog-data');
const describeDataRoot = resolve(pptaskRoot, 'describe-data');
const providerRoot = resolve(pptaskRoot, 'core/src/providers');

// Unified, offline-only entry point for all four PPTask provider catalogs.
// Reads only local `catalog-data`/`describe-data` snapshots (see
// `../../catalog-data/README.md` and `../../describe-data/README.md`) -
// never the network. Run `pnpm run pptask:sync-provider-data` first to
// refresh those snapshots.
//
// Usage: node generate-provider-catalogs.mjs [--only=runninghub,replicate]
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const providers = onlyArg
  ? onlyArg.slice('--only='.length).split(',').map(value => value.trim()).filter(Boolean)
  : DEFAULT_PROVIDERS;

process.exitCode = await runGenerateProviderCatalogsCli({
  providers,
  runninghub: {
    snapshotPath: resolve(catalogDataRoot, 'runninghub/models_registry.json'),
    registryOutputPath: resolve(providerRoot, 'runninghub/api/model-registry.json'),
    catalogOutputPath: resolve(providerRoot, 'runninghub/api/model-catalog.json'),
  },
  replicate: {
    pagesDir: resolve(catalogDataRoot, 'replicate'),
    catalogOutputPath: resolve(providerRoot, 'replicate/model-catalog.json'),
  },
  kieApiframe: {
    kieDescribeRoot: resolve(describeDataRoot, 'kie'),
    apiframeOpenApiPath: resolve(describeDataRoot, 'apiframe/openapi-v2.json'),
    apiframeModelsSummaryPath: resolve(describeDataRoot, 'apiframe/models-summary.json'),
    whitelist: loadProviderModelWhitelist(defaultWhitelistPath),
    kieCatalogOutputPath: resolve(providerRoot, 'kie/model-catalog.json'),
    apiframeCatalogOutputPath: resolve(providerRoot, 'apiframe/model-catalog.json'),
    kieDescribeOutputDir: resolve(providerRoot, 'kie/describe'),
    apiframeDescribeOutputDir: resolve(providerRoot, 'apiframe/describe'),
  },
});
