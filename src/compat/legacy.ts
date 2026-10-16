import { uploadWithBuiltinProvider } from './providers.ts';

export type ProviderScheme = string;
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type SignalLike = AbortSignal | { aborted?: boolean } | undefined;

export type Reporter = {
  onStage?: (stage: string, detail?: Record<string, any>) => void;
  onStart?: (taskId: string, metadata?: Record<string, any>) => void;
  onProgress?: (taskId: string, progress: number, status?: string) => void;
  onFinish?: (
    taskId: string,
    outcome: 'completed' | 'failed' | 'cancelled',
    errorMessage?: string,
  ) => void;
};

export type TaskRequestOptions = {
  signal?: SignalLike;
  idempotencyKey?: string;
  reporter?: Reporter;
  metadata?: Record<string, unknown>;
};

export type PlatformConfig = Record<string, any>;
export type FormilyFieldSchema = Record<string, any>;
export type FormilySchema = {
  type: 'object';
  properties: Record<string, FormilyFieldSchema>;
  [key: string]: any;
};

export type TaskInputSemantic =
  | 'prompt'
  | 'reference-image'
  | 'reference-video'
  | 'reference-audio';

export type TaskInputBinding = {
  field: string;
  semantic: TaskInputSemantic;
  valueFormat?: 'url' | 'reference';
  required?: boolean;
  multiple?: boolean;
  maxItems?: number;
};

export type ResourceDescriptor = {
  id: string;
  locator: string;
  title: string;
  description?: string;
  mediaKind?: string;
  operations?: readonly string[];
  revision?: string;
};

export type TaskCreateParams = {
  locator: string;
  payload?: Record<string, any>;
  platformConfig?: PlatformConfig;
  options?: TaskRequestOptions;
};

export type TaskCheckParams = {
  locator: string;
  taskId: string;
  platformConfig?: PlatformConfig;
  options?: TaskRequestOptions;
};

export type TaskResultParams = TaskCheckParams;

export type DescribeParams = {
  locator: string;
  platformConfig?: PlatformConfig;
  options?: TaskRequestOptions;
};

export type UploadParams = {
  locator?: string;
  uploadProvider: string;
  formData: FormData;
  platformConfig?: PlatformConfig;
  options?: TaskRequestOptions;
};

export type TaskOutput = {
  url?: string;
  rawData?: unknown;
  [key: string]: any;
};

export type TaskResult = {
  provider: ProviderScheme;
  taskId: string;
  status: Extract<TaskStatus, 'succeeded'>;
  outputs: TaskOutput[];
  usage?: {
    input?: number;
    thoughts?: number;
    output?: number;
    [key: string]: number | undefined;
  };
  costCoins?: number;
  costMoney?: number;
  costMoneyCurrency?: string;
  raw?: unknown;
};

export type TaskCreateResult = {
  provider: ProviderScheme;
  taskId: string;
  status: TaskStatus;
  raw?: unknown;
  result?: TaskResult;
  metadata?: Record<string, any>;
};

export type TaskStatusResult = {
  provider: ProviderScheme;
  taskId: string;
  status: TaskStatus;
  progress?: number;
  raw?: unknown;
};

export type TaskExecutionResult =
  | { mode: 'sync'; result: TaskResult }
  | { mode: 'async'; task: TaskCreateResult };

export type DescribeResult = {
  provider: ProviderScheme;
  metadata: { scheme: ProviderScheme; [key: string]: any };
  protocolVersion?: 'pptask.describe/v1' | string;
  schemaVersion?: string;
  resource?: ResourceDescriptor;
  bindings?: readonly TaskInputBinding[];
  formSchema: FormilySchema;
  formValues: Record<string, any>;
  recommendUploadProvider?: string;
  cancelable?: boolean;
};

export type UploadResult = {
  provider: ProviderScheme;
  url: string;
  raw?: unknown;
};

export type ProviderDefinition = {
  describeResource?: (params: DescribeParams) => Promise<DescribeResult>;
  createTask?: (params: TaskCreateParams) => Promise<TaskExecutionResult>;
  getExecutionMode?: (params: TaskCreateParams) => 'sync' | 'async';
  createTaskSync?: (params: TaskCreateParams) => Promise<TaskResult>;
  createTaskAsync?: (params: TaskCreateParams) => Promise<TaskCreateResult>;
  checkStatus?: (params: TaskCheckParams) => Promise<TaskStatusResult>;
  getResult?: (params: TaskResultParams) => Promise<TaskResult>;
  cancelTask?: (params: TaskCheckParams) => Promise<void>;
  canCancelTask?: (params: { locator: string }) => boolean;
};

export type UploadProviderDefinition = {
  upload(params: UploadParams): Promise<UploadResult>;
};

const providers = new Map<string, ProviderDefinition>();
const uploadProviders = new Map<string, UploadProviderDefinition>();

function normalizeScheme(value: string): string {
  return value.trim().toLowerCase().replace(/:$/, '');
}

export function registerProvider(scheme: string, definition: ProviderDefinition): void {
  providers.set(normalizeScheme(scheme), definition);
}

export function unregisterProvider(scheme: string): void {
  providers.delete(normalizeScheme(scheme));
}

export function getProvider(scheme: string): ProviderDefinition | undefined {
  return providers.get(normalizeScheme(scheme));
}

export function listProviders(): ProviderScheme[] {
  return [...providers.keys()];
}

export function registerUploadProvider(
  scheme: string,
  definition: UploadProviderDefinition,
): void {
  uploadProviders.set(normalizeScheme(scheme), definition);
}

export function getUploadProvider(scheme: string): UploadProviderDefinition | undefined {
  return uploadProviders.get(normalizeScheme(scheme));
}

export function listUploadProviders(): ProviderScheme[] {
  return [...uploadProviders.keys()];
}

export async function upload(params: UploadParams): Promise<UploadResult> {
  const scheme = normalizeScheme(params.uploadProvider);
  const registered = getUploadProvider(scheme);
  if (registered) {
    const { raw: _raw, ...result } = await registered.upload(params);
    return result;
  }
  return uploadWithBuiltinProvider(scheme, params);
}
