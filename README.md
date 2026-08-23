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

默认已注册 Replicate、RunningHub、GRSAI、Gemini、OpenAI、PPIO、火山方舟（Ark）与 Comfy Provider，并可按需扩展新 Provider（上传逻辑可通过 `registerUploadProvider` 拆分复用）：

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

### PPIO 图像模型

PPIO 使用同步的 Gemini `generateContent` 协议，默认请求
`https://api.ppio.com/v3/gemini-image/v1beta1`。模型放在 locator 的 pathname 中：

```ts
const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('ppio:///') && process.env.PPIO_API_KEY
      ? { apiKey: process.env.PPIO_API_KEY }
      : undefined,
});

const task = await executor.run({
  locator: 'ppio:///gemini-3.1-flash-image',
  payload: {
    prompt: 'Generate a product photo on a clean studio background',
    // 图片编辑时可传 data URL、纯 base64 或 { data, mimeType }
    urls: [],
    aspectRatio: '16:9',
    imageSize: '2K',
  },
});

const result = await task.promise;
const outputs = result.outputs;
```

支持 `gemini-3.1-flash-image`、`gemini-3-pro-image` 和
`gemini-2.5-flash-image`。如需代理或兼容服务，可通过
`platformConfig.baseURL`（也兼容 `baseUrl`）和 `platformConfig.apiVersion`
覆盖默认地址与版本。

GPT Image 2 使用 `ppio:///gpt-image-2`。不传输入图时自动调用文生图端点；传入
`urls` 或 `image` 后自动调用图片编辑端点，`mask` 可传带透明区域的 PNG：

```ts
const task = await executor.run({
  locator: 'ppio:///gpt-image-2',
  payload: {
    prompt: 'Replace the object inside the mask with a yellow banana',
    urls: ['data:image/png;base64,...'],
    mask: 'data:image/png;base64,...',
    n: 1,
    size: '3840x2160',
    quality: 'high',
    background: 'auto',
    outputFormat: 'png',
  },
});
```

GPT Image 2 支持 1-10 张输出、文档列出的 1K/2K/4K 尺寸、
`low`/`medium`/`high` 质量、PNG/JPEG，以及多图编辑。其默认 API 根地址为
`https://api.ppio.com/v3`，可用 `platformConfig.gptImageBaseURL` 覆盖。

PPIO GPT-5.6 使用 OpenAI Response API 协议，支持以下 locator：

- `ppio:///pa/gpt-5.6-terra`
- `ppio:///pa/gpt-5.6-luna`
- `ppio:///pa/gpt-5.6-sol`

```ts
const task = await executor.run({
  locator: 'ppio:///pa/gpt-5.6-terra',
  payload: {
    prompt: 'Explain why the sky is blue',
    instructions: 'Answer clearly and concisely.',
    reasoningEffort: 'high',
    reasoningSummary: 'concise',
    maxOutputTokens: 2048,
    verbosity: 'medium',
    stream: false,
  },
});
```

也可直接通过 `payload.input` 传入完整的 Response API 文本、图片或文件输入结构，
并透传 `text`、`tools`、`toolChoice`、`previousResponseId` 等参数。同步执行器会消费
SSE 流并返回合并后的最终结果。默认端点为
`https://api.ppio.com/openai/v1/responses`，可通过
`platformConfig.responseBaseURL`（或 `responseBaseUrl`）覆盖。服务端目前仅支持 POST，
且 `previous_response_id` 不保证状态串联。

GPT-5.6 当前不支持 `top_p`，Provider 会在请求发送前拒绝该参数。`temperature`
为可选参数且默认不发送；稳定控制输出时优先使用 `reasoningEffort`。

PPIO Fusion 融合模型使用 OpenAI Chat Completions 协议，locator 为
`ppio:///pprouter/fusion`：

```ts
const task = await executor.run({
  locator: 'ppio:///pprouter/fusion',
  payload: {
    systemPrompt: '从多个角度分析并给出明确结论。',
    prompt: '比较这三种技术方案的风险和收益。',
    maxTokens: 4096,
    temperature: 0.3,
    stream: true,
  },
});

const result = await task.promise;
```

也可通过 `payload.messages` 传入完整的多轮消息，并使用 `topP`、`seed`、`stop`、
`responseFormat`、`tools` 和 `toolChoice` 等 Chat Completions 参数。Provider 会消费
SSE 流并返回合并后的最终文本或函数调用。默认端点为
`https://api.ppio.com/openai/v1/chat/completions`，可通过
`platformConfig.chatBaseURL`（或 `chatBaseUrl`）覆盖。

Seedance 2.0 使用异步视频任务，locator 为 `ppio:///seedance-2.0`：

```ts
const task = await executor.run({
  locator: 'ppio:///seedance-2.0',
  payload: {
    prompt: '电影感的产品展示，镜头缓慢环绕',
    fast: false,
    resolution: '1080p',
    ratio: '16:9',
    duration: 8,
    generateAudio: true,
    returnLastFrame: true,
  },
});

const result = await task.promise;
```

支持 4-15 秒、480p/720p/1080p、标准/快速模式、首尾帧、参考图/视频/音频、
生成音频、联网搜索、水印和返回尾帧。快速模式不支持 1080p；参考视频只接受
HTTP(S) URL。默认创建端点为 `https://api.ppio.com/v3/async/seedance-2.0`，
状态与结果通过 `/v3/async/task-result` 轮询；可用 `platformConfig.asyncBaseURL`
（或 `asyncBaseUrl`）覆盖异步 API 根地址。

Seedance 国内 Token 计费协议使用官方完整模型名，与上面的旧异步接口相互独立：

- `ppio:///doubao-seedance-2-0-260128`
- `ppio:///doubao-seedance-2-0-fast-260128`
- `ppio:///doubao-seedance-2-0-mini-260615`
- `ppio:///doubao-seedance-2-5-260628`

```ts
const task = await executor.run({
  locator: 'ppio:///doubao-seedance-2-5-260628',
  payload: {
    prompt: '保持参考角色一致，跟随参考视频动作并匹配背景音乐',
    referenceImages: ['asset://asset-character'],
    referenceVideos: ['https://assets.example.com/motion.mp4'],
    referenceAudios: ['asset://asset-music'],
    resolution: '720p',
    ratio: 'adaptive',
    duration: 11,
    generateAudio: true,
    watermark: false,
  },
});

const result = await task.promise;
```

该协议使用原厂 `content[]` 多模态请求，创建任务返回 `cgt-*` 格式的 `id`，并通过
`/v3/bytedance-cn/metered/contents/generations/tasks/{id}` 查询。成功响应中的
`usage.completion_tokens` 和 `usage.total_tokens` 会保留在原始结果中。输入素材支持公网
HTTP(S) URL 或已激活的 `asset://<Id>`；2.0、fast、mini 和 2.5 共用协议实现，但仍按
各模型限制校验分辨率。默认根地址为 `https://api.ppio.com/v3/bytedance-cn/metered`，
可用 `platformConfig.seedanceCnMeteredBaseURL`（或 `seedanceCnMeteredBaseUrl`）覆盖。

Google Veo 3.1 使用原生 `predictLongRunning` 协议，支持以下 locator：

- `ppio:///veo-3.1-generate-001`
- `ppio:///veo-3.1-fast-generate-001`
- `ppio:///veo-3.1-lite-generate-001`

```ts
const task = await executor.run({
  locator: 'ppio:///veo-3.1-generate-001',
  payload: {
    prompt: '一艘纸船穿行在雨夜的霓虹城市中，电影感运镜',
    // 图生视频可传 image；首尾帧模式再传 lastFrame
    image: [],
    lastFrame: [],
    aspectRatio: '16:9',
    resolution: '1080p',
    durationSeconds: 8,
    sampleCount: 1,
    generateAudio: true,
    negativePrompt: '文字，水印',
  },
});

const result = await task.promise;
```

支持文生视频、首帧图生视频和首尾帧视频，画幅为 16:9 或 9:16，分辨率为
720p 或 1080p，时长可选 4/6/8 秒，每次生成 1-4 个视频。创建端点默认为
`https://api.ppio.com/v3/veo-3.1/v1/models/{model}:predictLongRunning`，结果通过
`https://api.ppio.com/v3/async/task-result` 轮询。可用 `platformConfig.veoBaseURL`
和 `platformConfig.veoApiVersion` 覆盖 Veo 根地址与版本。

Kling V3.0 使用 PPIO 异步视频协议，支持以下 locator：

- `ppio:///kling-v3.0-std-t2v`
- `ppio:///kling-v3.0-std-i2v`
- `ppio:///kling-v3.0-pro-t2v`
- `ppio:///kling-v3.0-pro-i2v`
- `ppio:///kling-v3.0-4k-t2v`
- `ppio:///kling-v3.0-4k-i2v`
- `ppio:///kling-v3.0-motion-control`

```ts
const task = await executor.run({
  locator: 'ppio:///kling-v3.0-pro-i2v',
  payload: {
    image: ['data:image/png;base64,...'],
    prompt: '电影感的产品展示，镜头缓慢接近，环境光扫过产品表面',
    endImage: [],
    duration: 8,
    cfgScale: 0.5,
    sound: true,
    negativePrompt: '文字，水印，画面抖动',
  },
});

const result = await task.promise;
```

Standard、Pro 和 4K 均支持文生视频与图生视频，时长为 3-15 秒，支持可选音频、
负面提示词、CFG 强度、首尾帧和对应版本的多镜头参数。动作控制使用参考图片与
HTTP(S) 参考视频，可选择 Standard/Pro 质量，以及跟随参考图或参考视频的构图模式。
创建端点为 `https://api.ppio.com/v3/async/{model}`，结果继续通过
`https://api.ppio.com/v3/async/task-result` 轮询。

MiniMax Hailuo 2.3 同样使用 PPIO 异步视频协议，支持以下 locator：

- `ppio:///minimax-hailuo-2.3-t2v`
- `ppio:///minimax-hailuo-2.3-i2v`
- `ppio:///minimax-hailuo-2.3-fast-i2v`

```ts
const task = await executor.run({
  locator: 'ppio:///minimax-hailuo-2.3-i2v',
  payload: {
    prompt: '熊猫在雪山日出时跳舞 [左移,上升]',
    image: ['data:image/jpeg;base64,...'],
    duration: 6,
    resolution: '1080P',
    enablePromptExpansion: true,
    fastPretreatment: false,
    aigcWatermark: false,
  },
});

const result = await task.promise;
```

三个接口都支持 6 秒或 10 秒视频：6 秒可选 768P/1080P，10 秒仅支持 768P。
普通文生与图生接口支持 `fastPretreatment`，Fast 图生接口不支持该字段。图片可传
公网 URL、data URL 或上传组件输出的 base64 对象。创建端点为
`https://api.ppio.com/v3/async/{model}`，结果通过通用异步任务接口轮询。

MiniMax H3 使用原厂异步视频协议，对应 locator 为 `ppio:///MiniMax-H3`：

```ts
const task = await executor.run({
  locator: 'ppio:///MiniMax-H3',
  payload: {
    prompt: '保持参考角色外观，使用参考视频的动作并匹配音乐节奏',
    referenceImages: ['https://assets.example.com/character.png'],
    referenceVideos: ['https://assets.example.com/motion.mp4'],
    referenceAudios: ['https://assets.example.com/music.mp3'],
    resolution: '2K',
    duration: 8,
    ratio: '16:9',
    aigcWatermark: false,
  },
});

const result = await task.promise;
```

H3 支持 768P/2K、4-15 秒，以及 21:9、16:9、4:3、1:1、3:4、9:16 和
素材模式下的 adaptive 画幅。可使用首帧/尾帧，或最多 9 张参考图、3 个参考视频、
3 个参考音频；帧模式与参考素材模式不能混用，参考音频也不能作为唯一参考素材。
所有输入素材都必须是服务端可访问的公网 HTTP(S) URL。创建端点默认为
`https://api.ppio.com/v3/minimax/v2/video_generation`，查询端点为
`/v3/minimax/v2/query/video_generation/{task_id}`；建议每 10-30 秒轮询一次，成功后
及时保存有时效性的结果地址。可通过 `platformConfig.minimaxBaseURL`（或
`minimaxBaseUrl`）覆盖协议根地址。

### 火山方舟 Seedream 5.0 Pro

火山方舟作为独立 Provider 注册，不与 PPIO 共用配置。模型 locator 为
`ark:///doubao-seedream-5-0-pro-260628`，默认请求
`https://ark.cn-beijing.volces.com/api/v3/images/generations`：

```ts
const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('ark:///') && process.env.ARK_API_KEY
      ? { apiKey: process.env.ARK_API_KEY }
      : undefined,
});

const task = await executor.run({
  locator: 'ark:///doubao-seedream-5-0-pro-260628',
  payload: {
    prompt: '精确拆分图片中的文字、主体和背景',
    image: ['https://assets.example.com/source.png'],
    layerDecomposition: true,
    size: '2K',
    outputFormat: 'jpeg',
    responseFormat: 'url',
    watermark: true,
  },
});

const result = await task.promise;
```

普通生成模式支持文生图、单图编辑和最多 10 张参考图，尺寸可使用 `1K`、`1.5K`、
`2K` 或合法的 `宽x高`。图层拆分模式要求恰好一张源图，支持 `auto`、`1K`、`1.5K`
和 `2K`，结果输出会保留 `zIndex`、`name`、`description` 与 `boundingBox`，便于按
图层顺序还原。可通过 `platformConfig.baseURL`（或 `baseUrl`）覆盖方舟 API 根地址。

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
