export type PlatformConfig = Record<string, any>;
export type SignalLike = { aborted?: boolean };
export type TaskOutput = Record<string, any>;
export type TaskResult = any;
export type TaskCreateResult = any;
export type TaskStatusResult = any;
export type DescribeResult = any;
export type TaskRequestOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};
export type FormilySchema = Record<string, any>;
