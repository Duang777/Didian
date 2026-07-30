# 任务清单：AI 资源工作台

## 2026-07-30 Skill Operating Loop

### Task SOL-1：前端缓存层过滤 internal Skill direction Missions

**描述：** 后端默认隐藏 `metadata.didian_internal = true` 的内部任务，但实时事件或缓存写入仍可能把 Skill 方向分析任务塞进普通 Mission 列表。把过滤规则集中放进 core cache helper，保护列表、看板和 My Missions 缓存。

**验收标准：**
- [x] `addIssueToBuckets` 不会把 internal issue 加入普通列表缓存。
- [x] `patchIssueInBuckets` 收到 `metadata.didian_internal = true` 时会从普通列表缓存移除该 issue。
- [x] WebSocket `issue:created` 不会把 internal Skill direction issue 插入列表。
- [x] 详情页仍可通过 direct issue detail/comment polling 读取 internal analysis result。

**验证：**
- [x] `pnpm --filter @didian/core exec vitest run issues/cache-helpers.test.ts issues/ws-updaters.test.ts`
- [x] `pnpm --filter @didian/core typecheck`

**依赖：** 无

**可能触及文件：**
- `packages/core/issues/cache-helpers.ts`
- `packages/core/issues/cache-helpers.test.ts`
- `packages/core/issues/ws-updaters.test.ts`

**规模预估：** S

### Task SOL-2：AI Inbox Skill 方向弹窗状态和错误诊断

**描述：** 让 `做成 Skill` 弹窗清楚表达平台初筛、本地 Codex 推荐方向、用户确认草稿和生成 Skill 的阶段。错误需要区分 backend offline、Codex Local offline、来源抓取失败和已生成 Skill。

**验收标准：**
- [ ] 弹窗中有清晰阶段状态，不要求用户进入 Mission 查看分析。
- [x] 无 Codex Local 时给出可继续填写草稿的路径。
- [x] backend offline 时提示启动后端，而不是泛泛 `Failed to fetch`。

**验证：**
- [x] `pnpm --filter @didian/views exec vitest run ai-workbench/ai-inbox/ai-inbox-page.test.tsx`
- [x] `pnpm --filter @didian/views typecheck`

**依赖：** SOL-1

**规模预估：** M

### Task SOL-3：Generated Skill 删除和重试闭环

**描述：** 用户可以从收藏卡片或 Skill library 删除 generated Skill，删除后 capture card 回到可重新生成状态；如果 Skill 已有 usage history，后续改为 archive 方案。

**验收标准：**
- [ ] 收藏卡片删除 generated Skill 后不再显示 `已生成`。
- [ ] Skill library 删除后列表刷新。
- [ ] 删除失败时提示原因，不吞掉错误。

**验证：**
- [ ] `pnpm --filter @didian/views exec vitest run ai-workbench/ai-inbox/ai-inbox-page.test.tsx skills`
- [ ] `pnpm --filter @didian/views typecheck`

**依赖：** SOL-1

**规模预估：** M

## 2026-07-28 Mission Skill Runtime 闭环

### Task MS-1：新增 Mission Skill Usage 数据基础

**描述：** 新增 `issue_skill_usage` migration 和查询，记录某个 Mission 计划或已经注入的 Skill。

**验收标准：**
- [x] migration 建立 `issue_skill_usage` 表、唯一约束和必要索引。
- [x] 查询支持 list、upsert planned、delete planned、mark injected。
- [x] 跨 workspace 查询无法返回或写入 usage。

**验证：**
- [x] `go test ./internal/handler -run 'TestIssueSkill' -count=1`

**依赖：** 无

**可能触及文件：**
- `server/migrations/165_issue_skill_usage.*.sql`
- `server/pkg/db/queries/issue_skill_usage.sql`
- generated sqlc files

**规模预估：** M

### Task MS-2：新增 Mission Skill Usage API

**描述：** 新增 `/api/issues/{issueId}/skills` list/add/delete，供 Mission 页面使用。

**验收标准：**
- [x] `GET` 返回 usage + skill/agent/runtime 展示字段。
- [x] `POST` 同 workspace skill 成功，重复添加幂等。
- [x] `POST` 跨 workspace skill 返回 404/403。
- [x] `DELETE` 只允许删除 planned usage。

**验证：**
- [x] `go test ./internal/handler -run 'TestIssueSkill' -count=1`

**依赖：** MS-1

**可能触及文件：**
- `server/internal/handler/issue_skill_usage.go`
- `server/cmd/server/router.go`
- `server/internal/handler/handler_test.go`

**规模预估：** M

### Task MS-3：runtime claim 注入 Mission 级 Skill

**描述：** daemon claim task 时合并 agent 默认 skills 和 issue planned skills，并将使用记录标记为 injected。

**验收标准：**
- [x] planned issue skill 出现在 claimed task 的 skill bundle/ref 中。
- [x] agent 默认 skill 和 issue selected skill 去重。
- [x] claim 成功后记录 task/agent/runtime。

**验证：**
- [x] `go test ./internal/handler ./internal/service -run 'Test.*IssueSkill|TestFinalizeTaskClaim|Test.*SkillBundle|Test.*Claim' -count=1`
- [ ] daemon prompt 文案专测后续补充。

**依赖：** MS-2

**可能触及文件：**
- `server/internal/service/task.go`
- `server/internal/handler/daemon.go`
- `server/internal/daemon/prompt.go`

**规模预估：** M

### Task MS-4：Mission 页面展示 Used Skills

**描述：** 前端新增类型/client/query，并在 Mission 详情页渲染 Used Skills 区块。

**验收标准：**
- [x] 无 usage 时显示紧凑空状态。
- [x] planned/injected/used/failed/skipped 有可读状态。
- [x] 每条记录链接到 Skill 详情。
- [x] 若有 agent/runtime/task 信息，作为辅助元信息展示。

**验证：**
- [x] `pnpm --filter @didian/core typecheck`
- [ ] `pnpm --filter @didian/views test -- issue-detail`
- [x] `pnpm --filter @didian/views typecheck`

**依赖：** MS-2

**可能触及文件：**
- `packages/core/types/agent.ts`
- `packages/core/api/client.ts`
- `packages/core/issues/queries.ts`
- `packages/views/issues/components/issue-detail.tsx`
- `packages/views/issues/components/issue-detail.test.tsx`

**规模预估：** M

### Task MS-5：Mission 页面添加/移除 planned Skill

**描述：** 在 Mission 详情页提供第一版手动添加 Skill 的入口，先用 workspace Skill 列表选择，不做自动推荐。移除仅对 `planned` 生效；`injected/used/failed/skipped` 保留为审计记录。

**验收标准：**
- [x] 用户能从 workspace Skill 列表添加 planned Skill。
- [x] planned Skill 可以移除。
- [x] injected Skill 不允许静默删除。
- [x] 添加/移除成功后刷新 Skills 区块。
- [x] API 失败时显示 toast，不破坏现有展示。

**验证：**
- [x] `pnpm --filter @didian/views test -- issue-detail`

**依赖：** MS-4

**可能触及文件：**
- `packages/views/issues/components/issue-detail.tsx`
- `packages/views/issues/components/issue-detail.test.tsx`

**规模预估：** M

### Task MS-6：收藏卡片用已生成 Skill 创建 Mission

**描述：** 当收藏网页已经沉淀为平台 Skill 后，在收藏卡片提供 `用 Skill 创建 Mission`，创建 Mission 后立即把该 Skill 以 `capture_origin` 绑定到 Mission。

**验收标准：**
- [x] 已生成 Skill 的收藏卡片显示 `打开 Skill`。
- [x] 已生成 Skill 不再重复触发生成任务。
- [x] 用户能从收藏卡片创建 Mission。
- [x] 创建成功后调用 Mission Skill Usage API 绑定 Skill。
- [x] 卡片展示已创建并绑定的 Mission 链接。

**验证：**
- [x] `pnpm --filter @didian/views test -- ai-inbox-page`
- [x] `pnpm --filter @didian/views typecheck`

**依赖：** MS-5

**可能触及文件：**
- `packages/views/ai-workbench/ai-inbox/ai-inbox-page.tsx`
- `packages/views/ai-workbench/ai-inbox/ai-inbox-page.test.tsx`

**规模预估：** S

## 2026-07-14 Runtime-first 更新

最新产品和技术方案以 `docs/ai-resource-workbench/01-product-requirements.md`、`02-technical-plan.md`、`03-implementation-review.md`、`04-browser-memory-bookmarks.md` 为准。第一版主线收敛为：

```text
AI Inbox -> Missions / Codex Run -> Atlas -> System
```

执行规则：

- 后续开发优先做 `/ai-inbox`、`/missions`、`/atlas`、`/system`。
- `AI Studio`、`Autopilot` 不进入 MVP 主导航；历史任务中相关条目视为后续/高级入口，不作为当前开发阻塞。
- Mission 详情必须优先体现 Codex Runtime 能力：Inputs、Plan、Activity、Evidence、Review、Outputs。
- Karakeep 借鉴只作为功能和流程参考：https://github.com/karakeep-app/karakeep 。不要复制 AGPL-3.0 源码。
- 每次功能改进后做原子提交，提交前只 stage 本次相关文件，方便回滚。

## Task 1：基线验证和旧术语审计

**描述：** 在实施新 IA 前记录当前项目健康状态，并盘点用户可见的旧模板词，避免后续替换遗漏。

**验收标准：**
- [x] 记录 `pnpm --filter @didian/views typecheck` 结果。
- [x] 盘点 Issue、Agent、Runtime、Skill、Squad、Project、Resource、Usage、Rules、Didian Helper 的主要出现位置。
- [x] 标出哪些旧词是内部实现名可保留，哪些是用户可见文案必须替换。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] `rg "Issues|Issue|Agents|Agent|Runtimes|Runtime|Skills|Squads|Usage|Didian Helper" packages/views apps/web`

**进度记录（2026-07-13）：**
- `pnpm --filter @didian/views typecheck` 通过。
- 旧术语审计已跑；用户可见高优先级残留集中在 `packages/views/onboarding/templates/*`、`packages/views/onboarding/steps/*`、旧 `issues/agents/skills/squads/runtimes` 模块页面和 locale。`packages/core/types`、旧 API/client、store、测试里的 `issue/agent/runtime/skill/squad` 暂作为内部实现名保留。
- `Didian Helper`、创建第一个 Agent、连接 Runtime 才能开始等 onboarding 文案登记到 Task 6 处理。

**依赖：** 无

**可能触及文件：**
- `docs/ai-resource-workbench/01-product-requirements.md`

**规模预估：** S

## Task 2：确认技术方案和路由兼容策略

**描述：** 在写代码前确认 `docs/ai-resource-workbench/02-technical-plan.md` 中的关键技术决策，尤其是新增产品路由、兼容旧路由、Mission 复用 Issue、Atlas fixture、Autopilot 后置的策略。

**验收标准：**
- [x] 技术方案已被阅读并确认没有阻塞性问题。
- [x] MVP 主路由列表已确认：`/ai-inbox`、`/missions`、`/atlas`、`/system`。
- [x] 旧/兼容路由 `/ai-studio`、`/autopilot` 如已存在，不进入第一版主导航。
- [x] 旧路由短期保留策略已确认。
- [x] 明确第一阶段不做数据库 migration。

**验证：**
- [x] `docs/ai-resource-workbench/02-technical-plan.md` 中验收闸门已对齐。
- [x] `tasks/plan.md` 和 `tasks/todo.md` 都引用技术方案。

**进度记录（2026-07-13）：**
- 路由兼容策略按技术方案落地：新增产品路由，旧 `/inbox`、`/issues`、`/resources`、`/agents`、`/skills`、`/squads`、`/runtimes` 保留。
- 本阶段未做数据库 migration，也未重命名后端 issue/agent/runtime/skill/squad 模型。

**依赖：** Task 1

**可能触及文件：**
- `docs/ai-resource-workbench/02-technical-plan.md`
- `tasks/plan.md`
- `tasks/todo.md`

**规模预估：** XS

## Task 3：建立产品术语和 view model 约定

**描述：** 为 AI Inbox、Mission、Codex Run、Atlas、System、Advanced、Later Autopilot 建立统一术语和前端映射约定，减少散落替换。

**验收标准：**
- [x] 文档中明确旧模型到新产品对象的映射。
- [x] 前端有集中术语配置、locale namespace 或 view model 约定。
- [x] Mission 状态、Codex Run 执行现场、Atlas 对象、System / Advanced 字段有初步字段定义。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] 文档能指导后续任务不直接暴露旧模型名。

**进度记录（2026-07-13）：**
- 新增 `packages/views/ai-workbench/types.ts`、`schemas.ts`、`fixtures.ts`，集中定义 AI Inbox、Mission、Atlas、System/Advanced 的前端 view model、zod schema 和 demo fixture；历史 AI Studio/Autopilot 字段后续降级处理。
- 新增 `packages/views/ai-workbench/fixtures.test.ts`，覆盖 AI 理解启发式与 schema 校验。
- `@didian/views` 已导出 `./ai-workbench`，后续页面优先从产品层 view model 接入，不直接暴露旧模型名。

**依赖：** Task 2

**可能触及文件：**
- `docs/ai-resource-workbench/01-product-requirements.md`
- `packages/views/locales/*/*.json`
- `packages/views/resources/*` 或新建产品 view model 文件

**规模预估：** S-M

## Task 4：新增产品路由和路径构建器

**描述：** 先增加新产品路由和 `WorkspacePaths` 构建器，确保导航切换前每个目标页面都有可渲染骨架，旧路由继续保留。

**验收标准：**
- [x] `paths.workspace(slug)` 支持 MVP 主入口 `aiInbox`、`missions`、`missionDetail`、`atlas`、`system`；历史 `aiStudio`、`autopilot` 如已存在只作兼容。
- [x] Web app 存在对应 route 页面骨架。
- [x] 旧 `/inbox`、`/issues`、`/resources`、`/agents`、`/skills`、`/squads`、`/runtimes` 不删除。
- [x] 页面骨架能显示标题和基本空状态。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] `pnpm --filter @didian/core test -- paths` 或运行现有 paths 测试。
- [ ] 手动打开每个新 route 不 404。

**进度记录（2026-07-13）：**
- 新增 `paths.workspace(slug).aiInbox()`、`missions()`、`missionDetail(id)`、`atlas()`、`system()`，历史 `aiStudio()`、`autopilot()` 如已存在只作兼容；同步 `paths.test.ts` 与 `consistency.test.ts`。
- 同步 `packages/views/editor/utils/link-handler.ts` 的 workspace route allowlist，保证 `/missions/...`、`/atlas` 等无 slug 内链可以继续补 workspace slug。
- 新增 Web route 骨架：`ai-inbox`、`missions`、`missions/[id]`、`atlas`、`system`；历史 `ai-studio`、`autopilot` 若保留，不进入 MVP 主导航。
- 已通过 `pnpm --filter @didian/core test -- paths`、`pnpm --filter @didian/views test -- ai-workbench`、`pnpm --filter @didian/views typecheck`、`pnpm --filter @didian/web typecheck`。

**依赖：** Task 3

**可能触及文件：**
- `packages/core/paths/paths.ts`
- `packages/core/paths/paths.test.ts`
- `apps/web/app/[workspaceSlug]/(dashboard)/ai-inbox/page.tsx`
- `apps/web/app/[workspaceSlug]/(dashboard)/missions/page.tsx`
- `apps/web/app/[workspaceSlug]/(dashboard)/missions/[id]/page.tsx`
- `apps/web/app/[workspaceSlug]/(dashboard)/atlas/page.tsx`
- `apps/web/app/[workspaceSlug]/(dashboard)/system/page.tsx`

**规模预估：** S-M

## Task 5：主导航收敛为 Runtime-first 四入口

**描述：** 将产品内页一级导航改为 AI Inbox、Missions、Atlas、System，并把 Nodes/Integrations/Settings/Advanced 等基础设施和高级入口收进 System。

**验收标准：**
- [x] 一级导航只显示 AI Inbox、Missions、Atlas、System。
- [x] Projects、Resources、Agents、Skills、Squads、Runtimes、Usage、Rules 不再作为一级主导航出现。
- [x] 旧页面仍可通过二级入口或兼容路径访问。
- [ ] 当前选中态、hover、移动端导航不因文案变更破坏布局。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查桌面和移动导航。

**进度记录（2026-07-13）：**
- `packages/views/layout/app-sidebar.tsx` 需收敛为 AI Inbox、Missions、Atlas、System；Chat 作为协作入口可保留在 personal nav。
- `Resources`、`Issues`、`Projects`、`Agents`、`Skills`、`Squads`、`Runtimes`、`Usage` 不再作为一级 sidebar nav 出现，旧 route 文件未删除，pins 仍可进入 legacy issue/project 详情。
- workspace switcher 的默认工作区入口从 `/issues` 改为 `/ai-inbox`，新建按钮文案改为 New Mission / 新建 Mission。
- 已通过 `pnpm --filter @didian/views test -- app-sidebar`、`pnpm --filter @didian/views typecheck`、`pnpm --filter @didian/web typecheck`。

**进度记录（2026-07-14）：**
- 主导航已按 Runtime-first 收敛为 AI Inbox、Missions、Atlas、System；AI Studio 和 Autopilot 不再作为一级导航展示。
- 旧 `/ai-studio`、`/autopilot` path builder 和 route 如存在，暂作为兼容保留，不作为 MVP 主入口。
- 已提交 `405b91475 feat(views): hide advanced AI surfaces from main nav`。
- 已通过 `pnpm --filter @didian/views test -- app-sidebar`、`pnpm --filter @didian/views typecheck`。

**依赖：** Task 4

**可能触及文件：**
- `packages/views/layout/**/*`
- `packages/views/navigation/**/*`
- `packages/views/locales/*/*.json`
- `apps/web/app/**/*`

**规模预估：** M

## Task 6：Onboarding 改成 AI Inbox 首次引导

**描述：** 把 Step 1 / Step 2 / Didian Helper / 创建 agent 的引导改为“把链接、文件、浏览器标签或一个想法丢进 AI Inbox”。

**验收标准：**
- [x] 新用户第一屏引导 AI Inbox 输入，而不是创建 agent 或连接 runtime。
- [x] 引导步骤包含：丢入输入、AI 理解、创建 Mission、进入 Atlas/Autopilot。
- [x] 无节点或无真实执行能力时，有 mock/体验模式说明。
- [x] 中文文案优先，英文 locale 如存在需同步或标记待补。

**验证：**
- [x] `pnpm --filter @didian/views typecheck`
- [x] `rg "Didian Helper|创建你的第一个 agent|Step 1|Step 2" packages/views/locales packages/views/onboarding` 剩余命中有保留理由。
- [ ] 手动检查新 workspace onboarding。

**进度记录（2026-07-13）：**
- 默认 onboarding 顺序已收束为 source、role、use_case、workspace；工作区创建/选择后直接 `completeOnboarding` 并进入 AI Inbox，不再默认进入 Runtime/Agent 步骤。
- Web 和 Desktop 的 onboarding 完成跳转已从 `/issues` 改为 `/ai-inbox`。
- Welcome 和 Workspace 文案已切到 AI Inbox -> Mission -> Atlas/Autopilot；工作区预览卡改为 AI Inbox、Missions、Atlas、AI Studio、Autopilot、System。
- 剩余 `Didian Helper` / Step 1 / Step 2 命中集中在 legacy skip-path templates 和 helper instructions，默认 onboarding 不再触发；后续若删除 legacy seed，再清理这些兼容模板。
- 已通过 `pnpm --filter @didian/views test -- onboarding`、`pnpm --filter @didian/views test -- locales`、`pnpm --filter @didian/views typecheck`、`pnpm --filter @didian/web typecheck`、`pnpm --filter @didian/desktop typecheck`。

**依赖：** Task 5

**可能触及文件：**
- `packages/views/onboarding/**/*`
- `packages/views/locales/*/onboarding.json`
- onboarding seed/template 相关文件

**规模预估：** M

## Task 7：AI Inbox 页面骨架

**描述：** 创建 AI Inbox 页面，提供万能输入区域、输入卡片列表和 AI 理解结果面板的静态/fixture 版本。

**验收标准：**
- [ ] 用户能输入 URL 或文本。
- [ ] 输入后生成输入卡片，展示类型、标题/预览、来源、置信度。
- [ ] AI 理解面板展示识别结果、用户意图、建议 Mission 标题和建议产物。
- [ ] 空状态、加载状态、错误状态完整。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动输入长 URL、中文文本、多行文本。
- [ ] 文本不溢出、不遮挡操作按钮。

**依赖：** Task 4

**可能触及文件：**
- `packages/views/ai-workbench/ai-inbox/**/*`
- `packages/views/ai-workbench/**/*`
- `apps/web/app/**/*`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 8：AI Inbox 创建 Mission 交接

**描述：** 从 AI 理解结果创建 Mission。短期可以复用 issue 创建路径或使用 fixture，但交互要像真实产品闭环。

**验收标准：**
- [ ] 用户能编辑 AI 建议的 Mission 标题。
- [ ] 点击创建后进入 Mission 队列或 Mission 详情。
- [ ] Mission 保留原始输入、AI 理解、建议产物等上下文；第一版写入 description 或 demo fixture，不依赖 metadata。
- [ ] 创建失败时有清晰错误提示和重试入口。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动从 AI Inbox 创建 Mission。
- [ ] 如果走 mutation，相关 query cache 更新正确。

**依赖：** Task 7

**可能触及文件：**
- `packages/views/ai-workbench/ai-inbox/**/*`
- `packages/views/issues/**/*` 或 Missions 新视图
- `packages/core/issues/mutations.ts`
- `packages/core/types/api.ts` 如后续明确扩展 API

**规模预估：** M

## Task 9：Missions 队列视图

**描述：** 将 Issues 列表产品化为 Missions 队列，状态和卡片字段围绕 AI 规划/执行，而不是 issue tracker。

**验收标准：**
- [ ] 页面标题、breadcrumb、按钮、筛选、空状态使用 Missions 语义。
- [ ] 状态显示 Understanding、Planned、Running、Review、Completed、Needs Attention。
- [ ] 卡片展示目标、AI 理解、当前步骤、Review 数、产物预览、风险/阻塞。
- [ ] My Issues 变为 Missions 的筛选，不再作为一级概念。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查空列表、有列表、搜索无结果和长标题。
- [ ] `rg "Issues|My Issues|New issue|Create issue" packages/views/issues packages/views/locales` 用户可见命中已处理或登记。

**依赖：** Task 8

**可能触及文件：**
- `packages/views/issues/**/*`
- `packages/views/my-issues/**/*`
- `packages/views/locales/*/issues.json`
- `packages/views/locales/*/my-issues.json`

**规模预估：** M

## Task 10：Mission 详情 AI Plan 重排

**描述：** 将 issue 详情重排为 Mission 工作台，优先展示 AI Plan、Review Queue、Artifacts、Activity、Related Atlas。

**验收标准：**
- [ ] 详情页顶部展示 Mission 目标、状态、置信度和来源输入。
- [ ] AI Plan 步骤可见，并显示状态、证据、产物和阻塞点。
- [ ] Review Queue 能展示待确认决策。
- [ ] Artifacts 展示摘要、表格、资料包、索引等 fixture。
- [ ] 保留评论、附件、实时更新等已有协作能力。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查 Planned、Running、Review、Completed 状态。
- [ ] 长日志、长链接、长标题不破坏布局。

**依赖：** Task 9

**可能触及文件：**
- `packages/views/issues/components/issue-detail.tsx`
- `packages/views/issues/components/execution-log-section.tsx`
- `packages/views/resources/task-detail/resource-task-detail.tsx`
- `packages/views/locales/*/issues.json`

**规模预估：** L，实施前可再拆为 Header/Plan/Artifacts 三个子任务

## Task 11：Mission 失败诊断和 Review 动作

**描述：** 为 Needs Attention 和 Review 状态增加 AI 诊断卡片和用户动作，例如重试、补充信息、重新分派、接受/拒绝建议。

**验收标准：**
- [ ] 失败卡片解释原因，不只显示 failed。
- [ ] AI 给出下一步建议。
- [ ] Review 决策包含接受、跳过、编辑、重新理解等动作入口。
- [ ] 高风险动作文案明确需要确认。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查失败和待确认 fixture。

**依赖：** Task 10

**可能触及文件：**
- `packages/views/issues/components/issue-detail.tsx`
- `packages/views/resources/task-detail/resource-task-detail.tsx`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 12：Atlas Collection 视图

**描述：** 创建 Atlas 页面，用 fixture 或 Mission artifact 展示 AI 生成的 Collection 和资源卡片。

**验收标准：**
- [ ] Atlas 首页展示 Collection 卡片。
- [ ] Collection 展示主题、AI 摘要、资源数、来源 Mission、更新时间。
- [ ] Resource 卡片展示 AI 标题、原始标题、类型、来源、摘要和证据。
- [ ] 空状态引导用户从 AI Inbox 创建第一个 Mission。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查资源卡片长标题、缺摘要、缺来源。

**依赖：** Task 10

**可能触及文件：**
- `packages/views/ai-workbench/atlas/**/*`
- `packages/views/resources/**/*`
- `apps/web/app/**/*`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 13：Atlas 关系、重复建议和 Ask Atlas fixture

**描述：** 在 Atlas 中加入资源关系/重复建议区块，并提供基于 fixture 的 Ask Atlas 引用式问答。

**验收标准：**
- [ ] 用户能看到重复、相似、版本、来源等关系标签或区块。
- [ ] 重复建议需要用户确认，不自动合并/删除。
- [ ] Ask Atlas 能回答至少 3 个预设问题并展示引用来源。
- [ ] 没有证据时能返回“暂无证据”的空答案。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查 Ask Atlas 引用显示和空答案。

**依赖：** Task 12

**可能触及文件：**
- `packages/views/ai-workbench/atlas/**/*`
- `packages/views/resources/**/*`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 14：AI Studio 三栏/三 Tab 骨架

**描述：** 将 Agents、Skills、Squads/Workflows 产品化为 AI Studio 的 Roles、Capabilities、Recipes。

**验收标准：**
- [ ] AI Studio 有 Roles、Capabilities、Recipes 三个区域或 tab。
- [ ] Roles 不再展示为低层 agent 管理台，而是 AI 角色模板。
- [ ] Capabilities 展示系统会什么，而不是 skill 文件细节优先。
- [ ] Recipes 展示处理配方，而不是 squad 编队概念。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查三个区域在桌面和移动端可用。

**依赖：** Task 5

**可能触及文件：**
- `packages/views/agents/**/*`
- `packages/views/skills/**/*`
- `packages/views/squads/**/*`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 15：System / Advanced 入口内容

**描述：** 不做独立 AI Studio 模板页。先在 System / Advanced 中提供 Agents、Skills、Squads 兼容入口，并在 Mission 详情展示当前 Codex Run 使用的 runtime/agent/profile/skill bundle。

**验收标准：**
- [ ] System / Advanced 可进入 Agents、Skills、Squads 旧页面。
- [ ] Mission 详情展示当前 Codex Run 使用的 runtime/agent/profile/skill bundle。
- [ ] 普通用户主线不出现独立 AI Studio 主页面。
- [ ] 如保留模板内容，只作为高级说明，不作为 MVP 骨架依赖。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 文案不使用 agent/skill/squad 作为首要用户概念。

**依赖：** Task 14

**可能触及文件：**
- `packages/views/ai-workbench/system/**/*`
- `packages/views/agents/**/*`
- `packages/views/locales/*/*.json`
- fixture/template 数据文件

**规模预估：** S-M

## Task 16：Later Autopilot 策略建议

**描述：** 第一版不做 mock Autopilot 页面。后续基于真实 capture/run/memory 行为识别重复模式，再生成 dry-run 策略建议。

**验收标准：**
- [ ] 不新增 MVP Autopilot 主页面。
- [ ] 真实用户动作和确认点能被记录为后续策略建议输入。
- [ ] 策略启用前必须有 dry-run、确认门和运行历史。
- [ ] 旧 `/autopilots` 如保留，只作为高级兼容入口。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查旧兼容入口不进入主导航。

**依赖：** Task 5、Task 12

**可能触及文件：**
- 后续再新增 `packages/views/ai-workbench/autopilot/**/*`
- `packages/views/autopilots/**/*` 如需复用旧 Autopilot 组件
- `packages/views/locales/*/*.json`
- strategy fixture 数据文件

**规模预估：** M

## Task 17：记录可转 Autopilot 的重复行为

**描述：** 在 Mission 完成页或 Atlas Collection 中先记录用户重复动作和确认点，为后续 Autopilot 策略建议提供真实上下文；不在 MVP 中跳转到 mock 策略预览页。

**验收标准：**
- [ ] 完成 Mission 能记录可复用动作，例如摘要、归档、加入 Atlas、写入 artifact。
- [ ] Atlas Collection 能记录重复整理/周期摘要/监控更新等意图。
- [ ] 后续策略建议能带入来源上下文。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动从 Mission 和 Atlas 两条路径记录后续策略上下文。

**依赖：** Task 13、Task 16

**可能触及文件：**
- `packages/views/issues/components/issue-detail.tsx`
- `packages/views/ai-workbench/atlas/**/*`
- 后续再新增 `packages/views/ai-workbench/autopilot/**/*`

**规模预估：** M

## Task 18：System 收纳节点和配置

**描述：** 把 Nodes/Runtimes、Integrations、Providers、Storage、Settings 等基础设施入口收纳进 System，主导航不再暴露基础设施模块。

**验收标准：**
- [ ] System 页面或菜单包含 Nodes、Integrations、Providers、Storage、Permissions、Workspace Settings。
- [ ] 节点状态仍可查看，但不是一级主模块。
- [ ] Mission 详情执行记录能展示相关 Node 信息。
- [ ] 无节点时 AI Inbox/Missions 有可理解降级状态。

**验证：**
- [ ] `pnpm --filter @didian/views typecheck`
- [ ] 手动检查 System 和 Mission 执行记录入口。

**进度记录（2026-07-14）：**
- System 页面已增加 Infrastructure 和 Advanced 两组入口卡。
- Advanced 中提供 Agents、Skills、Squads、Autopilots 旧路由兼容入口；基础设施中提供 Nodes 和 Settings 入口。
- 已提交 `54ca6f2be feat(views): add system advanced entry links`。
- 已通过 `pnpm --filter @didian/views test -- system-page`、`pnpm --filter @didian/views typecheck`。

**依赖：** Task 5、Task 10

**可能触及文件：**
- `packages/views/runtimes/**/*`
- `packages/views/settings/**/*`
- `packages/views/layout/**/*`
- `packages/views/locales/*/*.json`

**规模预估：** M

## Task 19：端到端 Demo fixture

**描述：** 准备一条确定性的 Demo 数据，从 AI Inbox 输入到 Mission / Codex Run、Atlas、Ask Atlas 全链路可演示。

**验收标准：**
- [ ] Fixture 包含一组真实感链接/资源输入。
- [ ] AI Inbox 有理解结果。
- [ ] Mission 有计划、Review、Artifacts、失败/诊断可选样例。
- [ ] Atlas 有 Collection、Resource、关系、引用答案。
- [ ] 后续 Autopilot 可从该 Collection 的真实重复行为生成策略建议，但不作为 MVP 演示必需项。

**验证：**
- [ ] 手动 5 分钟内走完整 Demo。
- [ ] 不依赖真实云盘 API、真实浏览器扩展或真实 daemon。

**依赖：** Task 8、Task 10、Task 13、Task 16

**可能触及文件：**
- `packages/views/**/fixtures*`
- `packages/views/ai-workbench/ai-inbox/**/*`
- `packages/views/ai-workbench/atlas/**/*`
- 后续再新增 `packages/views/ai-workbench/autopilot/**/*`

**规模预估：** M

## Task 20：文档同步和残留词清理

**描述：** 同步 README/product overview/design 文档，并清理产品内页最影响第一印象的旧模板词。

**验收标准：**
- [x] 旧 Multica/历史方案文档已从 `docs/` 根目录移除。
- [x] 新方案文档集中在 `docs/ai-resource-workbench/` 并按 `01`、`02`、`03` 编号。
- [ ] README 或相关文档说明新 IA、MVP 范围和旧模型映射。
- [ ] `tasks/plan.md`、`tasks/todo.md` 和 PRD 口径一致。
- [ ] 用户可见残留旧词有清单或已替换。

**验证：**
- [ ] `rg "Tasks / Resources / Projects / Nodes / Analytics|Didian Helper|agent workspace|issue tracker" docs tasks packages/views apps/web`
- [ ] 文档链接路径可打开。

**依赖：** Task 1、Task 5

**可能触及文件：**
- `README.md`
- `README.zh-CN.md`
- `docs/ai-resource-workbench/**/*`
- `tasks/plan.md`
- `tasks/todo.md`

**规模预估：** S-M

## 最终 Checkpoint

- [ ] 一级导航是 AI Inbox、Missions、Atlas、System。
- [ ] 新用户第一屏是 AI Inbox，不是创建 agent 或 issue。
- [ ] AI Inbox -> Mission / Codex Run -> Atlas -> Ask Atlas Demo 闭环可走通。
- [ ] Nodes/Runtime、Integrations、Settings 已收入 System。
- [ ] 用户可见层基本不再出现旧模板第一印象。
- [ ] 触及包 typecheck 通过，失败项有记录和原因。
