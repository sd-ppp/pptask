# @sdppp/pptask

通过统一的 `locator + payload` 协议复用不同 AI Provider 的异步能力。代码现分为两部分：

```
core/               // Provider 注册、通用任务方法（describe/create/check/get/cancel/upload）
executors/inline/   // 进程内执行器：本地直连或 HTTP 代理（前端、BFF、脚本场景）
```

## core/ —— Provider 注册与任务入口

`core` 暴露的六个入口函数在任何环境下可用（`platformConfig` 可选，用于传入当前调用的默认配置）：

- `describeResource({ locator, platformConfig?, options? })`
- `createTask({ locator, payload?, platformConfig?, options? })`
- `checkStatus({ locator, taskId, platformConfig?, options? })`
- `getResult({ locator, taskId, platformConfig?, options? })`
- `cancelTask({ locator, taskId, platformConfig?, options? })`
- `upload({ uploadProvider?, locator?, formData, platformConfig?, options? })`

`TaskResult` 额外包含 `costCoins` / `costMoney` / `costMoneyCurrency` 字段，Provider 在有消费信息时会填入（如平台内积分、人民币金额与货币单位），供上层做扣费或展示。

默认已注册 `replicate:///` 与 `runninghub:///`(使用三斜杠,路径格式),并可按需扩展新 Provider(上传逻辑可通过 `registerUploadProvider` 拆分复用):

```ts
import { registerProvider, registerUploadProvider } from './core/src/index.ts';
import type { ProviderDefinition, UploadProviderDefinition } from './core/src/types.ts';

const customProvider: ProviderDefinition = {
  async describeResource({ locator }) {
    return {
      provider: 'custom',
      metadata: { scheme: 'custom', locator },
      formSchema: { type: 'object', properties: {} },
      formValues: {},
      recommendUploadProvider: 'custom',
    };
  },
  async createTask({ locator }) {
    return {
      provider: 'custom',
      taskId: 'job-1',
      status: 'pending',
      raw: {},
    };
  },
  async checkStatus({ taskId }) {
    return {
      provider: 'custom',
      taskId,
      status: 'succeeded',
      raw: {},
    };
  },
  async getResult({ taskId }) {
    return {
      provider: 'custom',
      taskId,
      status: 'succeeded',
      outputs: [],
      raw: {},
    };
  },
  async cancelTask() {},
};

registerProvider('custom', customProvider);

const customUploadProvider: UploadProviderDefinition = {
  async upload({ formData }) {
    // 自定义上传实现
    return { provider: 'custom', url: 'https://files.example.com/demo', raw: {} };
  },
};

registerUploadProvider('custom', customUploadProvider);
```

如果需要维护平台密钥，可根据 locator 的 scheme 手动选择默认值，并在调用时自行合并覆盖项：

```ts
import { createTask } from './core/src/index.ts';
import { parseLocator, normalizeScheme } from './core/src/resource.ts';

const defaults: Record<string, Record<string, any>> = {};
if (process.env.REPLICATE_API_KEY) {
  defaults[normalizeScheme('replicate')] = { apiKey: process.env.REPLICATE_API_KEY };
}

function resolvePlatformConfig(locator: string) {
  const { scheme } = parseLocator(locator);
  const base = defaults[normalizeScheme(scheme)] ?? {};
  return base;
}

await createTask({
  locator: 'replicate:///owner/model',
  payload: { prompt: 'hi' },
  platformConfig: resolvePlatformConfig('replicate:///owner/model'),
});
```

**核心状态面板**

- `providers`：`registerProvider` 写入的 Provider 注册表，`ensureProvider` / `listProviders` 等读取。
- `replicate/versionCache`：`replicate` Provider 内部按 `apiKey:model` 的版本缓存，避免重复请求最新版本号与模型元数据。

## executors/inline/ —— 进程内执行器

`createInlineExecutor` 负责在同一个进程内执行任务（复用当前进程内已注册的 Provider）。

```ts
import { createInlineExecutor } from './executors/inline/src/index.ts';

// 直连 Replicate / RunningHub 等 Provider
const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('replicate:///') && process.env.REPLICATE_API_KEY
      ? { apiKey: process.env.REPLICATE_API_KEY }
      : undefined,
});
const describe = await executor.describe({ locator: 'replicate:///owner/model' });
const task = await executor.run({
  locator: 'replicate:///owner/model',
  payload: describe.formValues,
});
const outputs = await task.promise;
```

`upload` 会自动注入在创建执行器时提供的 `platformConfig`，无需调用时再次传入。`describe` 返回的 `recommendUploadProvider` 可直接透传给 `upload({ uploadProvider })`。

### 通过 HTTP 代理自定义 Provider

如果需要像旧版 `mode: 'http'` 那样通过 HTTP 代理触发任务，可在外部直接封装 HTTP 请求并注册 Provider：

```ts
import { registerProvider } from '@sdppp/pptask/core/src/index.ts';
import type { ProviderDefinition } from '@sdppp/pptask/core/src/types.ts';

const BASE_URL = 'https://router.example.com/api';

async function fetchToken(): Promise<string> {
  // 在此实现实际的鉴权逻辑
  return process.env.TASKROUTER_TOKEN ?? '';
}

async function postJson<T>(
  path: string,
  body: Record<string, any>,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await fetchToken()}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const httpProvider: ProviderDefinition = {
  async describeResource(params) {
    const result = await postJson('/tasks/describe', {
      locator: params.locator,
      platformConfig: params.platformConfig,
      options: params.options,
    });
    return result.recommendUploadProvider
      ? result
      : { ...result, recommendUploadProvider: 'runninghub' };
  },
  createTask: params =>
    postJson('/tasks', {
      locator: params.locator,
      payload: params.payload ?? {},
      platformConfig: params.platformConfig,
      options: params.options,
    }),
  checkStatus: params =>
    postJson('/tasks/status', {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: params.options,
    }),
  getResult: params =>
    postJson('/tasks/result', {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: params.options,
    }),
  cancelTask: params =>
    postJson('/tasks/cancel', {
      locator: params.locator,
      taskId: params.taskId,
      platformConfig: params.platformConfig,
      options: params.options,
    }),
};

registerProvider('taskrouter', httpProvider);
```

随后即可通过 `createInlineExecutor()` 直接消费 `taskrouter://` 资源。

## 测试

### 运行测试

```bash
pnpm test
```

### 集成测试配置

集成测试需要真实的 API Keys。配置步骤：

1. **创建 test.env 文件**：
   ```bash
   cp test.env.example test.env
   ```

2. **填入你的 API Keys**：
   ```env
   # test.env
   REPLICATE_API_KEY=r8_your-key-here
   RUNNINGHUB_API_KEY=your-key-here
   GRSAI_API_KEY=your-key-here
   ```

3. **运行测试**：
   ```bash
   pnpm test
   ```

**注意**：
- `test.env` 仅在运行测试时加载，不会影响正常的开发或生产环境
- 没有 API Key 的集成测试会被自动跳过
- Vitest 会在测试开始前通过 `vitest.setup.ts` 自动加载 `test.env`

## 示例与下一步

- `demo/server`：最小化 Express 示例，提供 `/api/tasks/*`、`/api/balance`（演示余额）路由。
- `demo/web`：React + Formily 页面，使用 `inline` 执行器的 HTTP 模式触达后端。

在生产环境中可基于上述两层组合出更多形态（CLI、Electron、Job Worker 等），新 Provider 也只需实现 `ProviderDefinition` 并通过 `registerProvider` 注入即可。
