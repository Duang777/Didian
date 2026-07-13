# 技术方案：AI 资源工作台

## 0. 目标

这份文档把 `docs/ai-resource-workbench/01-product-requirements.md` 落成可实施技术方案，明确每个板块借鉴哪些开源项目、复用当前代码库哪些能力、第一版怎么做、风险在哪里、失败时如何降级。

核心目标不是一次性重构后端，而是在不打碎现有 issue/agent/runtime/skill/squad 能力的前提下，把产品表层改造成：

```text
AI Inbox -> Missions -> Atlas -> AI Studio -> Autopilot
```

## 1. 当前代码库可复用基础

### 1.1 已有视图模块

当前代码库已经有适合渐进改造的模块：

| 现有模块 | 路径 | 新产品归属 | 复用方式 |
| --- | --- | --- | --- |
| Inbox | `packages/views/inbox` | AI Inbox 的历史通知/收件箱基础 | 复用双栏结构、列表选择、URL query 同步；新建 AI Inbox capture 视图，不直接破坏旧通知 inbox。 |
| Issues | `packages/views/issues` | Missions | 复用 issue 列表、详情、评论、附件、实时同步；用户可见层改为 Mission。 |
| Resources | `packages/views/resources` | Atlas / Mission fixture | 已有资源工作台 mock、task board、task detail、artifact preview，可迁移为 Mission/Atlas demo fixture。 |
| Agents | `packages/views/agents` | AI Studio Roles | 复用 agent 查询和详情能力，表层展示为 AI 角色。 |
| Skills | `packages/views/skills` | AI Studio Capabilities | 复用 skill 列表/导入能力，表层展示为能力包。 |
| Squads | `packages/views/squads` | AI Studio Recipes | 复用 squad/team 编排基础，表层展示为处理配方。 |
| Autopilots | `packages/views/autopilots` | Autopilot Strategies | 复用 autopilot/runs/triggers 基础，第一版改造为策略卡。 |
| Runtimes | `packages/views/runtimes` | System Nodes | 复用节点状态、runtime 查询和健康展示，移入 System。 |
| Settings | `packages/views/settings` | System | 复用工作区、集成、通知、provider 配置。 |

### 1.2 已有路由模块

Web app 当前已有：

```text
/:workspace/inbox
/:workspace/issues
/:workspace/resources
/:workspace/agents
/:workspace/skills
/:workspace/squads
/:workspace/autopilots
/:workspace/runtimes
/:workspace/settings
/:workspace/usage
```

新方案建议采用“新增产品路由 + 保留旧路由”的兼容策略：

```text
/:workspace/ai-inbox      -> 新 AI Inbox
/:workspace/missions      -> 新 Missions
/:workspace/atlas         -> 新 Atlas
/:workspace/ai-studio     -> 新 AI Studio
/:workspace/autopilot     -> 新 Autopilot
/:workspace/system        -> 新 System
```

旧路由短期保留，不做硬删除：

```text
/:workspace/issues        -> 可继续访问，后续可渲染 Missions 或重定向
/:workspace/resources     -> 可继续访问，后续可渲染 Atlas 或兼容资源工作台
/:workspace/agents        -> AI Studio Roles 兼容入口
/:workspace/skills        -> AI Studio Capabilities 兼容入口
/:workspace/squads        -> AI Studio Recipes 兼容入口
/:workspace/runtimes      -> System Nodes 兼容入口
```

这样可以避免 pin、通知链接、旧分享链接、浏览器历史和内部跳转在第一阶段失效。

### 1.3 已有数据/API 能力

已有 `packages/core` 查询和 mutation 能支撑第一阶段：

- `packages/core/issues/*`：Mission 基础。
- `packages/core/inbox/*`：通知/收件箱基础。
- `packages/core/agents/*`：AI Role 基础。
- `packages/core/skills/*`：Capability 基础。
- `packages/core/squads/*`：Recipe 基础。
- `packages/core/autopilots/*`：Strategy 基础。
- `packages/core/runtimes/*`：System Node 基础。
- `packages/core/api/schemas.ts` 和 `zod`：边界校验基础。

## 2. 总体技术路线

### 2.1 第一版不做的事

- 不重命名数据库表。
- 不重写 issue/agent/runtime/skill/squad 后端模型。
- 不删除旧路由。
- 不引入复杂图数据库。
- 不做真实浏览器自动化。
- 不做完整下载器或云盘系统。
- 不把 Autopilot 做成真正调度系统的前置条件。

### 2.2 第一版要做的事

- 建立新产品路由和导航。
- 建立统一 view model 和 fixture schema。
- 用现有 issue 创建/列表/详情承载 Mission。
- 用 fixture/artifacts 承载 Atlas。
- 用现有 agents/skills/squads 聚合成 AI Studio。
- 用现有 autopilots 或 mock strategy 承载 Autopilot。
- 把 runtime/settings/integrations 收进 System。

### 2.3 推荐目录结构

建议新增一个产品层目录，集中放新 IA 的 view model、fixture、页面壳：

```text
packages/views/ai-workbench/
  terminology.ts
  schemas.ts
  fixtures.ts
  types.ts
  ai-inbox/
  missions/
  atlas/
  ai-studio/
  autopilot/
  system/
```

也可以按现有模块拆目录，但必须有一个集中 `types/schemas/fixtures`，否则新旧术语会散落。

### 2.4 核心 view model

第一版建议先定义前端 view model，不急着映射数据库 schema：

```ts
export type MissionState =
  | "understanding"
  | "planned"
  | "running"
  | "review"
  | "completed"
  | "needs_attention";

export type AiInboxInput = {
  id: string;
  kind: "url" | "text" | "file" | "browser_capture";
  title: string;
  preview: string;
  source?: string;
  confidence: number;
};

export type AiUnderstanding = {
  intent:
    | "research_pack"
    | "learning_plan"
    | "collect"
    | "compare"
    | "deduplicate"
    | "summarize"
    | "monitor"
    | "diagnose"
    | "archive_only";
  suggestedMissionTitle: string;
  summary: string;
  suggestedOutputs: string[];
  missingInfo: string[];
  confidence: number;
};

export type MissionView = {
  id: string;
  title: string;
  goal: string;
  state: MissionState;
  inputs: AiInboxInput[];
  understanding: AiUnderstanding;
  plan: MissionPlanStep[];
  reviewItems: MissionReviewItem[];
  artifacts: MissionArtifact[];
  relatedAtlasIds: string[];
};

export type AtlasResource = {
  id: string;
  title: string;
  originalTitle?: string;
  kind: "link" | "file" | "note" | "repo" | "video" | "document" | "artifact";
  sourceUrl?: string;
  summary: string;
  evidence: AtlasEvidence[];
  relationships: AtlasRelationship[];
};

export type AutopilotStrategy = {
  id: string;
  goal: string;
  mode: "watch" | "organize" | "clean" | "summarize" | "diagnose" | "recommend";
  trigger: string;
  conditions: string[];
  actions: string[];
  confirmationsRequired: string[];
  riskLevel: "low" | "medium" | "high";
  enabled: boolean;
};
```

这些类型第一版可放 `packages/views/ai-workbench/types.ts`。如果后续需要 API 化，再迁到 `packages/core/ai-workbench` 并补 zod schema。

## 3. 开源项目借鉴到技术实现

| 板块 | 借鉴项目 | 借鉴功能 | 我们的实现方式 |
| --- | --- | --- | --- |
| AI Inbox | Karakeep、Linkwarden、ArchiveBox | 快速接受任意链接/笔记/网页，保存来源和全文搜索入口。 | 第一版做万能输入 + 输入卡片 + AI 理解面板；不做完整网页抓取，先用 URL/text/fixture。 |
| AI Inbox | nanobrowser | 浏览器侧 capture 和 AI 自动化入口。 | 先预留 `browser_capture` payload schema；MVP 用 fixture import，不承诺真实控制浏览器。 |
| Missions | Dify、n8n | 任务有步骤、运行记录、可检查执行过程。 | Mission 详情展示 AI Plan、Review、Artifacts、Activity；不暴露 workflow builder。 |
| Missions | CodeMachine、OpenSail | 长任务、agent 执行和状态流。 | 复用 issue/agent task/runtime 日志能力；无 runtime 时展示 mock execution。 |
| Atlas | RAGFlow、AnythingLLM | 文档解析、引用式问答、知识库。 | Atlas first 版用 Collection/Resource/Evidence/Ask fixture；后续接 RAG。 |
| Atlas | claude-obsidian、swarmvault | 自组织知识图谱、local-first memory。 | 先做分组和关系标签，不做图数据库；保留 provenance。 |
| AI Studio | Dify、Flowise | 角色、能力、流程可配置。 | 聚合 Agents/Skills/Squads 为 Roles/Capabilities/Recipes；默认展示模板而不是底层配置。 |
| Autopilot | n8n、Dify | 自动化策略、触发条件、运行历史。 | 自然语言生成策略卡；第一版 mock run history，后续接现有 autopilot triggers/runs。 |
| System | Open WebUI、AnythingLLM | Provider、模型、local-first 设置。 | Runtime、provider、integration、settings 收进 System，不作为主业务导航。 |

## 4. 分板块技术方案

## 4.1 AI Inbox

### 借鉴来源

- Karakeep：bookmark-everything 和 AI tagging 的“快速丢进去”体验。
- Linkwarden：链接保存、归档、collection 的长期组织思路。
- ArchiveBox：URL ingestion 和保存来源的严谨性。
- nanobrowser：浏览器扩展作为采集入口，但不在 MVP 承诺复杂自动操作。

### 现有落点

- 旧通知收件箱：`packages/views/inbox/components/inbox-page.tsx`
- 新路由建议：`apps/web/app/[workspaceSlug]/(dashboard)/ai-inbox/page.tsx`
- 新视图建议：`packages/views/ai-workbench/ai-inbox/ai-inbox-page.tsx`
- 路径配置：`packages/core/paths/paths.ts`
- 导航：`packages/views/layout/app-sidebar.tsx`

### 实施方式

1. 新增 `/ai-inbox` 路由，不直接覆盖旧 `/inbox`。
2. 新增 `AiInboxPage`，包含输入框、输入卡片区、AI 理解面板。
3. 先实现本地启发式理解：
   - URL 数量多于 1：倾向 `research_pack` 或 `compare`。
   - 包含 GitHub/docs/video 关键词：推断资源类型。
   - 文本包含“整理/对比/学习/监控/失败”：推断 intent。
4. 后续可把理解逻辑换成 LLM API，不改变 UI contract。
5. 创建 Mission 时第一阶段可走：
   - 方案 A：调用现有 issue create mutation，把 AI Inbox 上下文写入 `description` 的结构化 Markdown 区块；当前 `CreateIssueRequest` 不支持写 `metadata`。
   - 方案 B：先创建前端 demo Mission fixture，完成 UI 闭环。
   - 方案 C：后续新增后端 endpoint 或扩展 issue metadata 写入能力，再把 Mission context 正式持久化。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 直接改旧 `/inbox` 破坏通知收件箱 | 高 | 新增 `/ai-inbox`，旧 `/inbox` 保留。 |
| AI 理解没有真实 LLM 显得假 | 中 | 启发式 + fixture 做到交互真实；文案标注“建议理解”。后续替换 provider。 |
| 创建 Mission 需要后端字段支持 | 中 | 当前 create issue 不能写 metadata；第一版只写 description 或 demo store，正式持久化另做后端任务。 |
| 浏览器 capture 过早做大 | 中 | MVP 只做 `browser_capture` schema 和 fixture import。 |

### 降级方案

如果 issue create 接不进去，AI Inbox 仍可创建本地 fixture Mission 并跳转到 `/missions?demo=<id>`，保证演示闭环。

## 4.2 Missions

### 借鉴来源

- Dify：workflow/app 分离和可视化运行过程。
- n8n：运行历史、每一步可检查。
- CodeMachine / OpenSail：长任务和 agent 状态流。

### 现有落点

- 列表：`packages/views/issues/components/issues-page.tsx`
- 列表核心 surface：`packages/views/issues/surface/*`
- 详情：`packages/views/issues/components/*` 和 issue detail 相关目录。
- API/query：`packages/core/issues/queries.ts`、`packages/core/issues/mutations.ts`
- 新路由建议：`/:workspace/missions`、`/:workspace/missions/[id]`

### 实施方式

1. 新增 `MissionsPage`，内部复用 `IssueSurface`，但 header、empty、card 文案改为 Mission。
2. 新增 `MissionView` adapter，将 `Issue` 映射为：
   - `title` -> Mission title
   - `description` -> goal / inputs / AI understanding 的 Markdown/fixture 来源
   - `metadata` -> 只读补充信息；当前前端 create/update API 不写 metadata
   - `status` -> Mission state
   - `comments/timeline` -> Activity
   - `attachments` -> Artifacts
3. 状态映射第一版：

| Issue 状态 | Mission 状态 |
| --- | --- |
| Backlog | Understanding |
| Todo | Planned |
| In Progress | Running |
| In Review | Review |
| Done | Completed |
| Blocked/failed reason | Needs Attention |

4. Mission 详情优先渲染 `AI Plan`。如果没有真实 plan，从 fixture 或 metadata 生成默认 plan。
5. Review Queue 第一版使用 `proposedActions` fixture，后续接真实 proposed action schema。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| IssueSurface 内部强绑定 issue 文案 | 中 | 第一版包一层 MissionsPage + locale 替换；复杂卡片后续局部 fork。 |
| 状态映射不完全匹配真实业务 | 中 | 明确是 display mapping，不改变 issue status enum。 |
| 详情页重排牵涉评论/附件/实时更新 | 高 | 不删旧详情能力，新增 Mission sections；保留 Activity 中原功能。 |
| Mission 创建 metadata 不可写 | 中 | 不依赖 metadata 创建 Mission；上下文先放 description 或 demo fixture，后续单独设计 metadata/API。 |

### 降级方案

如果 `IssueSurface` 过于难改，先保留现有 issue 列表作为数据源，新增一个轻量 Mission queue view 用 `useQuery(issueListOptions)` 渲染独立卡片。

## 4.3 Atlas

### 借鉴来源

- RAGFlow：文档解析、引用、RAG context。
- AnythingLLM：workspace + knowledge base + chat。
- claude-obsidian：任意来源进入自组织知识图谱。
- swarmvault：local-first LLM wiki 和 agent memory。

### 现有落点

- 已有资源 mock：`packages/views/resources/mock-data.ts`
- 已有工作台：`packages/views/resources/resources-workbench-page.tsx`
- artifact preview：`packages/views/resources/artifacts/artifact-preview.tsx`
- 新路由建议：`/:workspace/atlas`
- 新视图建议：`packages/views/ai-workbench/atlas/*`

### 实施方式

1. 第一版 Atlas 不建后端表，使用 `AtlasCollection`、`AtlasResource` fixture。
2. 从已有 `resourceTaskDetails.artifacts/clusters` 迁移出第一批 Atlas fixture。
3. Atlas 首页展示 Collection cards。
4. Collection 详情展示 Resource cards、Evidence、Relationships。
5. Ask Atlas 第一版使用固定问题匹配：
   - “哪些适合入门？”
   - “哪些资源重复？”
   - “下一步建议？”
   返回带 citation 的 fixture answer。
6. 后续接入 RAG 时，只替换 Ask provider，不改变 Atlas UI contract。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Atlas 变成静态假页面 | 中 | 必须从 Mission 完成页链接进入；fixture 绑定 Mission id。 |
| 没有图数据库无法做图谱 | 低 | MVP 用关系标签和分组布局，不做 graph canvas。 |
| 引用式回答没有检索能力 | 中 | 第一版限定 fixture 问题；后续增加 embedding/RAG。 |
| 资源和项目旧概念混乱 | 中 | Atlas 使用 Collection 统一项目/资源库概念。 |

### 降级方案

如果 Atlas route 来不及做完整详情，先在 `packages/views/resources` 上改造成 Atlas 首页，保留已有 artifact preview 和 task detail mock。

## 4.4 AI Studio

### 借鉴来源

- Dify：应用、工具、工作流分层。
- Flowise：可复用 AI flow，但隐藏底层复杂度。
- Open WebUI：多 provider/工具生态的友好设置体验。

### 现有落点

- Roles：`packages/views/agents`
- Capabilities：`packages/views/skills`
- Recipes：`packages/views/squads`
- 新路由建议：`/:workspace/ai-studio`

### 实施方式

1. 新增 `AIStudioPage`，用 tabs 或 segmented control 展示 Roles / Capabilities / Recipes。
2. Roles tab 可以复用 `AgentsPage` 的数据，但默认显示模板卡，不直接显示底层表格。
3. Capabilities tab 复用 skills 数据，加入能力用途、适用输入、被哪些 Role 使用。
4. Recipes tab 复用 squads/workflows 数据，展示处理配方步骤和典型产物。
5. 第一版至少静态模板：资源侦探、去重专家、整理助手、研究分析师、失败诊断师、自动化规划师。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 直接复用 AgentsPage 仍像 agent 管理台 | 中 | AI Studio 首页先展示模板/说明，旧管理视图放“高级配置”。 |
| Skills/Squads 数据模型不适合能力/配方 | 中 | 第一版用静态模板 + optional existing data；不强依赖后端。 |
| 三个旧模块聚合后页面太复杂 | 中 | Tabs 分离，默认进入 Roles，Capabilities/Recipes 简洁卡片化。 |

### 降级方案

如果聚合真实数据成本高，AI Studio MVP 先做纯模板页，保留 Agents/Skills/Squads 旧路由作为高级入口。

## 4.5 Autopilot

### 借鉴来源

- n8n：trigger/action、运行记录、自动化模板。
- Dify：自然语言目标到可执行 agent/workflow。

### 现有落点

- `packages/views/autopilots/components/autopilots-page.tsx`
- `packages/views/autopilots/components/autopilot-detail-page.tsx`
- API/query：`packages/core/autopilots/*`
- 新路由建议：`/:workspace/autopilot`

### 实施方式

1. 新增或改造 Autopilot 页面为“自然语言目标 -> 策略卡”。
2. 策略卡字段：goal、mode、trigger、conditions、actions、confirmationsRequired、scope、riskLevel、enabled。
3. 第一版策略生成走启发式/fixture：
   - 包含“每周/每天” -> Summarize。
   - 包含“监控/有新资源” -> Watch。
   - 包含“失败/坏链” -> Diagnose。
   - 包含“重复/清理” -> Clean。
4. 启用/暂停第一版可本地状态或 mock mutation；后续接 `CreateAutopilotRequest`。
5. Mission/Atlas 提供“设为 Autopilot”入口，把上下文带到策略创建页。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 真实 autopilot API 和策略卡字段不一致 | 中 | Strategy view model 独立；API 只在保存时映射。 |
| 用户以为 Autopilot 已真实运行 | 中 | MVP 显示“预览/模拟运行历史”；真实启用需明确状态。 |
| 规则复杂度膨胀 | 高 | 不做规则编辑器，优先自然语言和策略卡。 |

### 降级方案

如果现有 autopilot API 改造成本高，先做 mock strategy 页面，不写后端，仅支持预览和本地启停。

## 4.6 System

### 借鉴来源

- Open WebUI：provider/model 配置收在设置里。
- AnythingLLM：local-first 工作区、provider、存储配置。

### 现有落点

- Nodes：`packages/views/runtimes`
- Settings：`packages/views/settings`
- Integrations：settings 下 Slack/Lark/GitHub/Composio 等 tab
- 新路由建议：`/:workspace/system`

### 实施方式

1. 新增 System 页面作为基础设施入口聚合页。
2. System 首页展示：Nodes、Integrations、Providers、Storage、Permissions、Workspace。
3. Nodes 仍复用 `RuntimesPage`，但从一级导航移入 System。
4. Mission 详情中仅展示与当前执行相关的 Node 信息。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 移除 Runtimes 一级入口导致用户找不到节点 | 中 | System 中放明显 Nodes 卡片；Mission 空状态也引导到 Nodes。 |
| Settings 已有很多 tab，System 容易重复 | 中 | System 是聚合入口，具体配置继续进入现有 settings/runtimes route。 |

### 降级方案

如果 System 页面来不及做，先把 configure group label 改为 System，并将 runtimes/settings 保留在底部配置分组。

## 5. 路由和导航实施方案

### 5.1 路径新增

在 `packages/core/paths/paths.ts` 增加：

```ts
aiInbox: () => `${ws}/ai-inbox`,
missions: () => `${ws}/missions`,
missionDetail: (id: string) => `${ws}/missions/${encode(id)}`,
atlas: () => `${ws}/atlas`,
aiStudio: () => `${ws}/ai-studio`,
autopilot: () => `${ws}/autopilot`,
system: () => `${ws}/system`,
```

保留旧路径。`root()` 后续可以从 `issues` 改到 `aiInbox`，但建议作为单独任务，先确认登录后默认页。

### 5.2 Next routes 新增

```text
apps/web/app/[workspaceSlug]/(dashboard)/ai-inbox/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/missions/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/missions/[id]/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/atlas/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/ai-studio/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/autopilot/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/system/page.tsx
```

### 5.3 导航重构

修改 `packages/views/layout/app-sidebar.tsx`：

- `personalNav` 改为 AI Inbox 或去掉 personal/workspace 的旧分组感。
- `workspaceNav` 改为 Missions、Atlas、AI Studio、Autopilot。
- `configureNav` 改为 System。
- 旧 routes 不在一级导航展示。

建议先保留旧 `NavKey`，新增新 key，逐步删除旧 key，避免一次性改爆类型。

## 6. 数据和接口策略

### 6.1 第一阶段数据来源优先级

1. 已有 API 数据：issues、agents、skills、squads、autopilots、runtimes。
2. 前端 view model adapter：把旧对象转换成新产品对象。
3. Fixture：AI 理解、Atlas 关系、Ask Atlas 答案、Autopilot 运行历史。
4. 新后端接口：等 UI contract 稳定后再补。

### 6.2 Zod 校验边界

项目已有 `zod`。建议对以下 fixture/外部输入建 schema：

- `AiInboxInputSchema`
- `AiUnderstandingSchema`
- `MissionViewSchema`
- `AtlasCollectionSchema`
- `AtlasResourceSchema`
- `AutopilotStrategySchema`

第一版 schema 可放 `packages/views/ai-workbench/schemas.ts`。如果后续被 API 复用，再迁到 `packages/core/ai-workbench/schemas.ts`。

### 6.3 后端迁移触发条件

只有满足以下条件才考虑新增后端 schema/API：

- Mission metadata 已经被 UI 稳定使用，且 description/metadata 塞不下。
- Atlas fixture 已经证明用户价值，需要真实持久化。
- Autopilot strategy 需要真实运行，而不只是预览。
- Ask Atlas 需要真实检索而不是 fixture。

## 7. 测试策略

| 层级 | 覆盖内容 | 命令 |
| --- | --- | --- |
| Typecheck | 新路由、view model、组件 props、locale key | `pnpm --filter @didian/views typecheck` |
| 单元测试 | schema、adapter、启发式 intent 分类、Ask Atlas fixture | `pnpm --filter @didian/views test` |
| 组件测试 | AI Inbox 输入、Mission 卡片、Atlas Collection、Autopilot 策略卡 | 现有 Vitest/Testing Library 模式 |
| 手动检查 | 导航、响应式、长文本、空状态、完整 demo | 本地 dev server |

关键测试用例：

- 长 URL 不撑破 AI Inbox 卡片。
- 输入中文自然语言能得到合理 intent。
- 缺少 Mission plan 时用 fallback plan。
- Atlas 资源缺 source/evidence 时不崩。
- Ask Atlas 无证据时返回空答案。
- Autopilot 高风险策略显示确认要求。

## 8. 实施顺序和不可并行项

### 必须顺序

1. 路由和 path builder。
2. 导航收敛。
3. AI Inbox。
4. Mission 创建交接。
5. Missions 队列/详情。
6. Atlas 从 Mission fixture 读取。
7. Autopilot 从 Mission/Atlas 上下文生成策略。

### 可并行

- AI Studio 模板内容。
- Atlas fixture 内容。
- Autopilot 策略 fixture。
- System 聚合页。
- 文档和 demo 脚本。

## 9. 高风险决策审查

### 决策 A：新增产品路由，不直接覆盖旧路由

**理由：** 当前旧路由被 pins、notifications、details、workspace root、历史链接依赖。直接覆盖风险高。

**风险：** 短期路由变多。

**接受理由：** 新导航只暴露新路由，旧路由作为兼容层存在。

### 决策 B：Mission 复用 Issue

**理由：** issue 已有列表、详情、评论、附件、实时同步、任务队列关联。

**风险：** 旧 status/字段和 Mission 语义不完全匹配。

**缓解：** 用 display mapping 和 adapter；不改 enum，不改 DB。

### 决策 C：Atlas 先 fixture/view model

**理由：** 图谱、RAG、resource schema 都属于较大后端工程。MVP 先验证用户体验。

**风险：** 数据不真实。

**缓解：** 必须从 Mission 完成页可达，fixture 绑定 Mission id，后续再持久化。

### 决策 D：Autopilot 先策略卡 mock

**理由：** 真实自动化涉及调度、权限、确认、运行日志。先验证自然语言策略体验。

**风险：** 用户误解为真实运行。

**缓解：** 明确“预览/模拟运行历史”；真实启用另做 API 接入任务。

## 10. 失败预案

| 如果卡在 | 预案 |
| --- | --- |
| 新路由和路径类型改动太大 | 先复用旧 `/resources` route 渲染新 workbench，导航 label 改为 AI Inbox/Missions/Atlas。 |
| IssueSurface 难以产品化 | 新建轻量 MissionQueue，直接消费 issue query，不复用复杂 surface。 |
| Issue 创建接口无法承载 AI Inbox 上下文 | AI Inbox 创建 demo Mission fixture，后续再接 API。 |
| Atlas 来不及持久化 | 使用 fixture + artifacts preview，明确 MVP 不做真实 schema。 |
| AI Studio 聚合复杂 | 先做静态模板页，旧 Agents/Skills/Squads 放高级入口。 |
| Autopilot API 不匹配 | 只做 strategy preview，不保存到后端。 |
| 多语言 locale 工作量过大 | 中文优先，英文保留 key 或简短 fallback；记录待补。 |

## 11. 验收闸门

进入实现前必须确认：

- [ ] 新路由策略采用“新增 + 兼容旧路由”。
- [ ] Mission 第一版复用 issue，不做 DB migration。
- [ ] Atlas 第一版使用 fixture/view model，不做图数据库。
- [ ] Autopilot 第一版允许 mock 策略和运行历史。
- [ ] 用户可见一级导航只展示五个主模块。

第一轮实现完成后必须满足：

- [ ] AI Inbox -> Mission -> Atlas -> Autopilot 至少 fixture 闭环可演示。
- [ ] 旧 `/issues`、`/inbox`、`/agents` 等兼容路由不 404。
- [ ] `pnpm --filter @didian/views typecheck` 通过或失败原因已记录。
- [ ] 长文本、中文文案、空状态在桌面/移动端不明显溢出。

## 12. 结论

这个方案的关键不是一次做完所有智能能力，而是把技术风险分层：

1. **产品 IA 和路由先稳定。**
2. **AI 行为先用 fixture/adapter 表达。**
3. **旧后端模型继续托底。**
4. **确认用户路径成立后，再逐步持久化 Atlas、真实化 Autopilot、接入浏览器 capture 和 runtime 执行。**

这样即使某个能力暂时无法真实实现，也不会卡死整体产品改造。
