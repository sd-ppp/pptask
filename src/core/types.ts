import type {
  Experimental_VideoModelV4,
  Experimental_VideoModelV4CallOptions,
  Experimental_VideoModelV4OperationStartResult,
  Experimental_VideoModelV4Result,
  FilesV4,
  FilesV4UploadFileCallOptions,
  FilesV4UploadFileResult,
  ImageModelV4,
  ImageModelV4CallOptions,
  ImageModelV4Result,
  JSONValue,
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
  ProviderV4,
  SharedV4ProviderMetadata,
  SharedV4Warning,
} from '@ai-sdk/provider';

export type PptaskModelType = 'language' | 'image' | 'video';
export type PptaskJobState =
  | 'creating'
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type PptaskOperationStartResult = {
  operation: JSONValue;
  warnings?: SharedV4Warning[];
  providerMetadata?: SharedV4ProviderMetadata;
  response?: {
    timestamp?: Date;
    modelId?: string;
    headers?: Record<string, string | undefined>;
  };
};

export type PptaskOperationStatusResult<RESULT extends object> =
  | {
      status: 'pending';
      phase?: 'queued' | 'running';
      progress?: number;
      providerMetadata?: SharedV4ProviderMetadata;
    }
  | ({ status: 'completed' } & RESULT)
  | {
      status: 'error';
      error: string;
      providerMetadata?: SharedV4ProviderMetadata;
    };

export type PptaskOperationContext = {
  jobId: string;
  idempotencyKey: string;
};

export type PptaskOperationMethods<CALL_OPTIONS, RESULT extends object> = {
  doStart?: (
    options: CALL_OPTIONS,
    context?: PptaskOperationContext,
  ) => PromiseLike<PptaskOperationStartResult>;
  doStatus?: (options: {
    operation: JSONValue;
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }) => PromiseLike<PptaskOperationStatusResult<RESULT>>;
  doCancel?: (options: {
    operation: JSONValue;
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }) => PromiseLike<void>;
  doDescribe?: () => PromiseLike<PptaskDescription>;
};

export type PptaskLanguageModel = LanguageModelV4 &
  PptaskOperationMethods<LanguageModelV4CallOptions, LanguageModelV4GenerateResult>;
export type PptaskImageModel = ImageModelV4 &
  PptaskOperationMethods<ImageModelV4CallOptions, ImageModelV4Result>;
export type PptaskVideoModel = Omit<Experimental_VideoModelV4, 'doStart'> & {
  doStart?: (
    options: Experimental_VideoModelV4CallOptions & { webhookUrl?: string },
    context?: PptaskOperationContext,
  ) => PromiseLike<Experimental_VideoModelV4OperationStartResult>;
  doCancel?: PptaskOperationMethods<
    Experimental_VideoModelV4CallOptions,
    Experimental_VideoModelV4Result
  >['doCancel'];
  doDescribe?: () => PromiseLike<PptaskDescription>;
};
export type PptaskModel = PptaskLanguageModel | PptaskImageModel | PptaskVideoModel;

export type PptaskLanguageModelImplementation = Pick<LanguageModelV4, 'supportedUrls'> &
  Partial<Pick<LanguageModelV4, 'doGenerate' | 'doStream'>> &
  PptaskOperationMethods<LanguageModelV4CallOptions, LanguageModelV4GenerateResult>;
export type PptaskImageModelImplementation = Pick<ImageModelV4, 'maxImagesPerCall'> &
  Partial<Pick<ImageModelV4, 'doGenerate'>> &
  PptaskOperationMethods<ImageModelV4CallOptions, ImageModelV4Result>;
export type PptaskVideoModelImplementation = Omit<
  Experimental_VideoModelV4,
  'specificationVersion' | 'provider' | 'modelId' | 'doStart'
> & {
  doStart?: PptaskVideoModel['doStart'];
  doCancel?: PptaskVideoModel['doCancel'];
  doDescribe?: () => PromiseLike<PptaskDescription>;
};

export type PptaskDescription = {
  providerId: string;
  modelId: string;
  modelType: PptaskModelType;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  defaultInput?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  providerMetadata?: SharedV4ProviderMetadata;
};

export type PptaskSerializedError = {
  name?: string;
  message: string;
  stack?: string;
};

export type PptaskJobRecord<RESULT = unknown> = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  providerId: string;
  modelType: PptaskModelType;
  modelId: string;
  state: PptaskJobState;
  input: unknown;
  operation?: JSONValue;
  progress?: number;
  result?: RESULT;
  error?: PptaskSerializedError;
  createdAt: string;
  updatedAt: string;
};

export type PptaskJobFilter = {
  states?: PptaskJobState[];
  providerId?: string;
  modelId?: string;
  idempotencyKey?: string;
};

export type PptaskJobStore = {
  get<RESULT = unknown>(id: string): Promise<PptaskJobRecord<RESULT> | undefined>;
  create(record: PptaskJobRecord): Promise<{
    record: PptaskJobRecord;
    created: boolean;
  }>;
  put(record: PptaskJobRecord): Promise<void>;
  update<RESULT = unknown>(
    id: string,
    updater: (record: PptaskJobRecord<RESULT>) => PptaskJobRecord<RESULT>,
  ): Promise<PptaskJobRecord<RESULT>>;
  list(filter?: PptaskJobFilter): Promise<PptaskJobRecord[]>;
  delete(id: string): Promise<void>;
};

export type PptaskJobEvent<RESULT = unknown> = {
  type: 'state';
  job: PptaskJobRecord<RESULT>;
};

export type PptaskJobHandle<RESULT = unknown> = {
  readonly id: string;
  status(options?: PptaskJobCallOptions): Promise<PptaskJobRecord<RESULT>>;
  watch(options?: PptaskJobCallOptions): AsyncIterable<PptaskJobEvent<RESULT>>;
  wait(options?: PptaskJobCallOptions): Promise<RESULT>;
  cancel(options?: PptaskJobCallOptions): Promise<void>;
};

export type PptaskJobCallOptions = {
  signal?: AbortSignal;
  headers?: Record<string, string | undefined>;
};

export type PptaskJobs = {
  start<RESULT = unknown>(options: {
    model: PptaskModel;
    input: unknown;
    idempotencyKey?: string;
  }): Promise<PptaskJobHandle<RESULT>>;
  resume<RESULT = unknown>(jobId: string): Promise<PptaskJobHandle<RESULT>>;
  status<RESULT = unknown>(
    jobId: string,
    options?: PptaskJobCallOptions,
  ): Promise<PptaskJobRecord<RESULT>>;
  watch<RESULT = unknown>(
    jobId: string,
    options?: PptaskJobCallOptions,
  ): AsyncIterable<PptaskJobEvent<RESULT>>;
  wait<RESULT = unknown>(jobId: string, options?: PptaskJobCallOptions): Promise<RESULT>;
  cancel(jobId: string, options?: PptaskJobCallOptions): Promise<void>;
  list(filter?: PptaskJobFilter): Promise<PptaskJobRecord[]>;
};

export type PptaskUploadOptions = FilesV4UploadFileCallOptions;
export type PptaskUploadResult = FilesV4UploadFileResult;

export type CreatePptaskProviderOptions = {
  providerId: string;
  languageModel?: (modelId: string) => PptaskLanguageModelImplementation;
  imageModel?: (modelId: string) => PptaskImageModelImplementation;
  videoModel?: (modelId: string) => PptaskVideoModelImplementation;
  files?: FilesV4;
  jobStore?: PptaskJobStore;
  pollIntervalMs?: number;
  maxStatusErrors?: number;
};

export type PptaskProvider = Omit<
  ProviderV4,
  'languageModel' | 'imageModel' | 'videoModel'
> & {
  readonly providerId: string;
  languageModel(modelId: string): PptaskLanguageModel;
  imageModel(modelId: string): PptaskImageModel;
  videoModel(modelId: string): PptaskVideoModel;
  describe(model: PptaskModel): Promise<PptaskDescription>;
  upload(options: PptaskUploadOptions): Promise<PptaskUploadResult>;
  jobs: PptaskJobs;
};

export type PptaskLanguageGenerateResult = LanguageModelV4GenerateResult;
export type PptaskLanguageStreamResult = LanguageModelV4StreamResult;
