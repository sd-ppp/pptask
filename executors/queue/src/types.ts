import type {
  DescribeResult,
  TaskCreateResult,
  TaskResult,
  TaskStatusResult,
  UploadResult,
  SignalLike,
  PlatformConfig,
} from '../../../core/src/types.ts';

export type ExecutionContext = Record<string, any>;

export type ExecutionOperation =
  | 'describe'
  | 'createTask'
  | 'checkStatus'
  | 'getResult'
  | 'cancelTask'
  | 'upload';

export type ExecutionOptions = {
  signal?: SignalLike;
  context?: ExecutionContext;
};

export type ExecutionResult<T> = {
  operation: ExecutionOperation;
  locator: string;
  platformConfig?: PlatformConfig;
  context?: ExecutionContext;
  data: T;
};

export type DescribeExecutionParams = {
  locator: string;
  platformConfig?: PlatformConfig;
  options?: ExecutionOptions;
};

export type CreateTaskExecutionParams = {
  locator: string;
  payload?: Record<string, any>;
  platformConfig?: PlatformConfig;
  options?: ExecutionOptions;
};

export type CheckStatusExecutionParams = {
  locator: string;
  taskId: string;
  platformConfig?: PlatformConfig;
  options?: ExecutionOptions;
};

export type GetResultExecutionParams = CheckStatusExecutionParams;

export type CancelTaskExecutionParams = CheckStatusExecutionParams;

export type UploadExecutionParams = {
  locator?: string;
  uploadProvider?: string;
  formData: FormData;
  platformConfig?: PlatformConfig;
  options?: ExecutionOptions;
};

export type DescribeExecutionResult = ExecutionResult<DescribeResult>;
export type CreateTaskExecutionResult = ExecutionResult<TaskCreateResult>;
export type CheckStatusExecutionResult = ExecutionResult<TaskStatusResult>;
export type GetResultExecutionResult = ExecutionResult<TaskResult>;
export type UploadExecutionResult = ExecutionResult<UploadResult>;
export type CancelTaskExecutionResult = ExecutionResult<void>;

export type QueueTaskRequest = {
  jobId?: string;
  locator: string;
  payload?: Record<string, any>;
  options?: ExecutionOptions;
};

export type QueueTaskMessage = Required<QueueTaskRequest>;

export type QueueJob = {
  jobId: string;
  locator: string;
  enqueuedAt: number;
  payload?: Record<string, any>;
  options?: ExecutionOptions;
  [key: string]: any;
};

export type EnqueueResult = {
  jobId: string;
  metadata?: Record<string, any>;
};

export type QueueExecutorHooks = {
  enqueue(job: QueueTaskRequest): Promise<EnqueueResult>;
  getStatus(jobId: string): Promise<TaskStatusResult | undefined>;
  getResult(jobId: string): Promise<TaskResult | undefined>;
  cancel?(jobId: string): Promise<void>;
};

export type QueueExecutor = {
  enqueue(request: QueueTaskRequest): Promise<EnqueueResult>;
  getStatus(jobId: string): Promise<TaskStatusResult | undefined>;
  getResult(jobId: string): Promise<TaskResult | undefined>;
  cancel(jobId: string): Promise<void>;
};

export type ReservedJob = {
  job: QueueJob;
  attempts: number;
};

export type QueueWorkerHooks = {
  reserve(): Promise<ReservedJob | undefined>;
  markComplete(job: QueueJob, result: TaskResult): Promise<void>;
  markFailed(job: QueueJob, error: any): Promise<void>;
  reportStatus?(job: QueueJob, status: TaskStatusResult): Promise<void>;
};

export type QueueWorkerOptions = {
  jobPollIntervalMs?: number;
  statusPollIntervalMs?: number;
  maxAttempts?: number;
  onError?(error: unknown): void | Promise<void>;
};
