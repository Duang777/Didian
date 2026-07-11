# Didian 资源工作台

Didian 是一个从浏览器到云盘的 AI 资源任务工作台，用来把散落在浏览器标签页、下载链接、收藏夹和云盘文件里的资料，整理成结构化、去重、可追问的资源库。

它不是给云盘加一个聊天框，而是把资料发现、任务创建、本地 Agent 执行、用户确认、云盘写入、artifact 生成和后续追问串成一个完整工作流。

**[English](README.md) | 简体中文**

## 产品形态

- **浏览器到云盘闭环**：在资料进入云盘前捕获标签页、页面、链接和上下文，避免来源丢失。
- **本地 Agent Runtime**：通过本地 daemon 检测 Codex、Claude Code、Cursor Agent、OpenCode 等 Agent CLI，并把任务分发到用户自己的机器上执行。
- **动态任务图**：把扫描、提取、匹配、合并、规划、确认、执行、入库和追问展示成可解释步骤。
- **Adapter 云盘层**：MVP 使用 `MockDriveAdapter`，后续可以接本地文件夹、浏览器辅助操作或官方云盘 API。
- **确认门**：写入云盘前必须由用户确认；MVP 禁止删除、覆盖、批量移动等破坏性操作。
- **可追溯产物**：生成资源索引、项目对比表、可复用清单和下一步计划，并保留来源引用。

## 架构

```text
浏览器 / 扩展
  -> Web 工作台
  -> Go API + 任务队列
  -> 本地 Daemon / Runtime
  -> Codex / Claude Code / Cursor Agent / OpenCode
  -> Artifacts + Proposed Actions
  -> Mock Drive 或 Adapter 云盘工作区
```

主要目录：

- `apps/web/`：Next.js 工作台平台接线。
- `apps/extension/`：浏览器采集入口。
- `server/`：Go API、任务队列、WebSocket 和 daemon API。
- `server/internal/daemon/`：本地 runtime 执行生命周期。
- `packages/core/`：无界面业务逻辑、schemas、API client、hooks 和 stores。
- `packages/ui/`：可复用 UI primitives。
- `packages/views/`：Web/桌面共享产品页面。
- `packages/adapters/`：云盘 adapter 实现。
- `tasks/`：实施计划和任务清单。

## 开发

环境需要 Node.js、pnpm、Go、Docker，以及项目脚本所需的本地服务。

```bash
pnpm install
cp .env.example .env
make setup
make start
```

常用检查：

```bash
pnpm typecheck
pnpm lint
pnpm test
make test
make check
```

修改代码前请先阅读 `CLAUDE.md`。它是本仓库给本地 Agent 和工程协作使用的根级规范。

## 当前状态

Didian 处于 MVP 构建阶段。第一批里程碑聚焦资源工作台外壳、Runtime 可见性、浏览器采集 payload、本地 Agent 执行、Mock 云盘写入和 artifact 生成。

## 许可证

见 [LICENSE](LICENSE)。
