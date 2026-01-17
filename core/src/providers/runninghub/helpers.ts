import { buildNodeInfoListFromValues } from './utils.ts';
import type {
  PlatformConfig,
  TaskOutput,
  TaskRequestOptions,
  TaskStatus,
} from '../../types.ts';

export type RunningHubConfig = {
  apiKey: string;
  language?: string;
};

export type RunninghubNodeTemplate = {
  nodeInfoTemplate: any[];
  defaultValues: Record<string, any>;
  rawData: any;
};

export function parseRunninghubWebappId(url: URL): string {
  // locator format: runninghub:///webapp-id (pathname only, three slashes)
  const webappId = url.pathname.replace(/^\//, '').trim();
  
  // Check if user used hostname instead of pathname (two slashes instead of three)
  if (!webappId && url.hostname) {
    throw new Error(
      `Invalid runninghub locator format. Found 'runninghub://${url.hostname}' (two slashes). ` +
      `Please use 'runninghub:///${url.hostname}' (three slashes) to specify the webapp ID in the pathname.`
    );
  }
  
  if (!webappId) {
    throw new Error('runninghub locator must include a webappId in pathname (e.g., runninghub:///app-123)');
  }
  
  return webappId;
}

export async function fetchRunninghubTemplate(
  webappId: string,
  config: RunningHubConfig
): Promise<RunninghubNodeTemplate> {
  const baseHost = getBaseHost(config.language);
  const apiUrl = `https://${baseHost}/api/webapp/apiCallDemo?apiKey=${config.apiKey}&webappId=${encodeURIComponent(
    webappId
  )}`;
  const response = await fetch(apiUrl, { headers: { Host: baseHost } });
  if (!response.ok) {
    throw new Error(`runninghub getNodes HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.code !== 0) {
    throw createRunningHubError('getNodes', payload);
  }
  const nodeInfoTemplate = Array.isArray(payload?.data?.nodeInfoList) ? payload.data.nodeInfoList : [];
  const defaultValues = buildRunninghubDefaults(nodeInfoTemplate);
  return {
    nodeInfoTemplate,
    defaultValues,
    rawData: payload,
  };
}

export function buildRunninghubDefaults(nodeInfoList: any[]): Record<string, any> {
  const defaults: Record<string, any> = {};
  nodeInfoList.forEach(node => {
    const key = `${node.nodeId}_${node.fieldName}`;
    defaults[key] = node.fieldValue;
  });
  return defaults;
}

export function buildRunninghubNodeInfoList(
  template: RunninghubNodeTemplate,
  payload: Record<string, any>
): any[] {
  return buildNodeInfoListFromValues(
    template.nodeInfoTemplate,
    payload,
    template.defaultValues
  );
}

export function getBaseHost(language?: string): string {
  return language && language !== 'en-US' ? 'www.runninghub.cn' : 'www.runninghub.ai';
}

export function ensureRunninghubConfig(platformConfig: PlatformConfig | undefined): RunningHubConfig {
  const config = (platformConfig ?? {}) as RunningHubConfig;
  const apiKey = config.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('runninghub apiKey is required');
  }
  const language =
    config.language && typeof config.language === 'string'
      ? config.language
      : undefined;
  return { apiKey, language };
}

export function extractRunninghubStatus(payload: any): string | undefined {
  const data = payload?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.status === 'string') return data.status;
  if (typeof data?.taskStatus === 'string') return data.taskStatus;
  if (typeof data?.state === 'string') return data.state;
  return undefined;
}

export function extractRunninghubProgress(payload: any): number | undefined {
  const data = payload?.data;
  if (typeof data?.progress === 'number') return data.progress;
  if (typeof data?.taskProgress === 'number') return data.taskProgress;
  return undefined;
}

export function extractRunninghubCost(payload: any):
  | { coins?: number; money?: number; moneyCurrency?: string }
  | undefined {
  const data = payload?.data;
  const items = Array.isArray(data) ? data : undefined;
  if (items && items.length > 0) {
    let coinsTotal = 0;
    let moneyTotal = 0;
    let hasCoins = false;
    let hasMoney = false;
    for (const entry of items) {
      const coins = parseNumber(entry?.consumeCoins ?? entry?.deductCredits ?? entry?.consumedCredits);
      if (coins !== undefined) {
        coinsTotal += coins;
        hasCoins = true;
      }
      const money = parseNumber(
        entry?.thirdPartyConsumeMoney ?? entry?.consumeMoney ?? entry?.deductMoney ?? entry?.consumedMoney
      );
      if (money !== undefined) {
        moneyTotal += money;
        hasMoney = true;
      }
    }
    if (!hasCoins && !hasMoney) return undefined;
    return {
      coins: hasCoins ? coinsTotal : undefined,
      money: hasMoney ? moneyTotal : undefined,
      moneyCurrency: hasMoney ? 'CNY' : undefined,
    };
  }
  const aggregate = typeof data === 'object' && data !== null ? data : {};
  const coins = parseNumber(
    aggregate.deductCredits ?? aggregate.consumedCredits ?? aggregate.consumeCoins ?? aggregate.consumeCredit
  );
  const money = parseNumber(
    aggregate.thirdPartyConsumeMoney ?? aggregate.consumeMoney ?? aggregate.deductMoney ?? aggregate.consumedMoney
  );
  const currency =
    typeof aggregate.currency === 'string'
      ? aggregate.currency
      : typeof aggregate.creditUnit === 'string'
        ? aggregate.creditUnit
        : money !== undefined
          ? 'CNY'
          : undefined;
  if (coins === undefined && money === undefined && currency === undefined) return undefined;
  return {
    coins,
    money,
    moneyCurrency: currency,
  };
}

export function normalizeRunninghubOutputs(data: any): TaskOutput[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.outputs)
      ? data.outputs
      : Array.isArray(data?.resultList)
        ? data.resultList
        : undefined;
  if (!list) return [];
  return list.map((entry: any) => ({
    url: entry?.fileUrl ?? entry?.url,
    rawData: entry,
  }));
}

export function mapRunninghubStatus(status: string | undefined): TaskStatus {
  const normalized = String(status || '').toUpperCase();
  switch (normalized) {
    case 'INIT':
    case 'WAITING':
    case 'QUEUED':
      return 'pending';
    case 'RUNNING':
    case 'PROCESSING':
    case 'EXECUTING':
      return 'running';
    case 'SUCCESS':
    case 'SUCCEEDED':
    case 'DONE':
      return 'succeeded';
    case 'FAILED':
    case 'ERROR':
      return 'failed';
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'pending';
  }
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

export function createRunningHubError(context: string, payload: any): Error {
  const code = payload?.code;
  const msg =
    payload?.msg ??
    payload?.message ??
    payload?.error ??
    payload?.errorMessage ??
    payload?.errorMsg ??
    payload?.data?.msg ??
    payload?.data?.message;
  const detail =
    payload?.data?.errorMsg ??
    payload?.data?.errorMessage ??
    payload?.data?.failReason ??
    payload?.data?.failMessage ??
    payload?.data?.message ??
    payload?.data?.reason;
  const segments = [`RunningHub ${context} failed`];
  if (typeof code !== 'undefined') segments.push(`code=${code}`);
  if (msg) segments.push(`msg=${msg}`);
  if (detail && detail !== msg) segments.push(`detail=${detail}`);
  const error = new Error(segments.join('; '));
  (error as any).payload = payload;
  return error;
}

export function buildRunninghubPayload(
  template: RunninghubNodeTemplate,
  payload: Record<string, any>
): { nodeInfoList: any[]; defaultValues: Record<string, any> } {
  const nodeInfoList = buildRunninghubNodeInfoList(template, payload);
  return { nodeInfoList, defaultValues: template.defaultValues };
}

function parseNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
