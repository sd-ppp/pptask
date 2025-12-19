import Replicate from 'replicate';
const versionCache = new Map();
export function parseReplicateModel(url) {
    const owner = url.hostname;
    const model = url.pathname.replace(/^\//, '');
    if (!owner || !model) {
        throw new Error('replicate locator must be replicate://{owner}/{model}');
    }
    return `${owner}/${model}`;
}
export function ensureReplicateConfig(platformConfig) {
    const config = (platformConfig ?? {});
    const apiKey = config.apiKey;
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('replicate apiKey is required');
    }
    return { apiKey, version: config.version };
}
export function createReplicateClient(apiKey) {
    return new Replicate({ auth: apiKey });
}
export async function resolveModelVersion(client, model, apiKey, explicitVersion) {
    if (explicitVersion)
        return explicitVersion;
    const cacheKey = `${apiKey}:${model}`;
    if (versionCache.has(cacheKey))
        return versionCache.get(cacheKey);
    const [owner, name] = model.split('/');
    const modelInfo = await client.models.get(owner, name);
    const version = modelInfo?.latest_version?.id;
    versionCache.set(cacheKey, version);
    return version;
}
export async function getModelMetadata(client, model, apiKey) {
    const [owner, name] = model.split('/');
    const info = await client.models.get(owner, name);
    const version = info?.latest_version?.id;
    versionCache.set(`${apiKey}:${model}`, version);
    const defaultValues = info?.default_example?.input ?? {};
    return { modelInfo: info, defaultValues };
}
export function mapReplicateStatus(status) {
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
export function normalizeReplicateOutputs(prediction) {
    const output = prediction?.output;
    if (!Array.isArray(output)) {
        if (output)
            return [{ url: extractUrlCandidate(output), rawData: prediction }];
        return [];
    }
    return output.map((entry) => ({
        url: extractUrlCandidate(entry),
        rawData: entry,
    }));
}
export function extractReplicateProgress(prediction) {
    const progress = prediction?.metrics?.progress;
    if (typeof progress === 'number')
        return progress;
    const pct = prediction?.output?.progress;
    if (typeof pct === 'number')
        return pct;
    return undefined;
}
export function extractReplicateCost(prediction) {
    const coins = typeof prediction?.metrics?.tokens === 'number'
        ? prediction.metrics.tokens
        : typeof prediction?.billing?.credits === 'number'
            ? prediction.billing.credits
            : undefined;
    const money = typeof prediction?.metrics?.total_cost === 'number'
        ? prediction.metrics.total_cost
        : typeof prediction?.billing?.total === 'number'
            ? prediction.billing.total
            : undefined;
    const moneyCurrency = typeof prediction?.metrics?.currency === 'string'
        ? prediction.metrics.currency
        : typeof prediction?.billing?.currency === 'string'
            ? prediction.billing.currency
            : undefined;
    if (coins === undefined && money === undefined && moneyCurrency === undefined)
        return undefined;
    return { coins, money, moneyCurrency };
}
export function isRequestAborted(signal) {
    if (!signal)
        return false;
    if (signal instanceof AbortSignal)
        return signal.aborted;
    return Boolean(signal.aborted);
}
export function createAbortError(message) {
    try {
        return new DOMException(message, 'AbortError');
    }
    catch {
        const error = new Error(message);
        error.name = 'AbortError';
        return error;
    }
}
function extractUrlCandidate(entry) {
    if (!entry)
        return undefined;
    if (typeof entry === 'string')
        return entry;
    if (typeof entry === 'object') {
        if (typeof entry.url === 'string')
            return entry.url;
        if (Array.isArray(entry) && entry.length > 0) {
            return extractUrlCandidate(entry[0]);
        }
    }
    return undefined;
}
