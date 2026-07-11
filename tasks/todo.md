# 任务清单：Didian

## Task 1：基线项目验证

**描述：** 安装依赖，并在产品实现前记录当前项目的健康状态。

**验收标准：**
- [ ] 依赖安装成功，或已记录失败原因。
- [ ] 已记录当前 typecheck、build、test 状态。
- [ ] 本地前置条件缺口已写入 `docs/setup-notes.md`。

**验证：**
- [ ] `pnpm install`
- [ ] `pnpm typecheck`
- [ ] 聚焦 Go daemon 测试或 `make test`

**依赖：** 无

**可能触及文件：**
- `docs/setup-notes.md`

**规模预估：** S

## Task 2：资源工作台路由骨架

**描述：** 添加一个资源工作台 route，渲染新 shell，同时不移除现有 issue routes。

**验收标准：**
- [x] Web 中可以渲染资源工作台 route。
- [x] Route 使用 `packages/views/` 中的共享 view component。
- [x] 现有 routes 不受影响。

**验证：**
- [x] `pnpm typecheck`
- [x] 手动检查 Web route

**依赖：** Task 1

**可能触及文件：**
- `apps/web/app/[workspaceSlug]/(dashboard)/...`
- `packages/views/resources/...`

**规模预估：** M

## Task 3：引入 Cult UI 组件

**描述：** 只复制工作台 shell 需要的开源 Cult UI/shadcn 组件到 `packages/ui/`，并适配现有 design tokens。

**验收标准：**
- [x] 需要的 primitives 可以从 `packages/ui/` 使用。
- [x] 组件不包含业务逻辑。
- [x] 当前切片复用已有 shadcn primitives，未引入需额外归因的第三方源码。

**验证：**
- [x] `pnpm typecheck`
- [x] 从 `packages/views/` 做组件 import smoke check

**依赖：** Task 1

**可能触及文件：**
- `packages/ui/components/...`
- `packages/ui/styles/...`
- `docs/third-party-notices.md`

**规模预估：** M

## Task 4：Mock 资源任务看板

**描述：** 用 mock 数据构建第一个资源任务看板：列、卡片、状态、计数和当前步骤展示。

**验收标准：**
- [x] 看板展示 resource-task columns。
- [x] 卡片展示目标、状态、runtime、来源数、资源数、重复数、风险数和当前步骤。
- [x] 长文本不会破坏布局。

**验证：**
- [x] `pnpm typecheck`
- [x] 任务卡片状态渲染组件测试
- [x] 手动响应式检查

**依赖：** Task 2、Task 3

**可能触及文件：**
- `packages/views/resources/task-board/*`
- `packages/views/resources/mock-data.ts`

**规模预估：** M

## Task 5：Mock 资源任务详情

**描述：** 用 mock 数据构建任务详情面板：动态计划、资源聚类、建议操作、执行时间线和 artifacts。

**验收标准：**
- [x] 可以打开选中任务的详情。
- [x] 动态 plan/checkpoint UI 可见。
- [x] 建议操作和确认区域可见。
- [x] Artifact 预览能安全渲染 Markdown。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] needs-confirmation 和 completed 状态组件测试

**依赖：** Task 4

**可能触及文件：**
- `packages/views/resources/task-detail/*`
- `packages/views/resources/artifacts/*`

**规模预估：** M

## Task 5A：Didian 用户可见品牌清理

**描述：** 先把用户直接看到的 Didian 品牌表层迁移为 Didian，同时保留 `@didian/*` 包名、CLI binary、protocol scheme、本地配置目录和数据库/API 技术标识，避免在同一切片里破坏运行链路。

**验收标准：**
- [x] Web/desktop 可见文案使用 Didian。
- [x] 主要本地化文案中的产品名使用 Didian。
- [x] 桌面端 productName、reload 提示和 release metadata 使用 Didian。
- [x] 深层技术标识保留为后续迁移任务。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] `pnpm --filter @didian/desktop typecheck`
- [x] Staged 文件不包含 `.env`、`.next`、`node_modules` 或真实密钥。

**依赖：** Task 2、Task 4

**可能触及文件：**
- `apps/web/app/not-found.tsx`
- `apps/desktop/*`
- `packages/views/locales/*/*.json`
- `tasks/plan.md`
- `tasks/todo.md`

**规模预估：** M

## Task 5B：Workspace package scope 迁移

**描述：** 将内部 workspace package scope 从 `@didian/*` 迁移到 Didian scope，例如 `@didian/core`、`@didian/ui`、`@didian/views`。这是构建系统级迁移，必须独立于产品功能提交。

**验收标准：**
- [ ] package names、exports、imports、Turbo filters 和 TS references 全部一致。
- [ ] 旧 `@didian/*` imports 不再出现在应用源码中。
- [ ] 迁移后 views/web/desktop typecheck 通过。

**验证：**
- [ ] `pnpm typecheck`
- [ ] `pnpm --filter @didian/views test`
- [ ] `rg '@didian/'` 只剩迁移文档或兼容说明。

**依赖：** Task 5A

**可能触及文件：**
- `package.json`
- `pnpm-workspace.yaml`
- `apps/*/package.json`
- `packages/*/package.json`
- `apps/**/*.{ts,tsx,mjs,json}`
- `packages/**/*.{ts,tsx,mjs,json}`

**规模预估：** L

## Task 5C：CLI、daemon、protocol 和持久化标识迁移

**描述：** 分阶段迁移 `didian` CLI、desktop protocol、`~/.didian` 本地目录、server command、release asset、metrics/env/API 等深层技术标识。需要保留兼容别名或迁移路径，不能和 UI 品牌替换混在一起。

**验收标准：**
- [ ] 旧 CLI/protocol/config 用户有明确兼容路径。
- [ ] 新 Didian 命令和 release asset 可以安装/启动 daemon。
- [ ] 本地配置目录迁移不会丢失现有登录态或 runtime 配置。
- [ ] DB/API/metrics 改名采用 expand/contract 或兼容别名策略。

**验证：**
- [ ] CLI/daemon Go 聚焦测试
- [ ] Desktop login/deep-link 手动检查
- [ ] Release asset name resolver 测试
- [ ] 配置迁移测试

**依赖：** Task 5B

**可能触及文件：**
- `server/cmd/didian/*`
- `apps/desktop/src/main/daemon-manager.ts`
- `apps/desktop/src/main/cli-*`
- `apps/desktop/electron-builder.yml`
- `server/internal/metrics/*`
- migrations/config docs

**规模预估：** L

## Task 6：使用现有 API 展示 Runtime 面板

**描述：** 在不改 daemon 行为的前提下，把现有 runtime 状态展示到资源工作台中。

**验收标准：**
- [ ] Runtime 面板在有数据时展示 provider、version、status 和 last heartbeat。
- [ ] 没有 daemon 连接时有清晰 empty/offline 状态。
- [ ] Runtime 数据仍由 React Query 管理为服务端状态。

**验证：**
- [ ] `pnpm typecheck`
- [ ] 手动检查 daemon 未连接状态
- [ ] 如本地环境允许，手动检查 daemon 已连接状态

**依赖：** Task 5

**可能触及文件：**
- `packages/views/resources/runtime-panel/*`
- 必要时少量修改 `packages/core/runtimes/` 现有 hooks

**规模预估：** S-M

## Task 7：资源领域类型和 Schemas

**描述：** 增加 resource task、captured source、resource item、cluster、proposed action、execution event、artifact 类型和 zod schemas。

**验收标准：**
- [ ] 类型位于 `packages/core/resources/`。
- [ ] Zod schemas 能校验 browser capture 和 proposed actions。
- [ ] 测试覆盖合法 payload 和畸形 payload。

**验证：**
- [ ] `pnpm test -- --filter resources` 或聚焦 Vitest 命令
- [ ] `pnpm typecheck`

**依赖：** Task 1

**可能触及文件：**
- `packages/core/resources/types.ts`
- `packages/core/resources/schemas.ts`
- `packages/core/resources/*.test.ts`

**规模预估：** S-M

## Task 8：浏览器采集 Fixture 导入

**描述：** 在完整扩展之前，先增加 fixture import 路径，用 JSON capture payload 创建资源任务。

**验收标准：**
- [ ] 用户/开发者可以导入示例 capture JSON。
- [ ] Payload 经过 resource schemas 校验。
- [ ] 导入任务出现在资源看板中。

**验证：**
- [ ] Fixture 校验单元测试
- [ ] 手动导入检查

**依赖：** Task 4、Task 7

**可能触及文件：**
- `packages/core/resources/fixtures/*`
- `packages/views/resources/import/*`

**规模预估：** M

## Task 9：Chrome Extension 被动采集 MVP

**描述：** 搭建 Chrome extension，并采集当前标签页/全部标签页的标题、URL、选中文本、可读正文和链接。

**验收标准：**
- [ ] Extension 可以本地构建。
- [ ] 当前标签页采集返回结构化 payload。
- [ ] 全部标签页采集返回结构化 payload。
- [ ] Payload 可以发送或复制到工作台导入流程。

**验证：**
- [ ] Extension build command
- [ ] 手动 Chrome side-panel 测试
- [ ] 能单测的纯 extraction helpers 添加单元测试

**依赖：** Task 7

**可能触及文件：**
- `apps/extension/*`

**规模预估：** M

## Task 10：Resource Task Prompt 路径

**描述：** 增加 resource task prompt 构建路径，打包用户目标、采集来源、安全约束和期望 artifact 文件。

**验收标准：**
- [ ] Prompt 明确分隔指令和采集数据。
- [ ] Prompt 要求本地 Agent 产出结构化 artifacts。
- [ ] Prompt 测试覆盖正常采集文本和恶意/指令型采集文本。

**验证：**
- [ ] `server/internal/daemon/` 中的聚焦 Go 测试
- [ ] 如果 daemon 改动较广，运行 `make test`

**依赖：** Task 7

**可能触及文件：**
- `server/internal/daemon/prompt.go`
- `server/internal/daemon/*prompt*_test.go`

**规模预估：** M

## Task 11：本地 Agent 资源任务执行验证

**描述：** 将一个资源任务通过现有本地 runtime 执行，并在资源详情视图展示流式执行日志。

**验收标准：**
- [ ] 任务可以被本地 Codex 或 Claude runtime 领取。
- [ ] 执行 logs/messages 在资源任务详情中可见。
- [ ] blocker/failure 状态可见。

**验证：**
- [ ] 手动本地 daemon 执行
- [ ] 针对 task type/lifecycle 变更的聚焦后端测试

**依赖：** Task 6、Task 10

**可能触及文件：**
- `server/internal/service/*`
- `server/internal/handler/*`
- `packages/views/resources/task-detail/*`

**规模预估：** L，实现前需要继续拆小

## Task 12：Mock Drive Adapter 契约

**描述：** 定义云盘 adapter 类型，并实现支持文件夹、保存链接、Markdown artifacts 和操作日志的 mock adapter。

**验收标准：**
- [ ] Adapter 支持 create folder、save URL、write Markdown、list folder 和 search。
- [ ] Destructive operations 不可用或会被拒绝。
- [ ] Contract tests 覆盖 adapter 行为。

**验证：**
- [ ] 聚焦 adapter 单元测试
- [ ] `pnpm typecheck`

**依赖：** Task 7

**可能触及文件：**
- `packages/adapters/*`
- 可能新增 `packages/core/resources/adapter-types.ts`

**规模预估：** M

## Task 13：确认门和 Mock Drive UI

**描述：** 将 proposed actions 连接到确认面板，并把安全操作执行到 mock drive。

**验收标准：**
- [ ] 用户执行前能看到准确 proposed actions。
- [ ] 安全操作可以被批准并执行。
- [ ] Mock drive 文件树在执行后更新。
- [ ] Destructive actions 不能执行。

**验证：**
- [ ] 确认状态组件/集成测试
- [ ] 手动端到端 mock drive 检查

**依赖：** Task 5、Task 12

**可能触及文件：**
- `packages/views/resources/confirmation/*`
- `packages/views/resources/library/*`
- `packages/core/resources/mutations.ts`

**规模预估：** M

## Task 14：Demo Fixture 和 Artifact 生成

**描述：** 准备确定性的 AI Agent 调研 Demo fixture，并生成资源索引、项目对比表、复用清单和下一步行动。

**验收标准：**
- [ ] Demo fixture 包含真实感浏览器资源。
- [ ] 生成 artifacts 包含来源链接。
- [ ] Artifacts 可以在工作台和 mock drive 中渲染。

**验证：**
- [ ] Artifact generation snapshot 或单元测试
- [ ] 手动 Demo 检查

**依赖：** Task 8、Task 13

**可能触及文件：**
- `packages/core/resources/fixtures/*`
- `packages/core/resources/artifacts/*`
- `packages/views/resources/artifacts/*`

**规模预估：** M

## Task 15：资源问答 MVP

**描述：** 对采集资源和生成 artifacts 增加带来源引用的轻量问答。

**验收标准：**
- [ ] 用户可以针对一个 resource task 提问。
- [ ] 回答引用 source resources 或 artifacts。
- [ ] 没有证据时能诚实返回空/无证据答案。

**验证：**
- [ ] Retrieval selection 单元测试
- [ ] 使用 Demo fixture 手动检查问答

**依赖：** Task 14

**可能触及文件：**
- `packages/core/resources/qa/*`
- `packages/views/resources/ask/*`

**规模预估：** M

## 最终 Checkpoint

- [ ] 完整 Demo 五分钟内完成。
- [ ] 不依赖私有云盘 API。
- [ ] 本地 runtime 路径可见，或有清晰模拟降级。
- [ ] 浏览器采集/导入、任务图、确认门、mock drive、artifacts 和问答全部可见。
- [ ] 已运行相关测试和类型检查，并记录结果。
