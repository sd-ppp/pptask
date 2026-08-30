import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APIFRAME_MODELS_URL,
  APIFRAME_OPENAPI_FALLBACK_URL,
  APIFRAME_OPENAPI_URL,
  syncApiframe,
} from '../scripts/lib/sync-provider-data.mjs';

function makeRoots() {
  return {
    catalogDataRoot: mkdtempSync(join(tmpdir(), 'pptask-catalog-apiframe-')),
    describeDataRoot: mkdtempSync(join(tmpdir(), 'pptask-describe-apiframe-')),
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

const VALID_OPENAPI = {
  openapi: '3.0.1',
  paths: { '/v2/images/generate': { post: {} } },
  components: { schemas: { GenerateImageRequest: {} } },
};
const INVALID_OPENAPI = { openapi: '3.0.1', paths: {} };
const MODELS_LIST = { models: [{ id: 'seedream-5-pro' }] };

describe('syncApiframe (cross-root transaction)', () => {
  let catalogDataRoot: string;
  let describeDataRoot: string;

  afterEach(() => {
    if (catalogDataRoot) rmSync(catalogDataRoot, { recursive: true, force: true });
    if (describeDataRoot) rmSync(describeDataRoot, { recursive: true, force: true });
  });

  it('fetches the official Apiframe URLs by default', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now: () => new Date() });
    expect(fetchImpl).toHaveBeenCalledWith(APIFRAME_MODELS_URL, expect.anything());
    expect(fetchImpl).toHaveBeenCalledWith(APIFRAME_OPENAPI_URL, expect.anything());
  });

  it('updates both catalog-data/apiframe and describe-data/apiframe together on success, tagged with the same transaction', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    const syncedAt = new Date('2026-04-01T00:00:00.000Z');
    const result = await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now: () => syncedAt });

    expect(result.status).toBe('success');
    const catalogDir = resolve(catalogDataRoot, 'apiframe');
    const describeDir = resolve(describeDataRoot, 'apiframe');
    expect(JSON.parse(readFileSync(resolve(catalogDir, 'models.json'), 'utf8'))).toEqual(MODELS_LIST);
    expect(JSON.parse(readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8'))).toEqual(VALID_OPENAPI);

    const catalogManifest = JSON.parse(readFileSync(resolve(catalogDir, 'manifest.json'), 'utf8'));
    const describeManifest = JSON.parse(readFileSync(resolve(describeDir, 'manifest.json'), 'utf8'));
    expect(catalogManifest.part).toBe('catalog');
    expect(describeManifest.part).toBe('describe');
    expect(catalogManifest.transactionId).toBe(describeManifest.transactionId);
    expect(catalogManifest.syncedAt).toBe('2026-04-01T00:00:00.000Z');
    expect(describeManifest.syncedAt).toBe('2026-04-01T00:00:00.000Z');
  });

  it('falls back to the GitHub OpenAPI mirror only when the primary response fails structural validation', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(INVALID_OPENAPI);
      if (url === APIFRAME_OPENAPI_FALLBACK_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now: () => new Date() });

    expect(result.status).toBe('success');
    expect(result.manifest?.describe.sourceUrls).toEqual([APIFRAME_OPENAPI_FALLBACK_URL]);
    const describeDir = resolve(describeDataRoot, 'apiframe');
    expect(JSON.parse(readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8'))).toEqual(VALID_OPENAPI);
  });

  it('fails the whole provider (no GitHub models fallback) when /v2/models fails, leaving describe-data/apiframe untouched even though openapi would have succeeded', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());

    // Prime both roots with an existing snapshot first.
    const primeFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl: primeFetch, now: () => new Date() });
    const catalogDir = resolve(catalogDataRoot, 'apiframe');
    const describeDir = resolve(describeDataRoot, 'apiframe');
    const priorModels = readFileSync(resolve(catalogDir, 'models.json'), 'utf8');
    const priorOpenapi = readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8');

    const updatedOpenapi = { ...VALID_OPENAPI, paths: { ...VALID_OPENAPI.paths, extra: {} } };
    const failingModelsFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return new Response('not found', { status: 404 });
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(updatedOpenapi);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl: failingModelsFetch, now: () => new Date() });

    expect(result.status).toBe('failed');
    expect(readFileSync(resolve(catalogDir, 'models.json'), 'utf8')).toBe(priorModels);
    expect(readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8')).toBe(priorOpenapi);
  });

  it('fails the whole provider when the openapi fetch and its fallback both fail, leaving catalog-data/apiframe untouched even though models would have succeeded', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const primeFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl: primeFetch, now: () => new Date() });
    const catalogDir = resolve(catalogDataRoot, 'apiframe');
    const describeDir = resolve(describeDataRoot, 'apiframe');
    const priorModels = readFileSync(resolve(catalogDir, 'models.json'), 'utf8');
    const priorOpenapi = readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8');

    const updatedModels = { models: [{ id: 'brand-new-model' }] };
    const failingOpenApiFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(updatedModels);
      if (url === APIFRAME_OPENAPI_URL) return new Response('server error', { status: 500 });
      if (url === APIFRAME_OPENAPI_FALLBACK_URL) return new Response('not found', { status: 404 });
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl: failingOpenApiFetch,
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    expect(readFileSync(resolve(catalogDir, 'models.json'), 'utf8')).toBe(priorModels);
    expect(readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8')).toBe(priorOpenapi);
  });

  it('reports failure (without throwing) when neither root has ever been synced and the first attempt fails', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
    const result = await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now: () => new Date() });
    expect(result.status).toBe('failed');
    expect(existsSync(resolve(catalogDataRoot, 'apiframe'))).toBe(false);
    expect(existsSync(resolve(describeDataRoot, 'apiframe'))).toBe(false);
  });

  it('sends the Apiframe API key as an X-API-Key header on the /v2/models and openapi requests when apiKey is provided', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      now: () => new Date(),
      apiKey: 'sk-test-apiframe-key',
    });

    expect(result.status).toBe('success');
    const modelsCall = fetchImpl.mock.calls.find(([url]) => url === APIFRAME_MODELS_URL);
    const openapiCall = fetchImpl.mock.calls.find(([url]) => url === APIFRAME_OPENAPI_URL);
    expect(modelsCall?.[1]?.headers?.['X-API-Key']).toBe('sk-test-apiframe-key');
    expect(openapiCall?.[1]?.headers?.['X-API-Key']).toBe('sk-test-apiframe-key');

    // The key must never leak into persisted artifacts.
    expect(JSON.stringify(result.manifest)).not.toContain('sk-test-apiframe-key');
  });

  it('also sends the X-API-Key header on the fallback openapi request', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(INVALID_OPENAPI);
      if (url === APIFRAME_OPENAPI_FALLBACK_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      now: () => new Date(),
      apiKey: 'sk-test-apiframe-key',
    });

    expect(result.status).toBe('success');
    const fallbackCall = fetchImpl.mock.calls.find(([url]) => url === APIFRAME_OPENAPI_FALLBACK_URL);
    expect(fallbackCall?.[1]?.headers?.['X-API-Key']).toBe('sk-test-apiframe-key');
  });

  it('does not send an X-API-Key header (or any secret) when no apiKey is configured', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl,
      now: () => new Date(),
      env: {},
    });

    expect(result.status).toBe('success');
    const modelsCall = fetchImpl.mock.calls.find(([url]) => url === APIFRAME_MODELS_URL);
    const openapiCall = fetchImpl.mock.calls.find(([url]) => url === APIFRAME_OPENAPI_URL);
    expect(modelsCall?.[1]?.headers ?? {}).not.toHaveProperty('X-API-Key');
    expect(openapiCall?.[1]?.headers ?? {}).not.toHaveProperty('X-API-Key');
  });

  it('never leaks the apiKey into the returned failure error message', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const apiKey = 'sk-secret-token-12345';
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return new Response(`403 Forbidden - key ${apiKey} rejected`, { status: 403 });
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({ catalogDataRoot, describeDataRoot, fetchImpl, now: () => new Date(), apiKey });

    expect(result.status).toBe('failed');
    expect(result.error).not.toContain(apiKey);
  });

  it('preserves the previous snapshot and reports failure when /v2/models still returns 403 (e.g. missing/invalid key)', async () => {
    ({ catalogDataRoot, describeDataRoot } = makeRoots());
    const primeFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return jsonResponse(MODELS_LIST);
      if (url === APIFRAME_OPENAPI_URL) return jsonResponse(VALID_OPENAPI);
      throw new Error(`unexpected url ${url}`);
    });
    await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl: primeFetch,
      now: () => new Date(),
      apiKey: 'sk-old-good-key',
    });
    const catalogDir = resolve(catalogDataRoot, 'apiframe');
    const describeDir = resolve(describeDataRoot, 'apiframe');
    const priorModels = readFileSync(resolve(catalogDir, 'models.json'), 'utf8');
    const priorOpenapi = readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8');

    const forbiddenFetch = vi.fn(async (url: string) => {
      if (url === APIFRAME_MODELS_URL) return new Response('forbidden', { status: 403 });
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncApiframe({
      catalogDataRoot,
      describeDataRoot,
      fetchImpl: forbiddenFetch,
      now: () => new Date(),
      env: {},
    });

    expect(result.status).toBe('failed');
    expect(readFileSync(resolve(catalogDir, 'models.json'), 'utf8')).toBe(priorModels);
    expect(readFileSync(resolve(describeDir, 'openapi-v2.json'), 'utf8')).toBe(priorOpenapi);
  });
});
