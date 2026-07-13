# PRD：AI 资源工作台

## 0. 前提假设

1. 产品基于当前 Didian 代码库继续演进，优先 Web 工作台体验。
2. 第一版优先做出有记忆点的 AI 产品闭环，不追求完整下载器、完整云盘或完整知识库。
3. 现有 `issue`、`agent`、`runtime`、`skill`、`squad` 等底层模型短期保留，先作为实现细节承载新产品语义。
4. 目标用户不是基础设施管理员，而是希望把混乱资源丢进产品后，得到结构化成果、可追问知识和可持续自动化的人。
5. AI 必须成为产品的组织能力：理解输入、规划任务、执行处理、解释过程、沉淀关系，而不是只放在聊天框或配置面板里。

## 1. 产品愿景

做一个 AI 原生的资源工作台：用户可以把链接、文件、浏览器标签、笔记、下载线索、研究问题、截图或模糊意图丢进来，Codex Runtime 理解用户想做什么，把它变成 AI Mission，在本地执行、留下证据和产物，并沉淀为可复用的 Atlas。

产品不应该像“下载管理器 + AI”，也不应该像“Agent 平台 + 资源插件”。它应该像一个会理解资源、组织资源、执行资源任务并长期记忆的 AI 操作台。

一句话定位：

> 一个能理解混乱资源、调用 Codex Runtime 执行任务、沉淀资源记忆的 AI 资源工作台。

## 2. 为什么要收敛成 Runtime-first 主线

上一版模块设计偏企业后台：Tasks、Resources、Projects、Nodes、AI Assistants、Capabilities、Workflows、Rules、Analytics、Settings。它完整，但不锐利，容易变成“什么都有，但每个模块都像管理页”。

新方向把产品收敛成一条有明确 AI 行为的主线：

```text
Capture / AI Inbox  ->  Codex Run / Mission  ->  Memory / Atlas  ->  System
       输入                    执行现场                    记忆沉淀          运行状态/高级配置
```

这条主线更容易被用户理解：

1. 我把东西丢进 AI Inbox。
2. AI 理解后创建 Mission。
3. Mission 调用 Codex Runtime 按计划执行，并持续展示日志、证据和产物。
4. 结果进入 Atlas，变成可查、可追问、有关联的资源记忆。
5. System 只在需要时解释 Runtime、Provider、权限和高级配置。

Agents、Skills、Squads、Autopilot 等能力仍然重要，但第一版不把它们做成用户默认面对的主板块。它们是 Codex Run 的执行配置、诊断入口和后续自动化能力，而不是产品故事本身。

## 3. 目标用户

### 3.1 主要用户

- 研究者：收集网页、论文、GitHub 仓库、视频和笔记。
- 学生：整理课程、教程、PDF、学习路线和资料包。
- 内容创作者：收集选题、脚本、灵感、素材链接和参考案例。
- 产品和工程团队：整理竞品资料、开源项目、技术文档、issue、方案比较。
- 高频收藏用户：保存很多东西，但经常忘记为什么保存、保存后也很难再利用。

### 3.2 核心痛点

- 保存很容易，事后理解很难。
- 链接、文件、笔记、浏览器标签和下载线索分散在不同系统。
- 用户经常忘记一个资源当时为什么值得保存。
- 重复、低质量、失效资源不断堆积。
- 传统资源管理器要求用户手动打标签、建文件夹、命名、总结。
- AI 聊天能回答问题，但很多时候不会把答案沉淀成长期结构。

## 4. 产品原则

1. **输入可以混乱，输出必须结构化。** 用户不应该为了使用产品而先整理一遍资料。
2. **AI 先解释理解，再开始行动。** 系统要展示“我认为你想做什么”。
3. **每个 Mission 都有计划。** AI 工作不能只是一个转圈 loading，而要有阶段、证据、产物和阻塞点。
4. **完成不是结束，而是进入 Atlas。** Mission 结果必须成为可复用的资源、合集、摘要、关系或策略。
5. **自动化必须来自真实重复行为。** Autopilot 不在第一版主导航里抢故事，等 capture/run/memory 路径跑通后再出现。
6. **基础设施不抢主线。** 节点、模型、集成、存储、权限都放到 System，只有在解释 Mission 时才露出。

## 5. 信息架构

### 5.1 一级导航

```text
AI Inbox       智能收件箱
Missions       AI 任务
Atlas          资源图谱
System         系统
```

### 5.2 二级/系统导航

```text
System         系统
  Nodes        节点 / 本地 Runtime
  Integrations 集成
  Providers    AI Provider
  Storage      存储 / Adapter
  Permissions  权限
  Workspace    工作区设置
```

### 5.3 旧模块去向

| 旧模块 | 新归属 | 原因 |
| --- | --- | --- |
| Issues | Missions | Issue 像项目管理，不像 AI 执行单元。 |
| My Issues | Missions 筛选 | “我的”是过滤条件，不应成为一级模块。 |
| Resources | Atlas | 普通资源列表没有差异化，AI 图谱更有产品记忆点。 |
| Projects | Atlas Collections | 项目、分类、合集概念重叠，先统一为 Collection。 |
| Agents | System / Advanced Roles | 第一版不做主板块；只在诊断或高级配置时露出。 |
| Skills | System / Advanced Capabilities | Skill 是实现细节，普通用户先看 Codex Run 用了什么能力。 |
| Squads | System / Later Recipes | 用户价值是可复用处理配方，但第一版不做独立配方管理。 |
| Runtimes | System Nodes | 节点是基础设施，不是主业务目标。 |
| Usage | 内嵌洞察 / System | 成功率、耗时、成本等应嵌入 Mission/System。 |
| Rules | Later Autopilot Strategies | 等真实重复行为足够后再把规则升级为后台策略。 |

## 6. 核心产品闭环

```text
用户把混乱输入丢进 AI Inbox
  -> AI 解释输入意图并建议 Mission
  -> 用户确认或微调 Mission
  -> Mission 通过 Codex Runtime 按 AI 计划执行
  -> 需要决策时进入 Review
  -> 结果沉淀为 Atlas 的资源、合集、摘要、关系和证据
  -> 用户可以追问 Atlas；重复模式后续可升级为 Autopilot
```

## 7. 模块需求

## 7.1 AI Inbox / 智能收件箱

### 定位

AI Inbox 是万能输入口，替代传统 “New Task / New Issue” 表单。

用户可以丢进来 URL、文本、Markdown、文件、浏览器标签组、截图、网盘链接、磁链、研究问题或一句模糊指令。系统的任务不是立刻保存，而是先理解这些输入意味着什么工作。

### 用户任务

- 粘贴一组链接，让 AI 判断应该怎么整理。
- 导入浏览器标签组，不需要手动命名和打标签。
- 输入“帮我找并整理 AI Agent 入门资料”这类自然语言需求。
- 把输入保存到 Atlas，或者创建 Mission。
- 让 AI 重新理解、拆分为多个 Mission，或暂时放入收件箱。

### 功能要求

- 万能输入框：支持 URL、纯文本、Markdown、文件占位、浏览器 capture fixture。
- 输入卡片：每条输入显示类型、标题、来源、置信度。
- AI 理解面板：展示识别出的资源类型、用户意图、建议 Mission 标题、建议产物、缺失信息。
- 操作按钮：创建 Mission、保存到 Atlas、重新理解、拆分 Mission、丢弃。
- 空状态：强调“把链接、文件、标签页或一个想法丢进来”，不要像表单创建页。

### AI 行为

AI 需要把输入归类为：

- 研究资料包
- 学习路线
- 下载/收集
- 对比分析
- 去重整理
- 摘要生成
- 监控来源
- 失败诊断
- 仅归档

AI Inbox 阶段不执行高风险动作，只能提出 Mission、Atlas 保存或补充信息建议。

### 验收标准

- 用户能粘贴至少一个 URL 或文本块。
- UI 在创建 Mission 前展示 AI 的理解结果。
- 用户能编辑建议标题并创建 Mission。
- 空状态不是“创建 issue”，而是“丢进混乱输入”。

## 7.2 Missions / AI 任务

### 定位

Missions 是 AI 规划和执行工作的核心单元，替代 Issues/Tasks。

Mission 不只是状态行，而是包含目标、AI 理解、执行计划、事件流、Review 决策、产物和 Atlas 关联的一组工作记录。

### 用户任务

- 查看 AI 正在做什么。
- 理解复杂任务处于哪个阶段。
- 审核 AI 建议，确认是否接受输出。
- 重试、暂停、重新分派、归档 Mission。
- 在失败时查看 AI 诊断和建议。

### Mission 状态

| 状态 | 含义 |
| --- | --- |
| Understanding / 理解中 | AI 正在理解输入和目标。 |
| Planned / 已规划 | AI 已生成计划，等待执行或确认。 |
| Running / 执行中 | AI、节点或系统 worker 正在处理步骤。 |
| Review / 待确认 | AI 需要用户做决策。 |
| Completed / 已完成 | 结果已被接受或保存。 |
| Needs Attention / 需要介入 | 出错、缺权限、缺节点或需要用户补充信息。 |

### 详情页结构

1. Mission Header：标题、目标、状态、置信度、负责人。
2. AI Plan：步骤、状态、证据、产物、阻塞点。
3. Review Queue：等待用户确认的决策。
4. Artifacts：摘要、表格、资料包、索引、报告。
5. Activity：日志、评论、重试、节点执行记录。
6. Related Atlas：由此 Mission 创建或更新的资源、合集、主题。

### AI 行为

- 非简单任务必须展示计划。
- 失败必须解释成人能理解的原因。
- 阻塞时给出下一步建议。
- 产物必须能追溯来源。
- 不可逆或外部写入操作必须先进入 Review。

### 验收标准

- 用户能看到 Mission 队列。
- 用户能打开 Mission 详情。
- 详情页优先展示 AI Plan，而不是传统评论流。
- 失败/阻塞 Mission 展示 AI 诊断卡片。
- 完成 Mission 能关联 Atlas 产物。

## 7.3 Atlas / 资源图谱

### 定位

Atlas 是产品的长期记忆，替代 Resources 和 Projects。

Atlas 不是文件列表，而是资源、主题、合集、关系、摘要和证据组成的活地图。它回答“这些资源是什么、有什么关系、为什么值得保存、以后如何复用”。

### 用户任务

- 浏览 AI 自动组织的资源合集。
- 理解某个资源是什么、为什么重要、来自哪里。
- 查看重复、相似、版本关系。
- 对一个合集或主题继续追问。
- 复用历史 Mission 的产物。

### 核心对象

| 对象 | 定义 |
| --- | --- |
| Resource | 链接、文件、笔记、网页、视频、仓库、文档、磁链或生成产物。 |
| Collection | AI 围绕主题或目标组织的一组资源。 |
| Topic | AI 从资源中提取出的主题。 |
| Relationship | 资源之间的重复、版本、来源、摘要、引用、相似关系。 |
| Evidence | 支撑 AI 判断的来源片段或元数据。 |

### 视图

- Collections：按 AI 生成主题展示合集卡片。
- Map：主题簇和关系，第一版用分组布局，不急着做复杂图画布。
- Duplicates：重复/相似资源审核台。
- Timeline：资源进入和演化时间线。
- Ask Atlas：带来源引用的资源问答。

### AI 行为

- 生成标题和摘要，但保留原始元数据。
- 建议 Collection 和 Topic。
- 检测重复和相似资源。
- 回答问题时引用来源。
- 保持 provenance 可见。

### 验收标准

- 完成的 Mission 能创建或更新 Collection。
- 用户能查看 Resource 的摘要、来源和关联资源。
- 用户能向 Collection 提问并得到带引用回答。
- 重复资源建议需要用户确认后才能合并、隐藏或删除。

## 7.4 Advanced AI Configuration / 高级 AI 配置

### 定位

Advanced AI Configuration 是 Codex Runtime 的高级配置和诊断入口，合并 Agents、Skills、Squads、Workflows，但不进入第一版主导航。

普通用户不是管理底层 agent，而是在 Mission 里看到 Codex Run 实际使用了哪些角色、能力包和处理配方。只有当用户需要诊断或深度自定义时，才从 System / Advanced 进入这些配置。

### 结构

### Roles / AI 角色

- Resource Detective / 资源侦探：识别资源类型、元数据和用户意图。
- Dedup Expert / 去重专家：识别重复、版本和相似资源。
- Organizer / 整理助手：创建合集、命名、生成索引。
- Research Analyst / 研究分析师：对比资源并生成 brief。
- Failure Diagnostician / 失败诊断师：解释失败下载、坏链、缺权限。
- Automation Planner / 自动化规划师：把自然语言目标变成 Autopilot 策略。

### Capabilities / 能力包

- 网页正文提取
- 链接分类
- 元数据提取
- OCR
- 摘要生成
- 重复检测
- 主题聚类
- 引用生成
- 下载诊断
- 策略生成

### Recipes / 处理配方

- 研究资料包配方
- 学习路线配方
- 课程资源整理配方
- 开源项目对比配方
- 失败资源诊断配方
- 每周资源摘要配方

### 验收标准

- 第一版不新增独立 AI Studio 一级导航。
- Mission 详情能展示当前 Codex Run 实际使用的 runtime/agent/profile/skill bundle。
- System / Advanced 可链接到现有 Agents、Skills、Squads 兼容页面。
- 后续有真实自定义需求时，再把 Roles、Capabilities、Recipes 做成独立高级页面。

## 7.5 Later Autopilot / 后续自动驾驶

### 定位

Autopilot 是后续的持续自动工作模式，替代 Rules/Automation，但不进入第一版主导航。

第一版先把 capture、Codex Run、Atlas memory 的真实路径跑通，并记录用户反复执行的动作。等真实重复行为足够后，AI 再把它们转成可检查、可暂停、可确认的策略建议。

### 用户任务

- 让某类资源持续保持整理。
- 监控一个来源或主题。
- 周期生成摘要、学习计划或资源报告。
- 定期清理重复、失效、低质量资源。
- 自动诊断失败 Mission。
- 查看 AI 最近做了什么，必要时暂停。

### 模式

| 模式 | 示例 |
| --- | --- |
| Watch / 监控 | 监控某个来源或主题的新资源。 |
| Organize / 整理 | 自动分类、命名、放入合集。 |
| Clean / 清理 | 查找重复、失效链接、低质量资源。 |
| Summarize / 总结 | 定期生成摘要、学习计划或周报。 |
| Diagnose / 诊断 | 检查失败 Mission 并提出修复建议。 |
| Recommend / 推荐 | 根据 Atlas 活动推荐下一步动作。 |

### 策略卡片字段

- 目标
- 触发条件
- 过滤条件
- 动作
- 需要确认的操作
- 作用范围
- 最近运行
- 下次运行
- 最近成果
- 风险等级

### AI 行为

- 把自然语言目标转成策略卡片。
- 解释策略会做什么、不会做什么。
- 高影响动作必须要求确认。
- 把最近执行记录总结成人能读懂的说明。

### 验收标准

- 第一版不新增 mock Autopilot 页面。
- AI Inbox、Mission、Atlas 能记录可用于后续策略建议的真实动作和确认点。
- 旧 Autopilot 页面如果保留，只作为高级兼容入口。
- 后续启用策略前必须有 dry-run、确认门和运行历史。

## 7.6 System / 系统

### 定位

System 放基础设施和高级配置，不和 AI Inbox / Missions / Atlas 主线争夺注意力。

### 内容

- Nodes / 本地 runtime
- Integrations / 集成
- AI Providers / 模型与 provider
- Storage / 存储与 adapter
- Permissions / 权限
- Notifications / 通知
- Workspace Settings / 工作区设置
- Developer Diagnostics / 开发者诊断

### 验收标准

- Nodes 可以从 System 进入，也可以在 Mission 详情的执行记录里露出。
- Provider 或集成失败时可以诊断，但不把 Nodes 做成一级导航。

## 8. 开源项目借鉴

产品应该借鉴模式，而不是照搬模块。

| 项目 | 地址 | 可借鉴 | 不照搬 |
| --- | --- | --- | --- |
| Dify | https://github.com/langgenius/dify | Agentic workflow、应用/工作流分离、工具编排。 | 不把 builder 作为默认体验，用户先丢资源，不先搭流程。 |
| n8n | https://github.com/n8n-io/n8n | Trigger/action、自动化模板、运行记录可检查。 | 不让普通用户面对节点图和集成管线。 |
| Flowise | https://github.com/FlowiseAI/Flowise | 可视化 AI flow、可复用 chain。 | 不要求用户手动搭 LLM chain。 |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | Local-first workspace、知识库、agent 体验。 | 不变成普通 chat-over-docs。 |
| Open WebUI | https://github.com/open-webui/open-webui | 多 provider 设置、友好的 AI 工作台体验。 | 不让 chat 成为唯一产品中心。 |
| RAGFlow | https://github.com/infiniflow/ragflow | 文档解析、RAG、引用质量、agent + retrieval。 | 第一版不做企业级文档流水线复杂度。 |
| Karakeep | https://github.com/karakeep-app/karakeep | Bookmark-everything、AI tag、全文搜索。 | 不停在收藏夹，AI Inbox 要创建 Mission。 |
| Linkwarden | https://github.com/linkwarden/linkwarden | 收藏、归档、协作、网页保全。 | 不以手动文件夹/项目作为核心。 |
| ArchiveBox | https://github.com/ArchiveBox/ArchiveBox | URL ingestion 和网页保存思路。 | 不做纯归档工具，归档只是能力之一。 |
| nanobrowser | https://github.com/nanobrowser/nanobrowser | 浏览器侧 AI 自动化、多 agent web workflow。 | MVP 不承诺复杂浏览器控制，先做 capture 和确认。 |
| claude-obsidian | https://github.com/AgriciDaniel/claude-obsidian | 丢入任意来源，AI 自动整理成知识图谱。 | 不绑定 Obsidian 或纯 Markdown。 |
| swarmvault | https://github.com/swarmclawai/swarmvault | Local-first LLM wiki、知识图谱、agent memory。 | 不把 memory 基础设施直接暴露给用户。 |

### 借鉴结论

1. Capture 类产品赢在快速接受混乱输入。
2. RAG 产品常常停在问答，Atlas 要解决长期结构沉淀。
3. Workflow 工具强大但吓人，Autopilot 要生成策略而不是让用户搭图。
4. Agent 平台容易暴露太多机器感，AI Studio 应展示角色、能力、配方。
5. Bookmark/archive 产品偏被动，Missions 让资源处理变主动。

## 9. MVP 范围

### Must Have

- 一级导航：AI Inbox、Missions、Atlas、System。
- AI Inbox 万能输入和 mock/启发式理解结果。
- 从 AI Inbox 创建 Mission。
- Mission 队列和 Mission 详情，详情包含 Codex Run 执行现场：Inputs、Plan、Activity、Evidence、Review、Outputs。
- Atlas Collection 视图，能展示 Mission fixture 生成的资源。
- System 入口承载 Runtime、Nodes、Integrations、Settings、Advanced。

### Should Have

- Ask Atlas：基于 fixture 的带引用回答。
- Mission Review Queue。
- Atlas 重复资源建议。
- 失败 Mission 的 AI 诊断卡片。
- 浏览器 capture fixture 导入。
- Mission 详情展示 Runtime 在线/离线状态和诊断入口。

### Could Have

- 真实浏览器扩展采集。
- Mock Drive 写入预览。
- 本地文件夹导出。
- 真实 daemon/runtime 执行。
- 基于真实事件的 Autopilot 策略建议。

### MVP 不做

- 完整下载器 UI。
- 完整云盘替代品。
- 复杂可视化 workflow builder。
- 图数据库。
- 把数据库表从 issue/agent/runtime/skill 重命名为新产品对象。
- Nodes 作为一级模块。
- AI Studio 作为一级模块。
- Autopilot 作为一级模块或 mock 策略页。
- 传统 Usage 大报表。
- 复杂规则编辑器。

## 10. 成功指标

### 产品成功

- 新用户 60 秒内理解产品主循环。
- 第一屏鼓励输入，而不是配置。
- AI 输出以理解、计划、执行日志、证据、摘要、关系和产物形式可见。
- 完成的工作能在 Atlas 中继续复用。
- 一级导航只有 AI Inbox、Missions、Atlas、System，而不是十几个管理模块。

### Demo 成功

- 用户把一组链接或 fixture 丢进 AI Inbox。
- AI 给出 Mission 标题、理解和计划。
- Mission 详情展示进度、产物和 Review 决策。
- Mission 详情展示 Codex Run 的计划、日志、证据和产物。
- 完成 Mission 后生成 Atlas Collection。
- 用户向 Atlas 提问并得到带引用回答。

### 工程成功

- 现有 issue/agent/runtime 基础设施仍可用。
- 用户可见术语足够集中，避免新旧概念混用。
- 旧模块先折叠或隐藏，不急着删除可用 route。
- 触及包的 typecheck 通过。

## 11. 现有模型映射

| 产品对象 | 第一版实现方式 |
| --- | --- |
| Mission | 复用现有 Issue，增加产品化 view model。 |
| AI Role | 复用现有 Agent，第一版作为 System / Advanced 兼容入口。 |
| Capability | 复用现有 Skill，第一版只在 Codex Run 详情或高级配置中露出。 |
| Recipe | 复用现有 Squad/Workflow 概念，后续再产品化。 |
| Node | 复用现有 Runtime。 |
| Atlas Resource | 先用前端 fixture/view model，后续再建 schema。 |
| Autopilot Strategy | 后续基于真实 capture/run/memory 行为生成，不进入第一版核心模型。 |

## 12. 阶段交付

### Phase 1：IA Reset

- 一级导航改成 AI Inbox、Missions、Atlas、System。
- Nodes、Settings、Integrations 收进 System。
- Issues 用户可见层改成 Missions。
- Onboarding 改成 AI Inbox 首次引导。

### Phase 2：AI Inbox

- 万能输入页。
- Mock 理解引擎。
- 创建 Mission 的交接。
- 空、加载、错误状态。

### Phase 3：Missions

- Mission 队列。
- 带 Codex Run 执行现场的详情页。
- Review 卡片。
- 失败诊断卡片。

### Phase 4：Atlas

- Collection 视图。
- Resource 卡片。
- 关联资源和重复建议。
- Ask Atlas fixture 引用回答。

### Phase 5：System / Advanced

- Runtime/Nodes 状态。
- Provider、Integrations、Settings 入口。
- Agents、Skills、Squads 高级兼容入口。
- Mission 详情到 System 的诊断跳转。

### Phase 6：Later Autopilot

- 基于真实 capture/run/memory 行为识别重复模式。
- 从重复模式生成策略建议。
- Dry-run、确认门和运行历史。
- 旧 Autopilot API 的映射和迁移。

## 13. 待确认问题

1. 产品名继续叫 Didian，还是换成更贴近迅雷体系的名称？
2. 登录后默认首页是否直接进入 AI Inbox？
3. Atlas 第一版只用 fixture，还是从现有 issue attachments/artifacts 推导？
4. Autopilot 后续从哪些真实用户动作中生成策略建议？
5. App 文案是否中文优先，英文作为后续补齐？

## 14. 推荐决策

采用以下 Runtime-first 结构作为第一版产品方向：

```text
AI Inbox
Missions
Atlas
System
```

不要继续扩展旧的后台式模块地图。每个主模块都必须有独特 AI 行为：

- AI Inbox 理解混乱输入。
- Missions 通过 Codex Runtime 规划、执行并展示证据。
- Atlas 记忆并连接产物。
- System 承载 Runtime 状态、Provider、Settings 和高级配置。

AI Studio 和 Autopilot 是后续/高级能力，不进入第一版主导航。
