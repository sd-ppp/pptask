import { describe, it, expect } from 'vitest';
import { parseLocator } from '../src/resource.ts';

describe('parseLocator', () => {
  it('parses replicate locator', () => {
    const parsed = parseLocator('replicate://owner/model');
    expect(parsed.scheme).toBe('replicate');
    expect(parsed.url.hostname).toBe('owner');
  });

  it('parses runninghub locator', () => {
    const parsed = parseLocator('runninghub://app-123');
    expect(parsed.scheme).toBe('runninghub');
    expect(parsed.url.hostname).toBe('app-123');
  });

  it('throws on invalid url', () => {
    expect(() => parseLocator('invalid-url')).toThrow(/Invalid locator/);
  });

  it('normalizes unknown scheme without validation', () => {
    const parsed = parseLocator('unknown://abc');
    expect(parsed.scheme).toBe('unknown');
    expect(parsed.url.hostname).toBe('abc');
  });
});
