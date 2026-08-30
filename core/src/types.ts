export type ProviderScheme = string;

export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type SignalLike = AbortSignal | { aborted?: boolean } | undefined;

export type TaskRequestOptions = {
  signal?: SignalLike;
};

export type PlatformConfig = Record<string, any>;

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

export type TaskCreateResult = {
  provider: ProviderScheme;
  taskId: string;
  status: TaskStatus;
  raw: any;
  metadata?: Record<string, any>;
};

export type TaskStatusResult = {
  provider: ProviderScheme;
  taskId: string;
  status: TaskStatus;
  progress?: number;
  raw: any;
};

export type TaskResult = {
  provider: ProviderScheme;
  taskId: string;
  status: Extract<TaskStatus, 'succeeded'>;
  outputs: TaskOutput[];
  costCoins?: number;
  costMoney?: number;
  costMoneyCurrency?: string;
  raw: any;
};

export type TaskExecutionResult =
  | {
      mode: 'sync';
      result: TaskResult;
    }
  | {
      mode: 'async';
      task: TaskCreateResult;
    };

export type TaskOutput = {
  url?: string;
  rawData: any;
  [key: string]: any;
};

export type DescribeResult = {
  provider: ProviderScheme;
  metadata: {
    scheme: ProviderScheme;
    [key: string]: any;
  };
  formSchema: FormilySchema;
  formValues: Record<string, any>;
  recommendUploadProvider?: string;
  cancelable?: boolean;
};

export type UploadResult = {
  provider: ProviderScheme;
  url: string;
  raw: any;
};

export type CancelCapabilityParams = {
  locator: string;
};

export type ProviderDefinition = {
  describeResource(params: DescribeParams): Promise<DescribeResult>;

  // The provider selects the protocol internally and returns a tagged result.
  createTask: (params: TaskCreateParams) => Promise<TaskExecutionResult>;

  // Deprecated compatibility aliases. New code should use createTask.
  getExecutionMode?: (params: TaskCreateParams) => 'sync' | 'async';
  createTaskSync?: (params: TaskCreateParams) => Promise<TaskResult>;
  createTaskAsync?: (params: TaskCreateParams) => Promise<TaskCreateResult>;
  checkStatus?: (params: TaskCheckParams) => Promise<TaskStatusResult>;
  getResult?: (params: TaskResultParams) => Promise<TaskResult>;
  cancelTask?: (params: TaskCheckParams) => Promise<void>;

  /**
   * Locator-aware cancellation capability check. A provider may implement
   * `cancelTask` while only actually supporting it for some locators (e.g.
   * RunningHub's legacy `app` API supports remote cancellation but its newer
   * `api` API does not). When defined, this takes precedence over merely
   * checking whether `cancelTask` is a function.
   */
  canCancelTask?: (params: CancelCapabilityParams) => boolean;
};

export type UploadProviderDefinition = {
  upload(params: UploadParams): Promise<UploadResult>;
};

export type FormilyFieldSchema = Record<string, any>;

export type FormilySchema = {
  type: 'object';
  properties: Record<string, FormilyFieldSchema>;
  [key: string]: any;
};
