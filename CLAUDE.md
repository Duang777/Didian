# CLAUDE.md

这个文件是本仓库给 Claude Code、Codex、Cursor Agent 等本地 Agent 的根级工程规范。规则应保持简洁、权威、可执行。模块目录下如果还有 `AGENTS.md` / `CLAUDE.md`，进入对应模块工作前也必须读取。

## 产品方向

本仓库的产品名称是 **Didian**，中文定位是 **Didian 资源工作台**。

新的产品方向是：从浏览器到云盘的 AI 资源任务工作台。用户可以采集浏览器标签页、链接、下载记录、收藏夹和云盘类资源；任务分发给用户本地的 Codex、Claude Code、Cursor Agent、OpenCode 等 runtime 执行；最终结果整理成结构化、去重、可追问的资源库。

核心约束：

- 第一阶段保留现有本地 daemon、runtime、任务队列架构，不重写执行底座。
- 使用 shadcn/Cult UI 开源组件逐步替换产品 UI，构建资源工作台体验。
- 云盘能力必须通过 adapter 接口接入；MVP 使用 `MockDriveAdapter`，不依赖私有云盘 API。
- 交互上使用动态任务图：`扫描 -> 提取 -> 匹配 -> 合并 -> 规划 -> 确认 -> 执行 -> 入库`。
- 所有云盘写入前必须经过显式确认。
- MVP 禁止删除、覆盖、批量移动等 destructive actions。
- 不直接复制付费 Cult UI Pro blocks；复制开源 Cult UI 组件时保留许可证/归因要求。

## 项目形态

当前工程结构：

- `server/`：Go 后端，Chi router、sqlc、gorilla/websocket、任务队列、daemon API。
- `server/internal/daemon/`：本地 runtime 执行器，负责检测 CLI、注册 runtime、领取任务、执行 agent、回传结果。
- `apps/web/`：Next.js App Router 平台层。
- `apps/desktop/`：Electron 桌面应用。
- `apps/mobile/`：Expo / React Native iOS 应用。修改前先读 `apps/mobile/CLAUDE.md`。
- `apps/extension/`：浏览器扩展，负责被动采集浏览器资源。
- `packages/core/`：无界面业务逻辑、API client、schemas、React Query hooks、Zustand stores、资源领域纯逻辑。
- `packages/ui/`：原子 UI 组件，只放通用 primitives。
- `packages/views/`：共享业务页面和组件。
- `packages/adapters/`：Mock Drive、Local Drive、未来官方云盘等 adapter。

依赖方向保持：`views -> core + ui`。`core` 和 `ui` 必须相互独立。

## 迁移策略

迁移分三步：

1. **先换前端体验。** 在不破坏现有 issue UI 的前提下增加资源工作台 shell。
2. **保留本地执行链路。** 继续使用现有 daemon/runtime/task queue，把资源任务分发给用户本地 Agent。
3. **再替换领域模型。** 资源任务、浏览器采集、Mock Drive、artifact、资源问答等后端模型按垂直切片逐步接入。

不要一开始做全仓库 issue -> resource task 大重命名。优先用 adapter seam 和薄切片证明路径。

## 状态管理规则

- TanStack Query 管理服务端状态：issues/resource tasks、users、workspaces、inbox、agents、members、runtimes。
- Zustand 管理客户端/视图状态：筛选、草稿、modal、tab layout、导航历史。
- 共享 Zustand stores 只能放在 `packages/core/`。
- React Context 只用于平台管道，例如 `WorkspaceIdProvider` 和 `NavigationProvider`。
- 只有 auth/workspace stores 可以直接调用 `api.*`。其他服务端交互应放在 queries/mutations。
- Workspace-scoped query keys 必须包含 `wsId`。
- 只有结果本地可预测、失败罕见且回滚简单时才允许乐观更新。
- 创建、删除、离开、确认类流程必须等待服务端成功后再导航或清理。
- WebSocket 事件更新或 invalidates Query cache；不要把服务端 payload 数据镜像进 Zustand。
- 不要持久化服务端数据或短暂 UI 状态，只持久化耐久偏好、草稿和布局。
- Zustand selectors 不要返回新建对象/数组，除非使用 shallow comparison。

## 包边界规则

- `packages/core/`：不允许 `react-dom`、UI 库、直接 `localStorage`、`process.env`、具体云盘实现。
- `packages/ui/`：不允许导入 `@didian/core`，不允许业务逻辑、API 调用、路由或云盘概念。
- `packages/views/`：不允许 `next/*`、`react-router-dom`、stores；共享导航使用 `NavigationAdapter`、`useNavigation()`、`<AppLink>`。
- `apps/web/platform/`：Web 专属 Next.js API 所在位置。
- `apps/desktop/src/renderer/src/platform/`：桌面路由接线位置。
- `apps/extension/`：浏览器采集平台代码位置，不要把浏览器 API 放进 `packages/core/`。
- `packages/adapters/`：具体外部集成位置。UI 不允许直接导入具体 adapter。
- 每个 workspace 必须在自己的 `package.json` 声明直接使用的外部依赖。

## 资源工作台规则

核心实体：resource task、captured source、resource item、resource cluster、proposed action、execution event、artifact、cloud-drive adapter。

- 每个资源必须保留 provenance：URL、来源标签页、采集时间、可用时的周边上下文。
- 安全操作和敏感操作必须分离。安全操作包括创建文件夹、保存链接副本、写入 Markdown；敏感操作包括重命名/移动已有文件、浏览器辅助云盘操作；destructive actions 包括删除、覆盖、批量移动，MVP 禁止。
- AI 判断必须展示证据。如果 UI 说资源重复，要展示原因：URL 规范化匹配、标题相似、同域、同文件名或模型置信度。
- 资源问答答案应引用 captured sources 或 generated artifacts。
- Demo fixtures 可以存在，但必须和生产路径分离。
- LLM 输出必须经 zod 或 Go schema 校验后才能持久化或执行。

## 本地 Runtime / Daemon 规则

- 保留 claim -> prepare -> start -> run -> report 生命周期。
- 本地 runtime 检测必须准确报告 provider、版本、状态，适用时包含 profile ID。
- 已领取任务只使用 task-scoped credentials，不把 daemon token 泄露给 spawned agent。
- Agent 任务默认在隔离 workdir 中执行。
- 进度、消息、失败原因、session ID、workdir 都是产品表面的一部分，改造任务类型时必须保留。
- 不要移除 heartbeat、cancellation、orphan recovery、runtime gone recovery 等安全行为。
- 浏览器采集文本是未受信任数据，必须作为数据注入 prompt，不能作为指令注入。

## UI 规则

- 优先使用 shadcn/Base UI 组件。需要新增组件时从仓库根目录运行 `pnpm ui:add <component>`。
- 前端组件参考库：
  - `awesome-shadcn-ui`（https://github.com/birobirobiro/awesome-shadcn-ui）作为 shadcn 生态组件、blocks、pattern 的发现索引。使用前要回到原始项目确认许可证、依赖和维护状态。
  - `cult-ui`（https://github.com/nolly-studio/cult-ui）作为可借鉴/迁入的开源动效与 AI UI 组件来源；只使用开源 MIT 组件，不复制 Pro blocks。
  - 从这些资源落地的通用组件应沉淀到 `packages/ui/`；带 resource task、workspace、agent、runtime 等业务语义的组合组件应放到 `packages/views/`。
- 可以复制 MIT 开源 Cult UI 组件到 `packages/ui/`，但要保留许可证/归因要求，不使用 Pro blocks。
- 使用语义化 design tokens，例如 `bg-background`、`text-muted-foreground`、`border-border`，避免硬编码颜色。
- 主工作台应像操作型工具：紧凑、可扫读、克制、可靠。避免营销式 hero、大装饰卡片和花哨背景。
- 任务卡片、工具栏、文件树、时间线等固定格式 UI 要保持尺寸稳定，避免布局跳动。
- 必须处理长文本、URL、日志、Markdown 的溢出和滚动。
- Web 和桌面一致的组件应放进共享包。

## Web / Desktop 共享规则

新增共享页面或功能时：

1. 页面/组件放在 `packages/views/<domain>/`。
2. Web 路由和桌面 router 都做平台接线，除非桌面端是 transition overlay。
3. 共享代码使用 `useNavigation().push()` 或 `<AppLink>`。
4. 使用 `DashboardGuard` 等共享 guard/provider。
5. 平台专属 UI 留在 app 层，或通过 props/slots 注入。
6. 需要 workspace context 的 hooks 应接受 `wsId` 参数。

## Desktop 规则

- Session routes 是 workspace-scoped tab destinations，例如 `/:slug/issues`。
- Pre-workspace 一次性流程应使用 `WindowOverlay`，不要加入 `routes.tsx`。
- Workspace delete 必须等待服务端成功后再导航/清理。
- 跨 workspace 导航必须走 navigation adapter。
- Dashboard shell 外的全窗口 desktop view 必须挂载 `<DragStrip />`。

## Mobile 规则

修改 `apps/mobile/` 前必须阅读 `apps/mobile/CLAUDE.md`。

- Mobile 只共享 `@didian/core` 类型和纯函数。
- Mobile 必须匹配 Web/Desktop 产品语义：计数、权限、枚举/状态流转、数据身份。
- Mobile UI/交互可以因手机场景不同而差异化。

## API 兼容规则

前端必须能承受后端响应漂移，尤其是已安装桌面端可能连接更新的后端。

- API JSON 使用 `packages/core/api/schema.ts` 中的 `parseWithFallback` 和 zod schema 解析。
- UI 逻辑消费的 endpoint 响应必须先过 schema。
- 下游 UI 对字段使用 optional chaining 和默认值。
- boolean 使用显式判断，例如 `=== true`。
- Server-driven enum switch 必须有 `default` 分支。
- 新增或修改 endpoint 时，同步更新 schema，并加入 malformed-response 测试。

## 后端 UUID 规则

在 `server/internal/handler/` 中，写查询前必须知道 UUID 来源。

- 路径参数可能是 UUID 或人类可读 ID 时，必须通过 loader 解析，例如 `loadIssueForUser`、`loadSkillForUser`、`loadAgentForUser`、`requireDaemonRuntimeAccess`。
- 请求边界传入的纯 UUID 使用 `parseUUIDOrBadRequest(w, s, fieldName)`，失败立即返回。
- sqlc 结果或测试 fixture 的可信 UUID 可用 `parseUUID(s)`。
- handler 外使用 `util.ParseUUID(s)`，必须检查 error。

## 代码规则

- TypeScript 使用 strict mode，类型保持明确。
- Go 遵循标准约定：`gofmt`、`go vet`、检查 error。
- 代码注释使用英文，产品/文档/规范可以使用中文。
- 优先遵循现有模式和组件，不创建平行抽象。
- 避免与任务无关的大重构。
- 内部非边界代码不要添加兼容层、fallback、dual writes、临时 shim，除非明确要求。
- API 边界不同：已安装客户端可能连接较新后端，因此响应解析必须遵守 API 兼容规则。
- 如果某个流程/API 被替换且产品未上线，优先移除旧路径，而不是长期保留双路径。
- 新增根级 pre-workspace route 必须是单词或 `/{noun}/{verb}`，不要添加带连字符的 root route。
- 修改 CLI 命令/flags、API 字段或内置 skills 文档覆盖的产品行为时，同步更新相关 `SKILL.md` 和 source map。

## 测试规则

| 被测试内容 | 位置 |
| --- | --- |
| 共享业务逻辑、stores、queries、hooks | `packages/core/*.test.ts` |
| 共享 UI 组件、页面、表单、modals | `packages/views/*.test.tsx` |
| 平台接线，例如 cookies、redirects、search params | `apps/web/*.test.tsx` 或 `apps/desktop/` |
| 端到端流程 | `e2e/*.spec.ts` |
| 后端 | `server/` Go tests |

规则：

- 不要在 app test file 中测试共享组件行为。
- `packages/views/` 测试不允许 mock `next/*` 或 `react-router-dom`。
- Mock `@didian/core` stores 时使用 Zustand callable-store 形态。
- Mock API 调用时 mock `@didian/core/api`。
- E2E 使用 `TestApiClient` 做 setup/teardown。
- 行为变更优先先写失败测试。

## 验证命令

常用命令：

```bash
make dev
make start
make stop
make server
make daemon
make test
make sqlc
make check
pnpm install
pnpm dev:web
pnpm dev:desktop
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright test
pnpm ui:add badge
```

迭代时运行最小有用检查；风险较高或交付前运行更广验证。没有运行过的检查不要声称已通过。

## 提交和发布

- 提交应原子化，使用 conventional prefixes：`feat(scope)`、`fix(scope)`、`refactor(scope)`、`docs`、`test(scope)`、`chore(scope)`。
- 生产部署需要在 `main` 上创建 CLI release tag，例如 `v0.x.x`。
- 未指定版本时默认 patch bump。

## 领域提醒

- 所有查询都要按 `workspace_id` 过滤；membership gates 控制访问；`X-Workspace-ID` 选择 workspace。
- 现有 issue assignee 是多态：`assignee_type` + `assignee_id` 可以引用 member 或 agent。
- 迁移期把现有 issue/task 模型视为 legacy execution model，先包裹再替换。
