import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function dedupeByLocator(entries) {
  return [...new Map(entries.map(entry => [entry.locator, entry])).values()]
    .sort((left, right) => left.locator.localeCompare(right.locator));
}

export function buildSearchText(parts) {
  return parts.filter(Boolean).join(' ').toLocaleLowerCase();
}

export async function writeJsonAtomically(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

export async function readJsonFile(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function fetchText(url, options = {}) {
  const { timeoutMs = 20_000, accept = 'text/plain, text/markdown, application/json' } = options;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: accept },
      });
    } catch (networkError) {
      lastError = networkError;
      if (attempt === 3) break;
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1000));
      continue;
    }
    const body = await response.text();
    if (response.ok) return body;
    // Non-retryable client errors (aside from 429, which is a retryable rate
    // limit) fail fast instead of burning through all 3 attempts.
    if (response.status < 500 && response.status !== 429) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${body.slice(0, 300)}`);
    }
    lastError = new Error(`${response.status} ${body.slice(0, 300)}`);
    if (attempt === 3) break;
    await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1000));
  }
  // Every loop exit above either returns the body or `break`s into this
  // explicit throw - the function must never fall through and implicitly
  // return `undefined` after exhausting retries.
  throw new Error(`Failed to fetch ${url}: ${lastError?.message ?? 'unknown error'}`);
}

export async function mapWithConcurrency(items, limit, mapper) {
  const result = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      result[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return result;
}

export function normalizeOpenApiSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const normalized = Array.isArray(schema) ? [...schema] : { ...schema };
  if (Array.isArray(schema)) {
    return schema.map(item => normalizeOpenApiSchema(item));
  }
  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === 'object') {
      normalized[key] = normalizeOpenApiSchema(value);
    }
  }
  return normalized;
}
