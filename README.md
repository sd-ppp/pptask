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

默认已注册 Replicate、RunningHub、GRSAI、Gemini、OpenAI、PPIO、Novita、火山方舟（Ark）与 Comfy Provider，并可按需扩展新 Provider（上传逻辑可通过 `registerUploadProvider` 拆分复用）：

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

### Novita（PPIO 海外站）Nano Banana

Novita 作为独立 Provider 注册，不与国内 PPIO 共用 locator、API Key 或地址配置。
默认请求 `https://api.novita.ai/gemini/v1/models/{model}:generateContent`，使用
`Authorization: Bearer <NOVITA_API_KEY>`：

```ts
const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('novita:///') && process.env.NOVITA_API_KEY
      ? { apiKey: process.env.NOVITA_API_KEY }
      : undefined,
});

const task = await executor.run({
  locator: 'novita:///gemini-3.1-flash-image',
  payload: {
    prompt: 'Generate a cinematic product photo',
    // 图片编辑可传 data URL、纯 base64 或 inlineData 对象
    urls: [],
    aspectRatio: '16:9',
    imageSize: '4K',
  },
});

const result = await task.promise;
console.log(result.outputs, result.costCoins); // costCoins 为 totalTokenCount
```

支持 `gemini-3.1-flash-lite-image`、`gemini-3.1-flash-image`、
`gemini-3-pro-image`、`gemini-2.5-flash-image`，以及对应的四个 `-as` 模型。
默认固定 `responseModalities: ['IMAGE']`，防止额外生成思考图片并产生额外 Token；
确需文字说明时可传 `includeTextResponse: true` 或显式传
`responseModalities: ['TEXT', 'IMAGE']`。支持 `1K`、`2K`、`4K`，也可通过
`platformConfig.baseURL` 和 `platformConfig.apiVersion`（`v1`/`v1beta`）覆盖协议地址。

### Novita GPT Image 2

GPT Image 2 继续使用独立的 `novita` Provider，支持以下 locator：

- `novita:///gpt-image-2`
- `novita:///gpt-image-2-oai`

不传参考图时，Provider 以 JSON 请求
`https://api.novita.ai/openai/v1/images/generations`；传入 `urls`、`images`、`image`
或 `mask` 后自动切换到 multipart 请求 `/openai/v1/images/edits`。编辑模式支持多张
`image[]` 和单张 PNG 遮罩：

```ts
const task = await executor.run({
  locator: 'novita:///gpt-image-2',
  payload: {
    prompt: 'Replace the background with a clean studio backdrop',
    urls: ['data:image/png;base64,...'],
    mask: 'data:image/png;base64,...',
    size: '1024x1024',
    quality: 'high',
    outputFormat: 'png',
    inputFidelity: 'high',
  },
});
```

支持 PNG、JPEG、WebP、1-10 张输出；表单尺寸选项与 PPIO GPT Image 2 保持一致，
同时底层仍接受 GPT Image 2 的合法自定义尺寸。宽高必须为
16 的倍数、比例在 1:3 到 3:1 之间，最长边不超过 3840、短边不超过 2160。
为便于 Token 成本控制，默认显式使用 `1024x1024` 和 `high`。文生图默认使用
文档建议的 `moderation: 'low'`，编辑接口不发送该参数。响应中的
`usage.total_tokens` 会回填至 `costCoins`。可通过
`platformConfig.openaiBaseURL`（或 `openaiBaseUrl`）覆盖 OpenAI 兼容根地址。

### Novita GPT-5.6（Responses / Chat Completions）

GPT-5.6 继续使用独立的 `novita` Provider。模型列表与 PPIO 已接入的模型保持一致，
不使用协议文档中的示例模型：

- `novita:///pa/gpt-5.6-terra`
- `novita:///pa/gpt-5.6-luna`
- `novita:///pa/gpt-5.6-sol`

同一个 locator 支持两种 OpenAI 兼容协议。`apiMode: 'responses'` 为默认模式，调用
`/openai/v1/responses`；`apiMode: 'chat_completions'` 调用
`/openai/v1/chat/completions`：

```ts
const task = await executor.run({
  locator: 'novita:///pa/gpt-5.6-terra',
  payload: {
    apiMode: 'responses', // 或 chat_completions
    systemPrompt: '回答要简洁准确',
    prompt: '解释一下这张图',
    urls: ['data:image/png;base64,...'],
    reasoningEffort: 'medium',
    maxOutputTokens: 2048,
    responseFormat: 'text',
    stream: false,
  },
});
```

也可在 `platformConfig.wireApi` / `platformConfig.wire_api` 中设置默认协议；payload
中的 `apiMode`、`wireApi` 或 `wire_api` 优先级更高。支持文字、图片、工具调用、
推理强度、结构化输出和流式响应；响应中的 `usage.total_tokens` 会回填至
`costCoins`。由于 GPT-5.6 服务端不接受 `top_p`，Provider 会在请求前明确报错，
请使用 `temperature` 调节随机性。默认 OpenAI 兼容根地址为
`https://api.novita.ai/openai`，可通过 `platformConfig.openaiBaseURL` 覆盖。

### Novita Seedance 海外版（Token 计费）

海外 Seedance 使用独立的 `novita` Provider 和 Novita API Key，不与国内 PPIO
地址或 Key 混用。支持以下官方版本 locator：

- `novita:///doubao-seedance-2-0-260128`
- `novita:///doubao-seedance-2-0-fast-260128`
- `novita:///doubao-seedance-2-0-mini-260615`
- `novita:///doubao-seedance-2-5-260628`
- 对应的四个 `dreamina-` 前缀模型

```ts
const task = await executor.run({
  locator: 'novita:///doubao-seedance-2-5-260628',
  payload: {
    prompt: '保持参考角色一致，生成电影感产品短片',
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
console.log(result.outputs[0].url, result.costCoins);
```

Provider 通过 `POST /v3/bytedance/metered/contents/generations/tasks` 创建任务，使用
官方 `cgt-*` ID 轮询同路径下的 `{id}`，并支持通过 DELETE 取消排队任务或删除任务
记录。成功结果同时兼容 `content.video_url` 与 `content.url`，`usage.total_tokens`
会回填至 `costCoins`。输入素材支持公网 HTTP(S) URL、已激活的 `asset://<Id>`，
以及本地图片上传。表单中的 `firstFrameFile`、`lastFrameFile` 和
`referenceImageFiles` 会把本地图片转换为 Base64 Data URL；URL 字段仍可照常使用，
本地参考图与 URL 参考图合计最多 9 张。代码调用时也可直接传 Data URL 或
`{ inlineData: { mimeType, data } }`；
首尾帧模式不能与参考素材模式混用。默认根地址为
`https://api.novita.ai/v3/bytedance/metered`，可通过
`platformConfig.seedanceOverseaMeteredBaseURL`（或 `seedanceOverseaMeteredBaseUrl`）
覆盖。

### Novita Kling 3.0 系列

Kling 3.0 使用 Novita 官方 v3 异步接口，已接入 7 个独立 locator：

- `novita:///kling-v3.0-std-t2v`
- `novita:///kling-v3.0-std-i2v`
- `novita:///kling-v3.0-pro-t2v`
- `novita:///kling-v3.0-pro-i2v`
- `novita:///kling-v3.0-4k-t2v`
- `novita:///kling-v3.0-4k-i2v`
- `novita:///kling-v3.0-motion-control`

```ts
const task = await executor.run({
  locator: 'novita:///kling-v3.0-pro-i2v',
  payload: {
    // image 也可传 Upload 表单结果、Data URL 或 inlineData
    image: 'data:image/png;base64,...',
    multiPrompt: [
      '镜头缓慢推进，商品从暗部进入主光区',
      '主体转向镜头，背景灯光逐渐亮起',
    ],
    duration: 10,
    cfgScale: 0.5,
    sound: true,
  },
});
```

Standard、Pro 和 4K 均覆盖文生视频与图生视频，时长支持 3–15 秒；文生视频
支持 `16:9`、`9:16`、`1:1`。图生视频的 `image` / `endImage` 支持 JPG、PNG
公网 URL 或 Base64，单张上限 10MB。Pro 的 `multiPrompt` 为字符串数组；
Standard/4K 图生视频的 `multiPrompt` 为 `{ prompt, duration }[]`。尾帧不能与
多分镜同时使用。

Motion Control 需要角色参考图和公网 MP4/MOV 动作视频 URL，可选择
`kling-v3-0-std` 或 `kling-v3-0-pro`，并通过 `characterOrientation` 选择跟随
图片构图或视频构图。所有 Kling 任务通过
`GET /v3/async/task-result?task_id=...` 查询。默认异步根地址为
`https://api.novita.ai/v3/async`，可用 `platformConfig.asyncBaseURL`（或
`asyncBaseUrl`）覆盖。

### Novita Google Veo 3.1

Veo 3.1 使用 Google 原生 `predictLongRunning` 请求结构和 Novita 的统一异步
结果接口，支持三款独立 locator：

- `novita:///veo-3.1-generate-001`
- `novita:///veo-3.1-fast-generate-001`
- `novita:///veo-3.1-lite-generate-001`

```ts
const task = await executor.run({
  locator: 'novita:///veo-3.1-generate-001',
  payload: {
    prompt: 'A cinematic camera move from the first frame to the last frame',
    image: 'data:image/png;base64,...',
    lastFrame: 'data:image/jpeg;base64,...',
    aspectRatio: '16:9',
    resolution: '1080p',
    durationSeconds: 8,
    sampleCount: 1,
    generateAudio: true,
  },
});
```

文本生视频不传图片；图生视频传 `image`；首尾帧模式同时传 `image` 和
`lastFrame`。图片会转换为原生 `{ mimeType, bytesBase64Encoded }`，支持 JPEG
和 PNG，本地上传无需先取得公网 URL。支持 4/6/8 秒、16:9 或 9:16、720p 或
1080p，以及单次 1–4 个视频。提交可选择 `v1` 或 `v1beta1`，结果始终通过
`GET /v3/async/task-result?task_id=...` 查询；不要调用 Google 原生 operation
查询地址。默认提交根地址为 `https://api.novita.ai/v3/veo-3.1`，可通过
`platformConfig.veo31BaseURL`（或 `veo31BaseUrl`）覆盖。

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

### CRUN 图片模型

CRUN 作为独立 Provider 注册，默认使用统一异步任务接口
`https://api.crun.ai/api/v1/client/job/CreateTask`。目前支持以下 locator：

- `crun:///google/nano-banana-2`
- `crun:///google/nano-banana-2-v2`
- `crun:///google/nano-banana-2-lite`
- `crun:///google/nano-banana-pro`
- `crun:///google/nano-banana-pro-v2`
- `crun:///google/nano-banana`
- `crun:///google/nano-banana-v2`
- `crun:///openai/gpt-image-2`
- `crun:///openai/gpt-image-2-stable`
- `crun:///openai/gpt-image-2-premium`
- `crun:///bytedance/seedream-5-pro`

```ts
const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('crun:///') && process.env.CRUN_API_KEY
      ? {
          apiKey: process.env.CRUN_API_KEY,
          baseURL: process.env.CRUN_BASE_URL,
        }
      : undefined,
});

const task = await executor.run({
  locator: 'crun:///google/nano-banana-2',
  payload: {
    prompt: '一张电影质感的未来城市海报，中文标题清晰可读',
    imgUrls: ['https://assets.example.com/reference.png'],
    resolution: '4K',
    aspectRatio: '16:9',
    outputFormat: 'png',
    googleSearch: false,
  },
});

const result = await task.promise;
```

所有型号都支持文生图和基于公网图片 URL 的编辑。`Nano Banana 2` 与 `Pro` 支持
`1K`、`2K`、`4K`；`2 Lite` 使用精简参数。名称以 `-v2` 结尾的是成本优化通道，
通常更便宜但可能更慢：Provider 会自动避免传入该通道不支持的 `output_format`，
并且不会向 `nano-banana-2-v2` 传入 `google_search`。本地图片可通过 `crun`
上传 Provider 自动取得 CRUN 资源 URL，再作为 `img_urls` 提交；不能直接把本地路径或
Base64 数据作为 `img_urls`。任务成功后从
`result.media_urls` 解析图片地址；CRUN 结果链接有保留时限，应及时下载。

GPT Image 2 三个通道均作为独立型号接入。默认版提交 `prompt`、`img_urls` 与
`aspect_ratio`；Stable 额外支持 `quality`、`background`、`output_format` 和
`moderation`；Premium 支持 `quality`、`1K/2K/4K` 的 `resolution`，最多接收 14 张
参考图。本地参考图均先经 CRUN 上传 Provider 转换为资源 URL，Provider 不会把某一
通道的专属参数混入其他通道。

Seedream 5.0 Pro 使用 `crun:///bytedance/seedream-5-pro`，支持文生图与最多 10 张
参考图编辑，提供 `1K/2K` 分辨率、常用横竖比例、跟随首张参考图比例以及 PNG/JPEG
输出。本地参考图会由 CRUN 上传 Provider 自动上传，再以 `img_urls` 提交：

```ts
const task = await executor.run({
  locator: 'crun:///bytedance/seedream-5-pro',
  payload: {
    prompt: '保留人物身份，把场景改成电影质感的杂志封面',
    imgUrls: ['https://assets.example.com/portrait.png'],
    resolution: '2K',
    aspectRatio: 'match_input_image',
    outputFormat: 'png',
  },
});
```

#### CRUN GPT-5.6 系列

CRUN GPT-5.6 使用同步 OpenAI 兼容接口，三款模型均支持 Responses 与
Chat Completions 两种协议：

- `crun:///gpt-5.6-sol`
- `crun:///gpt-5.6-terra`
- `crun:///gpt-5.6-luna`

```ts
const task = await executor.run({
  locator: 'crun:///gpt-5.6-terra',
  payload: {
    apiMode: 'responses', // 默认；也可设为 chat_completions
    systemPrompt: '回答要简洁、准确。',
    prompt: '分析这张图片，并概括最重要的信息。',
    urls: ['https://assets.example.com/reference.png'],
    reasoningEffort: 'medium',
    maxOutputTokens: 2048,
    responseFormat: 'text',
    stream: false,
  },
});

const result = await task.promise;
console.log(result.outputs[0].text);
```

默认调用 `POST /api/v1/responses`；`apiMode: 'chat_completions'` 调用
`POST /api/v1/chat/completions`。也可通过 `platformConfig.wireApi` 选择默认协议，
payload 中的 `apiMode` / `wireApi` 优先。三款模型支持 `none/low/medium/high`
推理强度，单次最多 5 张 JPG、PNG、GIF 或 WebP 图片；本地图片会先由 CRUN 上传
Provider 自动取得临时 URL。`temperature` 与 `top_p` 只在显式传入时发送，默认均不
发送。Responses 与 Chat 的流式响应会在 Provider 内合并成最终文本结果。

#### CRUN Seedance 视频系列

Seedance 视频模型同样复用 CRUN 统一异步任务接口，支持以下 locator：

- Seedance 2.5：`crun:///bytedance/seedance2-5-t2v`、
  `crun:///bytedance/seedance2-5-i2v`、`crun:///bytedance/seedance2-5-r2v`
- Seedance 2.0：`crun:///bytedance/seedance2-0-t2v`、
  `crun:///bytedance/seedance2-0-i2v`、`crun:///bytedance/seedance2-0-r2v`
- Seedance 2.0 Mini：`crun:///bytedance/seedance2-0-mini-t2v`、
  `crun:///bytedance/seedance2-0-mini-i2v`、
  `crun:///bytedance/seedance2-0-mini-r2v`
- Seedance 2.0 Fast：`crun:///bytedance/seedance2-0-fast-t2v`、
  `crun:///bytedance/seedance2-0-fast-i2v`、
  `crun:///bytedance/seedance2-0-fast-r2v`
- Seedance 1.5 Pro：`crun:///bytedance/seedance1-5-pro-t2v`、
  `crun:///bytedance/seedance1-5-pro-i2v`

```ts
const task = await executor.run({
  locator: 'crun:///bytedance/seedance2-5-r2v',
  payload: {
    prompt: '[Image1] 中的角色进入 [Video1] 的场景，配合 [Audio1] 的节奏',
    referenceImages: ['https://assets.example.com/character.png'],
    referenceVideos: ['https://assets.example.com/location.mp4'],
    referenceAudios: ['https://assets.example.com/music.mp3'],
    resolution: '1080p',
    aspectRatio: '16:9',
    duration: 8,
    audio: true,
  },
});

const result = await task.promise;
```

文生、图生和参考生分别使用不同请求字段。图生模式通过 `img_urls` 传入一张首帧和
可选的尾帧；参考生模式使用 `reference_images`、`reference_videos`、
`reference_audios`，且至少包含图片或视频。HTTP(S) URL 和 Seedance `asset://`
标识都可直接使用；本地图片、视频、音频可先通过 CRUN 上传 Provider 转换为 URL。
Provider 会根据系列限制分辨率和最长时长，并把成功结果解析为 `video` 输出。

#### CRUN Kling 视频系列

已接入以下六个 Kling locator：

- `crun:///kling/v3`
- `crun:///kling/v3-turbo`
- `crun:///kling/v3-motion-control`
- `crun:///kling/v2-6`
- `crun:///kling/v2-6-motion-control`
- `crun:///kling/avatar`

```ts
const task = await executor.run({
  locator: 'crun:///kling/v3',
  payload: {
    mode: 'pro',
    multiShots: true,
    shotType: 'customize',
    imgUrls: ['https://assets.example.com/start-frame.png'],
    multiPrompt: [
      { prompt: '广角镜头，@hero 走入古老神殿', duration: 4 },
      { prompt: '中景，@hero 举起发光的遗物', duration: 6 },
    ],
    elementList: [{
      name: 'hero',
      description: '穿黄色雨衣的年轻探险家',
      elementImageUrls: ['https://assets.example.com/hero.png'],
    }],
    duration: 10,
    audio: true,
  },
});

const result = await task.promise;
```

`kling/v3` 同时支持 Standard/Pro、文生视频、单图图生、首尾帧、多镜头、最多三个
角色或元素参考以及原生音频。多镜头自定义模式最多六段，各段时长之和必须等于总时长；
提示词使用 `@name` 引用 `elementList` 中的角色。`kling/v3-turbo` 提供更快的
720p/1080p 文生或单图图生；`kling/v3-motion-control` 使用一张角色图和一个动作
参考视频；`kling/avatar` 使用一张肖像和一段语音生成对口型视频。本地图片、视频和
音频均通过 CRUN 上传 Provider 自动转换为公网资源 URL。

Kling 2.6 普通生成通过 `crun:///kling/v2-6` 同时支持文生、单图图生和首尾帧图生。
`std` 输出 720p、必须关闭音频，且双首尾帧只允许 `std`；`pro` 输出 1080p，
支持原生音频。时长可选 5 或 10 秒，画幅支持 `16:9`、`9:16`、`1:1`。
`crun:///kling/v2-6-motion-control` 使用一张角色图片和一段动作参考视频，
可选择画面构图跟随图片或参考视频。两种模式的本地素材都通过 CRUN 上传 Provider
自动转换为 URL。

#### CRUN MiniMax H3 视频系列

MiniMax H3 按官方四种任务模式分别接入：

- 文生视频：`crun:///minimax/h3-t2v`
- 首帧或首尾帧图生视频：`crun:///minimax/h3-i2v`
- 图片、视频、音频多模态参考生视频：`crun:///minimax/h3-r2v`
- 成功的 768P H3 任务再生为 2K：`crun:///minimax/h3-regeneration`

```ts
const task = await executor.run({
  locator: 'crun:///minimax/h3-r2v',
  payload: {
    prompt: '保留 [Image1] 的人物外观，跟随 [Video1] 的动作和 [Audio1] 的节奏',
    referenceImages: ['https://assets.example.com/character.png'],
    referenceVideos: ['https://assets.example.com/motion.mp4'],
    referenceAudios: ['https://assets.example.com/music.mp3'],
    duration: 8,
    resolution: '2K',
    aspectRatio: '16:9',
  },
});
```

普通生成支持 `768P/2K`、4–15 秒和原生音频。图生模式接收一张首帧或两张首尾帧，
画幅固定为 `auto`；参考模式最多接收 9 张图片、3 段视频、3 段音频，总文件数最多
12 个，并且不能只传音频。再生模式仅提交原成功 768P 任务的 `h3_task_id`。
本地图片、视频和音频均通过 CRUN 上传 Provider 自动转换为公网 URL。

#### CRUN PixVerse V6 视频系列

PixVerse V6 按 CRUN 官方的三个任务通道分别接入：

- 文生视频：`crun:///pixverse/v6-t2v`
- 单图图生视频：`crun:///pixverse/v6-i2v`
- 多主体参考生视频：`crun:///pixverse/v6-r2v`

```ts
const task = await executor.run({
  locator: 'crun:///pixverse/v6-r2v',
  payload: {
    prompt: '@hero 穿过 @forest，电影感跟拍镜头，环境音自然',
    referenceImages: [
      { url: 'https://assets.example.com/hero.png', refName: 'hero', type: 'subject' },
      { url: 'https://assets.example.com/forest.jpg', refName: 'forest', type: 'background' },
    ],
    duration: 8,
    quality: '1080p',
    aspectRatio: '16:9',
    generateAudio: true,
  },
});
```

三个通道均支持 1–15 秒、`360p/540p/720p/1080p` 和可选原生音频。文生、图生
支持 `generateMultiClip` 多镜头；图生要求恰好一张首图，并跟随输入图画幅；参考生
支持 1–7 张图片，可为每张参考图设置不超过 30 个字符的 `refName` 和
`subject/background` 角色，并在提示词中用 `@refName` 精确引用。本地图片通过 CRUN
上传 Provider 自动转换为公网 URL。

#### CRUN HappyHorse 1.1 视频系列

HappyHorse 1.1 按 CRUN 官方三个通道分别接入：

- 文生视频：`crun:///happyhorse-1-1-t2v`
- 单图图生视频：`crun:///happyhorse-1-1-i2v`
- 多图参考生视频：`crun:///happyhorse-1-1-r2v`

```ts
const task = await executor.run({
  locator: 'crun:///happyhorse-1-1-r2v',
  payload: {
    prompt: '保持参考图中的人物和马匹一致，生成一段电影感骑行场景，包含自然对白和环境声',
    imgUrls: [
      'https://assets.example.com/rider.png',
      'https://assets.example.com/horse.jpg',
    ],
    resolution: '1080P',
    duration: 10,
    aspectRatio: '16:9',
  },
});
```

三个通道均支持 `480P/720P/1080P` 和 3–15 秒视频。文生和参考生可选择
`16:9/9:16/3:4/4:3/4:5/5:4/1:1/9:21/21:9` 画幅；图生要求恰好一张首帧图，
画幅跟随输入图；参考生支持 1–9 张图片。模型的对白与声音由提示词直接描述，不提交
额外的 `audio` 开关。项目固定使用 CRUN 海外 `global` 区域，并开启输入、输出合规检查。
本地图片会通过 CRUN 上传 Provider 自动转换为 `img_urls` 公网资源 URL。

#### CRUN MiniMax Hailuo 2.3

Hailuo 2.3 使用同一个 CRUN Locator 同时支持文生视频和图生视频：

- Locator：`crun:///minimax/hailuo-2-3`
- 不传 `imgUrls`：文生视频
- 传一张 `imgUrls`：图生视频（本地图片会自动上传到 CRUN）

```ts
const task = await executor.run({
  locator: 'crun:///minimax/hailuo-2-3',
  payload: {
    prompt: '海边灯塔在清晨薄雾中逐渐显现，镜头缓慢向前推进',
    imgUrls: ['https://assets.example.com/start.jpg'], // 文生视频时省略
    mode: 'pro',
    duration: 6,
    resolution: '1080P',
  },
});
```

支持 `std/pro` 两种模式、`768P/1080P` 分辨率和 6/10 秒时长；其中 `1080P`
使用 6 秒组合。成功结果按视频资源统一解析，兼容 `media_urls`、`video_urls`、
`video_url` 和 `url` 等响应字段。

#### CRUN Image Upscale 图片放大

CRUN 图片放大工具分为两个独立版本：

- 基础版：`crun:///image-upscale`
- 专业版：`crun:///image-upscale-pro`

```ts
const basic = await executor.run({
  locator: 'crun:///image-upscale',
  payload: {
    imgUrls: ['https://assets.example.com/source.jpg'],
    scaleFactor: 4,
    mode: 'face',
    outputFormat: 'png',
  },
});

const pro = await executor.run({
  locator: 'crun:///image-upscale-pro',
  payload: {
    imgUrls: ['https://assets.example.com/source.jpg'],
    clarity: 'ultra',
  },
});
```

基础版支持自动倍率或 `1×/2×/4×`、`clean/face` 增强模式和 `png/jpg`
输出；专业版提供 `high/ultra` 两档清晰度。两个版本都要求恰好一张输入图，
本地图片通过 CRUN 上传 Provider 自动转换为公网 URL。

#### CRUN Image Expand 图片扩展

Locator：`crun:///image-expand`。与图片放大不同，该模型生成原图边界外的新内容。
两种模式共用统一异步创建、查询和结果接口，并支持可选提示词、PNG/JPG 输出和回调。

```ts
// 四边扩展：各边比例范围 0–1，例如 0.25 表示向该方向扩展 25%。
const sides = await executor.run({
  locator: 'crun:///image-expand',
  payload: {
    imgUrls: ['https://assets.example.com/original.jpg'],
    expandMode: 'sides', top: 0.25, bottom: 0.1, left: 0.2, right: 0.2,
    prompt: '自然延伸天空和草地', outputFormat: 'png',
  },
});
// 画布模式：输入是预先合成的扩展画布，不是未经处理的原图。
const canvas = await executor.run({
  locator: 'crun:///image-expand',
  payload: {
    imgUrls: ['https://assets.example.com/prepared-canvas.png'],
    expandMode: 'canvas', maskUrl: ['https://assets.example.com/mask.png'],
  },
});
```

画布与蒙版必须同尺寸；画布待生成区域填白，蒙版黑色区域保留原图、白色区域生成。
`expandMode` 是本地选择字段，不发送给 CRUN；指定模式只发送该模式的参数，避免
表单切换后残留字段混用。不传模式时，有 `mask_url` / `maskUrl` 自动使用画布模式。
本地文件由 CRUN 上传 Provider 自动转成 URL；API 不直接接收 Base64 或本地路径。
画布合成由调用方预处理，桌面测试面板提供拖动布局和自动生成蒙版的功能。

API 文档要求：单张 JPG/PNG、每边至少 64 px、最长边不超过 4090 px、文件不超过
5 MB；原始网页上传控件标注 10 MB，与 API 文档不一致，因此面板按 5 MB 校验。
URL 输入的实际文件尺寸和大小由服务端校验。
详见[官方 Image Expand 文档](https://docs.crun.ai/ai-tools/image-expand)。

#### CRUN 图片 / 视频去水印

两个独立 Locator 使用 CRUN 统一异步创建、查询和结果接口：

- 图片：`crun:///image-watermark-remove`，接收恰好一张 `imgUrls`，
  `mode` 支持 `basic`（默认）或 `pro`；Pro 是同一模型的模式，不是另一个模型 ID。
- 视频：`crun:///video-watermark-remove`，接收恰好一个 `videoUrl`，
  提交时转成单个 `video_url` 字符串，不发送图片的 `mode` 字段。

```ts
const imageTask = await executor.run({
  locator: 'crun:///image-watermark-remove',
  payload: { imgUrls: ['https://assets.example.com/source.png'], mode: 'pro' },
});
const videoTask = await executor.run({
  locator: 'crun:///video-watermark-remove',
  payload: { videoUrl: ['https://assets.example.com/source.mp4'] },
});
```

本地图片和视频均可通过 CRUN 上传 Provider 自动取得临时 URL；接口不直接接收
本地路径或 Base64。两者不需要提示词，支持可选 HTTPS `callbackUrl`。图片 Basic
支持 JPG/PNG/BMP、每边 20–10000 px、文件不超过 50 MB；Pro 支持 JPG/PNG/WebP、
文件小于 50 MB。视频文档未明确给出时长、分辨率或大小上限，以服务端校验为准。
仅处理自己拥有或获得授权的素材。

官方文档：[图片去水印](https://docs.crun.ai/ai-tools/image-watermark-remove)、
[视频去水印](https://docs.crun.ai/ai-tools/video-watermark-remove)。

#### CRUN Grok Imagine Video 1.5 Preview

Grok Imagine Video 1.5 Preview 使用 CRUN 官方单图图生视频通道：

- Locator：`crun:///grok-imagine-video-1.5-preview`

```ts
const task = await executor.run({
  locator: 'crun:///grok-imagine-video-1.5-preview',
  payload: {
    prompt: '慢速电影感推进镜头，人物自然开口说话，带同步环境音和背景音乐',
    imgUrls: ['https://assets.example.com/reference.png'],
    aspectRatio: 'auto',
    resolution: '720p',
    duration: 10,
  },
});
```

该通道要求一张参考图片和非空提示词，支持 1–15 秒以及 `480p/720p`。画幅使用
`auto` 跟随输入图。模型会原生生成同步对白、环境音、音效和音乐，官方请求中没有额外
的音频开关。本地图片会通过 CRUN 上传 Provider 自动转换为 `img_urls` 公网资源 URL。

#### CRUN Gemini Omni 多模态视频

Gemini Omni 使用 CRUN 官方统一多模态视频通道：

- Locator：`crun:///google/gemini-omni`

```ts
const task = await executor.run({
  locator: 'crun:///google/gemini-omni',
  payload: {
    prompt: '参考产品图与运镜视频，生成一段光线连贯、主体稳定的电影感广告片',
    referenceImages: [
      'https://assets.example.com/product.png',
      'https://assets.example.com/style.png',
    ],
    videoList: [
      { url: 'https://assets.example.com/camera-motion.mp4', start: 0, ends: 6 },
    ],
    duration: 6,
    aspectRatio: '16:9',
    resolution: '720p',
  },
});
```

该通道可组合文字、参考图片和一个参考视频；最多 7 张参考图，图片与视频合计最多
8 个素材。参考视频通过 `video_list` 传入，每项包含 `url`、`start` 和 `ends`，且
`ends` 必须晚于 `start`。支持 `4/6/8/10` 秒、`16:9/9:16` 画幅以及
`720p/1080p/4k`。本地图片和视频会通过 CRUN 上传 Provider 自动转换为公网 URL。

#### CRUN Google Veo 3.1 视频系列

Veo 3.1 按 CRUN 官方 8 个独立通道接入：

- 标准版：`crun:///google/veo3-1-t2v`、`crun:///google/veo3-1-i2v`
- Fast：`crun:///google/veo3-1-fast-t2v`、`crun:///google/veo3-1-fast-i2v`、`crun:///google/veo3-1-fast-r2v`
- Lite：`crun:///google/veo3-1-lite-t2v`、`crun:///google/veo3-1-lite-i2v`、`crun:///google/veo3-1-lite-r2v`

```ts
const task = await executor.run({
  locator: 'crun:///google/veo3-1-fast-i2v',
  payload: {
    prompt: '人物从雨夜街角转身走向镜头，霓虹倒影自然流动，带同步环境音',
    imgUrls: [
      'https://assets.example.com/first-frame.png',
      'https://assets.example.com/last-frame.png',
    ],
    duration: 8,
    resolution: '1080p',
    aspectRatio: '16:9',
    translatePrompt: true,
  },
});
```

文生和图生通道支持 `4/6/8` 秒；Fast/Lite 参考生通道固定 8 秒。图生支持 1 张
首帧图或 2 张首尾帧图；参考生支持 1–3 张参考图。全系列支持 `720p/1080p`、
`16:9/9:16` 和 `translate_prompt`，生成视频包含 Veo 原生同步音频。本地图片会通过
CRUN 上传 Provider 自动转换为 `img_urls` 公网资源 URL。

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
