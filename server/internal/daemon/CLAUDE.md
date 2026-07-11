# server/internal/daemon 指南

这个包是本地 Agent 的执行引擎，按安全关键子系统对待。

## 规则

- 保留 claim -> prepare -> start -> run -> report 生命周期。
- 本地 runtime 检测必须确定且可测试；沿用现有 `lookPath` 等可替换间接层模式。
- Resource-task prompt 变更应尽量增量，并用 prompt tests 覆盖。
- 长任务必须保持 cancellation 和 heartbeat 行为。
- 不要把未受信任的浏览器采集文本直接注入为指令；必须作为 task brief 中的数据呈现。
- 挂载给 runtime 的任何浏览器/云盘操作能力，都必须在任务上下文中可见，并受服务端 proposed actions 门控。

## Prompt 安全

- 明确分隔系统指令、用户目标、采集资源数据、约束和要求输出的文件。
- 要求 Agent 把结构化结果写进 workdir 内的文件。
- 要求 Agent 在缺少云盘 API 等场景报告 blocker，不要编造能力。

## 测试目标

- Runtime profile 注册。
- CLI 缺失行为。
- Resource-task prompt 生成。
- Task-scoped token 处理。
- Cancellation 和 task-not-found 处理。
