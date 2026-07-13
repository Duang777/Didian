# 技术方案：AI 资源工作台

## 0. 目标

这份文档把 `docs/ai-resource-workbench/01-product-requirements.md` 落成可实施技术方案，明确每个板块借鉴哪些开源项目、复用当前代码库哪些能力、第一版怎么做、风险在哪里、失败时如何降级。

核心目标不是一次性重构后端，也不是把所有旧模块都包装成新的管理面板。Didian 的第一叙事应该是 **Codex Runtime 驱动的浏览器资料工作流**：用户把页面、搜索结果、链接和文件交给工作台，本地 Codex Runtime 在用户机器上阅读、比较、整理、生成产物，并把结果沉淀成可再次召回的资料记忆。

第一版产品表层应收敛成：

```text
Capture / AI Inbox -> Codex Run / Mission -> Memory / Atlas -> System
```

`Agents`、`Skills`、`Squads`、`Autopilot`、`Runtimes` 仍然复用，但它们不是主故事本身。它们应作为 Codex Run 的执行配置、运行状态和高级设置存在。用户要感知的是“资料正在被 Codex 处理、处理到哪一步、产出了什么、以后怎么被召回”，而不是“我在管理多少个 agent/skill/squad”。

一句话故事：**Didian 不是一个更会分类的收藏夹，而是把浏览器收藏变成 Codex 可以持续处理、追问、更新和召回的个人资料工作流。**

## 1. 当前代码库可复用基础

### 1.1 已有视图模块

当前代码库已经有适合渐进改造的模块：

| 现有模块 | 路径 | 新产品归属 | 复用方式 |
| --- | --- | --- | --- |
| Inbox | `packages/views/inbox` | AI Inbox 的历史通知/收件箱基础 | 复用双栏结构、列表选择、URL query 同步；新建 AI Inbox capture 视图，不直接破坏旧通知 inbox。 |
| Issues | `packages/views/issues` | Missions | 复用 issue 列表、详情、评论、附件、实时同步；用户可见层改为 Mission。 |
| Resources | `packages/views/resources` | Atlas / Mission fixture | 已有资源工作台 mock、task board、task detail、artifact preview，可迁移为 Mission/Atlas demo fixture。 |
| Agents | `packages/views/agents` | Advanced / System | 不做 MVP 主页面；作为 Runtime 可调用角色、所有权和诊断入口。 |
| Skills | `packages/views/skills` | Advanced / System | 不做 MVP 主页面；作为 Codex Runtime 上下文/能力包配置入口。 |
| Squads | `packages/views/squads` | Advanced / Later Recipes | 不做 MVP 主页面；后续用于多角色处理配方，第一版隐藏在高级入口。 |
| Autopilots | `packages/views/autopilots` | Later Background Runs | 不做 MVP 主页面；等 capture/run/memory 路径跑通后再做后台策略。 |
| Runtimes | `packages/views/runtimes` | System / Run Status | 复用节点状态、runtime 查询和健康展示；主流程中只露出当前 Codex Runtime 状态。 |
| Settings | `packages/views/settings` | System | 复用工作区、集成、通知、provider 配置。 |

第一版优先复用底层能力，而不是把每个旧模块做成一个新的定制化面板。Agents/Skills/Squads/Autopilots 可以继续保留旧路由和高级入口，但不要抢占“浏览器资料 -> Codex 执行 -> 记忆召回”的主线。

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
/:workspace/ai-inbox      -> Capture / AI Inbox
/:workspace/missions      -> Codex Runs / Missions
/:workspace/atlas         -> Memory / Atlas
/:workspace/system        -> Runtime / Settings / Advanced
```

`/:workspace/ai-studio` 和 `/:workspace/autopilot` 可以保留技术预留或旧骨架，但不进入第一版主导航。若页面已经存在，也应作为高级入口或后续阶段，不作为当前产品故事的核心板块。

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

- 建立收敛后的产品路由和导航：AI Inbox、Missions、Atlas、System。
- 建立统一 view model 和 fixture schema。
- 用现有 issue 创建/列表/详情承载 Mission。
- 用 fixture/artifacts 承载 Atlas。
- 在 Mission 详情里突出 Codex Runtime 的执行现场：计划、日志、证据、产物、确认门。
- 把 agents/skills/squads/autopilots/runtimes/settings 收进 System / Advanced，不作为 MVP 主导航。

### 2.2A AI 能力如何被看见

AI 能力不应该主要体现在“有一个 AI Studio 面板”。第一版应该把 Codex Runtime 的强能力体现在用户路径上：

1. **理解输入**：收藏页面后自动生成摘要、主题、实体、价值判断和后续可执行建议。
2. **生成计划**：用户把一组页面交给 Didian，Codex Runtime 生成可检查的处理计划，例如“阅读 -> 去重 -> 对比 -> 生成索引 -> 写入云盘”。
3. **真实执行**：复用现有本地 daemon/runtime/task queue，让 Codex 在用户机器上执行任务，而不是只显示 mock 卡片。
4. **展示证据**：每个结论都能回到页面、摘录、高亮、附件或生成 artifact。
5. **产出结果**：生成 Markdown、对比表、资源索引、下一步计划、云盘写入建议。
6. **后续召回**：用户下次搜索相似内容时，浏览器插件提示旧收藏，并可一键让 Codex 更新、比较或加入新 Mission。

这条路径比“配置 Role / Capability / Recipe”更能讲清楚 Codex Runtime 的强大：**用户不是在管理 AI，而是在把浏览器资料交给一个可执行的本地 AI 工作流。**

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
  system/
  advanced/
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

```

这些类型第一版可放 `packages/views/ai-workbench/types.ts`。如果后续需要 API 化，再迁到 `packages/core/ai-workbench` 并补 zod schema。Autopilot strategy 属于后续阶段类型，不进入第一版核心 view model。

## 3. 开源项目借鉴到技术实现

| 板块 | 借鉴项目 | 借鉴功能 | 我们的实现方式 |
| --- | --- | --- | --- |
| AI Inbox | Karakeep、Linkwarden、ArchiveBox | 快速接受任意链接/笔记/网页，保存来源和全文搜索入口。 | 第一版做万能输入 + 输入卡片 + AI 理解面板；不做完整网页抓取，先用 URL/text/fixture。 |
| AI Inbox | nanobrowser | 浏览器侧 capture 和 AI 自动化入口。 | 先预留 `browser_capture` payload schema；MVP 用 fixture import，不承诺真实控制浏览器。 |
| Missions | Dify、n8n | 任务有步骤、运行记录、可检查执行过程。 | Mission 详情展示 AI Plan、Review、Artifacts、Activity；不暴露 workflow builder。 |
| Missions | CodeMachine、OpenSail | 长任务、agent 执行和状态流。 | 复用 issue/agent task/runtime 日志能力；无 runtime 时展示 mock execution。 |
| Atlas | RAGFlow、AnythingLLM | 文档解析、引用式问答、知识库。 | Atlas first 版用 Collection/Resource/Evidence/Ask fixture；后续接 RAG。 |
| Atlas | claude-obsidian、swarmvault | 自组织知识图谱、local-first memory。 | 先做分组和关系标签，不做图数据库；保留 provenance。 |
| Advanced / System | Dify、Flowise | 角色、能力、流程可配置。 | 第一版不做主板块；Agents/Skills/Squads 作为高级配置，必要时从 Mission 详情进入。 |
| Later Autopilot | n8n、Dify | 自动化策略、触发条件、运行历史。 | 后续基于真实 capture/run/memory 行为做后台策略，不用 mock run history 抢 MVP 主线。 |
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

Missions 是第一版展示 AI 能力的主舞台，不只是 issue 的换皮。用户在这里看到 Codex Runtime 如何把浏览器资料变成可检查、可确认、可落地的工作流。

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

4. Mission 详情优先渲染 `Codex Run` 执行现场：
   - Inputs：浏览器收藏、搜索结果、文件、用户目标。
   - Plan：Codex 生成的步骤。
   - Activity：daemon/runtime 日志、task messages、状态变化。
   - Evidence：页面摘录、来源 URL、附件、生成 artifact 引用。
   - Review：云盘写入、归档、合并等需要确认的动作。
   - Outputs：资源索引、对比表、下一步计划、可追问资料包。
5. 如果没有真实 plan，从 fixture 或 metadata 生成默认 plan；但只作为空状态/演示降级，真实路径优先接现有 runtime/task queue。
6. Review Queue 第一版使用 `proposedActions` fixture，后续接真实 proposed action schema。

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

Atlas 第一版不需要做成复杂知识库或图谱面板。它应该是 Codex Run 的结果沉淀：用户看见哪些页面被读过、哪些结论有证据、哪些资源下次搜索会被召回。

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

1. 第一版 Atlas 可以不建完整图数据库，但应优先消费 browser memory / Mission artifacts；fixture 只做无数据降级。
2. 从已有 `resourceTaskDetails.artifacts/clusters` 迁移出第一批 Atlas fixture，并逐步接入 `captured_source` / `page_memory`。
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

## 4.4 Advanced AI Configuration（原 AI Studio，后续）

该板块不进入第一版主导航。当前代码库里的 Agents / Skills / Squads 能力很有价值，但第一版不需要把它们包装成单独的 AI Studio 面板。它们应作为 Codex Runtime 的高级配置存在，在用户需要诊断“谁在执行、带了哪些能力、为什么没跑起来”时再出现。

### 借鉴来源

- Dify：应用、工具、工作流分层。
- Flowise：可复用 AI flow，但隐藏底层复杂度。
- Open WebUI：多 provider/工具生态的友好设置体验。

### 现有落点

- Roles：`packages/views/agents`
- Capabilities：`packages/views/skills`
- Recipes：`packages/views/squads`
- 旧路由可保留：`/:workspace/agents`、`/:workspace/skills`、`/:workspace/squads`
- 新入口建议：System / Advanced 下的配置卡，不进入第一版主导航。

### 实施方式

1. 第一版不新建主导航 `AIStudioPage`。
2. System / Advanced 中提供 Agents、Skills、Squads 的入口卡。
3. Mission 详情只展示当前 Codex Run 实际使用的 runtime/agent/profile/skill bundle，不展示完整配置台。
4. 后续如果用户需要自定义角色和配方，再新增 AI Studio 或 Advanced 页面。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 做成主页面稀释 Codex Runtime 故事 | 高 | 第一版降级为 System / Advanced，不进入主导航。 |
| 直接复用 AgentsPage 仍像 agent 管理台 | 中 | 只在高级入口中保留，不作为普通用户默认体验。 |
| Skills/Squads 数据模型不适合能力/配方 | 中 | 后续有真实用户需求再包装，不为 MVP 做静态模板。 |

### 降级方案

保留 Agents/Skills/Squads 旧路由作为高级入口。MVP 不做纯模板 AI Studio 页。

## 4.5 Later Autopilot

Autopilot 不进入第一版主导航。它应该在 capture/run/memory 真实路径跑通后再出现：当用户已经有足够多的收藏、Mission 和 Atlas 结果时，再把重复行为固化成后台策略。

### 借鉴来源

- n8n：trigger/action、运行记录、自动化模板。
- Dify：自然语言目标到可执行 agent/workflow。

### 现有落点

- `packages/views/autopilots/components/autopilots-page.tsx`
- `packages/views/autopilots/components/autopilot-detail-page.tsx`
- API/query：`packages/core/autopilots/*`
- 旧路由可保留：`/:workspace/autopilots`
- 新入口建议：后续从 AI Inbox、Mission、Atlas 的真实操作中生成“设为后台策略”。

### 实施方式

1. 第一版不做 mock Autopilot 页面。
2. 先记录真实用户动作：收藏、摘要、搜索召回、创建 Mission、确认产物、写入 Atlas。
3. 后续从这些动作中生成策略建议，例如：
   - “每次收藏 GitHub repo 后自动摘要并加入 AI Agent collection”。
   - “每周汇总本周收藏的论文/项目”。
   - “搜索时命中旧收藏后自动提示更新摘要”。
4. 策略卡字段仍可保留：goal、trigger、conditions、actions、confirmationsRequired、scope、riskLevel、enabled。
5. 启用真实策略前必须有 dry-run 和确认门。

### 技术风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Mock Autopilot 抢主线 | 高 | 第一版不做 mock run history，等真实行为足够后再推出。 |
| 真实 autopilot API 和策略卡字段不一致 | 中 | Strategy view model 独立；API 只在保存时映射。 |
| 规则复杂度膨胀 | 高 | 不做规则编辑器，优先从真实行为生成策略建议。 |

### 降级方案

如果现有 autopilot API 改造成本高，保持旧 Autopilot 页面为高级入口；MVP 不新增策略页。

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
system: () => `${ws}/system`,
```

保留旧路径。`root()` 后续可以从 `issues` 改到 `aiInbox`，但建议作为单独任务，先确认登录后默认页。`aiStudio` / `autopilot` 不作为第一版 path builder；如果需要兼容现有页面，继续使用旧 `agents` / `skills` / `squads` / `autopilots` 路径并藏在 System / Advanced。

### 5.2 Next routes 新增

```text
apps/web/app/[workspaceSlug]/(dashboard)/ai-inbox/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/missions/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/missions/[id]/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/atlas/page.tsx
apps/web/app/[workspaceSlug]/(dashboard)/system/page.tsx
```

如果需要一个高级配置页，可以后续放在 `/:workspace/system/advanced`，不要在第一版新增独立 AI Studio / Autopilot 一级页面。

### 5.3 导航重构

修改 `packages/views/layout/app-sidebar.tsx`：

- `personalNav` 改为 AI Inbox 或去掉 personal/workspace 的旧分组感。
- `workspaceNav` 改为 AI Inbox、Missions、Atlas。
- `configureNav` 改为 System，并在 System 内承载 Runtime、Settings、Advanced。
- 旧 routes 不在一级导航展示。

建议先保留旧 `NavKey`，新增新 key，逐步删除旧 key，避免一次性改爆类型。

## 6. 数据和接口策略

### 6.1 第一阶段数据来源优先级

1. 已有 API 数据：issues、runtimes、settings，以及 Mission 能关联到的 task/activity/artifact 数据。
2. 前端 view model adapter：把旧对象转换成新产品对象，重点映射 Mission、Codex Run、Atlas Resource。
3. Runtime 执行数据：优先接本地 daemon/runtime/task queue 能提供的 plan、log、status、artifact；没有真实数据时才用 fixture 降级。
4. Fixture：AI 理解、Atlas 关系、Ask Atlas 答案，以及少量 Mission demo execution。
5. 新后端接口：等 UI contract 稳定后再补。

Agents、Skills、Squads、Autopilots 的已有 API 可以被 System / Advanced 使用，但不作为第一阶段主路径的数据依赖。

### 6.2 Zod 校验边界

项目已有 `zod`。建议对以下 fixture/外部输入建 schema：

- `AiInboxInputSchema`
- `AiUnderstandingSchema`
- `MissionViewSchema`
- `AtlasCollectionSchema`
- `AtlasResourceSchema`

第一版 schema 可放 `packages/views/ai-workbench/schemas.ts`。如果后续被 API 复用，再迁到 `packages/core/ai-workbench/schemas.ts`。

### 6.3 后端迁移触发条件

只有满足以下条件才考虑新增后端 schema/API：

- Mission metadata 已经被 UI 稳定使用，且 description/metadata 塞不下。
- Atlas fixture 已经证明用户价值，需要真实持久化。
- Codex Run 的 plan/log/artifact 需要跨设备、跨会话稳定追踪。
- Autopilot strategy 在真实 capture/run/memory 行为基础上需要启用后台运行。
- Ask Atlas 需要真实检索而不是 fixture。

## 7. 测试策略

| 层级 | 覆盖内容 | 命令 |
| --- | --- | --- |
| Typecheck | 新路由、view model、组件 props、locale key | `pnpm --filter @didian/views typecheck` |
| 单元测试 | schema、adapter、启发式 intent 分类、Ask Atlas fixture | `pnpm --filter @didian/views test` |
| 组件测试 | AI Inbox 输入、Mission 卡片、Codex Run 执行现场、Atlas Collection、System 入口 | 现有 Vitest/Testing Library 模式 |
| 手动检查 | 导航、响应式、长文本、空状态、Runtime 在线/离线状态、完整 demo | 本地 dev server |

关键测试用例：

- 长 URL 不撑破 AI Inbox 卡片。
- 输入中文自然语言能得到合理 intent。
- 缺少 Mission plan 时用 fallback plan。
- Runtime 离线时 Mission 详情解释清楚当前无法真实执行，并引导到 System。
- Codex Run 的 plan/log/evidence/artifacts 长文本不撑破布局。
- Atlas 资源缺 source/evidence 时不崩。
- Ask Atlas 无证据时返回空答案。

## 8. 实施顺序和不可并行项

### 必须顺序

1. 路由和 path builder。
2. 导航收敛。
3. AI Inbox。
4. Mission 创建交接。
5. Missions 队列/详情。
6. Atlas 从 Mission fixture 读取。
7. System 聚合 Runtime、Settings、Advanced 入口。

### 可并行

- Atlas fixture 内容。
- Runtime 执行现场 fixture / adapter。
- System / Advanced 入口卡。
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

### 决策 D：Autopilot 后置，不做策略卡 mock

**理由：** 真实自动化涉及调度、权限、确认、运行日志。第一版如果先做策略卡 mock，会把用户注意力从 Codex Runtime 的真实执行能力拉回“配置自动化面板”。

**风险：** 短期少一个看起来完整的自动化板块。

**缓解：** 在 AI Inbox / Mission / Atlas 中记录真实用户动作和确认点。等 capture/run/memory 路径跑通后，再从真实行为生成后台策略建议。

### 决策 E：AI 能力通过 Codex Run 现场体现

**理由：** Codex Runtime 的价值在于能阅读上下文、生成计划、执行任务、留下证据和产物，而不是让用户管理一组 AI 角色配置。

**风险：** 如果第一版 runtime 接入不足，执行现场会退化成静态 demo。

**缓解：** Mission 详情必须优先消费现有 runtime/task queue 数据；fixture 只作为离线、空状态和 demo 降级。System 中提供清楚的 runtime 健康和连接状态。

## 10. 失败预案

| 如果卡在 | 预案 |
| --- | --- |
| 新路由和路径类型改动太大 | 先复用旧 `/resources` route 渲染新 workbench，导航 label 改为 AI Inbox/Missions/Atlas。 |
| IssueSurface 难以产品化 | 新建轻量 MissionQueue，直接消费 issue query，不复用复杂 surface。 |
| Issue 创建接口无法承载 AI Inbox 上下文 | AI Inbox 创建 demo Mission fixture，后续再接 API。 |
| Atlas 来不及持久化 | 使用 fixture + artifacts preview，明确 MVP 不做真实 schema。 |
| Runtime 数据接不完整 | Mission 详情展示离线/降级执行现场，保留 plan/evidence/artifact UI contract，同时在 System 引导用户检查节点。 |
| Advanced 聚合复杂 | 不新建聚合页，直接从 System 放旧 Agents/Skills/Squads/Runtimes/Settings 入口卡。 |
| Autopilot API 不匹配 | 不做新 Autopilot 页面，保留旧路由为高级兼容入口。 |
| 多语言 locale 工作量过大 | 中文优先，英文保留 key 或简短 fallback；记录待补。 |

## 11. 验收闸门

进入实现前必须确认：

- [ ] 新路由策略采用“新增 + 兼容旧路由”。
- [ ] Mission 第一版复用 issue，不做 DB migration。
- [ ] Atlas 第一版使用 fixture/view model，不做图数据库。
- [ ] Codex Runtime 的 plan/log/evidence/artifact 数据来源和降级方式已确认。
- [ ] AI Studio / Autopilot 不进入第一版主导航。
- [ ] 用户可见一级导航只展示 AI Inbox、Missions、Atlas、System。

第一轮实现完成后必须满足：

- [ ] AI Inbox -> Mission -> Atlas 至少 fixture 闭环可演示。
- [ ] Mission 详情能看见 Codex Run 的 Inputs、Plan、Activity、Evidence、Review、Outputs。
- [ ] 旧 `/issues`、`/inbox`、`/agents` 等兼容路由不 404。
- [ ] `pnpm --filter @didian/views typecheck` 通过或失败原因已记录。
- [ ] 长文本、中文文案、空状态在桌面/移动端不明显溢出。

## 12. 结论

这个方案的关键不是一次做完所有智能能力，而是把技术风险分层：

1. **产品 IA 和路由先稳定。**
2. **Codex Runtime 的执行现场先讲清楚。**
3. **AI 理解、Atlas 和降级路径用 fixture/adapter 托底。**
4. **旧后端模型继续托底。**
5. **确认用户路径成立后，再逐步持久化 Atlas、接入浏览器 capture，并把真实重复行为升级成 Autopilot。**

这样即使某个能力暂时无法真实实现，也不会卡死整体产品改造。
