import type {
  DescribeResult,
  TaskRequestOptions,
  TaskStatusResult,
  PlatformConfig,
} from '../../../core/src/types.ts';

export type SignalLike = TaskRequestOptions['signal'];

export type Reporter = {
  onStart?: (taskId: string, metadata?: Record<string, any>) => void;
  onProgress?: (taskId: string, progress: number, status?: string) => void;
  onFinish?: (taskId: string, outcome: 'completed' | 'failed' | 'cancelled', errorMessage?: string) => void;
};

export type RunOptions = {
  signal?: SignalLike;
  context?: Record<string, any>;
  reporter?: Reporter;
};

export type PlatformConfigSource =
  | PlatformConfig
  | ((locator: string) => PlatformConfig | undefined);

export type InlineExecutorConfig = {
  platformConfig?: PlatformConfigSource;
};

export type DelegateEndpoints = {
  describe: string;
  createTask: string;
  checkStatus: string;
  getResult: string;
  cancelTask: string;
  upload: string;
};

export type DescribeParams = {
  locator: string;
  options?: RunOptions;
};

export type RunParams = {
  locator: string;
  payload?: Record<string, any>;
  options?: RunOptions;
};

export type UploadParams = {
  locator?: string;
  uploadProvider?: string;
  formData: FormData;
  options?: RunOptions;
};

export interface TaskHandle<T = any> {
  taskId: string;
  promise: Promise<T>;
  cancelable: boolean;
  cancel: () => Promise<void>;
}

export interface InlineExecutor {
  describe(params: DescribeParams): Promise<DescribeResult>;
  run(params: RunParams): Promise<TaskHandle<any[]>>;
  upload(params: UploadParams): Promise<string>;
}

export type TaskRunReporter = Reporter;
