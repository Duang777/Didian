# PRD：个人收藏到 Skills 能力库

## 0. 前提假设

1. 第一版只做个人能力，不做团队共享、公开市场或跨 workspace 分发。
2. “乌托邦能力”落在 Didian 内部个人 Skill 库，不同步为外部 Codex Skill / Agent Skill 文件。
3. 收藏入口优先复用当前浏览器扩展和 `captured_source` / `page_memory` 浏览器记忆链路。
4. Skill 生成必须由用户确认触发，系统只能先生成 Skill 候选建议，不能自动污染个人 Skill 库。
5. 第一批重点网页类型只覆盖技术文档、GitHub repo、教程 / How-to。论文、普通博客、产品页先进入收藏和知识关联，不作为默认 Skill 生成主路径。
6. Atlas 第一版展示局部知识关系和来源追溯，不先引入完整图数据库或复杂图谱画布。

## 1. 产品愿景

把用户收藏的网页从静态链接升级为个人能力入口：

```text
网页收藏
  -> 收藏卡片
  -> 轻量理解与知识关联
  -> Skill 候选提示
  -> 用户确认生成
  -> Didian 内部个人 Skill 库
  -> Atlas 关系展示和后续复用
```

一句话定位：

> Didian 不只是保存网页，而是帮用户判断哪些网页值得炼成可复用的个人 AI 能力。

这条能力是现有 AI Inbox / Mission / Atlas 主线的自然延伸：收藏卡片保存事实，AI 判断能力机会，Mission 执行生成，Atlas 记录知识关系，个人 Skill 库承载可重复调用能力。

## 2. 目标用户

### 2.1 第一版用户

- 高频收藏技术资料的个人用户。
- 经常保存 API 文档、开源仓库、教程、工具说明的人。
- 希望把“以后可能会用”的页面沉淀成可调用能力，而不是只丢进收藏夹的人。
- 需要在调研、集成、选型、学习和排障中反复复用网页知识的人。

### 2.2 用户痛点

- 收藏网页很容易，事后复用很困难。
- 用户经常忘记某个页面当时为什么重要。
- 很多技术文档、repo、教程其实包含可重复流程，但传统收藏夹不会识别。
- AI 聊天可以临时总结网页，但总结不会沉淀成长期能力。
- 个人 Skill 库如果完全靠手写，创建成本太高。

## 3. 产品目标

### 3.1 目标

1. 用户可以把网页收藏成个人收藏卡片。
2. 系统可以异步理解网页，识别页面类型、主题、实体、摘要和可复用流程。
3. 系统可以判断网页是否值得生成个人 Skill 候选。
4. 用户在卡片上看到明确、可解释的 Skill 生成建议。
5. 用户确认后，Didian 生成个人 Skill 草稿。
6. 用户确认草稿后，Skill 进入 Didian 内部个人 Skill 库。
7. 收藏卡片、Skill 候选、已生成 Skill 和 Atlas 知识节点之间有可追溯关系。

### 3.2 非目标

- 不做团队共享 Skill。
- 不做公开 Skill 市场。
- 不自动启用 Skill。
- 不把所有网页都推荐成 Skill。
- 不把论文、普通博客、产品页作为第一版 Skill 推荐重点。
- 不做完整 graph database 迁移。
- 不做浏览器自动操作或网页自动填表。
- 不从第三方网页复制不可追溯的大段内容进入 Skill。

## 4. 核心体验

### 4.1 收藏进入

用户在浏览器中点击 Didian 扩展按钮收藏当前页。

系统立即创建收藏卡片，状态为：

```text
captured -> enriching -> ready
```

收藏成功不等待 AI 理解完成。页面抓取、摘要、分类和 Skill 机会判断都在后台异步执行。

### 4.2 收藏卡片

收藏卡片默认展示：

- 标题
- 来源域名
- URL
- 收藏时间
- 页面类型
- 一句话 takeaway
- 摘要状态
- 主题标签
- 相关知识节点
- Skill 候选提示状态

卡片操作：

- 打开原网页
- 查看详情
- 加入 AI Inbox
- 保存到 Atlas
- 重新理解
- 静音此类建议
- 归档

### 4.3 Skill 候选提示

当系统判断网页适合生成 Skill 时，在收藏卡片上展示轻量建议：

```text
这个网页可以变成一个个人 Skill

「Stripe Checkout 接入助手」
它可以根据你的项目栈，生成接入步骤、API 调用示例、环境变量清单和常见错误排查。

来源：Stripe Docs
适合场景：API 集成、支付接入、排障
置信度：高

[生成 Skill] [收藏为知识] [以后少推荐这类]
```

提示必须回答三个问题：

1. 它能变成什么 Skill？
2. 这个 Skill 能帮用户做什么？
3. 为什么系统认为这个网页值得生成 Skill？

### 4.4 生成 Skill

用户点击“生成 Skill”后，系统创建一个个人 Skill 生成任务。

生成过程可以复用 Mission / Codex Run 语义，但产品上表现为“生成个人 Skill 草稿”。

生成完成后进入 Skill Draft Review：

- Skill 名称
- 描述
- 使用场景
- 触发示例
- 输入要求
- 输出格式
- 操作说明
- 来源卡片
- 证据摘要
- 风险和限制

用户可以：

- 启用 Skill
- 编辑后启用
- 保留草稿
- 放弃生成

### 4.5 个人 Skill 库

已启用 Skill 进入 Didian 内部个人 Skill 库。

Skill 库中的每个 Skill 必须能回溯：

- 来自哪些收藏卡片
- 来自哪些 URL
- 何时生成
- 由哪个用户启用
- 最近被哪些 Mission 或 AI 操作调用
- 是否有来源网页更新或失效风险

## 5. 第一批网页类型

### 5.1 技术文档

优先级最高。技术文档天然包含 API、参数、限制、错误码、示例和集成流程。

可生成的 Skill 类型：

- API 接入助手
- SDK 使用助手
- 错误排查助手
- 配置生成助手
- 文档问答助手
- 最佳实践检查器

示例提示：

```text
这个文档可以做成「Supabase Auth 接入助手」。
它可以根据你的项目栈，生成登录流程、环境变量、回调配置和常见错误排查。
```

### 5.2 GitHub repo

优先级第二。GitHub repo 很适合做开源项目评估、上手、部署和替代方案比较。

可生成的 Skill 类型：

- 开源项目评估
- 快速上手助手
- 安装部署助手
- 代码库结构解释器
- 依赖风险检查器
- 替代方案比较助手

示例提示：

```text
这个仓库可以做成「开源项目尽调 Skill」。
它可以检查 README、license、安装方式、维护活跃度、风险点，并生成采用建议。
```

### 5.3 教程 / How-to

优先级第三。教程通常包含操作步骤，但质量不稳定，需要较高判断门槛。

可生成的 Skill 类型：

- 步骤执行助手
- 配置向导
- 检查清单
- 排障流程
- 项目初始化模板
- 操作 SOP

示例提示：

```text
这个教程可以做成「Next.js Auth 配置 Skill」。
它可以按你的项目情况，带你完成登录、回调、环境变量和测试账号配置。
```

### 5.4 暂不主推类型

| 类型 | 第一版处理 | 原因 |
| --- | --- | --- |
| 论文 | 进入收藏和 Atlas，默认不强推 Skill | 工程可执行细节经常不足，更适合研究卡片和方法提取。 |
| 普通博客 | 进入收藏和 Atlas，只有出现 checklist / workflow / template 时才建议 Skill | 观点内容太多，容易生成低质量能力。 |
| 产品页 | 进入收藏和 Atlas，后续进入竞品研究方向 | 营销内容较多，第一版 Skill 生成价值不稳定。 |

## 6. AI 判断策略

### 6.1 判断原则

Didian 应该宁可少推荐，也不要乱推荐。

Skill 候选必须同时满足：

1. 页面包含可重复流程。
2. 页面有稳定输入和输出。
3. 页面内容能帮助未来任务执行，而不是只提供一次性信息。
4. 生成的 Skill 可以被一句 “当你要做 X 时，我帮你完成 Y” 描述。
5. 建议可以引用页面中的证据片段解释。

### 6.2 Skill Opportunity Detector

后台 enrichment 完成后，运行 Skill 机会判断。

建议输出结构：

```ts
type SkillOpportunity = {
  shouldSuggest: boolean
  confidence: number
  pageType:
    | "technical_doc"
    | "github_repo"
    | "tutorial"
    | "blog"
    | "paper"
    | "product_page"
    | "unknown"
  proposedTitle: string
  proposedCapability: string
  whyUseful: string
  triggerExamples: string[]
  expectedInputs: string[]
  expectedOutputs: string[]
  reusableWorkflowScore: number
  instructionDensityScore: number
  futureUseScore: number
  evidenceSnippets: string[]
  riskNotes: string[]
}
```

### 6.3 推荐阈值

第一版建议：

- `confidence >= 0.75`
- `reusableWorkflowScore >= 0.7`
- `instructionDensityScore >= 0.65`
- `futureUseScore >= 0.7`
- `pageType` 是 `technical_doc`、`github_repo`、`tutorial` 之一
- 至少有 2 条 evidence snippets

未达到阈值时，只生成普通收藏卡片和 Atlas 关联，不展示 Skill 候选。

### 6.4 降噪机制

用户可以对建议做反馈：

- 生成 Skill
- 收藏为知识
- 本次忽略
- 以后少推荐这类
- 不再对此网站推荐

这些反馈应进入个人偏好，用于调整后续推荐频率和类型权重。

## 7. 数据模型建议

### 7.1 PersonalSkill

```ts
type PersonalSkill = {
  id: string
  ownerUserId: string
  workspaceId: string
  title: string
  description: string
  category:
    | "api_integration"
    | "repo_research"
    | "tutorial_workflow"
    | "debugging"
    | "evaluation"
    | "other"
  sourceCardIds: string[]
  sourceUrls: string[]
  triggerExamples: string[]
  inputSchema?: unknown
  outputFormat?: string
  instructions: string
  evidenceSummary: string
  limitations: string[]
  status: "draft" | "active" | "archived"
  createdAt: string
  updatedAt: string
}
```

### 7.2 SkillProposal

```ts
type SkillProposal = {
  id: string
  ownerUserId: string
  workspaceId: string
  sourceCardId: string
  pageType: string
  title: string
  capability: string
  whyUseful: string
  confidence: number
  triggerExamples: string[]
  expectedInputs: string[]
  expectedOutputs: string[]
  evidenceSnippets: string[]
  riskNotes: string[]
  status:
    | "suggested"
    | "accepted"
    | "dismissed"
    | "muted"
    | "converted_to_draft"
  generatedSkillId?: string
  createdAt: string
  updatedAt: string
}
```

### 7.3 KnowledgeRelation

第一版可以用轻量关系表，不先引入图数据库。

```ts
type KnowledgeRelation = {
  id: string
  workspaceId: string
  ownerUserId: string
  fromType: "capture" | "topic" | "entity" | "skill_proposal" | "skill" | "mission" | "artifact"
  fromId: string
  toType: "capture" | "topic" | "entity" | "skill_proposal" | "skill" | "mission" | "artifact"
  toId: string
  relation:
    | "mentions"
    | "similar_to"
    | "supports"
    | "derived_skill"
    | "generated_by"
    | "used_by"
    | "updates"
    | "contradicts"
  confidence: number
  evidence?: string
  createdAt: string
}
```

## 8. Atlas 知识关联展示

### 8.1 第一版目标

Atlas 不需要先做全屏复杂图谱。第一版要解决的是：

- 这个收藏为什么重要？
- 它和哪些收藏相似？
- 它能生成或已经生成哪些 Skill？
- 它关联哪些主题、实体、Mission 和产物？
- 这个 Skill 后来被哪些任务使用过？

### 8.2 局部节点视图

从单张收藏卡片或单个 Skill 打开关系视图时，展示局部节点：

```text
当前收藏卡片
  -> 主题节点
  -> 实体节点
  -> 相似收藏
  -> Skill 候选
  -> 已生成 Skill
  -> 使用过该 Skill 的 Mission
```

节点类型：

- Web Page
- Topic
- Entity
- Skill Proposal
- Personal Skill
- Mission
- Artifact

### 8.3 交互要求

- 点击节点可打开详情抽屉。
- 点击边可查看关系解释和证据。
- 支持按关系类型过滤。
- 默认只展示一跳关系，用户可手动展开。
- 当关系证据不足时，不强行连线。

## 9. 关键页面

### 9.1 收藏卡片列表

目标：让用户扫读最近收藏，并快速看到哪些页面有能力生成价值。

主要区域：

- 搜索和过滤
- 页面类型 filter
- Skill 候选 filter
- 收藏卡片列表
- enrichment 状态
- 批量加入 Atlas / AI Inbox

### 9.2 收藏详情页

目标：展示网页事实、AI 理解、Skill 候选和知识关联。

主要区域：

- 页面信息
- AI 摘要
- 关键点
- 主题和实体
- Skill 候选卡
- 关系节点
- 来源正文片段

### 9.3 Skill Draft Review

目标：让用户在启用前审查 AI 生成的个人 Skill。

主要区域：

- Skill 名称和描述
- 能力说明
- 触发示例
- 输入输出
- 操作说明
- 来源和证据
- 风险限制
- 启用 / 编辑 / 保留草稿 / 放弃

### 9.4 个人 Skill 库

目标：管理已启用和草稿状态的个人 Skill。

主要区域：

- 搜索
- 分类
- 状态 filter
- Skill 卡片
- 来源追溯
- 最近使用记录
- 归档

## 10. 文案原则

### 10.1 推荐文案

文案要描述能力，不要炫耀 AI。

推荐：

```text
这个网页可以变成「API 接入助手」
它可以根据你的项目栈，生成接入步骤、请求示例和错误排查清单。
```

避免：

```text
AI 发现了一个超强自动化机会！
```

### 10.2 状态文案

```text
正在理解网页
已生成摘要
发现可生成的个人 Skill
已收藏为知识
Skill 草稿已生成
已加入个人 Skill 库
```

### 10.3 降噪文案

```text
以后少推荐这类
不再对此网站推荐
只收藏为知识
```

## 11. 技术落点

### 11.1 现有链路

优先复用：

- `apps/extension`：浏览器采集。
- `captured_source`：保存原始网页事实。
- `page_memory`：保存摘要、主题、实体和搜索文本。
- AI Inbox：展示进入 Didian 的网页卡片。
- Mission / Codex Run：承载用户确认后的深处理和生成任务。
- Atlas：展示记忆、关系和来源追溯。
- Skills：承载 Didian 内部个人 Skill 库。

### 11.2 建议新增能力

- Skill opportunity detector。
- Skill proposal 持久化。
- Personal skill 草稿状态。
- 收藏卡片到 Skill 的来源关系。
- Skill 反馈和静音偏好。
- 局部知识关系查询。

### 11.3 建议目录

```text
server/internal/service/
  memory_enrichment.go
  skill_opportunity.go
  personal_skill_generation.go

server/internal/handler/
  browser_capture.go
  skill_proposal.go
  personal_skill.go

server/pkg/db/queries/
  browser_capture.sql
  skill_proposal.sql
  personal_skill.sql
  knowledge_relation.sql

packages/core/browser-memory/
  types.ts
  queries.ts
  mutations.ts

packages/core/personal-skills/
  types.ts
  queries.ts
  mutations.ts

packages/views/ai-workbench/
  ai-inbox/
  atlas/

packages/views/skills/
  personal-skill-library.tsx
  skill-draft-review.tsx
```

### 11.4 开发命令

```bash
pnpm install --frozen-lockfile
pnpm --filter @didian/views typecheck
pnpm --filter @didian/views test
pnpm --filter @didian/views lint
make start-main FRONTEND_PORT=3002
```

## 12. 安全与质量边界

### 12.1 Always

- 收藏网页正文按不可信输入处理。
- LLM 输出必须过 schema 校验。
- Skill 生成必须保留来源卡片和证据。
- Skill 启用必须经过用户确认。
- 生成失败不能影响原收藏卡片。
- 低置信度页面只进入知识卡，不推荐 Skill。

### 12.2 Ask First

- 新增数据库迁移。
- 新增外部 LLM provider。
- 新增向量数据库或图数据库。
- 修改现有 Skills 公共模型语义。
- 把个人 Skill 变成 workspace 共享 Skill。

### 12.3 Never

- 不在用户未确认时自动启用 Skill。
- 不为所有收藏默认生成 Skill。
- 不把网页大段内容无差别复制进 Skill。
- 不因为 AI 判断失败阻塞收藏成功。
- 不把个人 Skill 默认暴露给团队成员。
- 不在第一版引入不可逆自动化动作。

## 13. 验收标准

### 13.1 收藏卡片

- 用户能收藏技术文档、GitHub repo、教程页面。
- 收藏成功不依赖 AI 生成完成。
- 卡片能展示标题、URL、来源域名、页面类型、摘要状态和 takeaway。
- enrichment 失败时卡片仍可打开，并能重试理解。

### 13.2 Skill 候选

- 技术文档、GitHub repo、教程页面能在高置信度时展示 Skill 候选。
- 论文、普通博客、产品页默认不展示 Skill 候选，除非满足高质量流程信号。
- Skill 候选说明必须包含标题、能力、使用场景、置信度和来源证据。
- 用户可以接受、忽略或降低同类推荐。

### 13.3 Skill 生成

- 用户点击“生成 Skill”后创建个人 Skill 草稿。
- 草稿包含名称、描述、触发示例、输入输出、说明、来源和限制。
- 用户确认后 Skill 进入个人 Skill 库。
- 用户放弃生成时，收藏卡片和知识关系不丢失。

### 13.4 知识关联

- 收藏卡片能看到相关主题、实体、相似收藏和 Skill 候选。
- 已生成 Skill 能回溯来源收藏。
- 局部节点视图最多默认展示一跳关系。
- 每条关键关系都有关系类型和置信度。

## 14. 指标

### 14.1 产品指标

- 收藏到 ready 的成功率。
- 收藏到 Skill 候选展示率。
- Skill 候选接受率。
- Skill 草稿启用率。
- 已启用 Skill 后续被调用次数。
- 用户对“以后少推荐这类”的点击率。
- Skill 候选被忽略率。

### 14.2 质量指标

- Skill 候选人工接受率目标：第一版 >= 20%。
- 低质量推荐投诉或撤销率：第一版 <= 10%。
- 生成 Skill 必须有来源证据比例：100%。
- 收藏成功但 enrichment 失败比例：可见且可重试。
- 已启用 Skill 的来源可追溯比例：100%。

### 14.3 Aha Moment

用户第一次明确感受到：

> 我收藏的不是链接，而是以后能被 Didian 调用的个人能力。

可通过访谈问题验证：

1. 这条 Skill 建议像不像你真的会用的能力？
2. 如果系统不提示，你会自己想到把这个网页做成 Skill 吗？
3. 你愿意让 Didian 继续帮你发现这类能力吗？
4. 你更想让它少推荐但更准，还是多推荐再筛选？

## 15. 版本路线

### V0：PRD 和 Demo Fixture

- 完成 PRD。
- 用 fixture 展示收藏卡片、Skill 候选、Skill Draft、局部关系。
- 不接真实生成。

### V1：真实收藏 + 规则判断

- 真实收藏进入卡片。
- enrichment 生成页面类型、摘要、主题、实体。
- 用规则 + LLM schema 生成 Skill 候选。
- 支持接受 / 忽略 / 少推荐。

### V2：个人 Skill 草稿

- 用户确认后生成个人 Skill 草稿。
- 支持 review、编辑和启用。
- Skill 进入内部个人 Skill 库。
- Skill 能追溯来源卡片。

### V3：Atlas 局部关系

- 收藏、主题、实体、Skill 候选、Skill、Mission 建立轻量关系。
- 卡片详情页展示局部节点关系。
- 支持关系过滤和展开。

### V4：质量学习

- 根据用户反馈调整推荐阈值。
- 对网站、页面类型、Skill 类型做个人偏好。
- 识别重复收藏行为，推荐更稳定的个人能力。

## 16. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Skill 推荐过多 | 用户觉得吵，降低信任 | 高阈值、默认只覆盖三类网页、提供少推荐反馈。 |
| Skill 生成质量不稳定 | 用户启用后不可用 | 草稿 review、来源证据、输入输出结构化、启用前确认。 |
| 网页内容质量低 | 生成无价值 Skill | 页面类型判断和 instruction density 分数控制。 |
| 知识图谱变成装饰 | 好看但不实用 | 第一版只做局部关系和来源追溯。 |
| 与现有 Skills 模型冲突 | 后续迁移复杂 | 先做 personal skill adapter，避免直接改公共语义。 |
| LLM 输出污染数据库 | 数据不可控 | schema 校验、状态机、失败可重试。 |

## 17. 开放问题

1. Didian 内部 Skill 库是否沿用当前 Skills 表，还是新增 personal skill 表再做映射？
2. Skill Draft Review 是否应该作为独立页面，还是收藏详情页里的抽屉？
3. 用户启用 Skill 后，它在 AI Inbox / Mission 中如何被调用和展示？
4. 是否需要为个人 Skill 设置版本号，以支持来源网页更新后的再生成？
5. “乌托邦能力”最终是否需要一个更用户化的正式命名，例如“个人能力”“可复用助手”或“能力卡”？
