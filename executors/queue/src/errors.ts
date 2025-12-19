import type { ExecutionContext, ExecutionOperation } from './types.ts';

export interface ServiceErrorOptions {
  status?: number;
  locator?: string;
  platformConfig?: Record<string, any>;
  context?: ExecutionContext;
  cause?: any;
  code?: string | number;
  details?: any;
}

export class ServiceError extends Error {
  operation: ExecutionOperation;
  status: number;
  locator?: string;
  platformConfig?: Record<string, any>;
  context?: ExecutionContext;
  cause?: any;
  code?: string | number;
  details?: any;

  constructor(operation: ExecutionOperation, message: string, options?: ServiceErrorOptions) {
    super(message);
    this.operation = operation;
    this.status = options?.status && options.status >= 400 && options.status < 600 ? options.status : 500;
    this.locator = options?.locator;
    this.platformConfig = options?.platformConfig;
    this.context = options?.context;
    this.cause = options?.cause;
    this.code = options?.code;
    this.details = options?.details;
  }
}
