import Replicate from 'replicate';
import type { PlatformConfig, TaskOutput, TaskRequestOptions, TaskStatus } from '../../types.ts';

export type ReplicateConfig = {
  apiKey: string;
  version?: string;
};

const versionCache = new Map<string, string | undefined>();

export function parseReplicateModel(url: URL): string {
  // locator format: replicate:///owner/model (pathname only, three slashes)
  const pathname = url.pathname.replace(/^\//, '');
  
  // Check if user used hostname (two slashes instead of three)
  if (!pathname && url.hostname) {
    throw new Error(
      `Invalid replicate locator format. Found 'replicate://${url.hostname}' (two slashes). ` +
      `Please use 'replicate:///${url.hostname}/model' (three slashes) to specify owner/model in the pathname.`
    );
  }
  
  // Split pathname into owner and model
  const parts = pathname.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error('replicate locator must be replicate:///owner/model (e.g., replicate:///black-forest-labs/flux-schnell)');
  }
  
  const owner = parts[0];
  const model = parts.slice(1).join('/'); // Support models with slashes in name
  
  return `${owner}/${model}`;
}

export function ensureReplicateConfig(platformConfig: PlatformConfig | undefined): ReplicateConfig {
  const config = (platformConfig ?? {}) as ReplicateConfig;
  const apiKey = config.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('replicate apiKey is required');
  }
  return { apiKey, version: config.version };
}

export function createReplicateClient(apiKey: string): Replicate {
  return new Replicate({ auth: apiKey });
}

export async function resolveModelVersion(
  client: Replicate,
  model: string,
  apiKey: string,
  explicitVersion?: string
): Promise<string | undefined> {
  if (explicitVersion) return explicitVersion;
  const cacheKey = `${apiKey}:${model}`;
  if (versionCache.has(cacheKey)) return versionCache.get(cacheKey);
  const [owner, name] = model.split('/');
  const modelInfo: any = await client.models.get(owner, name);
  const version = modelInfo?.latest_version?.id;
  versionCache.set(cacheKey, version);
  return version;
}

export async function getModelMetadata(
  client: Replicate,
  model: string,
  apiKey: string
): Promise<{ modelInfo: any; defaultValues: Record<string, any> }> {
  const [owner, name] = model.split('/');
  const info: any = await client.models.get(owner, name);
  const version = info?.latest_version?.id;
  versionCache.set(`${apiKey}:${model}`, version);
  const defaultValues: Record<string, any> = info?.default_example?.input ?? {};
  return { modelInfo: info, defaultValues };
}

export function mapReplicateStatus(status: string | undefined): TaskStatus {
  const normalized = String(status || '').toLowerCase();
  switch (normalized) {
    case 'starting':
    case 'queued':
      return 'pending';
    case 'processing':
    case 'running':
      return 'running';
    case 'succeeded':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function normalizeReplicateOutputs(prediction: any): TaskOutput[] {
  const output = prediction?.output;
  if (!Array.isArray(output)) {
    if (output) return [{ url: extractUrlCandidate(output), rawData: prediction }];
    return [];
  }
  return output.map((entry: any) => ({
    url: extractUrlCandidate(entry),
    rawData: entry,
  }));
}

export function extractReplicateProgress(prediction: any): number | undefined {
  const progress = prediction?.metrics?.progress;
  if (typeof progress === 'number') return progress;
  const pct = prediction?.output?.progress;
  if (typeof pct === 'number') return pct;
  return undefined;
}

export function extractReplicateCost(prediction: any):
  | { coins?: number; money?: number; moneyCurrency?: string }
  | undefined {
  const coins =
    typeof prediction?.metrics?.tokens === 'number'
      ? prediction.metrics.tokens
      : typeof prediction?.billing?.credits === 'number'
        ? prediction.billing.credits
        : undefined;
  const money =
    typeof prediction?.metrics?.total_cost === 'number'
      ? prediction.metrics.total_cost
      : typeof prediction?.billing?.total === 'number'
        ? prediction.billing.total
        : undefined;
  const moneyCurrency =
    typeof prediction?.metrics?.currency === 'string'
      ? prediction.metrics.currency
      : typeof prediction?.billing?.currency === 'string'
        ? prediction.billing.currency
        : undefined;
  if (coins === undefined && money === undefined && moneyCurrency === undefined) return undefined;
  return { coins, money, moneyCurrency };
}

export function isRequestAborted(signal: TaskRequestOptions['signal']): boolean {
  if (!signal) return false;
  if (signal instanceof AbortSignal) return signal.aborted;
  return Boolean(signal.aborted);
}

export function createAbortError(message: string): DOMException {
  try {
    return new DOMException(message, 'AbortError');
  } catch {
    const error = new Error(message);
    (error as any).name = 'AbortError';
    return error as any;
  }
}

function extractUrlCandidate(entry: any): string | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object') {
    if (typeof entry.url === 'string') return entry.url;
    if (Array.isArray(entry) && entry.length > 0) {
      return extractUrlCandidate(entry[0]);
    }
  }
  return undefined;
}
