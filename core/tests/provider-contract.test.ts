import { describe, expect, it } from 'vitest';
import { createPptask } from '../src/index.ts';
import type { ProviderDefinition } from '../src/types.ts';

describe('pptask public provider contract', () => {
  it('uses an empty registry until providers are explicitly registered', () => {
    const pptask = createPptask();
    expect(pptask.listProviders()).toEqual([]);
    expect(pptask.listUploadProviders()).toEqual([]);
  });

  it('normalizes describe metadata and infers compatible input bindings', async () => {
    const pptask = createPptask();
    pptask.registerProvider('custom', providerDefinition());

    const result = await pptask.describeResource({ locator: 'custom:///image-1' });

    expect(result.protocolVersion).toBe('pptask.describe/v1');
    expect(result.schemaVersion).toBe('1');
    expect(result.resource).toMatchObject({
      id: 'custom:///image-1',
      locator: 'custom:///image-1',
    });
    expect(result.bindings).toEqual([
      { field: 'prompt', semantic: 'prompt' },
      { field: 'images', semantic: 'reference-image' },
    ]);
  });

  it('returns sync results directly and never puts outputs in metadata', async () => {
    const pptask = createPptask();
    pptask.registerProvider('custom', providerDefinition('sync'));

    const result = await pptask.createTask({
      locator: 'custom:///image-1',
      payload: { prompt: 'test' },
    });

    expect(result).toMatchObject({
      provider: 'custom',
      taskId: 'sync-task',
      status: 'succeeded',
      metadata: { syncCompleted: true },
      result: {
        status: 'succeeded',
        outputs: [{ url: 'https://files.example/output.png' }],
      },
    });
    expect(result.metadata).not.toHaveProperty('outputs');
    expect(result).not.toHaveProperty('raw');
    expect(result.result).not.toHaveProperty('raw');
    expect(result.result?.outputs[0]).not.toHaveProperty('rawData');
  });

  it('sanitizes async create, status, result, and upload responses', async () => {
    const pptask = createPptask();
    pptask.registerProvider('custom', providerDefinition());
    pptask.registerUploadProvider('custom', {
      async upload() {
        return { provider: 'custom', url: 'https://files.example/input.png', raw: { token: 'secret' } };
      },
    });

    const created = await pptask.createTask({ locator: 'custom:///image-1' });
    const status = await pptask.checkStatus({ locator: 'custom:///image-1', taskId: 'async-task' });
    const result = await pptask.getResult({ locator: 'custom:///image-1', taskId: 'async-task' });
    const uploaded = await pptask.upload({ uploadProvider: 'custom', formData: new FormData() });

    expect(created).not.toHaveProperty('raw');
    expect(status).toEqual({ provider: 'custom', taskId: 'async-task', status: 'succeeded', progress: 1 });
    expect(status).not.toHaveProperty('raw');
    expect(result).toEqual({
      provider: 'custom',
      taskId: 'async-task',
      status: 'succeeded',
      outputs: [{ url: 'https://files.example/output.png' }],
    });
    expect(result).not.toHaveProperty('raw');
    expect(result.outputs[0]).not.toHaveProperty('rawData');
    expect(uploaded).toEqual({ provider: 'custom', url: 'https://files.example/input.png' });
    expect(uploaded).not.toHaveProperty('raw');
  });
});

function providerDefinition(mode: 'async' | 'sync' = 'async'): ProviderDefinition {
  return {
    async describeResource() {
      return {
        provider: 'custom',
        metadata: { scheme: 'custom' },
        formSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            images: { type: 'array' },
          },
        },
        formValues: { prompt: '', images: [] },
      };
    },
    async createTask() {
      if (mode === 'sync') {
        return {
          mode: 'sync',
          result: {
            provider: 'custom',
            taskId: 'sync-task',
            status: 'succeeded',
            outputs: [{ url: 'https://files.example/output.png', rawData: { secret: true } }],
            raw: { secret: true },
          },
        };
      }
      return {
        mode: 'async',
        task: { provider: 'custom', taskId: 'async-task', status: 'pending', raw: { secret: true } },
      };
    },
    async checkStatus() {
      return { provider: 'custom', taskId: 'async-task', status: 'succeeded', progress: 1, raw: { secret: true } };
    },
    async getResult() {
      return {
        provider: 'custom',
        taskId: 'async-task',
        status: 'succeeded',
        outputs: [{ url: 'https://files.example/output.png', rawData: { secret: true } }],
        raw: { secret: true },
      };
    },
    async cancelTask() {},
  };
}
