# 仓库 Agent 指南

这个文件给 Codex、Claude Code、Cursor Agent 等本地 Agent 提供仓库入口说明。

> **单一事实来源：** 根目录 `CLAUDE.md` 是更完整、更权威的工程规范。开始任何代码任务前先读 `CLAUDE.md`，再根据任务位置读取对应模块的 `AGENTS.md` / `CLAUDE.md`。

## 当前产品方向

这个工作区的产品名称是 **Didian**，中文定位是 **Didian 资源工作台**：一个从浏览器到云盘的资源任务平台。它使用本地 daemon/runtime 模型，同时用 shadcn/Cult UI 组件构建资源工作流产品体验。

默认实现原则：

- 在没有明确替代方案前，保留本地 runtime、daemon 和任务队列架构。
- 逐步把 coding issue UI 替换为 resource task UI。
- 云盘操作必须走 adapter 接口；MVP 使用模拟云盘，不依赖私有云盘 API。
- 优先使用动态任务图和显式确认门，而不是固定多 Agent 角色表演。
- 不复制付费 Cult UI Pro blocks；复制开源组件时保留必要许可证/归因要求。

## 快速架构索引

- `server/`：Go 后端、Chi router、sqlc、gorilla/websocket、任务队列、daemon API。
- `server/internal/daemon/`：本地 runtime 执行器，负责检测并调用 Codex、Claude Code、Cursor Agent 等 CLI。
- `apps/web/`：Next.js Web 平台层，只做路由和平台接线。
- `apps/desktop/`：Electron 桌面应用。
- `apps/mobile/`：Expo / React Native iOS 应用，修改前必须读 `apps/mobile/CLAUDE.md`。
- `apps/extension/`：未来 Chrome 扩展，负责浏览器资源被动采集。
- `packages/core/`：无界面业务逻辑、API schemas、React Query hooks、Zustand stores、资源领域纯逻辑。
- `packages/ui/`：原子 UI 组件，只放 shadcn/Base UI/Cult UI 通用组件，不放业务逻辑。
- `packages/views/`：Web/桌面共享业务页面和组件，资源工作台页面应放这里。
- `packages/adapters/`：Mock Drive、Local Drive、未来官方云盘等具体 adapter。

## 状态管理硬规则

- TanStack Query 管理服务端状态，例如任务、用户、workspace、agents、runtimes。
- Zustand 只管理客户端/视图状态，例如筛选、草稿、modal、布局。
- 共享 Zustand stores 放在 `packages/core/`，不要放在 `packages/views/` 或 app 目录。
- WebSocket 事件更新 Query cache；不要把服务端 payload 镜像进 Zustand。
- Workspace-scoped query key 必须包含 `wsId`。

## 包边界硬规则

- `packages/core/`：不允许 `react-dom`、UI 库、直接 `localStorage`、`process.env`、具体云盘实现。
- `packages/ui/`：不允许导入 `@didian/core`，不允许业务逻辑。
- `packages/views/`：不允许 `next/*`、`react-router-dom`、Zustand store；路由用 NavigationAdapter。
- `apps/web/platform/`：Web 专属 Next.js API 的位置。
- `server/internal/daemon/`：保留本地执行生命周期，不要随意改 claim/prepare/start/run/report 流程。

## 常用命令

```bash
make dev              # 自动设置并启动后端 + 前端
make start            # 启动当前 checkout
make stop             # 停止当前 checkout
make daemon           # 启动本地 daemon
make test             # Go 测试
make sqlc             # SQL 变更后重新生成 sqlc 代码
make check            # 全量验证流水线
pnpm install
pnpm dev:web
pnpm dev:desktop
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright test
pnpm ui:add badge     # 添加 shadcn/Base UI 组件
```

## 工作方式

- 先读 PRD 和 `tasks/plan.md` / `tasks/todo.md`，再实现。
- 采用垂直切片：每次完成一条可验证路径，不做大而全改造。
- 优先保留现有 runtime 能力，先替换前端体验，再逐步替换领域模型。
- 任何云盘写入都必须有确认门；MVP 禁止 destructive actions。
- 修改代码后运行最小有用验证；不要声称没跑过的检查已通过。
