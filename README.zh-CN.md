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

### Worktree 开发启动

如果你是在 git worktree 目录里开发，请使用 worktree 专用命令，这样当前目录会使用独立的 `.env.worktree`、数据库名、后端端口和前端端口：

```bash
cd /path/to/your-didian-worktree
make setup-worktree
make start-worktree
```

`make setup-worktree` 会在缺少 `.env.worktree` 时自动创建它，安装依赖，确保共享的本地 PostgreSQL 容器已启动，创建当前 worktree 对应的数据库，并执行 migrations。

`make start-worktree` 会读取 `.env.worktree`，先跑 migrations，然后同时启动 Go 后端和 Next.js 前端。启动时会打印准确的本地访问地址，例如：

```text
Backend: http://localhost:18957
Frontend: http://localhost:13877
```

停止当前 worktree 的前后端进程，但保留共享 PostgreSQL 容器：

```bash
make stop-worktree
```

如果提示端口被占用，先在同一个 worktree 目录执行 `make stop-worktree`。如果占用端口的是另一个 checkout，请进入那个 checkout 执行对应的 `make stop`、`make stop-main` 或 `make stop-worktree`。

常用检查：

```bash
pnpm typecheck
pnpm lint
pnpm test
make test
make check
```

修改代码前请先阅读 `CLAUDE.md`。它是本仓库给本地 Agent 和工程协作使用的根级规范。

## 接入本机 Codex

Didian 不会在浏览器里直接运行 Codex。它会把 Mission 派发给本机 daemon，由 daemon 检测你机器上的 `codex` CLI，注册 Codex runtime，并在本机执行被分配的任务。正常用户路径应该是 CLI-first：执行一次 setup，然后保持 daemon 运行。

本地 self-host 开发时，先启动 Web/API，再跑 setup 流程：

```bash
didian setup self-host
```

如果还没安装 CLI、正在仓库源码里开发，可以用源码 CLI 跑同一条命令：

```bash
cd server
go run ./cmd/didian setup self-host
```

`setup self-host` 会配置 `http://localhost:8080` 为 API、`http://localhost:3000` 为 Web，打开浏览器登录，发现你的 workspace，并启动 daemon。daemon 会从 `PATH` 自动检测 Codex；在 macOS 上也会检查 ChatGPT.app 和 Codex.app 内置的 Codex binary。

确认 setup 已经找到 Codex：

```bash
didian daemon status
didian runtime list --output json
```

使用源码 CLI 时：

```bash
go run ./cmd/didian daemon status
go run ./cmd/didian runtime list --output json
```

在 runtime 输出里，Codex 记录应该是 `provider` 为 `codex`，并且 `status` 为 `online`。Codex runtime 在线且 Agent 已绑定后，新建 Mission 就可以在 UI 里分配给这个 Agent。

如果已经创建的 Mission 仍然是“未分配”，可以用 CLI 手动绑定到 Codex Agent：

```bash
didian agent list --output json
didian issue update DID-8 --assignee-id <agent-id> --status todo
```

### Codex 检测排障

如果 `daemon status` 只显示其他 agent，或者 `runtime list` 里 Codex runtime 是 `offline`，先确认 Codex 可用后重启 daemon：

```bash
codex --version
didian daemon stop
didian daemon start
```

在 macOS 上，如果 Codex 打包在 ChatGPT.app 里但仍然没有被检测到，可以显式指定路径：

```bash
didian daemon stop

DIDIAN_CODEX_PATH=/Applications/ChatGPT.app/Contents/Resources/codex \
didian daemon start
```

对应的源码 CLI 调试方式是：

```bash
cd server

export DIDIAN_SERVER_URL=http://localhost:8080
export DIDIAN_WORKSPACE_ID=<workspace-id>

DIDIAN_CODEX_PATH=/Applications/ChatGPT.app/Contents/Resources/codex \
go run ./cmd/didian daemon start --foreground
```

创建或分配 Mission 时保持 `didian daemon start` 运行。可以设置 `DIDIAN_CODEX_MODEL=<model-id>` 作为 daemon 级默认模型。

## 当前状态

Didian 处于 MVP 构建阶段。第一批里程碑聚焦资源工作台外壳、Runtime 可见性、浏览器采集 payload、本地 Agent 执行、Mock 云盘写入和 artifact 生成。

## 许可证

见 [LICENSE](LICENSE)。
