import { describe, it, expect } from 'vitest';
import { describeResource, createTask, checkStatus, getResult } from '../src/index.ts';

const replicateApiKey = process.env.REPLICATE_API_KEY;
const replicateSuite = replicateApiKey ? describe : describe.skip;

replicateSuite('replicate integration (live)', () => {
  const apiKey = process.env.REPLICATE_API_KEY!;
  const model = process.env.REPLICATE_MODEL || 'stability-ai/sdxl';
  const locator = `replicate://${model}`;
  const platformConfig = { apiKey };

  it('describes model metadata', async () => {
    const describeResult = await describeResource({ locator, platformConfig });
    expect(describeResult.provider).toBe('replicate');
    expect(describeResult.metadata.model).toBe(model);
  });

  it(
    'creates task, polls status, fetches result',
    async () => {
      const runInput = process.env.REPLICATE_RUN_INPUT_JSON
        ? JSON.parse(process.env.REPLICATE_RUN_INPUT_JSON)
        : { prompt: 'a tranquil landscape painting' };

      const created = await createTask({ locator, payload: runInput, platformConfig });
      expect(typeof created.taskId).toBe('string');

      let latestStatus = created;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await wait(3000);
        latestStatus = await checkStatus({
          locator,
          taskId: created.taskId,
          platformConfig,
        });
        if (latestStatus.status === 'succeeded') break;
        if (latestStatus.status === 'failed' || latestStatus.status === 'cancelled') {
          throw new Error(`replicate task ended with status=${latestStatus.status}`);
        }
      }

      expect(latestStatus.status).toBe('succeeded');

      const result = await getResult({
        locator,
        taskId: created.taskId,
        platformConfig,
      });
      expect(Array.isArray(result.outputs)).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
    },
    180_000
  );
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
