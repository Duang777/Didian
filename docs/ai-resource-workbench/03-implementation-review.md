# AI 资源工作台：方案审核与实施顺序

## 1. 审核结论

整体方向合理，但必须按“先骨架、再闭环、再深化”的方式实现，不能直接从大页面改造开始。

合理之处：

- 五模块 IA 比旧后台式模块更清晰，能突出 AI 行为。
- 新增产品路由并保留旧路由是正确选择，可以避免通知、pin、历史链接和详情页回归。
- Mission 复用 Issue 是现实可行的短期策略，因为现有 issue 已经有列表、详情、评论、附件、实时同步、执行日志等能力。
- Atlas 先用 fixture/view model 合理，图谱/RAG/持久化都是后续大工程。
- Autopilot 先做策略预览合理，真实调度、权限、确认、运行日志不能一口气做。

需要修正或警惕的点：

- `CreateIssueRequest` 当前不能写 `metadata`，所以 AI Inbox -> Mission 第一版不能依赖 metadata 持久化。只能写结构化 description 或使用 demo fixture。
- 不能先改导航再补 route。必须先新增 `/ai-inbox`、`/missions`、`/atlas`、`/ai-studio`、`/autopilot`、`/system` 页面骨架。
- Mission 详情改造风险较高，真实落点是 `packages/views/issues/components/issue-detail.tsx` 及相关组件，不是一个独立 `issues/detail` 目录。
- AI Studio 不应急着深度改 Agents/Skills/Squads，第一版最好做聚合模板页，把旧管理能力放高级入口。
- Atlas 如果只做卡片列表会失去差异化，第一版必须至少有 Collection、Evidence、Relationship/duplicate suggestion、Ask Atlas fixture。
- Autopilot 必须明确“策略预览/模拟运行历史”，否则用户会误以为后台真实自动执行。

## 2. 总体实施策略

### 阶段 1：可达骨架

目标：所有新模块 route 可访问，导航不 404，旧路由保留。

实施顺序：

1. 跑基线 typecheck，记录当前状态。
2. 新增 `WorkspacePaths`：`aiInbox`、`missions`、`missionDetail`、`atlas`、`aiStudio`、`autopilot`、`system`。
3. 新增 Next route 页面骨架。
4. 建立 `packages/views/ai-workbench` 产品层目录，放 `types.ts`、`schemas.ts`、`fixtures.ts`、`terminology.ts`。
5. 导航切换到五模块。

停止条件：

- 新路由都能打开。
- 旧路由不 404。
- `pnpm --filter @didian/views typecheck` 通过或有明确失败记录。

### 阶段 2：最小闭环

目标：AI Inbox 可以创建 Mission，Mission 可以关联 Atlas，Atlas 可以生成 Autopilot 策略预览。

实施顺序：

1. AI Inbox 支持 URL/text 输入和启发式理解。
2. 创建 Mission：优先写 issue description；如果接口或状态复杂，降级为 demo Mission fixture。
3. Missions 队列：先做轻量队列，不急着完全改造所有 IssueSurface 视图。
4. Mission 详情：先新增 AI Plan/Artifacts/Review 区块，不删除旧评论和执行日志。
5. Atlas：基于 fixture 展示 Collection/Resource/Evidence。
6. Autopilot：从 Atlas/Mission 上下文生成策略卡。

停止条件：

- 可以手动走通 AI Inbox -> Mission -> Atlas -> Autopilot。
- 不依赖真实浏览器扩展、真实云盘 API、真实 runtime。

### 阶段 3：模块深化

目标：每个模块形成自己的产品特色，而不是只有 mock 文案。

实施顺序：

1. AI Inbox 增加多输入卡片、重新理解、拆分 Mission。
2. Mission 增加失败诊断卡和 Review 动作。
3. Atlas 增加 Ask Atlas fixture、重复建议和来源引用。
4. AI Studio 增加 Roles、Capabilities、Recipes 模板。
5. System 收纳 Nodes/Integrations/Providers/Settings。
6. Onboarding 改成 AI Inbox 首次引导。

停止条件：

- 5 分钟 demo 可讲清楚产品主线。
- 首屏不再像 issue/agent workspace 模板。

## 3. 分模块实施计划

## 3.1 AI Inbox

### 从哪里开始

先新增 `packages/views/ai-workbench/ai-inbox/ai-inbox-page.tsx`，不要改旧 `packages/views/inbox`。

### 第一版实现

- 输入框支持 URL/text。
- 本地解析输入生成 `AiInboxInput[]`。
- 启发式生成 `AiUnderstanding`。
- 用户能编辑 Mission 标题。
- 创建 Mission 时：
  - 首选调用 `useCreateIssue`，把上下文写进 description。
  - 如果接入风险大，使用 demo fixture。

### 借鉴项目

- Karakeep：快速收藏任意内容。
- Linkwarden：链接保全和 collection 思路。
- ArchiveBox：URL ingestion 的来源意识。
- nanobrowser：浏览器 capture 入口，MVP 只预留 payload。

### 技术风险

- 真实 AI 理解暂时没有 provider。
- issue create 不能写 metadata。
- 输入类型过多会扩散。

### 风险控制

- 第一版只支持 URL/text。
- AI 理解先启发式，UI contract 先稳定。
- Mission context 写 description 或 demo fixture。

## 3.2 Missions

### 从哪里开始

先新增 `packages/views/ai-workbench/missions/missions-page.tsx`，消费现有 issue query 或复用 `IssueSurface`。不要一开始就大改 `IssueSurface` 内部。

### 第一版实现

- Mission queue 只需要 list/empty/search basic。
- `Issue` -> `MissionView` adapter 独立成 helper。
- 状态 display mapping 不改后端 enum。
- 详情页先在 `issue-detail.tsx` 加 Mission sections，旧评论/附件/日志保留。

### 借鉴项目

- Dify：可解释的 workflow run。
- n8n：每一步运行记录可检查。
- OpenSail/CodeMachine：长任务/agent 执行状态。

### 技术风险

- IssueSurface 复杂，可能不适合直接改。
- 详情页改造容易牵动评论、附件、执行日志。

### 风险控制

- 队列可先轻量独立实现。
- 详情只新增区块，不删除旧能力。
- 状态只是 display mapping。

## 3.3 Atlas

### 从哪里开始

先做 `packages/views/ai-workbench/atlas/atlas-page.tsx`，使用 `fixtures.ts` 数据。

### 第一版实现

- Collection 卡片。
- Collection 详情或 inline 展开。
- Resource 卡片包含 summary、source、evidence。
- Relationship 标签：duplicate、similar、version、source。
- Ask Atlas 用固定问题和 fixture citation。

### 借鉴项目

- RAGFlow：引用式回答和文档解析思路。
- AnythingLLM：workspace knowledge base。
- claude-obsidian/swarmvault：自组织知识图谱。

### 技术风险

- 没有真实 RAG，容易像静态页面。
- 图谱可视化容易过度设计。

### 风险控制

- 第一版不用 graph canvas，用关系标签和 Collection 分组。
- Ask Atlas 限定 fixture 问题。
- 必须从 Mission 链接进入 Atlas，证明它是产物不是孤立页。

## 3.4 AI Studio

### 从哪里开始

先做聚合模板页，不直接重构 Agents/Skills/Squads。

### 第一版实现

- Roles tab：资源侦探、去重专家、整理助手、研究分析师、失败诊断师。
- Capabilities tab：网页提取、链接分类、摘要、去重、主题聚类、引用生成等。
- Recipes tab：研究资料包、学习路线、开源项目对比、失败资源诊断等。
- 每个卡片提供“高级配置”入口跳到旧 Agents/Skills/Squads。

### 借鉴项目

- Dify：应用/工具/工作流分层。
- Flowise：可复用 AI flow。
- Open WebUI：provider/能力配置的友好入口。

### 技术风险

- 直接复用旧页面会看起来还是 agent 管理台。
- 模板内容如果太泛，会没有产品记忆点。

### 风险控制

- 首页模板优先，旧管理入口降级为高级配置。
- 模板必须绑定 AI Inbox/Missions/Atlas/Autopilot 的使用场景。

## 3.5 Autopilot

### 从哪里开始

先做 `packages/views/ai-workbench/autopilot/autopilot-page.tsx` 策略预览，不急着写后端。

### 第一版实现

- 自然语言目标输入。
- 启发式生成 strategy card。
- 卡片显示 trigger、conditions、actions、confirmation、risk。
- 本地启用/暂停状态。
- 从 Mission/Atlas 带上下文进入。

### 借鉴项目

- n8n：trigger/action 和运行记录。
- Dify：自然语言/agent workflow 编排。

### 技术风险

- 用户误解为真实自动运行。
- 现有 autopilot API 字段和策略卡不匹配。

### 风险控制

- 明确标注“策略预览/模拟运行历史”。
- 保存到后端作为后续任务，不阻塞 MVP。

## 3.6 System

### 从哪里开始

先做聚合入口页，链接到现有 runtimes/settings。

### 第一版实现

- Nodes 卡片 -> `/runtimes`。
- Integrations/Providers/Workspace -> `/settings` 对应 tab 或页面。
- Mission 详情中展示 Node 信息时只读，不做配置。

### 借鉴项目

- Open WebUI：provider/model 设置。
- AnythingLLM：local-first workspace 配置。

### 技术风险

- 用户找不到节点配置。

### 风险控制

- System 入口固定在导航底部。
- 无节点空状态直接引导到 System Nodes。

## 4. 高质量 Skills 使用计划

每个阶段使用不同 skills，避免靠直觉硬写。

| 阶段 | 必用 skills | 用途 |
| --- | --- | --- |
| 路由/接口设计 | `api-and-interface-design` | 定义 paths、view model、schema、adapter 边界。 |
| UI 实现 | `frontend-ui-engineering` | 保证布局、状态、交互、响应式和可访问性。 |
| 多文件实现 | `incremental-implementation` | 按路由、view model、页面、测试分小步提交。 |
| 行为变化 | `test-driven-development` | 为 intent 分类、adapter、schema、path builder 写测试。 |
| 高风险决策 | `doubt-driven-development` | 审查 Mission 持久化、路由兼容、Atlas fixture 边界。 |
| 每个阶段收尾 | `code-review-and-quality` | 从正确性、架构、安全、性能检查。 |
| 上线前 | `browser-testing-with-devtools` | 浏览器中检查导航、布局、长文本、控制台错误。 |

## 5. 推荐开工顺序

不要从 Onboarding 开始，也不要从 Mission 详情开始。推荐从最低风险、最高依赖的基础开始：

1. **Task 1：基线验证和旧术语审计**
   先知道当前能不能 typecheck，旧词在哪里。

2. **Task 2：确认技术方案和路由兼容策略**
   重点确认：新增路由、旧路由保留、Mission 不写 metadata。

3. **Task 3：建立产品术语和 view model 约定**
   建 `packages/views/ai-workbench/types.ts`、`schemas.ts`、`fixtures.ts`、`terminology.ts`。

4. **Task 4：新增产品路由和路径构建器**
   先让 `/ai-inbox`、`/missions`、`/atlas`、`/ai-studio`、`/autopilot`、`/system` 可打开。

5. **Task 7：AI Inbox 页面骨架**
   做产品第一屏和理解面板。

6. **Task 8：AI Inbox 创建 Mission 交接**
   做最小闭环的第一跳。

7. **Task 9：Missions 队列视图**
   展示 AI 任务队列。

8. **Task 12：Atlas Collection 视图**
   让 Mission 有沉淀结果。

9. **Task 16：Autopilot 策略预览页**
   让 Atlas/Mission 能生成持续策略。

10. **Task 5 和 Task 6：导航与 Onboarding**
    等目标页面可用后，再把导航和新用户引导切过去。

11. **Task 10、11、13、14、15、17、18**
    深化 Mission 详情、Ask Atlas、AI Studio、System 和跨模块入口。

## 6. 每阶段验收闸门

### 骨架闸门

- 新路由可打开。
- 旧路由不 404。
- Path tests 通过。
- 导航不指向空页面。

### 最小闭环闸门

- AI Inbox 可以产生 Mission。
- Mission 可以展示计划。
- Mission 完成态能链接 Atlas。
- Atlas 可以生成 Autopilot 预览。

### 产品感闸门

- 第一屏不再像 issue/agent workspace。
- 每个模块都有独特 AI 行为。
- 没有把 Nodes/Skills/Squads/Usage 重新做成一级模块。

### 质量闸门

- `pnpm --filter @didian/views typecheck` 通过。
- 新增 adapter/schema 至少有单元测试。
- 浏览器手动检查无明显布局溢出。
- 控制台无关键 runtime error。

## 7. 最终建议

方案可以继续推进，但要按以下约束执行：

1. 先建新路由骨架，再改导航。
2. AI Inbox -> Mission 不依赖 metadata。
3. Missions 队列先轻量实现，详情页增量加区块，不大拆旧 issue 详情。
4. Atlas 先做有证据和关系的 fixture，不做图数据库。
5. Autopilot 先策略预览，不承诺真实运行。
6. AI Studio 先模板聚合，不深改 Agents/Skills/Squads。

只要守住这些边界，方案是可实施的；如果一开始就做后端模型迁移、真实 RAG、真实自动化或大改 issue detail，就很容易在中途卡住。
