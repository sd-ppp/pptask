<!-- English -->
# PPTask

> One interface for AI media generation, across providers.

[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg)](https://nodejs.org/)

PPTask is an open source task layer for AI media generation. It connects models and API platforms through one stable `locator + payload` contract, and normalizes the complete lifecycle: description, creation, polling, result extraction, cancellation, and asset upload.

Your application talks to PPTask instead of implementing a different SDK, request format, status mapper, error handler, and result parser for every platform.

```text
your app
   |
   | locator + payload
   v
 PPTask ---------------------------------------------------+
   | describe | create | check | result | cancel | upload  |
   +-------------------------------------------------------+
      |          |          |          |          |
   Replicate  RunningHub   ComfyUI    PPIO      Kie.ai ...
```

## Why PPTask

- **One entry point for many platforms.** Select a provider and model with a locator instead of coupling product code to a vendor SDK.
- **One task lifecycle.** Synchronous generation and asynchronous queues become the same task handle, status model, and result shape.
- **Built for media workflows.** Image, video, and audio integrations include asset upload, progress, cancellation, and cost metadata where available.
- **Discoverable model capabilities.** `describeResource` returns form schema, defaults, metadata, and upload recommendations for dynamic UIs.
- **Provider isolation.** Authentication, endpoints, status codes, output formats, and platform errors stay inside the adapter layer.
- **Open extension model.** Register a provider or upload provider for a private API, internal gateway, or self-hosted workflow without changing the core.
- **No lowest-common-denominator trap.** Stable fields make integrations portable while `raw` and metadata preserve provider-specific details.

## Where it fits

- AI creative tools that need several image, video, or audio platforms.
- Workflow systems that route by price, region, availability, or model capability.
- SaaS products that want one task and cancellation model across providers.
- Teams consolidating scattered vendor SDKs into a testable, replaceable adapter layer.
- Private deployments connecting ComfyUI, internal services, and public APIs.

## Core concepts

### Locator

A locator is a stable address for a model or workflow. The scheme selects the provider; the remaining path is interpreted by that provider:

```text
replicate:///black-forest-labs/flux-schnell
runninghub://api/rhart-image-n-pro/text-to-image
comfy-http://127.0.0.1:8188/workflows/product-shot
ppio:///gemini-3.1-flash-image
kie://market/seedream/5-pro-text-to-image
apiframe://video/kling-3.0
```

Keep connection configuration separate from one-off task input:

- `platformConfig` contains API keys, base URLs, and provider settings.
- `payload` contains prompts, dimensions, references, and task parameters.
- `options` contains execution controls such as an abort signal.

### Unified results

Every provider maps successful output to one result shape while retaining the original response:

```ts
type TaskResult = {
  provider: string;
  taskId: string;
  status: 'succeeded';
  outputs: Array<{ url?: string; rawData: unknown }>;
  costCoins?: number;
  costMoney?: number;
  costMoneyCurrency?: string;
  raw: unknown;
};
```

## Supported providers

| Provider | Locator scheme | Typical coverage |
| --- | --- | --- |
| Replicate | `replicate:` | Model/version resolution, async tasks, uploads |
| RunningHub | `runninghub:` | WebApp, API models, workflows, uploads |
| ComfyUI | `comfy-http:` / `comfy-https:` | Self-hosted workflows and uploads |
| PPIO | `ppio:` | Image, video, text, and multimodal models |
| Novita | `novita:` | Image, video, text, and multimodal models |
| Kie.ai | `kie:` | Catalog-backed image, video, and audio models |
| APIFrame | `apiframe:` | Image, video, music, and uploads |
| GRSAI | `grsai:` | Image generation and uploads |
| OpenAI | `openai:` | Image generation, editing, and variations |
| Gemini | `gemini:` | Gemini image generation |
| Volcengine Ark | `ark:` | Volcengine Ark image models |

See the [Provider Guide](docs/PROVIDER_GUIDE.md) for model-level parameters and platform-specific behavior.

## Quick start

Install PPTask from npm:

```bash
npm install pptask
```

Use the inline executor to get one task handle for synchronous and asynchronous providers:

```ts
import { createInlineExecutor } from 'pptask/executors/inline';

const executor = createInlineExecutor({
  platformConfig: locator =>
    locator.startsWith('replicate:')
      ? { apiKey: process.env.REPLICATE_API_KEY }
      : undefined,
});

const locator = 'replicate:///black-forest-labs/flux-schnell';
const description = await executor.describe({ locator });
const task = await executor.run({
  locator,
  payload: { ...description.formValues, prompt: 'A product photo with soft studio lighting' },
});

console.log(task.taskId, task.cancelable);
const result = await task.promise;
console.log(result.outputs);
```

Keep API keys in a server or trusted runtime. Never bundle provider secrets into browser code or commit them to the repository.

## Public API

Core exposes `describeResource`, `createTask`, `checkStatus`, `getResult`, `cancelTask`, and `upload`. Providers and upload providers can be registered with `registerProvider` and `registerUploadProvider`. See the [Provider Guide](docs/PROVIDER_GUIDE.md) and [Contributing Guide](CONTRIBUTING.md) for the complete contract.

## Project status

PPTask is currently `0.x`. The API is usable in real applications, but may evolve before the first stable release. Near-term work includes stabilizing the provider SDK and error model, publishing to npm, expanding model catalogs, adding cross-provider routing, and improving server-side credential isolation.

## Development

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
pnpm run test:build
```

More documentation: [Provider Guide](docs/PROVIDER_GUIDE.md), [Build and publishing](docs/BUILD.md), [Contributing](CONTRIBUTING.md), and [Security Policy](SECURITY.md).

## License

PPTask is licensed under the [Apache License 2.0](LICENSE). You may use, modify, and distribute it, including for commercial purposes, subject to the license terms.

Mentioned models, platforms, and trademarks belong to their respective owners. PPTask is an independent open source project and does not imply affiliation with or endorsement by those platforms.

---

<!-- 中文 -->
# PPTask

> 面向 AI 媒体生成的统一入口，连接不同模型与 API 平台。

[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933.svg)](https://nodejs.org/)

PPTask 是面向 AI 媒体生成的统一任务接口。它用一套稳定的 `locator + payload` 协议连接不同模型与 API 平台，并把同步响应、异步任务、状态轮询、结果提取、取消和素材上传整理成一致的生命周期。

应用只需要面向 PPTask 编程，不必为每个平台重复实现鉴权、请求格式、状态映射、错误处理和结果解析。

```text
your app
   |
   | locator + payload
   v
 PPTask ---------------------------------------------------+
   | describe | create | check | result | cancel | upload  |
   +-------------------------------------------------------+
      |          |          |          |          |
   Replicate  RunningHub   ComfyUI    PPIO      Kie.ai ...
```

## 为什么是 PPTask

- **一个入口，多种平台**：通过 locator 选择 Provider 和模型，业务代码不再绑定某一家 SDK。
- **统一任务生命周期**：同步生成与异步队列统一为相同的任务句柄、状态和结果结构。
- **媒体生成优先**：围绕图片、视频、音频等生成任务设计，内置素材上传、进度、取消和成本字段。
- **模型可描述**：`describeResource` 返回表单 Schema、默认值和上传建议，可直接驱动动态 UI。
- **平台差异留在适配层**：鉴权、端点、状态码、输出结构和错误信息由 Provider 负责归一化。
- **开放扩展**：Provider 与 Upload Provider 都可注册，私有平台和内部网关无需修改核心代码。
- **保留原始响应**：标准字段方便跨平台编程，`raw` 同时保留平台特有信息，避免能力被最低公分母限制。

## 适合什么场景

- AI 创作工具需要同时接入多个图片、视频或音频平台。
- 工作流系统需要按价格、区域、可用性或模型能力动态切换供应商。
- SaaS 产品希望用同一套任务状态、取消和结果结构构建前端体验。
- 团队需要逐步把散落的平台 SDK 收敛到可测试、可替换的 Provider 层。
- 私有部署需要同时连接 ComfyUI、本地服务和公开 API。

## 核心概念

### Locator

Locator 是资源的稳定地址。scheme 表示平台，后续部分由对应 Provider 解释：

```text
replicate:///black-forest-labs/flux-schnell
runninghub://api/rhart-image-n-pro/text-to-image
comfy-http://127.0.0.1:8188/workflows/product-shot
ppio:///gemini-3.1-flash-image
kie://market/seedream/5-pro-text-to-image
apiframe://video/kling-3.0
```

平台配置与任务参数分离：

- `platformConfig` 放 API Key、Base URL 等连接配置。
- `payload` 放 prompt、尺寸、参考素材等单次任务参数。
- `options` 放取消信号等执行控制信息。

这让凭据管理、任务复现和 Provider 切换保持清晰。

### 统一结果

所有 Provider 最终返回同一类结果：

```ts
type TaskResult = {
  provider: string;
  taskId: string;
  status: 'succeeded';
  outputs: Array<{ url?: string; rawData: unknown }>;
  costCoins?: number;
  costMoney?: number;
  costMoneyCurrency?: string;
  raw: unknown;
};
```

## 支持的平台

| Provider | Locator scheme | 典型能力 |
| --- | --- | --- |
| Replicate | `replicate:` | Replicate 模型与版本解析、异步任务、上传 |
| RunningHub | `runninghub:` | WebApp、API 模型、工作流任务与上传 |
| ComfyUI | `comfy-http:` / `comfy-https:` | 自托管工作流执行与上传 |
| PPIO | `ppio:` | 图片、视频、文本与多模态模型 |
| Novita | `novita:` | 图片、视频、文本与多模态模型 |
| Kie.ai | `kie:` | 基于目录的图片、视频、音频模型 |
| APIFrame | `apiframe:` | 图片、视频、音乐模型与素材上传 |
| GRSAI | `grsai:` | 图片生成任务与上传 |
| OpenAI | `openai:` | 图片生成、编辑与变体 |
| Gemini | `gemini:` | Gemini 图片生成能力 |
| Volcengine Ark | `ark:` | 火山方舟图片模型 |

具体模型、参数和平台差异见 [Provider Guide](docs/PROVIDER_GUIDE.md)。模型与平台能力会持续变化，代码中的 catalog 和 Provider 测试是最终依据。

## 快速开始

通过 npm 安装 PPTask：

```bash
npm install pptask
```

推荐使用 inline executor。它会把同步 Provider 和需要轮询的异步 Provider 都包装成统一任务句柄：

```ts
import { createInlineExecutor } from 'pptask/executors/inline';

const executor = createInlineExecutor({
  platformConfig: locator => {
    if (locator.startsWith('replicate:')) {
      return { apiKey: process.env.REPLICATE_API_KEY };
    }
    return undefined;
  },
});

const locator = 'replicate:///black-forest-labs/flux-schnell';
const description = await executor.describe({ locator });

const task = await executor.run({
  locator,
  payload: {
    ...description.formValues,
    prompt: 'A product photo with soft studio lighting',
  },
});

console.log('task:', task.taskId, 'cancelable:', task.cancelable);
const result = await task.promise;
console.log(result.outputs);
```

取消可取消的任务：

```ts
if (task.cancelable) {
  await task.cancel();
}
```

API Key 应只存在于服务端或可信执行环境。不要把平台密钥打包进浏览器代码或提交到仓库。

## 公共接口

Core 提供六个与执行环境无关的入口：

```ts
import {
  describeResource,
  createTask,
  checkStatus,
  getResult,
  cancelTask,
  upload,
} from 'pptask';
```

| 接口 | 作用 |
| --- | --- |
| `describeResource` | 获取模型元数据、表单 Schema、默认值和上传建议 |
| `createTask` | 创建任务，并归一化平台的创建响应 |
| `checkStatus` | 查询异步任务状态与进度 |
| `getResult` | 获取标准化输出、成本信息与原始响应 |
| `cancelTask` | 在 Provider 支持时取消远端任务 |
| `upload` | 使用独立 Upload Provider 上传输入素材 |

Inline executor 在这些原语之上提供 `describe`、`run`、`upload` 和 `TaskHandle`，适合应用直接使用。

## 扩展 Provider

Provider 是一个小而明确的适配器。最小实现负责描述资源和创建任务；异步 Provider 再实现状态与结果查询：

```ts
import { registerProvider } from 'pptask';
import type { ProviderDefinition } from 'pptask';

const provider: ProviderDefinition = {
  async describeResource({ locator }) {
    return {
      provider: 'acme',
      metadata: { scheme: 'acme', locator },
      formSchema: { type: 'object', properties: {} },
      formValues: {},
    };
  },

  async createTask({ payload }) {
    const job = await acme.jobs.create(payload);
    return {
      mode: 'async',
      task: {
        provider: 'acme',
        taskId: job.id,
        status: 'pending',
        raw: job,
      },
    };
  },

  async checkStatus({ taskId }) {
    return mapAcmeStatus(await acme.jobs.get(taskId));
  },

  async getResult({ taskId }) {
    return mapAcmeResult(await acme.jobs.get(taskId));
  },
};

registerProvider('acme', provider);
```

完整类型、上传扩展和 HTTP 代理示例见 [Provider Guide](docs/PROVIDER_GUIDE.md)。提交新 Provider 前请阅读 [Contributing Guide](CONTRIBUTING.md)。

## 设计原则

1. **稳定的公共契约优先于平台请求格式。** 平台差异应封装在 Provider 内。
2. **不隐藏平台能力。** 标准字段之外通过 `raw` 和 metadata 保留完整信息。
3. **配置与任务分离。** 凭据和端点属于 `platformConfig`，生成参数属于 `payload`。
4. **能力必须可发现。** 表单 Schema、上传建议和取消能力应能在运行前查询。
5. **新增集成必须可测试。** 请求映射、状态归一化、结果解析和错误路径都需要测试。

## 项目状态

PPTask 目前处于 `0.x` 阶段，API 已可用于实际项目，但在首个稳定版本前仍可能调整。近期重点包括：

- 稳定 Provider SDK 与错误模型。
- 完成 npm 发布与语义化版本流程。
- 扩充媒体类型、模型目录和 Provider 覆盖。
- 增加跨 Provider 的能力查询、路由和一致性测试。
- 完善服务端代理与凭据隔离方案。

## 开发

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
pnpm run test:build
```

更多资料：

- [Provider 详细指南](docs/PROVIDER_GUIDE.md)
- [构建与发布](docs/BUILD.md)
- [RunningHub API 模式](docs/RUNNINGHUB_API.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)

## License

PPTask 采用 [Apache License 2.0](LICENSE)。你可以在遵守许可证条款的前提下自由使用、修改和分发，包括商业用途。

项目中提及的模型、平台和商标归各自所有者。PPTask 是独立开源项目，除非另有说明，不代表与这些平台存在官方隶属或背书关系。
