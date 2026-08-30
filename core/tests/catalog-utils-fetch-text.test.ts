import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchText } from '../scripts/lib/catalog-utils.mjs';

describe('fetchText retry/error semantics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the body when the response is ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('hello world', { status: 200 })));
    await expect(fetchText('https://example.test/doc')).resolves.toBe('hello world');
  });

  it('throws (never resolves to undefined) after 3 consecutive 5xx responses instead of silently returning nothing', async () => {
    const fetchMock = vi.fn(async () => new Response('server exploded', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = fetchText('https://example.test/flaky', { timeoutMs: 1000 });
    await expect(result).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws immediately (no retry) for a non-retryable 4xx status', async () => {
    const fetchMock = vi.fn(async () => new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchText('https://example.test/missing')).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
