import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractKieApiDocUrls, KIE_INDEX_URL, syncKie } from '../scripts/lib/sync-provider-data.mjs';

function makeDescribeRoot() {
  return mkdtempSync(join(tmpdir(), 'pptask-describe-kie-'));
}

const INDEX_WITH_TWO_DOCS = `# Kie docs

## API Docs
- [Doc A](https://docs.kie.ai/market/a.md)
- [Doc B](https://docs.kie.ai/market/b.md)
- [CN Doc](https://docs.kie.ai/market/cn/skip.md)
`;

function textResponse(body: string, status = 200) {
  return new Response(body, { status });
}

describe('extractKieApiDocUrls', () => {
  it('extracts only non-cn market markdown URLs after the API Docs marker, deduped', () => {
    const urls = extractKieApiDocUrls(`${INDEX_WITH_TWO_DOCS}\n- [Doc A again](https://docs.kie.ai/market/a.md)`);
    expect(urls).toEqual(['https://docs.kie.ai/market/a.md', 'https://docs.kie.ai/market/b.md']);
  });
});

describe('syncKie', () => {
  let describeDataRoot: string;

  afterEach(() => {
    if (describeDataRoot) rmSync(describeDataRoot, { recursive: true, force: true });
  });

  it('fetches the official Kie docs index URL by default', async () => {
    describeDataRoot = makeDescribeRoot();
    const fetchImpl = vi.fn(async () => textResponse('# empty\n'));
    await syncKie({ describeDataRoot, fetchImpl, now: () => new Date() });
    expect(fetchImpl).toHaveBeenCalledWith(KIE_INDEX_URL, expect.anything());
  });

  it('mirrors the index plus every non-cn market doc, writing a manifest with all source URLs', async () => {
    describeDataRoot = makeDescribeRoot();
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://docs.kie.ai/llms.txt') return textResponse(INDEX_WITH_TWO_DOCS);
      if (url === 'https://docs.kie.ai/market/a.md') return textResponse('# Model A\ncontent a');
      if (url === 'https://docs.kie.ai/market/b.md') return textResponse('# Model B\ncontent b');
      throw new Error(`unexpected url ${url}`);
    });

    const result = await syncKie({
      describeDataRoot,
      fetchImpl,
      indexUrl: 'https://docs.kie.ai/llms.txt',
      now: () => new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(result.status).toBe('success');
    const targetDir = resolve(describeDataRoot, 'kie');
    expect(readFileSync(resolve(targetDir, 'llms.txt'), 'utf8')).toBe(INDEX_WITH_TWO_DOCS);
    expect(readFileSync(resolve(targetDir, 'market/a.md'), 'utf8')).toBe('# Model A\ncontent a');
    expect(readFileSync(resolve(targetDir, 'market/b.md'), 'utf8')).toBe('# Model B\ncontent b');
    expect(existsSync(resolve(targetDir, 'market/cn/skip.md'))).toBe(false);

    const manifest = JSON.parse(readFileSync(resolve(targetDir, 'manifest.json'), 'utf8'));
    expect(manifest.fileCount).toBe(3);
    expect(manifest.sourceUrls).toEqual([
      'https://docs.kie.ai/llms.txt',
      'https://docs.kie.ai/market/a.md',
      'https://docs.kie.ai/market/b.md',
    ]);
  });

  it('requires every doc to succeed: one failing doc fails the whole Kie sync and keeps the old snapshot', async () => {
    describeDataRoot = makeDescribeRoot();
    const goodFetch = vi.fn(async (url: string) => {
      if (url === 'https://docs.kie.ai/llms.txt') return textResponse(INDEX_WITH_TWO_DOCS);
      if (url === 'https://docs.kie.ai/market/a.md') return textResponse('# Model A\noriginal');
      if (url === 'https://docs.kie.ai/market/b.md') return textResponse('# Model B\noriginal');
      throw new Error(`unexpected url ${url}`);
    });
    await syncKie({ describeDataRoot, fetchImpl: goodFetch, indexUrl: 'https://docs.kie.ai/llms.txt', now: () => new Date() });

    const targetDir = resolve(describeDataRoot, 'kie');
    const originalA = readFileSync(resolve(targetDir, 'market/a.md'), 'utf8');

    const partiallyFailingFetch = vi.fn(async (url: string) => {
      if (url === 'https://docs.kie.ai/llms.txt') return textResponse(INDEX_WITH_TWO_DOCS);
      if (url === 'https://docs.kie.ai/market/a.md') return textResponse('# Model A\nupdated');
      if (url === 'https://docs.kie.ai/market/b.md') return textResponse('not found', 404);
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncKie({
      describeDataRoot,
      fetchImpl: partiallyFailingFetch,
      indexUrl: 'https://docs.kie.ai/llms.txt',
      now: () => new Date(),
    });

    expect(result.status).toBe('failed');
    // Old snapshot fully intact - the partial success ("a" already refetched)
    // must not have leaked into the real directory.
    expect(readFileSync(resolve(targetDir, 'market/a.md'), 'utf8')).toBe(originalA);
  });

  it('deletes stale docs that no longer appear in the index', async () => {
    describeDataRoot = makeDescribeRoot();
    const firstFetch = vi.fn(async (url: string) => {
      if (url === 'https://docs.kie.ai/llms.txt') return textResponse(INDEX_WITH_TWO_DOCS);
      if (url === 'https://docs.kie.ai/market/a.md') return textResponse('a');
      if (url === 'https://docs.kie.ai/market/b.md') return textResponse('b');
      throw new Error(`unexpected url ${url}`);
    });
    await syncKie({ describeDataRoot, fetchImpl: firstFetch, indexUrl: 'https://docs.kie.ai/llms.txt', now: () => new Date() });

    const targetDir = resolve(describeDataRoot, 'kie');
    expect(existsSync(resolve(targetDir, 'market/b.md'))).toBe(true);

    const indexWithOnlyA = `# Kie docs\n\n## API Docs\n- [Doc A](https://docs.kie.ai/market/a.md)\n`;
    const secondFetch = vi.fn(async (url: string) => {
      if (url === 'https://docs.kie.ai/llms.txt') return textResponse(indexWithOnlyA);
      if (url === 'https://docs.kie.ai/market/a.md') return textResponse('a-v2');
      throw new Error(`unexpected url ${url}`);
    });
    const result = await syncKie({
      describeDataRoot,
      fetchImpl: secondFetch,
      indexUrl: 'https://docs.kie.ai/llms.txt',
      now: () => new Date(),
    });

    expect(result.status).toBe('success');
    expect(readFileSync(resolve(targetDir, 'market/a.md'), 'utf8')).toBe('a-v2');
    expect(existsSync(resolve(targetDir, 'market/b.md'))).toBe(false);
  });
});
