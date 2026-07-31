# 实施计划：AI 资源工作台

## 2026-07-30 Skill Operating Loop

### 概览

本阶段以 `docs/ai-resource-workbench/06-skill-operating-loop-prd.md` 为准，目标是把当前已能生成/绑定的 Skill 流程打磨成可操作闭环：内部分析不污染 Mission 列表、能力能被 Mission 清楚选择和审计、生成后的能力可删除/重试，并逐步提升网页到能力的方向分析质量。

### 架构决策

- 能力方向分析继续复用 task/issue 执行底座，但 `didian_internal = true` 的记录不能进入普通 Mission 列表或前端实时缓存。
- Skill usage 仍然使用 `issue_skill_usage`，保持 Mission 级临时选择和 agent 默认 Skills 分离。
- 用户可见文案统一使用“能力/能力库”；后端 API、SQL、runtime payload 暂保留 `skill` 作为兼容实现名。
- 前端列表缓存必须有防御性过滤，不能只依赖后端默认查询。
- 平台发现来自后端 AI enrichment 写回的 `skill_opportunity`，只做候选提示；具体方向由本地 Codex 在弹窗内分析，用户确认后才生成。

### Phase 1: Make The Current Loop Less Weird

- [ ] Task SOL-1: 前端缓存层过滤 internal Skill direction Missions。
- [ ] Task SOL-2: AI Inbox 能力方向弹窗补充更明确的“后台分析中”状态和失败原因。
- [ ] Task SOL-3: 删除 generated Skill 后，capture card、Skill 列表、Mission planned usage 都能正确刷新。
- [x] Task SOL-13: 收藏 enrichment 成功后刷新 `skill_opportunity`，并把 AI Inbox 用户文案切到“能力”。

### Checkpoint: Phase 1

- [ ] `pnpm --filter @didian/core exec vitest run issues/cache-helpers.test.ts issues/ws-updaters.test.ts`
- [x] `pnpm --filter @didian/views exec vitest run ai-workbench/ai-inbox/ai-inbox-page.test.tsx`
- [ ] `pnpm --filter @didian/core typecheck`
- [x] `pnpm --filter @didian/views typecheck`
- [x] `go test ./internal/service -run 'TestMemoryEnrichmentServiceWritesSkillOpportunityFromAIEnrichment|TestMemoryEnrichmentServiceEnrichesPendingCapture|TestCompleteTaskWritesBrowserMemoryEnrichment' -count=1`
- [x] `go test ./internal/handler -run 'Test.*BrowserCapture|TestCreateBrowserCapture' -count=1`

### Phase 2: Make Skills Feel Used

- [ ] Task SOL-4: Mission detail 的 Skills 区块展示更清晰的 planned/injected/used/skipped/failed 说明。
- [ ] Task SOL-5: claim prompt 明确列出 Mission selected Skills 和选择原因。
- [ ] Task SOL-6: 后端测试覆盖 prompt 文案和 planned -> injected 审计记录。

### Phase 3: Make Skills Operable

- [ ] Task SOL-7: Skill detail 展示来源 capture、方向草稿、生成 Mission 和使用 Mission。
- [ ] Task SOL-8: 支持从 Skill detail 重新生成/更新 Skill。
- [ ] Task SOL-9: Skill 删除策略区分未使用 hard delete 和已使用 archive。

### Phase 4: Smarter Recommendations

- [ ] Task SOL-10: GitHub repo / docs / paper / blog/tutorial / product page 分类型提取信号。
- [ ] Task SOL-11: 移除用户可见百分比分数，统一为定性信号和证据片段。
- [ ] Task SOL-12: 本地 Codex 推荐 2-3 个具体能力方向，用户选择后生成。

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| internal 分析任务继续出现在列表 | High | 后端默认过滤 + 前端缓存层过滤 + 测试覆盖 WS created/update。 |
| Skill 变成泛泛网页摘要 | High | 方向确认表单强制输入用途、输入、输出、边界、成功标准。 |
| Mission Skill usage 和 agent default skills 混淆 | High | `issue_skill_usage` 和 `agent_skill` 分离，UI 文案强调“本 Mission 使用”。 |
| 删除能力破坏历史审计 | Medium | 已使用能力后续转 archive，未使用才 hard delete。 |

## 2026-07-28 Mission Skill Runtime 闭环

### 概览

本阶段以 `docs/ai-resource-workbench/05-mission-skill-runtime-loop.md` 为准，目标是把“收藏网页生成能力”推进到“Mission 真实选择、注入、展示能力使用记录”。第一版不做 marketplace、不做跨 workspace 共享、不做 embedding 推荐；先跑通手动选择和 runtime 注入闭环。

### 架构决策

- 新增 `issue_skill_usage` 记录 Mission 级 Skill 使用，不复用 `agent_skill`，避免一次选择永久污染 agent 默认能力。
- API 以 `/api/issues/{issueId}/skills` 作为 Mission Skill usage 子资源，沿用后端 `issue` 实现名。
- task claim 时合并 agent 默认 skills 和 issue planned skills，去重后传给 daemon。
- claim 成功后将 planned usage 标记为 `injected`，并记录 task/agent/runtime。
- Mission 页面先展示 Used Skills 区块，后续再做创建页推荐和右侧 Properties 摘要。

### Phase 1: Foundation

- [x] Task 1: 数据库迁移和 sqlc 查询。
- [x] Task 2: 后端 API list/add/delete Mission skills。
- [x] Task 3: 后端测试覆盖同 workspace、跨 workspace、幂等、删除 planned。

### Checkpoint: Foundation

- [x] `go test ./internal/handler -run 'TestIssueSkill' -count=1`
- [x] API contract 可以被前端 client 使用。

### Phase 2: Runtime Injection

- [x] Task 4: task claim 合并 issue planned skills。
- [x] Task 5: claim 成功后 usage 进入 injected，记录 task/agent/runtime。
- [x] Task 6: daemon claim payload 注入 Mission selected skills。

### Checkpoint: Runtime

- [x] claim/finalize 测试证明 Mission 级 Skill 被注入并记录。
- [x] planned -> injected 状态可追踪。

### Phase 3: Frontend

- [x] Task 7: core types/client/query hooks。
- [x] Task 8: Mission detail 渲染 Used Skills。
- [x] Task 9: Mission detail 支持添加/移除 planned Skill 的第一版入口。
- [x] Task 10: 已生成能力的收藏卡片支持创建并绑定 Mission。

### Checkpoint: Complete

- [x] `pnpm --filter @didian/core typecheck`
- [x] `pnpm --filter @didian/views test -- issue-detail`
- [x] `pnpm --filter @didian/views test -- ai-inbox-page`
- [x] `pnpm --filter @didian/views typecheck`
- [x] Mission/Issue 详情页能看到 Used Skills 区块。

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| claim payload 过大 | Medium | 复用现有 skill bundle refs/capability，避免重复传大文件。 |
| Skill 选择误变成 agent 永久配置 | High | `issue_skill_usage` 与 `agent_skill` 分表。 |
| 跨 workspace Skill 泄漏 | High | API 和查询都校验 issue/skill workspace_id。 |
| UI 抢占 Mission 主流程 | Medium | Used Skills 用紧凑区块，不做大型配置面板。 |

### Open Questions

- injected usage 删除时第一版返回 409，保留为 runtime 审计记录。
- generated Skill 是否要自动添加到 originating Mission？当前计划先不自动添加，只在用户确认后使用。

## 概览

本计划按 `docs/ai-resource-workbench/01-product-requirements.md` 重写，具体技术落地以 `docs/ai-resource-workbench/02-technical-plan.md` 为准，方案审核和开工顺序以 `docs/ai-resource-workbench/03-implementation-review.md` 为准。产品主线从旧的 Tasks / Resources / Projects / Nodes / Analytics 收敛为 Runtime-first 工作流：AI Inbox、Missions / Codex Run、Atlas、System。

第一阶段不重构数据库表名，不删除已有可用 route，不重写 daemon/runtime 执行底座。我们先把用户可见的信息架构、onboarding、导航、核心页面和 demo fixture 切到新产品语义，让产品从模板感变成 AI 原生工作台。底层 `issue`、`agent`、`runtime`、`skill`、`squad` 暂时作为实现细节承载新概念；AI Studio / Autopilot 只作为 System / Advanced 或后续能力，不进入 MVP 主导航。

## 架构决策

- **Runtime-first 优先。** 一级导航只保留 AI Inbox、Missions、Atlas、System；Nodes、Integrations、Settings、Providers、Agents、Skills、Squads 等放入 System / Advanced。
- **先改产品语义，再改数据模型。** Mission 先复用 issue；AI Role 先复用 agent；Capability 先复用 skill；Recipe 先复用 squad/workflow；Node 先复用 runtime。
- **用 view model 隔离旧模型。** 在前端建立产品化 view model/fixture/terminology 层，避免到处直接把 issue 文案替换成 Mission 文案。
- **AI 行为必须可见。** AI 能力主要体现在 Codex Run 现场：理解输入、生成计划、执行日志、证据、Review、产物、沉淀关系。
- **MVP 允许 fixture，但不能用 mock 面板抢主线。** AI Inbox 的理解结果、Atlas Collection 可以先用 fixture；不做 mock Autopilot 策略页。
- **基础设施降级处理。** 没有本地 daemon、真实浏览器扩展或云盘 API 时，使用 fixture、mock node、mock artifacts 和清晰空状态。
- **旧模块先折叠，不硬删。** Projects、Resources、Agents、Skills、Squads、Runtimes、Usage、Rules 先改归属和导航入口；后续验证稳定后再考虑删除或迁移路由。
- **新增产品路由，兼容旧路由。** 第一版新增 `/ai-inbox`、`/missions`、`/atlas`、`/system`，旧 `/issues`、`/inbox`、`/resources`、`/agents`、`/skills`、`/squads`、`/autopilots` 等路径短期保留，避免 pins、通知、历史链接失效。

## 依赖图

```text
PRD 和术语表
  -> IA Reset / 导航收敛
    -> Onboarding 切到 AI Inbox
    -> AI Inbox 输入与理解 fixture
      -> Mission 创建/队列/详情
        -> Atlas Collection 和 Ask Atlas fixture
  -> System 收纳 Runtime/Nodes/Integrations/Settings/Advanced
  -> Later Autopilot 基于真实重复行为生成策略建议
  -> 验证、文档和 demo 脚本
```

## Phase 0：基线与术语收口

- [ ] 跑一次基线 typecheck/test，记录当前项目健康状态。
- [ ] 建立产品术语表：AI Inbox、Mission、Codex Run、Atlas、System Node、Advanced、Later Autopilot。
- [ ] 盘点旧用户可见词：Issue、Agent、Runtime、Skill、Squad、Project、Resource、Usage、Autopilot、Didian Helper。
- [ ] 明确哪些旧词允许作为内部实现名继续存在。

### Checkpoint：基线

- [ ] `pnpm --filter @didian/views typecheck` 结果已记录。
- [ ] 旧术语出现位置有审计清单。
- [ ] 文档明确 Phase 1 不做数据库/后端表名迁移。

## Phase 1：IA Reset 和 Onboarding

- [ ] 主导航改为 AI Inbox、Missions、Atlas、System。
- [ ] Nodes、Integrations、Providers、Storage、Settings 收入 System。
- [ ] Issues/My Issues 用户可见层改成 Missions 和筛选。
- [ ] Agents/Skills/Squads/Runtimes 的一级入口从主导航移除，转入 System / Advanced。
- [ ] Onboarding 首屏改成 AI Inbox：引导用户丢链接、文本、文件、浏览器标签或一个想法。
- [ ] 清理旧 Didian Helper / 创建 agent / 连接 runtime 才能开始的错位引导。

### Checkpoint：IA Reset

- [ ] 新用户第一屏是 AI Inbox 引导。
- [ ] 一级导航只有 AI Inbox、Missions、Atlas、System。
- [ ] 基础设施不再抢占主导航。
- [ ] 产品内页主要标题不再显示 Issue/Agent/Runtime 模板感。

## Phase 2：AI Inbox

- [ ] 创建 AI Inbox 页面或视图。
- [ ] 支持 URL 和文本输入，后续预留文件/浏览器 capture。
- [ ] 为输入生成卡片：类型、标题、来源、置信度。
- [ ] 增加 AI 理解面板：识别结果、用户意图、建议 Mission 标题、建议产物、缺失信息。
- [ ] 支持从理解结果创建 Mission，短期复用 issue 创建路径或 fixture。
- [ ] 支持重新理解、拆分 Mission、保存到 Atlas 的入口占位。

### Checkpoint：AI Inbox

- [ ] 用户能输入一组链接或文本。
- [ ] 创建 Mission 前能看到 AI 理解结果。
- [ ] 创建后能进入 Missions 队列或 Mission 详情。
- [ ] 空、加载、错误状态完整。

## Phase 3：Missions

- [ ] 将 Issues 列表产品化为 Mission 队列。
- [ ] 状态改为 Understanding、Planned、Running、Review、Completed、Needs Attention。
- [ ] Mission 卡片展示目标、AI 理解、当前步骤、Review 数量、产物预览、风险/阻塞。
- [ ] Mission 详情页重排为 Header、Inputs、Plan、Activity、Evidence、Review Queue、Artifacts/Outputs、Related Atlas。
- [ ] 失败和阻塞状态展示 AI 诊断卡片。
- [ ] 保留评论、附件、实时更新等已有协作能力。

### Checkpoint：Missions

- [ ] Mission 队列不再像 issue tracker。
- [ ] Mission 详情优先展示 Codex Run 执行现场。
- [ ] Review 和失败诊断有清晰用户动作。
- [ ] 完成 Mission 能链接到 Atlas 产物。

## Phase 4：Atlas

- [ ] 创建 Atlas 页面或视图。
- [ ] 基于 fixture 或 Mission artifacts 展示 Collection。
- [ ] Resource 卡片展示 AI 标题、原始标题、类型、来源、摘要、证据。
- [ ] 支持 Collection 详情：主题、资源列表、相关资源、Mission 来源。
- [ ] 增加 Duplicates/相似资源建议视图或区块。
- [ ] 增加 Ask Atlas fixture：基于 Collection 返回带引用答案。

### Checkpoint：Atlas

- [ ] 完成 Mission 后有可见 Atlas Collection。
- [ ] Resource 不是纯文件行，而有 AI 摘要和来源证据。
- [ ] 用户能看到资源之间的关系或重复建议。
- [ ] Ask Atlas 有可演示的引用式回答。

## Phase 5：System / Advanced

- [ ] System 展示 Runtime/Nodes 状态、Settings、Provider、Integrations 入口。
- [ ] System / Advanced 提供 Agents、Skills、Squads 兼容入口。
- [ ] Mission 详情展示当前 Codex Run 实际使用的 runtime/agent/profile/skill bundle。
- [ ] Runtime 离线或缺配置时，从 Mission 空状态/错误状态引导到 System。

### Checkpoint：System / Advanced

- [ ] 普通用户主线仍聚焦 AI Inbox -> Mission -> Atlas。
- [ ] 高级配置可达，但不作为主导航抢故事。
- [ ] Runtime 状态和诊断路径清楚。

## Phase 6：Later Autopilot

- [ ] 基于真实 capture/run/memory 行为识别重复模式。
- [ ] 从重复模式生成策略建议。
- [ ] 策略启用前必须有 dry-run、确认门和运行历史。
- [ ] 旧 Autopilot API 如需接入，先做字段映射和权限审查。

### Checkpoint：Later Autopilot

- [ ] Autopilot 来源于真实重复行为，而不是 MVP mock 页面。
- [ ] 策略启用前可检查、可解释、可暂停。
- [ ] Autopilot 与 Atlas/Missions 有明确连接。

## Phase 7：System、验证和 Demo 收口

- [ ] System 收纳 Nodes、Integrations、Providers、Storage、Permissions、Workspace Settings。
- [ ] 节点状态只在 System 和 Mission 执行记录中出现。
- [ ] 准备一条端到端 Demo fixture：AI Inbox -> Mission / Codex Run -> Atlas -> Ask Atlas。
- [ ] 补齐空状态、加载状态、错误状态、权限/无节点降级状态。
- [ ] 更新 README 或产品文档，说明 Runtime-first IA 和旧模型映射。

### Checkpoint：完整 Demo

- [ ] 5 分钟内能演示完整闭环。
- [ ] Demo 不依赖真实云盘 API 或真实浏览器扩展。
- [ ] 没有 Didian Helper / Issue tracker / Agent workspace 模板残留第一印象。
- [ ] 触及包 typecheck 通过，测试结果有记录。

## 风险和缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 旧模型名和新产品名混用 | 高 | 建术语表和 view model；每个阶段用 `rg` 验收用户可见文案。 |
| 导航收敛导致旧功能不可达 | 中 | 旧页面先挂在 AI Studio/System 二级入口，不立即删除。 |
| AI Inbox 过于 mock，显得像静态 Demo | 中 | 输入、理解、创建 Mission 的交互必须真实；mock 只限 AI 结果。 |
| Atlas 变成普通资源列表 | 高 | 首版就要展示 Collection、摘要、证据、关系/重复建议。 |
| AI Studio 再次变成 Agent 管理台 | 中 | 不进入 MVP 主导航，只放 System / Advanced。 |
| Autopilot 变成规则表单 | 中 | 后置到真实重复行为产生后，不做 mock 策略页。 |
| 过早改数据库/后端造成回归 | 高 | Phase 1-7 保留 issue/agent/runtime/skill/squad 作为实现细节。 |

## 并行机会

- Atlas fixture、Runtime 执行现场 fixture、System / Advanced 入口可以并行准备。
- IA Reset 和 Onboarding 必须先做，否则后续页面会继续沿用旧导航。
- Mission 详情和 Atlas Collection 共享 artifacts/fixture contract，需先约定字段。

## 待确认问题

- 产品名继续叫 Didian，还是换成更贴近迅雷体系的新名称？
- 登录后默认首页是否直接进入 AI Inbox？
- Atlas 第一版只用 fixture，还是从现有 issue attachments/artifacts 推导？
- Autopilot 后续从哪些真实用户行为生成策略建议？
- App 是否中文优先，英文文案后续补齐？
