import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText, mapWithConcurrency, writeJsonAtomically } from './lib/catalog-utils.mjs';

console.warn(
  'sync-kie-apiframe-describe-data.mjs is deprecated; run `pnpm pptask:sync-provider-data` instead, '
    + 'which syncs Kie/Apiframe raw data atomically (per-provider staging + replace, partial-success '
    + 'across all four providers, and manifest.json snapshots).',
);

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, '../../../../..');
const rawOutputRoot = resolve(repoRoot, 'libs/domain/pptask/describe-data');
const kieRawOutput = resolve(rawOutputRoot, 'kie');
const apiframeRawOutput = resolve(rawOutputRoot, 'apiframe');
const apiframeOpenApiOutput = resolve(apiframeRawOutput, 'openapi-v2.json');
const apiframeModelsSummaryOutput = resolve(apiframeRawOutput, 'models-summary.json');

const kieIndexUrl = 'https://docs.kie.ai/llms.txt';
const apiframeOpenApiUrls = [
  'https://api.apiframe.ai/v2/openapi.json',
  'https://raw.githubusercontent.com/apiframe-ai/apiframe-nodejs-sdk/main/openapi.json',
];
const apiframeModelsSummaryUrls = [
  'https://api.apiframe.ai/v2/models',
  'https://raw.githubusercontent.com/apiframe-ai/apiframe-nodejs-sdk/main/models.json',
];

const kieIndex = await fetchText(kieIndexUrl);
await writeRawDocument(kieRawOutput, kieIndexUrl, kieIndex);
const kieUrls = extractKieApiDocUrls(kieIndex);
const kiePages = await mapWithConcurrency(kieUrls, 8, async url => ({
  url,
  body: await fetchText(url),
}));
await mapWithConcurrency(kiePages, 8, async ({ url, body }) => {
  await writeRawDocument(kieRawOutput, url, body);
});
console.log(`Saved ${kiePages.length + 1} Kie raw documents to ${kieRawOutput}`);

await syncApiframeOpenApi();
await syncApiframeModelsSummary();

function extractKieApiDocUrls(index) {
  const apiDocs = index.slice(index.indexOf('## API Docs'));
  return [...new Set([...apiDocs.matchAll(/\]\((https:\/\/docs\.kie\.ai\/market\/[^)]+\.md)\)/g)]
    .map(match => match[1])
    .filter(url => !url.includes('/cn/')))];
}

async function syncApiframeOpenApi() {
  const body = await fetchFirstAvailable(apiframeOpenApiUrls, {
    accept: 'application/json',
  });
  if (!body) {
    console.warn('Apiframe OpenAPI sync failed; keeping existing openapi-v2.json snapshot');
    return;
  }
  const parsed = JSON.parse(body);
  await writeJsonAtomically(apiframeOpenApiOutput, parsed);
  console.log(`Wrote Apiframe OpenAPI v2 snapshot to ${apiframeOpenApiOutput}`);
}

async function syncApiframeModelsSummary() {
  const body = await fetchFirstAvailable(apiframeModelsSummaryUrls, {
    accept: 'application/json',
  });
  if (!body) {
    console.warn('Apiframe /v2/models sync failed; keeping existing models-summary.json snapshot');
    return;
  }
  try {
    const parsed = JSON.parse(body);
    await writeJsonAtomically(apiframeModelsSummaryOutput, parsed);
    console.log(`Wrote Apiframe models summary to ${apiframeModelsSummaryOutput}`);
  } catch (error) {
    console.warn(`Apiframe models summary was not valid JSON: ${error.message}`);
  }
}

async function fetchFirstAvailable(urls, options) {
  for (const url of urls) {
    try {
      return await fetchText(url, options);
    } catch (error) {
      console.warn(`Skipped ${url}: ${error.message}`);
    }
  }
  return null;
}

async function writeRawDocument(root, url, body) {
  const parsed = new URL(url);
  const relativePath = parsed.pathname.replace(/^\/+/, '') || 'index.md';
  const outputPath = resolve(root, relativePath);
  if (!outputPath.startsWith(`${root}/`)) {
    throw new Error(`Refusing to write document outside catalog directory: ${url}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body, 'utf8');
}
