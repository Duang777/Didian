# Server Agent 指南

先阅读根目录 `CLAUDE.md`。`server/` 包含 Go 后端、数据库迁移、daemon API、任务队列、runtime 注册和 CLI。

## 职责

- 受 workspace/membership 权限保护的 API。
- Runtime 注册、心跳和任务队列生命周期。
- Daemon endpoints 和 task-scoped credentials。
- 数据库迁移和 sqlc 生成的数据访问代码。
- `server/cmd/multica` 下的 CLI 命令。

## 资源工作台方向

- 前端替换期间保留 daemon/runtime/task-queue 行为。
- 在现有 workspace auth 和任务生命周期模式后面，增量加入 resource-task 后端概念。
- Mock Drive 和未来云盘集成必须放在明确 service interface 后面。

## 边界

- 不削弱 workspace membership 检查。
- 不允许 daemon token 访问其 workspace/task scope 外的资源。
- MVP 不增加破坏性云盘操作。
- 不绕过 sqlc 模式访问数据库。

## 验证

- Go 测试：`make test`
- SQL 变更：运行 `make sqlc` 并提交生成代码。
- 触及后端/runtime 时，条件允许则运行 `make check`
