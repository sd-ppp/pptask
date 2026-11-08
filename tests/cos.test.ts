import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCosProvider, createCosMediaUrlSigner } from '../src/providers/cos/index.ts';
const { putObject, putObjectAcl, getObjectUrl } = vi.hoisted(() => ({ putObject: vi.fn(), putObjectAcl: vi.fn(), getObjectUrl: vi.fn() }));
vi.mock('cos-nodejs-sdk-v5', () => ({ default: class { putObject = putObject; putObjectAcl = putObjectAcl; getObjectUrl = getObjectUrl; } }));
beforeEach(() => {
  putObject.mockReset().mockResolvedValue({});
  putObjectAcl.mockReset().mockResolvedValue({});
  getObjectUrl.mockReset().mockReturnValue('https://signed.test/reference.png?signature=test');
});

describe('COS upstream reference URLs', () => {
  const key = `sixi/generated/${'a'.repeat(64)}.png`;
  const original = `https://${config.bucket}.cos.${config.region}.myqcloud.com/${key}`;
  it('provides a fresh signed read URL even when the stored URL was unsigned or expired', () => {
    const sign = createCosMediaUrlSigner(config);
    expect(sign(original)).toBe('https://signed.test/reference.png?signature=test');
    expect(sign(`${original}?q-signature=expired`)).toBe('https://signed.test/reference.png?signature=test');
    expect(getObjectUrl).toHaveBeenCalledWith({ Bucket: config.bucket, Region: config.region, Key: key, Protocol: 'https:', Sign: true, Expires: 3600 });
  });
  it('does not sign unrelated hosts or objects outside the generated media directory', () => {
    const sign = createCosMediaUrlSigner(config);
    for (const url of ['https://external.test/reference.png', `https://${config.bucket}.cos.${config.region}.myqcloud.com/private/secret.png`]) {
      expect(sign(url)).toBe(url);
    }
    expect(getObjectUrl).not.toHaveBeenCalled();
  });
  it('maps a configured public domain path back to the correct COS object key', () => {
    const sign = createCosMediaUrlSigner({ ...config, publicBaseUrl: 'https://media.test/assets/' });
    sign(`https://media.test/assets/${key}`);
    expect(getObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ Key: key }));
  });
});
const config = { secretId: 'test-id', secretKey: 'test-secret', bucket: 'media-1250000000', region: 'ap-guangzhou' };
describe('COS upload provider', () => {
  it('uploads through the standard provider API and returns a reusable URL', async () => {
    const provider = createCosProvider(config);
    const result = await provider.upload({ data: { type: 'data', data: new Uint8Array([1, 2, 3]) }, mediaType: 'image/png', filename: 'reference.png' });
    expect(result.providerReference?.cos).toMatch(/^https:\/\/media-1250000000/);
    expect(result.byteSize).toBe(3);
    expect(putObject).toHaveBeenCalledWith(expect.objectContaining({ ContentType: 'image/png', ContentLength: 3, ACL: 'public-read' }));
    expect(putObjectAcl).toHaveBeenCalledWith({ Bucket: config.bucket, Region: config.region, Key: putObject.mock.calls[0][0].Key, ACL: 'public-read' });
  });
  it('propagates storage failure', async () => {
    putObject.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(createCosProvider(config).upload({ data: { type: 'data', data: new Uint8Array([1]) }, mediaType: 'image/png' })).rejects.toThrow('storage unavailable');
    expect(putObjectAcl).not.toHaveBeenCalled();
  });
  it('does not return a URL when making the object readable fails', async () => {
    putObjectAcl.mockRejectedValueOnce(new Error('ACL denied'));
    await expect(createCosProvider(config).upload({ data: { type: 'data', data: new Uint8Array([1]) }, mediaType: 'image/png' })).rejects.toThrow('ACL denied');
  });
  it('does not upload an already cancelled request', async () => {
    const abort = new AbortController(); abort.abort();
    await expect(createCosProvider(config).upload({ data: { type: 'data', data: new Uint8Array([1]) }, mediaType: 'image/png', abortSignal: abort.signal })).rejects.toThrow();
  });
});
