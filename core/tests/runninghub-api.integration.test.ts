import { describe, it, expect } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
} from '../src/index.ts';

// 新 API 需要企业级共享 API Key，与旧 API 的 key 不同
const runninghubStandardApiKey = process.env.RUNNINGHUB_STANDARD_API_KEY;
const apiSuite = runninghubStandardApiKey ? describe : describe.skip;

apiSuite('runninghub-api provider (integration tests)', () => {
  const apiKey = process.env.RUNNINGHUB_STANDARD_API_KEY!;
  const modelPath = 'rhart-image-v1/text-to-image';
  const locator = `runninghub://api/${modelPath}`;
  const platformConfig = { apiKey };

  it('describes model schema', async () => {
    const result = await describeResource({ locator, platformConfig });
    expect(result.provider).toBe('runninghub-api');
    expect(result.formSchema).toBeDefined();
    expect(result.formSchema.properties.prompt).toBeDefined();
    expect(result.formSchema.properties.aspectRatio).toBeDefined();
    console.log(`✓ Model: ${modelPath}`);
  });

  it(
    'creates task, polls status, and fetches result',
    async () => {
      const testPayload = {
        prompt: 'A cute baby monkey with soft fur',
        aspectRatio: '3:4',
      };

      // 1. Create task
      const created = await createTask({
        locator,
        payload: testPayload,
        platformConfig,
      });
      
      expect(typeof created.taskId).toBe('string');
      expect(created.provider).toBe('runninghub-api');
      console.log(`✓ Created task: ${created.taskId}`);

      // 2. Poll status
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

      // 3. Get result
      const result = await getResult({
        locator,
        taskId: created.taskId,
        platformConfig,
      });
      
      expect(Array.isArray(result.outputs)).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
      expect(result.outputs[0].url).toMatch(/^https?:\/\//);
      console.log(`✓ Result URLs:`, result.outputs.map(o => o.url).join(', '));
    },
    180_000
  );
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
