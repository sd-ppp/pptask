import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { mapWithConcurrency } from './catalog-utils.mjs';
import {
  DEFAULT_RUNNINGHUB_OVERLAY_PATH,
  loadRunningHubOverlay,
  mergeRunningHubRegistry,
} from './runninghub-registry-overlay.mjs';

export const RUNNINGHUB_REGISTRY_URL =
  'https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/refs/heads/main/models_registry.json';
export const REPLICATE_MODELS_URL = 'https://api.replicate.com/v1/models';
export const APIFRAME_MODELS_URL = 'https://api.apiframe.ai/v2/models';
export const APIFRAME_OPENAPI_URL = 'https://api.apiframe.ai/v2/openapi.json';
export const APIFRAME_OPENAPI_FALLBACK_URL =
  'https://raw.githubusercontent.com/apiframe-ai/apiframe-nodejs-sdk/main/openapi.json';
export const KIE_INDEX_URL = 'https://docs.kie.ai/llms.txt';

const DEFAULT_PROVIDERS = ['runninghub', 'replicate', 'kie', 'apiframe'];

// ---------------------------------------------------------------------------
// Generic helpers: fetch, hashing, atomic staging swap
// ---------------------------------------------------------------------------

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function redactSecrets(text, secrets = []) {
  return secrets.filter(Boolean).reduce((acc, secret) => acc.split(secret).join('***REDACTED***'), text);
}

async function sleep(ms) {
  await new Promise(resolveDelay => setTimeout(resolveDelay, ms));
}

async function fetchWithRetry(fetchImpl, url, options = {}) {
  const { headers = {}, timeoutMs = 20_000, retryDelayMs = 0, maxAttempts = 3 } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    let body;
    try {
      response = await fetchImpl(url, {
        headers: { Accept: 'application/json, text/plain, text/markdown', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      body = await response.text();
    } catch (networkError) {
      lastError = networkError;
      if (attempt === maxAttempts) break;
      if (retryDelayMs > 0) await sleep(retryDelayMs * attempt);
      continue;
    }
    if (response.ok) return body;
    if (response.status < 500 && response.status !== 429) {
      throw new Error(`Request to ${url} failed: ${response.status} ${body.slice(0, 300)}`);
    }
    lastError = new Error(`${response.status} ${body.slice(0, 300)}`);
    if (attempt === maxAttempts) break;
    if (retryDelayMs > 0) await sleep(retryDelayMs * attempt);
  }
  throw new Error(`Request to ${url} failed after ${maxAttempts} attempts: ${lastError?.message ?? 'unknown error'}`);
}

function parseJsonOrThrow(body, label) {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${label} response was not valid JSON: ${errorMessage(error)}`);
  }
}

function sha256Hex(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function buildManifest({ provider, part, sourceUrls, files, syncedAt }) {
  const fileHashes = [...files]
    .map(file => ({ path: file.path, sha256: sha256Hex(file.content) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const contentHash = sha256Hex(JSON.stringify(fileHashes));
  return {
    provider,
    ...(part ? { part } : {}),
    transactionId: randomUUID(),
    sourceUrls: [...sourceUrls],
    fileCount: files.length,
    syncedAt: syncedAt instanceof Date ? syncedAt.toISOString() : syncedAt,
    contentHash: `sha256:${contentHash}`,
    files: fileHashes,
  };
}

// Real fs primitives used by default; every function below accepts an
// injectable `fsOps` override so tests can wrap real disk operations with a
// single targeted failure instead of mocking the filesystem wholesale.
const defaultFsOps = { existsSync, readdir, rename, mkdir, rm };

function siblingKindPrefix(targetDir, kind) {
  return `${basename(targetDir)}.${kind}-`;
}

function makeSiblingPath(targetDir, kind) {
  const prefix = siblingKindPrefix(targetDir, kind);
  return join(dirname(targetDir), `${prefix}${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

function makeStagingPath(targetDir) {
  return makeSiblingPath(targetDir, 'staging');
}

async function prepareStagingDir(stagingDir, fsOps = defaultFsOps) {
  await fsOps.rm(stagingDir, { recursive: true, force: true });
  await fsOps.mkdir(stagingDir, { recursive: true });
}

/**
 * Atomically swaps one or more staging directories into place as their
 * corresponding target directories. All swaps either succeed together or,
 * on any failure partway through, are rolled back from backups - this is
 * what lets Apiframe's list+openapi sync be treated as a single two-root
 * transaction. Rollback is applied to every pair that already has a backup
 * recorded, including a pair whose own final commit is what failed.
 */
export async function swapDirectories(pairs, fsOps = defaultFsOps) {
  const backups = [];
  try {
    for (const { targetDir, stagingDir } of pairs) {
      const backupDir = makeSiblingPath(targetDir, 'rollback');
      const hadExisting = fsOps.existsSync(targetDir);
      if (hadExisting) {
        await fsOps.rename(targetDir, backupDir);
      }
      backups.push({ targetDir, backupDir, hadExisting });
      await fsOps.mkdir(dirname(targetDir), { recursive: true });
      await fsOps.rename(stagingDir, targetDir);
    }
  } catch (error) {
    for (const { targetDir, backupDir, hadExisting } of backups) {
      await fsOps.rm(targetDir, { recursive: true, force: true }).catch(() => undefined);
      if (hadExisting) {
        await fsOps.rename(backupDir, targetDir).catch(rollbackError => {
          console.warn(
            `[sync-provider-data] failed to restore backup ${backupDir} -> ${targetDir} during rollback: `
              + `${errorMessage(rollbackError)}. The next sync attempt will self-heal this from the orphaned backup.`,
          );
        });
      }
    }
    throw error;
  }
  for (const { backupDir, hadExisting } of backups) {
    if (hadExisting) {
      await fsOps.rm(backupDir, { recursive: true, force: true }).catch(removeError => {
        console.warn(
          `[sync-provider-data] synced successfully but failed to remove old backup ${backupDir}: `
            + `${errorMessage(removeError)}. It will be cleaned up automatically on the next sync.`,
        );
      });
    }
  }
}

async function cleanupStagingDirs(stagingDirs, fsOps = defaultFsOps) {
  for (const stagingDir of stagingDirs) {
    await fsOps.rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function listSiblingOrphans(targetDir, kind, fsOps) {
  const parentDir = dirname(targetDir);
  const prefix = siblingKindPrefix(targetDir, kind);
  let entries;
  try {
    entries = await fsOps.readdir(parentDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  // Strict prefix match on the full sibling-name prefix (`<base>.<kind>-`)
  // so e.g. target "apiframe" never matches a sibling named
  // "apiframe-legacy.rollback-..." (different base name entirely).
  return entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith(prefix))
    .map(entry => join(parentDir, entry.name));
}

function siblingTimestamp(path, prefix) {
  const suffix = basename(path).slice(prefix.length);
  const timestamp = Number(suffix.split('-')[1]);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Self-healing step run before every sync attempt for a given target
 * directory. A process hard-killed mid-swap can leave the target missing
 * with its last-known-good snapshot sitting in a `.rollback-*` sibling (the
 * backup-rename succeeded but the commit-rename never ran), or leave a
 * half-written `.staging-*` sibling behind. This restores the old snapshot
 * (or, if several orphans exist, the most recent one) so that even a
 * subsequently failing network sync still leaves real data in place, and
 * otherwise just sweeps stale staging/rollback siblings so a backup-removal
 * failure after a successful swap gets cleaned up on the next run.
 *
 * Never touches a directory that doesn't share the exact `<base>.<kind>-`
 * sibling prefix, so adjacent provider directories are never at risk.
 */
export async function recoverOrphanedSwap(targetDir, fsOps = defaultFsOps) {
  const stagingOrphans = await listSiblingOrphans(targetDir, 'staging', fsOps);
  const rollbackOrphans = await listSiblingOrphans(targetDir, 'rollback', fsOps);

  if (fsOps.existsSync(targetDir)) {
    // The target already holds data (either untouched, or a prior swap
    // committed successfully but its backup-removal failed). Never restore
    // over live data - just sweep leftover siblings.
    for (const orphan of [...stagingOrphans, ...rollbackOrphans]) {
      await fsOps.rm(orphan, { recursive: true, force: true }).catch(error => {
        console.warn(`[sync-provider-data] failed to remove orphaned directory ${orphan}: ${errorMessage(error)}`);
      });
    }
    return { recovered: false };
  }

  let recovered = false;
  if (rollbackOrphans.length > 0) {
    const prefix = siblingKindPrefix(targetDir, 'rollback');
    const [latest, ...extras] = [...rollbackOrphans].sort(
      (left, right) => siblingTimestamp(right, prefix) - siblingTimestamp(left, prefix),
    );
    await fsOps.rename(latest, targetDir);
    recovered = true;
    for (const extra of extras) {
      await fsOps.rm(extra, { recursive: true, force: true }).catch(error => {
        console.warn(`[sync-provider-data] failed to remove extra orphaned backup ${extra}: ${errorMessage(error)}`);
      });
    }
  }

  for (const orphan of stagingOrphans) {
    await fsOps.rm(orphan, { recursive: true, force: true }).catch(error => {
      console.warn(`[sync-provider-data] failed to remove orphaned staging directory ${orphan}: ${errorMessage(error)}`);
    });
  }

  return { recovered };
}

async function recoverBeforeSync(targetDir, provider, fsOps) {
  await recoverOrphanedSwap(targetDir, fsOps).catch(error => {
    console.warn(`[sync-provider-data] ${provider} pre-sync recovery check failed: ${errorMessage(error)}`);
  });
}

/**
 * Runs a single-root provider sync: recover from any interrupted prior
 * swap, populate a staging directory, write its manifest, then
 * mirror-replace the target directory. On any failure the staging directory
 * is discarded and the previous snapshot in `targetDir` is left completely
 * untouched (and is recovered first if a prior run was interrupted).
 */
async function runSingleRootSync({ provider, targetDir, populate, now, secrets = [], fsOps = defaultFsOps }) {
  await recoverBeforeSync(targetDir, provider, fsOps);
  const stagingDir = makeStagingPath(targetDir);
  try {
    await prepareStagingDir(stagingDir, fsOps);
    const { sourceUrls, files } = await populate(stagingDir);
    const manifest = buildManifest({ provider, sourceUrls, files, syncedAt: now() });
    await writeFile(resolve(stagingDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await swapDirectories([{ targetDir, stagingDir }], fsOps);
    return { provider, status: 'success', manifest, error: null };
  } catch (error) {
    await cleanupStagingDirs([stagingDir], fsOps);
    return { provider, status: 'failed', manifest: null, error: redactSecrets(errorMessage(error), secrets) };
  }
}

// ---------------------------------------------------------------------------
// RunningHub: catalog-data/runninghub (official registry + Seedance
// Global / Dola Seedream overlay merge)
// ---------------------------------------------------------------------------

export async function syncRunningHub(options = {}) {
  const {
    catalogDataRoot,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    sourceUrl = RUNNINGHUB_REGISTRY_URL,
    retryDelayMs = 0,
    fsOps = defaultFsOps,
    overlay,
    overlayPath = DEFAULT_RUNNINGHUB_OVERLAY_PATH,
  } = options;
  const targetDir = resolve(catalogDataRoot, 'runninghub');

  return runSingleRootSync({
    provider: 'runninghub',
    targetDir,
    now,
    fsOps,
    populate: async stagingDir => {
      const body = await fetchWithRetry(fetchImpl, sourceUrl, { retryDelayMs });
      const upstream = parseJsonOrThrow(body, 'RunningHub registry');

      // The official feed is missing a handful of endpoints (currently
      // Seedance Global + Dola Seedream); a small version-controlled overlay
      // fills those gaps without ever overwriting upstream data - see
      // runninghub-registry-overlay.mjs for the merge contract.
      const isInlineOverlay = Array.isArray(overlay);
      const overlayEntries = isInlineOverlay ? overlay : await loadRunningHubOverlay(overlayPath);
      const overlaySource = isInlineOverlay ? 'inline-overlay' : overlayPath;

      const { entries: merged } = mergeRunningHubRegistry(upstream, overlayEntries);
      const content = `${JSON.stringify(merged, null, 2)}\n`;

      await writeFile(resolve(stagingDir, 'models_registry.json'), content, 'utf8');
      return {
        sourceUrls: [sourceUrl, overlaySource],
        files: [{ path: 'models_registry.json', content }],
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Replicate: catalog-data/replicate (paginated raw list mirror)
// ---------------------------------------------------------------------------

export async function syncReplicate(options = {}) {
  const {
    catalogDataRoot,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    env = process.env,
    modelsUrl = REPLICATE_MODELS_URL,
    retryDelayMs = 0,
    fsOps = defaultFsOps,
  } = options;
  const targetDir = resolve(catalogDataRoot, 'replicate');
  const apiKey = env.REPLICATE_API_KEY;

  if (!apiKey) {
    return {
      provider: 'replicate',
      status: 'failed',
      manifest: null,
      error: 'REPLICATE_API_KEY is not set; skipping Replicate sync',
    };
  }

  return runSingleRootSync({
    provider: 'replicate',
    targetDir,
    now,
    fsOps,
    secrets: [apiKey],
    populate: async stagingDir => {
      const files = [];
      const sourceUrls = [];
      const seenUrls = new Set();
      let nextUrl = modelsUrl;
      let pageIndex = 0;

      while (nextUrl) {
        if (seenUrls.has(nextUrl)) {
          throw new Error(`Replicate pagination repeated URL: ${nextUrl}`);
        }
        seenUrls.add(nextUrl);
        sourceUrls.push(nextUrl);

        const body = await fetchWithRetry(fetchImpl, nextUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          retryDelayMs,
        });
        const parsed = parseJsonOrThrow(body, `Replicate models page ${pageIndex}`);
        if (!Array.isArray(parsed.results)) {
          throw new Error(`Replicate models page ${pageIndex} is missing a results array`);
        }

        const fileName = `page-${String(pageIndex).padStart(4, '0')}.json`;
        await writeFile(resolve(stagingDir, fileName), body, 'utf8');
        files.push({ path: fileName, content: body });

        nextUrl = typeof parsed.next === 'string' && parsed.next ? parsed.next : '';
        pageIndex += 1;
      }

      if (files.length === 0) {
        throw new Error('Replicate models sync produced no pages');
      }
      return { sourceUrls, files };
    },
  });
}

// ---------------------------------------------------------------------------
// Kie: describe-data/kie (full raw doc mirror, all-or-nothing)
// ---------------------------------------------------------------------------

export function extractKieApiDocUrls(index) {
  const marker = index.indexOf('## API Docs');
  const apiDocs = marker === -1 ? index : index.slice(marker);
  return [
    ...new Set(
      [...apiDocs.matchAll(/\]\((https:\/\/docs\.kie\.ai\/market\/[^)]+\.md)\)/g)]
        .map(match => match[1])
        .filter(url => !url.includes('/cn/')),
    ),
  ];
}

function kieDocRelativePath(url) {
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\/+/, '') || 'index.md';
}

export async function syncKie(options = {}) {
  const {
    describeDataRoot,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    indexUrl = KIE_INDEX_URL,
    concurrency = 8,
    retryDelayMs = 0,
  } = options;
  const targetDir = resolve(describeDataRoot, 'kie');

  return runSingleRootSync({
    provider: 'kie',
    targetDir,
    now,
    populate: async stagingDir => {
      const indexBody = await fetchWithRetry(fetchImpl, indexUrl, { retryDelayMs });
      await writeFile(resolve(stagingDir, 'llms.txt'), indexBody, 'utf8');
      const files = [{ path: 'llms.txt', content: indexBody }];

      const docUrls = extractKieApiDocUrls(indexBody);
      const sourceUrls = [indexUrl, ...docUrls];

      const docs = await mapWithConcurrency(docUrls, concurrency, async url => ({
        url,
        body: await fetchWithRetry(fetchImpl, url, { retryDelayMs }),
      }));

      for (const { url, body } of docs) {
        const relativePath = kieDocRelativePath(url);
        const outputPath = resolve(stagingDir, relativePath);
        if (!outputPath.startsWith(`${stagingDir}${sep}`)) {
          throw new Error(`Refusing to write Kie doc outside staging directory: ${url}`);
        }
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, body, 'utf8');
        files.push({ path: relativePath, content: body });
      }

      return { sourceUrls, files };
    },
  });
}

// ---------------------------------------------------------------------------
// Apiframe: catalog-data/apiframe (/v2/models) + describe-data/apiframe
// (/v2/openapi.json) synced as a single cross-root transaction.
// ---------------------------------------------------------------------------

function validateApiframeOpenApiStructure(body, label) {
  const parsed = parseJsonOrThrow(body, label);
  if (!parsed || typeof parsed !== 'object' || !parsed.paths || !parsed.components?.schemas) {
    throw new Error(`${label} failed structural validation (missing paths/components.schemas)`);
  }
  return parsed;
}

async function fetchApiframeOpenApi(fetchImpl, primaryUrl, fallbackUrl, retryDelayMs, headers = {}) {
  try {
    const body = await fetchWithRetry(fetchImpl, primaryUrl, { retryDelayMs, headers });
    validateApiframeOpenApiStructure(body, 'Apiframe OpenAPI (primary)');
    return { body, sourceUrl: primaryUrl };
  } catch (primaryError) {
    if (!fallbackUrl) throw primaryError;
    const body = await fetchWithRetry(fetchImpl, fallbackUrl, { retryDelayMs, headers });
    validateApiframeOpenApiStructure(body, 'Apiframe OpenAPI (fallback)');
    return { body, sourceUrl: fallbackUrl };
  }
}

export async function syncApiframe(options = {}) {
  const {
    catalogDataRoot,
    describeDataRoot,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    env = process.env,
    apiKey = env.APIFRAME_API_KEY,
    modelsUrl = APIFRAME_MODELS_URL,
    openapiUrl = APIFRAME_OPENAPI_URL,
    openapiFallbackUrl = APIFRAME_OPENAPI_FALLBACK_URL,
    retryDelayMs = 0,
  } = options;

  // Apiframe's /v2/models and /v2/openapi.json follow the same auth
  // convention as the rest of the Apiframe provider (see
  // core/src/providers/apiframe/api.ts): an `X-API-Key` header. Without it
  // (or with an invalid key) Apiframe answers with 403, which is treated as
  // an ordinary sync failure below - no key is ever written into the
  // manifest, sourceUrls, or the returned error message.
  const authHeaders = apiKey ? { 'X-API-Key': apiKey } : {};

  const catalogTargetDir = resolve(catalogDataRoot, 'apiframe');
  const describeTargetDir = resolve(describeDataRoot, 'apiframe');
  const catalogStagingDir = makeStagingPath(catalogTargetDir);
  const describeStagingDir = makeStagingPath(describeTargetDir);

  try {
    await prepareStagingDir(catalogStagingDir);
    await prepareStagingDir(describeStagingDir);

    const modelsBody = await fetchWithRetry(fetchImpl, modelsUrl, { retryDelayMs, headers: authHeaders });
    parseJsonOrThrow(modelsBody, 'Apiframe models list');
    await writeFile(resolve(catalogStagingDir, 'models.json'), modelsBody, 'utf8');

    const { body: openapiBody, sourceUrl: openapiSourceUrl } = await fetchApiframeOpenApi(
      fetchImpl,
      openapiUrl,
      openapiFallbackUrl,
      retryDelayMs,
      authHeaders,
    );
    await writeFile(resolve(describeStagingDir, 'openapi-v2.json'), openapiBody, 'utf8');

    const syncedAt = now();
    const transactionId = randomUUID();
    const catalogManifest = {
      ...buildManifest({
        provider: 'apiframe',
        part: 'catalog',
        sourceUrls: [modelsUrl],
        files: [{ path: 'models.json', content: modelsBody }],
        syncedAt,
      }),
      transactionId,
    };
    const describeManifest = {
      ...buildManifest({
        provider: 'apiframe',
        part: 'describe',
        sourceUrls: [openapiSourceUrl],
        files: [{ path: 'openapi-v2.json', content: openapiBody }],
        syncedAt,
      }),
      transactionId,
    };
    await writeFile(resolve(catalogStagingDir, 'manifest.json'), `${JSON.stringify(catalogManifest, null, 2)}\n`, 'utf8');
    await writeFile(
      resolve(describeStagingDir, 'manifest.json'),
      `${JSON.stringify(describeManifest, null, 2)}\n`,
      'utf8',
    );

    await swapDirectories([
      { targetDir: catalogTargetDir, stagingDir: catalogStagingDir },
      { targetDir: describeTargetDir, stagingDir: describeStagingDir },
    ]);

    return {
      provider: 'apiframe',
      status: 'success',
      manifest: { catalog: catalogManifest, describe: describeManifest },
      error: null,
    };
  } catch (error) {
    await cleanupStagingDirs([catalogStagingDir, describeStagingDir]);
    const safeError = redactSecrets(errorMessage(error), apiKey ? [apiKey] : []);
    return { provider: 'apiframe', status: 'failed', manifest: null, error: safeError };
  }
}

// ---------------------------------------------------------------------------
// Orchestrator: runs all four providers independently, aggregates results
// ---------------------------------------------------------------------------

export async function syncProviderData(options = {}) {
  const {
    catalogDataRoot,
    describeDataRoot,
    fetchImpl = globalThis.fetch,
    now = () => new Date(),
    env = process.env,
    apiKey = env.APIFRAME_API_KEY,
    providers = DEFAULT_PROVIDERS,
    retryDelayMs = 0,
  } = options;

  const providerFns = {
    runninghub: () => syncRunningHub({ catalogDataRoot, fetchImpl, now, retryDelayMs }),
    replicate: () => syncReplicate({ catalogDataRoot, fetchImpl, now, env, retryDelayMs }),
    kie: () => syncKie({ describeDataRoot, fetchImpl, now, retryDelayMs }),
    apiframe: () => syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now, env, apiKey, retryDelayMs }),
  };

  const results = await Promise.all(providers.map(provider => providerFns[provider]()));
  return {
    results,
    success: results.every(result => result.status === 'success'),
  };
}

function manifestFileCount(result) {
  if (!result.manifest) return 0;
  if (typeof result.manifest.fileCount === 'number') return result.manifest.fileCount;
  return (result.manifest.catalog?.fileCount ?? 0) + (result.manifest.describe?.fileCount ?? 0);
}

export function formatSyncSummary(summary) {
  const lines = summary.results.map(result =>
    result.status === 'success'
      ? `[sync-provider-data] ${result.provider}: OK (${manifestFileCount(result)} files)`
      : `[sync-provider-data] ${result.provider}: FAILED - ${result.error}`,
  );
  lines.push(
    summary.success
      ? '[sync-provider-data] all providers synced successfully'
      : '[sync-provider-data] one or more providers failed; previous snapshots for those providers were preserved',
  );
  return lines.join('\n');
}

export async function runSyncProviderDataCli(options = {}) {
  const { log = console.log, ...syncOptions } = options;
  const summary = await syncProviderData(syncOptions);
  log(formatSyncSummary(summary));
  return summary.success ? 0 : 1;
}

export async function createTempRoot(prefix) {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function readManifest(dir) {
  return JSON.parse(await readFile(resolve(dir, 'manifest.json'), 'utf8'));
}
