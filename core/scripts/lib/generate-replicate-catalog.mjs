import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeJsonAtomically } from './catalog-utils.mjs';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const PAGE_FILE_PATTERN = /^page-\d+\.json$/;

async function listPageFiles(pagesDir) {
  let entries;
  try {
    entries = await readdir(pagesDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Replicate catalog-data page snapshots not found at ${pagesDir}. Run \`pnpm run pptask:sync-provider-data\` `
        + `first (offline generation only reads local snapshots, never the network): ${errorMessage(error)}`,
    );
  }
  const files = entries
    .filter(entry => entry.isFile() && PAGE_FILE_PATTERN.test(entry.name))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (files.length === 0) {
    throw new Error(`No Replicate page-*.json snapshots found in ${pagesDir}`);
  }
  return files;
}

function toLightweightModel(model) {
  return {
    owner: model.owner,
    name: model.name,
    description: typeof model.description === 'string' ? model.description : null,
    url: typeof model.url === 'string' ? model.url : null,
    latest_version_id: typeof model.latest_version?.id === 'string' ? model.latest_version.id : null,
    latest_version_created_at: typeof model.latest_version?.created_at === 'string'
      ? model.latest_version.created_at
      : null,
  };
}

/**
 * Offline Replicate catalog generation: reads every paginated raw list
 * snapshot from `catalog-data/replicate/page-*.json`, flattens and merges
 * them into a single deduped (by `owner/name`, later page wins) lightweight
 * model list, and writes the existing `model-catalog.json` runtime artifact
 * shape. Does not fetch or generate `describe` schemas for Replicate.
 *
 * Reads no network. Validates every page before writing anything, so a
 * failure (missing snapshot directory, no page files, malformed JSON,
 * missing `results` array) never touches the previous `catalogOutputPath`
 * artifact.
 */
export async function generateReplicateCatalog({ pagesDir, catalogOutputPath }) {
  const pageFiles = await listPageFiles(pagesDir);

  const byKey = new Map();
  for (const fileName of pageFiles) {
    const filePath = resolve(pagesDir, fileName);
    let body;
    try {
      body = await readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read Replicate page snapshot ${filePath}: ${errorMessage(error)}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      throw new Error(`Replicate page snapshot ${filePath} is not valid JSON: ${errorMessage(error)}`);
    }
    if (!Array.isArray(parsed.results)) {
      throw new Error(`Replicate page snapshot ${filePath} is missing a "results" array`);
    }
    for (const model of parsed.results) {
      if (typeof model?.owner !== 'string' || typeof model?.name !== 'string') continue;
      byKey.set(`${model.owner}/${model.name}`, toLightweightModel(model));
    }
  }

  const models = [...byKey.values()].sort(
    (left, right) => `${left.owner}/${left.name}`.localeCompare(`${right.owner}/${right.name}`),
  );

  await writeJsonAtomically(catalogOutputPath, models);
  return models;
}
