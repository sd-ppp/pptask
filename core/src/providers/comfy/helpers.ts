import type { PlatformConfig, TaskStatus } from '../../types.ts';

export type ComfyConfig = {
  // No authentication required
};

/**
 * Parse comfy locator URL
 * Format: comfy-http://server-url/workflow-id
 * Example: comfy-http://localhost:8188/workflow-123
 */
export function parseComfyLocator(url: URL): {
  serverUrl: string;
  workflowId: string;
} {
  // hostname + port = server address
  const serverUrl = url.port 
    ? `${url.hostname}:${url.port}`
    : url.hostname;
  
  // pathname = workflow id
  const workflowId = url.pathname.replace(/^\//, '').trim();
  
  if (!serverUrl) {
    throw new Error(
      'comfy locator must include server URL. ' +
      'Example: comfy-http://localhost:8188/workflow-123'
    );
  }
  
  if (!workflowId) {
    throw new Error(
      'comfy locator must include workflow ID. ' +
      'Example: comfy-http://localhost:8188/workflow-123'
    );
  }
  
  return { serverUrl, workflowId };
}

/**
 * Ensure platform config (no auth required for comfy)
 */
export function ensureComfyConfig(platformConfig: PlatformConfig | undefined): ComfyConfig {
  // No authentication required
  return {};
}

/**
 * Map ComfyUI status to standard TaskStatus
 */
export function mapComfyStatus(comfyStatus: string | undefined): TaskStatus {
  // TODO: Implement based on actual ComfyUI status values
  const normalized = String(comfyStatus || '').toLowerCase();
  
  switch (normalized) {
    case 'completed':
    case 'success':
      return 'succeeded';
    
    case 'failed':
    case 'error':
      return 'failed';
    
    case 'running':
    case 'processing':
    case 'executing':
      return 'running';
    
    case 'pending':
    case 'queued':
    case 'waiting':
      return 'pending';
    
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    
    default:
      return 'pending';
  }
}

/**
 * Build ComfyUI server base URL
 */
export function buildComfyBaseUrl(serverUrl: string, https: boolean = false): string {
  const protocol = https ? 'https' : 'http';
  return `${protocol}://${serverUrl}`;
}
