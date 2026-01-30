import { describe, it, expect } from 'vitest';
import { createTask, checkStatus, getResult } from '../src/index.ts';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const grsaiApiKey = process.env.GRSAI_API_KEY;
const grsaiSuite = grsaiApiKey ? describe : describe.skip;

// Get output directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, 'output', 'grsai');

grsaiSuite('grsai provider (integration tests)', () => {
  const apiKey = process.env.GRSAI_API_KEY!;
  // baseURL and model are hardcoded in the test, not from environment variables
  const baseUrl = 'https://grsai.dakka.com.cn';
  const model = 'nano-banana-pro';
  const locator = `grsai:///${model}`;
  const platformConfig = { apiKey, baseURL: baseUrl };

  it(
    'creates task, polls status, and fetches result',
    async () => {
      const runInput = process.env.GRSAI_RUN_INPUT_JSON
        ? JSON.parse(process.env.GRSAI_RUN_INPUT_JSON)
        : { 
            prompt: 'a beautiful cat playing in the grass',
            aspectRatio: '1:1',
            imageSize: '1K'
          };

      // Prepare output directory
      mkdirSync(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = join(outputDir, `test-${timestamp}.json`);
      
      const testLog: any = {
        startTime: new Date().toISOString(),
        input: runInput,
        locator,
        baseUrl,
        model,
        logs: [],
      };

      function log(message: string, data?: any) {
        const logEntry = { time: new Date().toISOString(), message, data };
        testLog.logs.push(logEntry);
        console.log(message, data !== undefined ? data : '');
      }

      // Create task
      const created = await createTask({ locator, payload: runInput, platformConfig });
      expect(typeof created.taskId).toBe('string');
      expect(created.provider).toBe('grsai');
      testLog.taskId = created.taskId;
      testLog.createResult = created;
      log(`✓ Created task: ${created.taskId}`);

      // Poll status until completed
      let latestStatus = created;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await wait(3000);
        latestStatus = await checkStatus({
          locator,
          taskId: created.taskId,
          platformConfig,
        });
        log(`  Polling [${attempt + 1}/60]: status=${latestStatus.status}, progress=${latestStatus.progress || 0}%`);
        
        if (latestStatus.status === 'succeeded') break;
        if (latestStatus.status === 'failed' || latestStatus.status === 'cancelled') {
          testLog.endTime = new Date().toISOString();
          testLog.error = `Task ended with status=${latestStatus.status}`;
          testLog.finalStatus = latestStatus;
          writeFileSync(outputFile, JSON.stringify(testLog, null, 2));
          throw new Error(`Task ended with status=${latestStatus.status}`);
        }
      }

      expect(latestStatus.status).toBe('succeeded');

      // Get final result
      const result = await getResult({
        locator,
        taskId: created.taskId,
        platformConfig,
      });
      
      expect(Array.isArray(result.outputs)).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
      expect(result.outputs[0]?.url).toBeDefined();
      
      testLog.finalResult = result;
      testLog.endTime = new Date().toISOString();
      testLog.success = true;
      
      const urls = result.outputs.map(o => o.url).join(', ');
      log(`✓ Result URLs: ${urls}`);
      
      // Write output to file
      writeFileSync(outputFile, JSON.stringify(testLog, null, 2));
      log(`✓ Test output saved to: ${outputFile}`);
    },
    300_000 // 5 minutes timeout for image generation
  );
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
