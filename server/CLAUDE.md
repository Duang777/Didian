# server 指南

后端是控制平面。它负责任务调度，用户本地 daemon 负责执行 agent 任务。

## Runtime 和任务规则

- 任务生命周期流转必须明确、可审计。
- Runtime 注册必须准确汇报本地 CLI：provider、版本、状态，适用时包括 profile ID。
- 已领取任务只能拿到 task-scoped credentials。
- 进度、消息、失败原因、session ID 和 workdir 都是产品表面的一部分；改造任务类型时必须保留。
- 使用现有 daemon wakeup、heartbeat、recovery 模式，不要另造并行 runner。

## 资源后端规则

- Resource task 必须保持 workspace-scoped。
- Proposed action 必须记录 sensitivity：safe、requires_confirmation、destructive。
- MVP 必须在服务端拒绝 destructive action，即使 UI 隐藏按钮。
- Mock cloud-drive 写入要和未来官方 cloud-drive adapter 明确分离。

## Go 质量要求

- 所有 Go 变更必须 `gofmt`。
- 每个 error 都要检查。
- handler 保持轻薄，业务行为放进 service。
- 生命周期和权限变更必须补测试。
