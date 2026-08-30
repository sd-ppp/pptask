import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

console.warn(
  'fetch-replicate-model-catalog.mjs is deprecated; run `pnpm pptask:sync-provider-data` instead, '
    + 'which syncs the raw Replicate list snapshot into catalog-data/replicate/ alongside the other providers.',
);

const packageEnvPath = resolve('libs/domain/pptask/.env');
if (existsSync(packageEnvPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(packageEnvPath);
}

const token = process.env.REPLICATE_API_KEY;
if (!token) {
  throw new Error('REPLICATE_API_KEY is required in libs/domain/pptask/.env');
}

const outputPath = resolve(
  process.env.REPLICATE_MODELS_CATALOG_PATH
    ?? 'libs/domain/pptask/core/src/providers/replicate/model-catalog.json',
);

const models = [];
const seenPages = new Set();
let nextUrl = 'https://api.replicate.com/v1/models';
let pageNumber = 0;

while (nextUrl) {
  if (seenPages.has(nextUrl)) {
    throw new Error(`Replicate pagination repeated URL: ${nextUrl}`);
  }
  seenPages.add(nextUrl);

  const page = await fetchReplicatePage(nextUrl, token);
  pageNumber += 1;
  if (!Array.isArray(page.results)) {
    throw new Error('Replicate model listing returned no results array');
  }
  console.log(`Fetched Replicate model page ${pageNumber}: ${page.results.length} models`);

  for (const model of page.results) {
    if (typeof model?.owner !== 'string' || typeof model?.name !== 'string') continue;
    models.push({
      owner: model.owner,
      name: model.name,
      description: typeof model.description === 'string' ? model.description : null,
      url: typeof model.url === 'string' ? model.url : null,
      latest_version_id: typeof model.latest_version?.id === 'string' ? model.latest_version.id : null,
      latest_version_created_at: typeof model.latest_version?.created_at === 'string'
        ? model.latest_version.created_at
        : null,
    });
  }

  nextUrl = typeof page.next === 'string' && page.next ? page.next : '';
}

models.sort((left, right) => `${left.owner}/${left.name}`.localeCompare(`${right.owner}/${right.name}`));
await mkdir(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(models, null, 2)}\n`, 'utf8');
await rename(temporaryPath, outputPath);

console.log(`Wrote ${models.length} Replicate models to ${outputPath}`);

async function fetchReplicatePage(url, apiKey) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    let body;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      body = await response.text();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Replicate model listing request failed after ${maxAttempts} attempts: ${error.message}`);
      }
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1000));
      continue;
    }

    if (response.ok) return JSON.parse(body);
    if (response.status < 500 && response.status !== 429) {
      throw new Error(`Replicate model listing failed (${response.status}): ${body}`);
    }
    if (attempt === maxAttempts) {
      throw new Error(`Replicate model listing failed after ${maxAttempts} attempts (${response.status}): ${body}`);
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1000));
  }
}
