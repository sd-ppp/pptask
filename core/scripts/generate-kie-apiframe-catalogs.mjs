import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProviderCatalogs, formatGenerateCatalogsSummary } from './lib/generate-provider-catalogs.mjs';
import { defaultWhitelistPath, loadProviderModelWhitelist } from './lib/generate-kie-apiframe-catalogs.mjs';

console.warn(
  '[generate-kie-apiframe-catalogs] this entrypoint is deprecated; prefer `pnpm run pptask:generate-provider-catalogs` '
    + '(which generates RunningHub/Replicate/Kie/Apiframe together). Delegating to it for Kie+Apiframe only.',
);

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, '../../../../..');
const describeDataRoot = resolve(repoRoot, 'libs/domain/pptask/describe-data');
const providerRoot = resolve(repoRoot, 'libs/domain/pptask/core/src/providers');

const summary = await generateProviderCatalogs({
  providers: ['kie', 'apiframe'],
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

console.log(formatGenerateCatalogsSummary(summary));
process.exitCode = summary.success ? 0 : 1;
