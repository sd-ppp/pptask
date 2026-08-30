import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Co-located next to sync-provider-data.mjs at `core/scripts/`.
export const DEFAULT_RUNNINGHUB_OVERLAY_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../runninghub-registry-overlay.json',
);

const REQUIRED_STRING_FIELDS = ['class_name', 'internal_name', 'name_en', 'output_type', 'category'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates a single RunningHub registry overlay entry against the minimal
 * schema shared by every entry in the upstream `models_registry.json`: a
 * non-empty `endpoint`, the identifying string fields, and a `params` array.
 * Throws with a message identifying the offending entry (by endpoint, or by
 * index when the endpoint itself is what's invalid) on the first problem
 * found, so bad overlay data fails loudly instead of silently corrupting the
 * merged catalog.
 */
function validateOverlayEntry(entry, index) {
  const label = isNonEmptyString(entry?.endpoint) ? `"${entry.endpoint}"` : `at index ${index}`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`RunningHub registry overlay entry ${label} must be an object`);
  }
  if (!isNonEmptyString(entry.endpoint)) {
    throw new Error(`RunningHub registry overlay entry ${label} is missing a non-empty "endpoint"`);
  }
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(entry[field])) {
      throw new Error(`RunningHub registry overlay entry ${label} is missing a non-empty "${field}"`);
    }
  }
  if (!Array.isArray(entry.params)) {
    throw new Error(`RunningHub registry overlay entry ${label} must have an array "params" field`);
  }
}

function requireEntryArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`RunningHub ${label} registry must be an array`);
  }
}

/**
 * Merges the official RunningHub registry (`upstream`) with a small,
 * version-controlled `overlay` of entries the official feed is missing
 * (currently Seedance Global + Dola Seedream). Upstream always wins on an
 * endpoint collision - the overlay only ever fills gaps, it never overwrites
 * or shadows upstream data. Returns a new array sorted deterministically by
 * `endpoint`; neither input array (nor its entries) is mutated.
 *
 * Throws (without merging anything) when:
 * - `upstream` or `overlay` is not an array;
 * - any upstream entry is missing a non-empty `endpoint`, or upstream itself
 *   contains a duplicate `endpoint` (a corrupt/unexpected upstream feed);
 * - any overlay entry fails schema validation (see `validateOverlayEntry`);
 * - the overlay declares the same `endpoint` more than once.
 */
export function mergeRunningHubRegistry(upstream, overlay) {
  requireEntryArray(upstream, 'upstream');
  requireEntryArray(overlay, 'overlay');

  const upstreamByEndpoint = new Map();
  upstream.forEach((entry, index) => {
    const endpoint = entry?.endpoint;
    if (!isNonEmptyString(endpoint)) {
      throw new Error(`RunningHub upstream registry entry at index ${index} is missing a non-empty "endpoint"`);
    }
    if (upstreamByEndpoint.has(endpoint)) {
      throw new Error(`RunningHub upstream registry has duplicate endpoint "${endpoint}"`);
    }
    upstreamByEndpoint.set(endpoint, entry);
  });

  const overlaySeen = new Set();
  const overlayToAdd = [];
  overlay.forEach((entry, index) => {
    validateOverlayEntry(entry, index);
    const { endpoint } = entry;
    if (overlaySeen.has(endpoint)) {
      throw new Error(`RunningHub registry overlay has duplicate endpoint "${endpoint}" (index ${index})`);
    }
    overlaySeen.add(endpoint);
    if (!upstreamByEndpoint.has(endpoint)) {
      overlayToAdd.push(entry);
    }
  });

  const entries = [...upstream, ...overlayToAdd].sort((left, right) => left.endpoint.localeCompare(right.endpoint));
  const addedEndpoints = overlayToAdd.map(entry => entry.endpoint);
  return { entries, addedEndpoints };
}

export async function loadRunningHubOverlay(path = DEFAULT_RUNNINGHUB_OVERLAY_PATH) {
  const body = await readFile(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error(`RunningHub registry overlay at ${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  requireEntryArray(parsed, 'overlay');
  return parsed;
}
