# Daemon Agent 指南

先阅读根目录 `CLAUDE.md` 和 `server/CLAUDE.md`。这个包是运行在用户机器上的本地 runtime 执行器。

## 职责

- 检测本地 Agent CLI，例如 Codex、Claude Code、Cursor Agent、OpenCode 和 custom runtime profiles。
- 向服务端注册 runtimes。
- 领取任务、准备隔离 workdir、启动 Agent CLI、流式回传进度/消息、报告最终结果。
- 保留 session/workdir 元数据，用于恢复和续跑。

## 资源工作台方向

- Resource task 应复用现有 daemon 执行路径，不要另建平行 runner。
- 浏览器/云盘资源上下文应注入 prompt 或隔离任务工作区中的文件。
- 任何本地文件或浏览器辅助云盘操作都必须显式、可审计。

## 边界

- 不要把 daemon 凭证泄露给 spawned agents；使用 task-scoped tokens。
- 除非任务明确指向用户批准的本地目录，否则不要在隔离 workdir 外运行任务。
- 不要静默修改用户文件或云端状态。
- 改造任务 prompt 时，不要移除 recovery、heartbeat、cancellation 或 orphan-task 行为。

## 验证

- 为 runtime 检测、prompt 构造、workspace 准备和任务结果回传补充或更新 daemon 测试。
- 先跑本包聚焦 Go 测试，再按需跑更广的 `make test`。
