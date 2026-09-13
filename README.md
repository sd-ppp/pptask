# PPTask AI SDK

`@sdppp/pptask-aisdk` extends Vercel AI SDK providers with durable remote jobs.
Every factory returns one provider that supports both the standard AI SDK model
methods and an explicit `jobs` API that can survive a browser reload.

## Core API

```ts
import { generateImage } from 'ai';
import { createReplicateProvider } from '@sdppp/pptask-aisdk/browser';

const replicate = createReplicateProvider({ apiKey: 'REPLICATE_API_TOKEN' });
const model = replicate.imageModel('black-forest-labs/flux-schnell');

// Durable API. Persist job.id in application state and resume it after reload.
const job = await replicate.jobs.start({
  model,
  input: { prompt: 'A clean product photograph', n: 1, providerOptions: {} },
});
const durableResult = await job.wait();

// Standard AI SDK API. The same model waits for the remote operation internally.
const sdkResult = await generateImage({
  model,
  prompt: 'A clean product photograph',
});
```

Models add four operation methods while retaining their AI SDK interfaces:

- `doStart`: creates the remote operation.
- `doStatus`: polls the remote operation and returns pending/completed/error.
- `doCancel`: cancels when the upstream platform supports it.
- `doDescribe`: returns model metadata and input schema.

The provider adds:

- `provider.describe(model)`
- `provider.upload(options)` using AI SDK `FilesV4`
- `provider.jobs.start/resume/status/watch/wait/cancel/list`

Model IDs are plain provider model IDs. The library does not use URL locators to
encode provider, model, operation, or credentials.

## Persistence

Browser imports use IndexedDB by default. Recreating both the store and provider
after a reload is enough to resume a persisted job:

```ts
import {
  createIndexedDbJobStore,
  createRunninghubProvider,
} from '@sdppp/pptask-aisdk/browser';

const jobStore = createIndexedDbJobStore({ databaseName: 'my-app-jobs' });
const runninghub = createRunninghubProvider({
  apiKey: 'RUNNINGHUB_API_KEY',
  jobStore,
});

const restored = await runninghub.jobs.resume(savedJobId);
const result = await restored.wait();
```

Server runtimes default to an in-memory store. Pass a custom `PptaskJobStore` to
persist jobs across server process restarts. A `jobSystem` is not injected: each
provider owns the runtime that resolves its models and remote operations. Only
the storage boundary is configurable because durability is application-specific.

The store's `create(record)` method is an atomic idempotency claim and returns
`{ record, created }`. `created: true` means this caller claimed a new job;
`created: false` means the same provider already has that `idempotencyKey`, so
the existing record must be returned. A key already used by another
provider/model must be rejected by the job API. Database-backed stores must
implement this claim atomically so two browser tabs cannot create duplicate
remote jobs.

Before persistence, request headers, abort signals, API keys, access tokens,
secrets, and other credential fields are removed from job input.

## Provider Factories

Primary factories:

```text
createReplicateProvider     createRunninghubProvider
createCrunProvider          createKieProvider
createApiframeProvider      createGrsaiProvider
createPpioProvider          createNovitaProvider
createArkProvider           createComfyProvider
createOpenAIProvider        createGeminiProvider
```

Modern platform factories:

```text
createFishProvider          createDeepinfraProvider
createOpenrouterProvider    createTavusProvider
createScenarioProvider      createXaiProvider
createCloudflareProvider    createVertexProvider
createBedrockProvider       createAzureProvider
createNvidiaProvider        createLeonardoProvider
createHeygenProvider        createDidProvider
createCartesiaProvider      createDeepgramProvider
createFireworksProvider
```

Each primary provider is also available from a tree-shakeable subpath such as
`@sdppp/pptask-aisdk/providers/replicate`. Modern factories are exported from
`@sdppp/pptask-aisdk/providers/modern`.

RunningHub accepts `api/<model-path>` and `app/<webapp-id>` model IDs. ComfyUI
receives its server in `baseURL` and uses `modelId` as the workflow identifier.
Modern providers whose API operation cannot be inferred from the model require
`operationPath` in their provider options.

## Custom Providers

Use `createPptaskProvider` to implement a platform directly with AI SDK-shaped
models. Asynchronous image and language models can implement `doStart` and
`doStatus`; `doGenerate` is synthesized for official AI SDK calls. Video models
use the AI SDK's native `doStart` and `doStatus` operation shape.

```ts
import { createPptaskProvider } from '@sdppp/pptask-aisdk';

const provider = createPptaskProvider({
  providerId: 'example',
  imageModel: modelId => ({
    maxImagesPerCall: 1,
    async doStart(options, context) {
      return { operation: { taskId: await createRemoteTask(modelId, options, context) } };
    },
    async doStatus({ operation, abortSignal }) {
      return checkRemoteTask(operation, abortSignal);
    },
  }),
});
```

Provider implementations are private to each factory; there is no public
backend-adapter registry or externally supplied job runtime.

## Browser And Server

Use `/browser` for browser applications and `/server` for server applications.
Both entry points are free of Node-only provider runtime dependencies. Browser
code should route requests through a server proxy or use short-lived,
user-scoped credentials when an upstream API key must remain private. Every
provider accepts a custom `fetch` implementation for that purpose.

## Tests

```bash
pnpm test             # unit, provider protocol, contract, and fake IndexedDB
pnpm test:browser     # real Chromium reload and IndexedDB recovery
pnpm typecheck
pnpm build
```

Live integrations are opt-in because they require credentials and may incur
provider costs:

```bash
PPTASK_INTEGRATION=1 \
PPTASK_REPLICATE_API_KEY=... \
PPTASK_REPLICATE_MODEL_ID=owner/model \
PPTASK_REPLICATE_MODEL_TYPE=image \
pnpm test:integration
```

Every provider uses the same variable pattern:
`PPTASK_<PROVIDER>_API_KEY`, `PPTASK_<PROVIDER>_MODEL_ID`, optional
`PPTASK_<PROVIDER>_MODEL_TYPE`, `PPTASK_<PROVIDER>_BASE_URL`,
`PPTASK_<PROVIDER>_OPERATION_PATH`, and JSON `PPTASK_<PROVIDER>_INPUT`.
