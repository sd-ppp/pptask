import { describe, it, expect } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
} from '../src/index.ts';

const runninghubApiKey = process.env.RUNNINGHUB_API_KEY;
const runninghubSuite = runninghubApiKey ? describe : describe.skip;

runninghubSuite('runninghub provider (integration tests)', () => {
  const apiKey = process.env.RUNNINGHUB_API_KEY!;
  const webappId = process.env.RUNNINGHUB_WEBAPP_ID || 'template-123';
  const locator = `runninghub:///${webappId}`;
  const platformConfig = { apiKey };

  it('describes webapp template', async () => {
    const describeResult = await describeResource({ locator, platformConfig });
    expect(describeResult.provider).toBe('runninghub');
    expect(describeResult.formSchema).toBeDefined();
    expect(describeResult.recommendUploadProvider).toBe('runninghub');
    console.log(`✓ Webapp ID: ${webappId}`);
  });

  it(
    'creates task, polls status, and fetches result',
    async () => {
      const runInput = process.env.RUNNINGHUB_RUN_INPUT_JSON
        ? JSON.parse(process.env.RUNNINGHUB_RUN_INPUT_JSON)
        : { '1_prompt': 'a beautiful sunset' };

      const created = await createTask({ locator, payload: runInput, platformConfig });
      expect(typeof created.taskId).toBe('string');
      expect(created.provider).toBe('runninghub');
      console.log(`✓ Created task: ${created.taskId}`);

      let latestStatus = created;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await wait(3000);
        latestStatus = await checkStatus({
          locator,
          taskId: created.taskId,
          platformConfig,
        });
        console.log(`  Polling [${attempt + 1}/40]: status=${latestStatus.status}`);
        
        if (latestStatus.status === 'succeeded') break;
        if (latestStatus.status === 'failed' || latestStatus.status === 'cancelled') {
          throw new Error(`Task ended with status=${latestStatus.status}`);
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
      console.log(`✓ Result URLs:`, result.outputs.map(o => o.url).join(', '));
      
      // Check cost information
      if (result.costCoins !== undefined) {
        console.log(`  Cost: ${result.costCoins} coins`);
      }
      if (result.costMoney !== undefined) {
        console.log(`  Cost: ${result.costMoney} ${result.costMoneyCurrency || 'CNY'}`);
      }
    },
    180_000
  );
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
