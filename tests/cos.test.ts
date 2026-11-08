import { describe, expect, it, vi } from 'vitest';
import { createCosProvider } from '../src/providers/cos/index.ts';
const { putObject } = vi.hoisted(() => ({ putObject: vi.fn().mockResolvedValue({}) }));
vi.mock('cos-nodejs-sdk-v5', () => ({ default: class { putObject = putObject; } }));
const config = { secretId: 'test-id', secretKey: 'test-secret', bucket: 'media-1250000000', region: 'ap-guangzhou' };
describe('COS upload provider', () => {
  it('uploads through the standard provider API and returns a reusable URL', async () => {
    const provider = createCosProvider(config);
    const result = await provider.upload({ data: { type: 'data', data: new Uint8Array([1, 2, 3]) }, mediaType: 'image/png', filename: 'reference.png' });
    expect(result.providerReference?.cos).toMatch(/^https:\/\/media-1250000000/);
    expect(result.byteSize).toBe(3);
    expect(putObject).toHaveBeenCalledWith(expect.objectContaining({ ContentType: 'image/png', ContentLength: 3, ACL: 'public-read' }));
  });
  it('propagates storage failure', async () => {
    putObject.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(createCosProvider(config).upload({ data: { type: 'data', data: new Uint8Array([1]) }, mediaType: 'image/png' })).rejects.toThrow('storage unavailable');
  });
  it('does not upload an already cancelled request', async () => {
    const abort = new AbortController(); abort.abort();
    await expect(createCosProvider(config).upload({ data: { type: 'data', data: new Uint8Array([1]) }, mediaType: 'image/png', abortSignal: abort.signal })).rejects.toThrow();
  });
});
