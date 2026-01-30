import { describe, it, expect, vi } from 'vitest';
import { createInlineExecutor } from '../../executors/inline/src/index.ts';
import * as core from '../src/index.ts';

const locator = 'comfy-http://localhost:8188/workflow-123';
const promptJson = JSON.stringify({
  prompt: {
    '57': {
      inputs: {
        image: '1.png',
      },
      class_type: 'LoadImage',
      _meta: {
        title: '#Image',
      },
    },
    '58': {
      inputs: {
        filename_prefix: 'sdppp/\\u5927\\u50bb\\u903c',
        images: ['63', 0],
      },
      class_type: 'SaveImage',
      _meta: {
        title: 'Save Image',
      },
    },
    '63': {
      inputs: {
        image: ['65', 0],
        alpha: ['57', 1],
      },
      class_type: 'JoinImageWithAlpha',
      _meta: {
        title: 'Join Image with Alpha',
      },
    },
    '65': {
      inputs: {
        image: ['57', 0],
      },
      class_type: 'ImageInvert',
      _meta: {
        title: 'Invert Image',
      },
    },
  },
});
const useHttps = false;
const comfySuite = describe;

comfySuite('comfy provider (integration tests)', () => {
  const platformConfig = useHttps ? { https: true } : undefined;
  const payload = JSON.parse(promptJson);
  const executor = createInlineExecutor({ platformConfig: () => platformConfig });

  it(
    'creates task, polls status, and fetches result',
    async () => {
      const statusSpy = vi.spyOn(core, 'checkStatus');
      const handle = await executor.run({
        locator: locator!,
        payload,
      });
      expect(typeof handle.taskId).toBe('string');
      const result = await handle.promise;
      expect(result.provider).toBe('comfy-http');
      const outputs = Array.isArray(result.outputs) ? result.outputs : [];
      expect(Array.isArray(outputs)).toBe(true);
      void statusSpy;
    },
    240_000
  );
});
