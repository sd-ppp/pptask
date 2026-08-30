import { describe, expect, it } from 'vitest';
import { createInlineExecutor } from '../../executors/inline/src/index.ts';

const ppioApiKey = process.env.PPIO_API_KEY;
const ppioSuite = ppioApiKey ? describe : describe.skip;

ppioSuite('ppio integration tests', () => {
  it(
    'generates an image with the PPIO Gemini-compatible API',
    async () => {
      const executor = createInlineExecutor({
        platformConfig: {
          apiKey: ppioApiKey!,
          baseURL: process.env.PPIO_BASE_URL,
          gptImageBaseURL: process.env.PPIO_GPT_IMAGE_BASE_URL,
          responseBaseURL: process.env.PPIO_RESPONSE_BASE_URL,
          apiVersion: process.env.PPIO_API_VERSION,
        },
      });

      const handle = await executor.run({
        locator: `ppio:///${process.env.PPIO_MODEL || 'gemini-2.5-flash-image'}`,
        payload: {
          prompt: 'Generate a small watercolor illustration of a yellow banana.',
          aspectRatio: '1:1',
          imageSize: '1K',
        },
      });

      const result = await handle.promise;
      expect(handle.cancelable).toBe(false);
      expect(result.provider).toBe('ppio');
      expect(result.status).toBe('succeeded');
      expect(result.outputs.some(output => output.url?.startsWith('data:image/'))).toBe(true);
    },
    300_000
  );
});
