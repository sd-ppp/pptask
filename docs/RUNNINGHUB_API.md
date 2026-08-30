# RunningHub API 模式说明

## 📋 概述
记录 RunningHub API 模式(`runninghub://api/<model-path>`)的 locator 格式，以及当前在
`packages/pptask/core/src/providers/runninghub/api/helpers.ts` 中预置的模型参数说明。

参数定义代码位置:
- `packages/pptask/core/src/providers/runninghub/api/helpers.ts`

---

## ⚡ 快速开始

```bash
# 必需: 企业级共享 API Key
export RUNNINGHUB_STANDARD_API_KEY="your-api-key"
```

```ts
const locator = 'runninghub://api/rhart-image-n-pro/text-to-image';
const platformConfig = { apiKey: process.env.RUNNINGHUB_STANDARD_API_KEY! };
```

---

## 📚 详细说明

### Locator 格式

- 格式: `runninghub://api/<model-path>`
- 示例:
  - `runninghub://api/rhart-image-n-pro/text-to-image`
  - `runninghub://api/rhart-image-v1/text-to-image`

`model-path` 会原样透传给 RunningHub API，对应 RunningHub 官方文档中的模型路径。

### 参数说明（来自 helpers.ts 预置 schema）

当前仅对两个 model-path 做了显式定义，其他模型走通用 schema（仅 `prompt`）。

#### 1) rhart-image-v1/text-to-image

locator: `runninghub://api/rhart-image-v1/text-to-image`

字段:

| 字段 | 类型 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| prompt | string | - | - | 文本提示词，必填 |
| aspectRatio | string | `1:1` `3:4` `4:3` `16:9` `9:16` | `3:4` | 画面比例 |

示例 payload:

```json
{
  "prompt": "A cute baby monkey with soft fur",
  "aspectRatio": "3:4"
}
```

#### 2) rhart-image-n-pro/text-to-image

locator: `runninghub://api/rhart-image-n-pro/text-to-image`

字段:

| 字段 | 类型 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| prompt | string | - | - | 文本提示词，必填 |
| aspectRatio | string | `1:1` `4:3` `3:4` `16:9` `9:16` | `9:16` | 画面比例 |
| resolution | string | `1k` `2k` `4k` | `1k` | 输出分辨率 |

示例 payload:

```json
{
  "prompt": "A cute baby monkey with soft fur",
  "aspectRatio": "9:16",
  "resolution": "1k"
}
```

#### 3) 其他 model-path（通用 schema）

字段:

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| prompt | string | 文本提示词，必填 |

#### 4) rhart-image-n-pro-official/edit

locator: `runninghub://api/rhart-image-n-pro-official/edit`

字段:

| 字段 | 类型 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| imageUrls | array | - | - | 必填，Upload 组件，最多 10 张图片，每张不超过 10 MB |
| prompt | string | - | - | 文本提示词，必填，长度 5-4000 |
| resolution | string | `1k` `2k` `4k` | `1k` | 必填，输出分辨率 |
| aspectRatio | string | `1:1` `3:2` `2:3` `3:4` `4:3` `4:5` `5:4` `9:16` `16:9` `21:9` | - | 可选，画面比例 |

示例 payload:

```json
{
  "imageUrls": ["https://example.com/input.png"],
  "prompt": "Enhance details and add cinematic lighting",
  "resolution": "1k",
  "aspectRatio": "16:9"
}
```

#### 5) rhart-image-n-pro/edit

locator: `runninghub://api/rhart-image-n-pro/edit`

字段:

| 字段 | 类型 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| imageUrls | array | - | - | 必填，Upload 组件，最多 10 张图片，每张不超过 10 MB |
| prompt | string | - | - | 文本提示词，必填，长度 5-4000 |
| aspectRatio | string | `1:1` `16:9` `9:16` `4:3` `3:4` `3:2` `2:3` `5:4` `4:5` `21:9` | - | 可选，画面比例 |
| resolution | string | `1k` `2k` `4k` `1K` `2K` `4K` | `1k` | 必填，输出分辨率 |

示例 payload:

```json
{
  "imageUrls": ["https://example.com/input.png"],
  "prompt": "Enhance details and add cinematic lighting",
  "resolution": "1k",
  "aspectRatio": "9:16"
}
```

#### 6) rhart-image-v1/edit

locator: `runninghub://api/rhart-image-v1/edit`

字段:

| 字段 | 类型 | 可选值 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| prompt | string | - | - | 文本提示词，必填，长度 5-4000 |
| aspectRatio | string | `auto` `1:1` `16:9` `9:16` `4:3` `3:4` `3:2` `2:3` `5:4` `4:5` `21:9` | - | 必填，画面比例 |
| imageUrls | array | - | - | 必填，Upload 组件，最多 5 张图片，每张不超过 10 MB |

示例 payload:

```json
{
  "imageUrls": ["https://example.com/input.png"],
  "prompt": "Enhance details and add cinematic lighting",
  "aspectRatio": "auto"
}
```

---

## 🔧 配置

必需环境变量:
- `RUNNINGHUB_STANDARD_API_KEY`: RunningHub API 企业级共享 API Key

---

## 📝 示例

单元测试示例:
- `packages/pptask/core/tests/runninghub-api.test.ts`
  - locator: `runninghub://api/rhart-image-n-pro/text-to-image`

集成测试示例:
- `packages/pptask/core/tests/runninghub-api.integration.test.ts`
  - model-path: `rhart-image-v1/text-to-image`

---

## 🐛 故障排查

- 报错 `model path`:
  - 确认 locator 形如 `runninghub://api/<model-path>`
  - 不要留空 `runninghub://api/`
- 报错 `apiKey is required`:
  - 确认 `RUNNINGHUB_STANDARD_API_KEY` 已设置
