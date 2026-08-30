# Security Policy

## Supported versions

PPTask 当前处于 `0.x` 阶段。安全修复仅保证应用于最新的 `master` 和最新发布版本。

## Reporting a vulnerability

请不要为未修复漏洞创建公开 Issue。优先使用 GitHub 仓库的 **Report a vulnerability** 私密报告入口，并提供：

- 受影响版本或提交 SHA。
- 可复现步骤和最小示例。
- 可能影响的 Provider、凭据或数据范围。
- 已知缓解方式（如有）。

维护者确认并完成修复前，请避免公开漏洞细节。

## Credential safety

- 仅通过运行时 `platformConfig` 或服务端环境变量提供 API Key。
- 不要把密钥放进 locator、payload、测试快照或日志。
- 浏览器应用应通过可信服务端代理调用需要私密凭据的 Provider。
- 调试 `raw` 响应前应检查并移除平台返回的敏感字段和临时资源地址。

第三方 AI 平台的服务可用性、内容策略和数据处理规则不由 PPTask 控制。部署者应同时遵守对应平台条款并评估数据合规要求。
