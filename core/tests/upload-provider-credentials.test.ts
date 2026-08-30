import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadGrsaiZHFile } from '../src/upload-providers/grsai/upload.ts';
import { uploadRunninghubFile } from '../src/upload-providers/runninghub/upload.ts';
import { checkRunninghubStatus } from '../src/providers/runninghub/app/api.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('upload provider credentials', () => {
  it('uses the configured RunningHub API key', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ code: 0, data: { fileName: 'uploaded.png' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.set('file', new Blob(['image']), 'input.png');

    await uploadRunninghubFile(formData, {
      apiKey: 'configured-runninghub-key',
      language: 'en',
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((request.body as FormData).get('apiKey')).toBe('configured-runninghub-key');
  });

  it('requires a RunningHub API key instead of falling back to a bundled value', async () => {
    const formData = new FormData();
    formData.set('file', new Blob(['image']), 'input.png');

    await expect(uploadRunninghubFile(formData, {})).rejects.toThrow(/apiKey/);
  });

  it('uses configured Grsai upload credentials and base URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            url: 'https://upload.example.test',
            token: 'upload-token',
            key: 'assets/input.png',
            domain: 'https://cdn.example.test',
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.set('file', new Blob(['image']), 'input.png');

    await uploadGrsaiZHFile(formData, {
      apiKey: 'provider-key',
      uploadApiKey: 'configured-upload-key',
      baseUrl: 'https://api.example.test',
      uploadBaseUrl: 'https://upload-api.example.test/',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://upload-api.example.test/client/resource/newUploadTokenZH',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer configured-upload-key',
      }),
    });
  });

  it('does not log RunningHub API keys during status polling', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('stop after log');
    }));

    await expect(
      checkRunninghubStatus(
        new URL('runninghub://app/demo'),
        'task-1',
        { apiKey: 'do-not-log-this-key' },
      ),
    ).rejects.toThrow('stop after log');

    expect(JSON.stringify(debug.mock.calls)).not.toContain('do-not-log-this-key');
    debug.mockRestore();
  });
});
