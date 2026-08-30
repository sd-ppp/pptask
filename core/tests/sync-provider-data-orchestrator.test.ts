import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIFRAME_MODELS_URL,
  APIFRAME_OPENAPI_URL,
  KIE_INDEX_URL,
  REPLICATE_MODELS_URL,
  RUNNINGHUB_REGISTRY_URL,
  runSyncProviderDataCli,
  syncProviderData,
} from '../scripts/lib/sync-provider-data.mjs';

function makeRoots() {
  return {
    catalogDataRoot: mkdtempSync(join(tmpdir(), 'pptask-catalog-orch-')),
    describeDataRoot: mkdtempSync(join(tmpdir(), 'pptask-describe-orch-')),
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

function textResponse(body: string, status = 200) {
  return new Response(body, { status });
}

const VALID_OPENAPI = {
  openapi: '3.0.1',
  paths: { '/v2/images/generate': { post: {} } },
  components: { schemas: { GenerateImageRequest: {} } },
};

function buildMixedFetch() {
  return vi.fn(async (url: string) => {
    if (url === RUNNINGHUB_REGISTRY_URL) return jsonResponse([{ endpoint: 'rh/one' }]);
    if (url === APIFRAME_MODELS_URL) return jsonResponse({ models: [{ id: 'seedream-5-pro' }] });
    if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
    if (url === KIE_INDEX_URL) return textResponse('# Kie\n\n## API Docs\n');
    if (url === REPLICATE_MODELS_URL) throw new Error('replicate should not be called without an API key');
    throw new Error(`unexpected url ${url}`);
  });
}

describe('syncProviderData (orchestrator)', () => {
  let catalogDataRoot: string;
  let describeDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
    if (describeDataRoot) rmSync(describeDataRoot, { recursive: true, force: true });
  });

  it('isolates provider failures: RunningHub/Kie/Apiframe succeed while Replicate fails due to a missing key', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = buildMixedFetch();

    const summary = await syncProviderData({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      env: {},
      now: () => new Date('2026-05-01T00:00:00.000Z'),
    });

    expect(summary.success).toBe(false);
    const byProvider = Object.fromEntries(
      summary.results.map((result: { provider: string }) => [result.provider, result]),
    );
    expect(byProvider.runninghub.status).toBe('success');
    expect(byProvider.kie.status).toBe('success');
    expect(byProvider.apiframe.status).toBe('success');
    expect(byProvider.replicate.status).toBe('failed');
    expect(byProvider.replicate.error).toMatch(/REPLICATE_API_KEY/);

    expect(existsSync(resolve(catalogDataRoot, 'runninghub', 'models_registry.json'))).toBe(true);
    expect(existsSync(resolve(catalogDataRoot, 'apiframe', 'models.json'))).toBe(true);
    expect(existsSync(resolve(describeDataRoot, 'apiframe', 'openapi-v2.json'))).toBe(true);
    expect(existsSync(resolve(describeDataRoot, 'kie', 'llms.txt'))).toBe(true);
    expect(existsSync(resolve(catalogDataRoot, 'replicate'))).toBe(false);
  });

  it('reports success=true only when every requested provider succeeds', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === RUNNINGHUB_REGISTRY_URL) return jsonResponse([{ endpoint: 'rh/one' }]);
      throw new Error(`unexpected url ${url}`);
    });

    const summary = await syncProviderData({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      providers: ['runninghub'],
      now: () => new Date(),
    });

    expect(summary.success).toBe(true);
    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].provider).toBe('runninghub');
  });
});

describe('runSyncProviderDataCli', () => {
  let catalogDataRoot: string;
  let describeDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
    if (describeDataRoot) rmSync(describeDataRoot, { recursive: true, force: true });
  });

  it('never logs the API key even when a provider using it fails', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = buildMixedFetch();
    const logLines: string[] = [];

    // buildMixedFetch() throws for Replicate's URL, so with a key present
    // Replicate will fail after exhausting retries - the CLI must still
    // report a non-zero exit code and must never print the raw key.
    const exitCode = await runSyncProviderDataCli({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      env: { REPLICATE_API_KEY: 'super-secret-value' },
      log: (line: string) => logLines.push(line),
    });

    expect(exitCode).toBe(1);
    expect(logLines.join('\n')).not.toContain('super-secret-value');
  });

  it('returns a non-zero exit code when any provider fails', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
    const logLines: string[] = [];

    const exitCode = await runSyncProviderDataCli({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      env: {},
      log: (line: string) => logLines.push(line),
    });

    expect(exitCode).toBe(1);
    expect(logLines.join('\n')).toMatch(/FAILED/);
  });

  it('returns exit code 0 when all four providers (including Replicate with a key) succeed', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === RUNNINGHUB_REGISTRY_URL) return jsonResponse([{ endpoint: 'rh/one' }]);
      if (url === APIFRAME_MODELS_URL) return jsonResponse({ models: [{ id: 'seedream-5-pro' }] });
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      if (url === KIE_INDEX_URL) return textResponse('# Kie\n\n## API Docs\n');
      if (url === REPLICATE_MODELS_URL) return jsonResponse({ results: [{ owner: 'a', name: 'one' }], next: null });
      throw new Error(`unexpected url ${url}`);
    });
    const logLines: string[] = [];

    const exitCode = await runSyncProviderDataCli({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      env: { REPLICATE_API_KEY: 'super-secret-value' },
      log: (line: string) => logLines.push(line),
    });

    expect(exitCode).toBe(0);
    expect(logLines.join('\n')).toContain('all providers synced successfully');
    expect(logLines.join('\n')).not.toContain('super-secret-value');
  });
});
