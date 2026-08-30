# Contributing to PPTask

感谢你帮助 PPTask 成为更可靠的 AI 媒体生成统一接口。修复、文档、测试、模型目录和新 Provider 都欢迎提交。

## 开始之前

1. 对较大的 API 设计、新 Provider 或行为变更，请先创建 Issue 说明使用场景和方案。
2. 不要在 Issue、测试、日志或提交中包含真实 API Key、用户素材和平台响应中的敏感信息。
3. 新功能应保持 `locator + payload + platformConfig` 的职责边界。

## 本地开发

需要 Node.js 20+ 和 pnpm。

```bash
git clone https://github.com/sd-ppp/pptask.git
cd pptask
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
pnpm run test:build
```

集成测试默认在缺少 API Key 时跳过。请从 `test.env.example` 创建本地 `test.env`，不要提交该文件。

## Provider 贡献清单

一个可合并的 Provider 通常需要：

- 使用独立且稳定的 locator scheme，并验证非法 locator。
- 实现 `describeResource` 与统一的 `createTask` 返回类型。
- 异步任务实现 `checkStatus` 和 `getResult`，支持时实现 `cancelTask`。
- 将平台状态映射为 `pending`、`running`、`succeeded`、`failed` 或 `cancelled`。
- 将媒体结果映射到 `outputs`，同时在 `raw` 中保留原始响应。
- API 支持时填写进度、Token、积分或金额字段。
- 通过 `platformConfig` 接收凭据和可覆盖端点，禁止硬编码密钥。
- 为成功、失败、取消、异常响应和参数映射添加单元测试。
- 更新 README 支持矩阵和 `docs/PROVIDER_GUIDE.md`。

上传逻辑如果可独立复用，应通过 `registerUploadProvider` 注册，不要与任务创建强耦合。

## 提交与 Pull Request

- 保持提交聚焦，并使用能说明行为变化的提交信息。
- Pull Request 应说明动机、公共接口变化、验证方式和已知限制。
- 不要提交生成产物、真实媒体文件、`.env` 或 `test.env`。
- 行为变更必须同步更新测试和文档。

提交贡献即表示你同意按照项目的 Apache License 2.0 发布你的贡献。
