import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  cancelTask,
  upload,
  listProviders,
} from '../src/index.ts';
import {
  parseComfyLocator,
  mapComfyStatus,
  buildComfyBaseUrl,
} from '../src/providers/comfy/helpers.ts';

const locator = 'comfy-http://localhost:8188/workflow-123';

describe('comfy provider (unit tests)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('helpers', () => {
    it('parses comfy locator', () => {
      const url = new URL(locator);
      const result = parseComfyLocator(url);
      
      expect(result.serverUrl).toBe('localhost:8188');
      expect(result.workflowId).toBe('workflow-123');
    });

    it('parses comfy locator without port', () => {
      const url = new URL('comfy-http://myserver.com/workflow-456');
      const result = parseComfyLocator(url);
      
      expect(result.serverUrl).toBe('myserver.com');
      expect(result.workflowId).toBe('workflow-456');
    });

    it('throws error for missing workflow id', () => {
      const url = new URL('comfy-http://localhost:8188/');
      expect(() => parseComfyLocator(url)).toThrow(/workflow ID/);
    });

    it('maps comfy status values', () => {
      expect(mapComfyStatus('completed')).toBe('succeeded');
      expect(mapComfyStatus('success')).toBe('succeeded');
      expect(mapComfyStatus('failed')).toBe('failed');
      expect(mapComfyStatus('error')).toBe('failed');
      expect(mapComfyStatus('running')).toBe('running');
      expect(mapComfyStatus('processing')).toBe('running');
      expect(mapComfyStatus('pending')).toBe('pending');
      expect(mapComfyStatus('queued')).toBe('pending');
      expect(mapComfyStatus('cancelled')).toBe('cancelled');
      expect(mapComfyStatus(undefined)).toBe('pending');
    });

    it('builds comfy base URL', () => {
      expect(buildComfyBaseUrl('localhost:8188')).toBe('http://localhost:8188');
      expect(buildComfyBaseUrl('localhost:8188', true)).toBe('https://localhost:8188');
      expect(buildComfyBaseUrl('myserver.com', false)).toBe('http://myserver.com');
    });
  });

  describe('provider registration', () => {
    it('is registered as a provider', () => {
      const providers = listProviders();
      expect(providers).toContain('comfy-http');
      expect(providers).toContain('comfy-https');
    });
  });

  describe('API functions (stubbed)', () => {
    it('describeResource throws not implemented', async () => {
      await expect(describeResource({ locator, platformConfig: {} })).rejects.toThrow(
        /not implemented/
      );
    });

    it('createTask posts to /prompt', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ prompt_id: 'task-123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      const created = await createTask({
        locator,
        payload: { prompt: { '1': { class_type: 'EmptyLatentImage', inputs: {} } } },
        platformConfig: {},
      });

      expect(created.taskId).toBe('task-123');
      expect(created.status).toBe('pending');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/prompt'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('checkStatus reads history status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            'task-123': { status: { status_str: 'success' } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const status = await checkStatus({ locator, taskId: 'task-123', platformConfig: {} });
      expect(status.status).toBe('succeeded');
    });

    it('getResult normalizes output URLs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            'task-123': {
              status: { status_str: 'success' },
              outputs: {
                '9': {
                  images: [{ filename: 'test.png', subfolder: '', type: 'output' }],
                },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await getResult({ locator, taskId: 'task-123', platformConfig: {} });
      expect(result.status).toBe('succeeded');
      expect(result.outputs.length).toBe(1);
      expect(result.outputs[0].url).toContain('/view?filename=test.png');
    });

    it('upload returns view URL', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'upload.png', subfolder: '', type: 'input' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const formData = new FormData();
      formData.append('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

      const result = await upload({
        uploadProvider: 'comfy-http',
        locator,
        formData,
        platformConfig: {},
      });

      expect(result.url).toContain('/view?filename=upload.png');
    });

    it('cancelTask sends interrupt and queue delete', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );

      await cancelTask({ locator, taskId: 'task-123', platformConfig: {} });
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
