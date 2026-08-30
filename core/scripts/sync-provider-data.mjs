import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSyncProviderDataCli } from './lib/sync-provider-data.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, '../../../../..');

const packageEnvPath = resolve(repoRoot, 'libs/domain/pptask/.env');
if (existsSync(packageEnvPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(packageEnvPath);
}

const catalogDataRoot = resolve(repoRoot, 'libs/domain/pptask/catalog-data');
const describeDataRoot = resolve(repoRoot, 'libs/domain/pptask/describe-data');

process.exitCode = await runSyncProviderDataCli({
  catalogDataRoot,
  describeDataRoot,
  // Apiframe's /v2/models and openapi endpoints require an X-API-Key header
  // (see libs/domain/pptask/.env.example); without it (or with an invalid
  // key) Apiframe responds 403 and that provider's sync fails, preserving
  // its previous local snapshot.
  apiKey: process.env.APIFRAME_API_KEY,
  // Real network usage benefits from a short backoff between retries;
  // tests inject retryDelayMs: 0 for determinism/speed.
  retryDelayMs: 300,
});
