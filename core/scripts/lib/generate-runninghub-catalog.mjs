import { readFile } from 'node:fs/promises';
import { buildSearchText, dedupeByLocator, writeJsonAtomically } from './catalog-utils.mjs';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

async function readRunningHubSnapshot(snapshotPath) {
  let body;
  try {
    body = await readFile(snapshotPath, 'utf8');
  } catch (error) {
    throw new Error(
      `RunningHub catalog-data snapshot not found at ${snapshotPath}. Run \`pnpm run pptask:sync-provider-data\` `
        + `first (offline generation only reads local snapshots, never the network): ${errorMessage(error)}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(`RunningHub snapshot at ${snapshotPath} is not valid JSON: ${errorMessage(error)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`RunningHub snapshot at ${snapshotPath} must be a JSON array of model entries`);
  }
  return parsed;
}

/**
 * Validates every entry has a non-empty `endpoint` and that no two entries
 * share the same endpoint. Throws (without returning anything) on the first
 * problem found, identifying the offending endpoint/index, so a corrupt or
 * unexpectedly-duplicated snapshot fails loudly instead of silently
 * producing a lossy catalog.
 */
function validateAndSortEntries(entries, snapshotPath) {
  const seen = new Map();
  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`RunningHub snapshot entry at index ${index} (${snapshotPath}) must be an object`);
    }
    if (!isNonEmptyString(entry.endpoint)) {
      throw new Error(`RunningHub snapshot entry at index ${index} (${snapshotPath}) is missing a non-empty "endpoint"`);
    }
    if (seen.has(entry.endpoint)) {
      throw new Error(
        `RunningHub snapshot has duplicate endpoint "${entry.endpoint}" (indices ${seen.get(entry.endpoint)} and ${index}) in ${snapshotPath}`,
      );
    }
    seen.set(entry.endpoint, index);
  });
  return [...entries].sort((left, right) => left.endpoint.localeCompare(right.endpoint));
}

function buildLightweightEntry(entry) {
  const label = entry.display_name ?? entry.name_cn ?? entry.name_en ?? entry.endpoint;
  const lightweight = {
    providerId: 'runninghub',
    locator: `runninghub://api/${entry.endpoint}`,
    label,
  };
  if (entry.category !== undefined) lightweight.category = entry.category;
  if (entry.output_type !== undefined) lightweight.outputType = entry.output_type;
  lightweight.searchText = buildSearchText([
    label,
    entry.name_cn,
    entry.name_en,
    entry.category,
    entry.output_type,
    entry.endpoint,
  ]);
  return lightweight;
}

/**
 * Offline RunningHub catalog generation: reads the merged (upstream +
 * overlay) raw registry snapshot from `catalog-data/runninghub`, writes it
 * back out untouched (aside from deterministic sorting) as the full
 * `model-registry.json` runtime artifact - preserving every model's full
 * `params` array for runtime describe/schema building - and derives a
 * lightweight, deduped-by-endpoint `model-catalog.json` list (locator,
 * label, category, outputType, searchText) that the RunningHub
 * `PPTaskLocatorOption` locator-catalog wiring reads directly.
 *
 * Reads no network. Validates the snapshot before writing anything, so a
 * failure (missing/malformed snapshot, missing endpoint, duplicate
 * endpoint) never touches the previous `registryOutputPath` /
 * `catalogOutputPath` artifacts.
 */
export async function generateRunningHubCatalog({ snapshotPath, registryOutputPath, catalogOutputPath }) {
  const rawEntries = await readRunningHubSnapshot(snapshotPath);
  const registry = validateAndSortEntries(rawEntries, snapshotPath);
  const catalog = dedupeByLocator(registry.map(buildLightweightEntry));

  await writeJsonAtomically(registryOutputPath, registry);
  await writeJsonAtomically(catalogOutputPath, catalog);

  return { registry, catalog };
}
