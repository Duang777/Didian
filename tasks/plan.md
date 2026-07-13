# 实施计划：AI 资源工作台

## 概览

本计划按 `docs/ai-resource-workbench/01-product-requirements.md` 重写，具体技术落地以 `docs/ai-resource-workbench/02-technical-plan.md` 为准，方案审核和开工顺序以 `docs/ai-resource-workbench/03-implementation-review.md` 为准。产品主线从旧的 Tasks / Resources / Projects / Nodes / Analytics 收敛为五个有独立 AI 行为的主板块：AI Inbox、Missions、Atlas、AI Studio、Autopilot。

第一阶段不重构数据库表名，不删除已有可用 route，不重写 daemon/runtime 执行底座。我们先把用户可见的信息架构、onboarding、导航、核心页面和 demo fixture 切到新产品语义，让产品从模板感变成 AI 原生工作台。底层 `issue`、`agent`、`runtime`、`skill`、`squad` 暂时作为实现细节承载新概念。

## 架构决策

- **五模块优先。** 一级导航只保留 AI Inbox、Missions、Atlas、AI Studio、Autopilot；Nodes、Integrations、Settings、Providers 等放入 System。
- **先改产品语义，再改数据模型。** Mission 先复用 issue；AI Role 先复用 agent；Capability 先复用 skill；Recipe 先复用 squad/workflow；Node 先复用 runtime。
- **用 view model 隔离旧模型。** 在前端建立产品化 view model/fixture/terminology 层，避免到处直接把 issue 文案替换成 Mission 文案。
- **AI 行为必须可见。** 每个主板块都要有明确 AI 行为：理解输入、生成计划、沉淀关系、调配能力、生成策略。
- **MVP 允许 mock，但交互要真实。** AI Inbox 的理解结果、Atlas Collection、Autopilot 运行历史可以先用 fixture/mock，但用户路径必须完整。
- **基础设施降级处理。** 没有本地 daemon、真实浏览器扩展或云盘 API 时，使用 fixture、mock node、mock artifacts 和清晰空状态。
- **旧模块先折叠，不硬删。** Projects、Resources、Agents、Skills、Squads、Runtimes、Usage、Rules 先改归属和导航入口；后续验证稳定后再考虑删除或迁移路由。
- **新增产品路由，兼容旧路由。** 第一版新增 `/ai-inbox`、`/missions`、`/atlas`、`/ai-studio`、`/autopilot`、`/system`，旧 `/issues`、`/inbox`、`/resources` 等路径短期保留，避免 pins、通知、历史链接失效。

## 依赖图

```text
PRD 和术语表
  -> IA Reset / 导航收敛
    -> Onboarding 切到 AI Inbox
    -> AI Inbox 输入与理解 fixture
      -> Mission 创建/队列/详情
        -> Atlas Collection 和 Ask Atlas fixture
        -> Autopilot 从 Mission/Atlas 生成策略
    -> AI Studio 角色/能力/配方模板
  -> System 收纳 Nodes/Integrations/Settings
  -> 验证、文档和 demo 脚本
```

## Phase 0：基线与术语收口

- [ ] 跑一次基线 typecheck/test，记录当前项目健康状态。
- [ ] 建立产品术语表：AI Inbox、Mission、Atlas、AI Role、Capability、Recipe、Autopilot Strategy、System Node。
- [ ] 盘点旧用户可见词：Issue、Agent、Runtime、Skill、Squad、Project、Resource、Usage、Autopilot、Didian Helper。
- [ ] 明确哪些旧词允许作为内部实现名继续存在。

### Checkpoint：基线

- [ ] `pnpm --filter @didian/views typecheck` 结果已记录。
- [ ] 旧术语出现位置有审计清单。
- [ ] 文档明确 Phase 1 不做数据库/后端表名迁移。

## Phase 1：IA Reset 和 Onboarding

- [ ] 主导航改为 AI Inbox、Missions、Atlas、AI Studio、Autopilot。
- [ ] Nodes、Integrations、Providers、Storage、Settings 收入 System。
- [ ] Issues/My Issues 用户可见层改成 Missions 和筛选。
- [ ] Agents/Skills/Squads/Runtimes 的一级入口从主导航移除，转入 AI Studio 或 System。
- [ ] Onboarding 首屏改成 AI Inbox：引导用户丢链接、文本、文件、浏览器标签或一个想法。
- [ ] 清理旧 Didian Helper / 创建 agent / 连接 runtime 才能开始的错位引导。

### Checkpoint：IA Reset

- [ ] 新用户第一屏是 AI Inbox 引导。
- [ ] 一级导航只有五个主模块。
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
- [ ] Mission 详情页重排为 Header、AI Plan、Review Queue、Artifacts、Activity、Related Atlas。
- [ ] 失败和阻塞状态展示 AI 诊断卡片。
- [ ] 保留评论、附件、实时更新等已有协作能力。

### Checkpoint：Missions

- [ ] Mission 队列不再像 issue tracker。
- [ ] Mission 详情优先展示 AI Plan。
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

## Phase 5：AI Studio

- [ ] 将 Agents 页面产品化为 AI Studio 的 Roles 区域。
- [ ] 将 Skills 页面产品化为 Capabilities 区域。
- [ ] 将 Squads/Workflows 产品化为 Recipes 区域。
- [ ] 增加至少 5 个强模板：资源侦探、去重专家、整理助手、研究分析师、失败诊断师、自动化规划师可选其五。
- [ ] 每个模板展示适用输入、使用能力、典型产物、可被哪些 Mission/Autopilot 调用。

### Checkpoint：AI Studio

- [ ] 用户看到的是 AI 角色、能力包、处理配方，而不是 agent/skill/squad 管理台。
- [ ] 模板和 AI Inbox/Missions/Autopilot 语义一致。
- [ ] 技术细节可见但不压过产品用途。

## Phase 6：Autopilot

- [ ] 创建 Autopilot 页面或改造旧 Autopilot/Rules 页面。
- [ ] 自然语言输入目标，生成策略预览卡。
- [ ] 策略卡包含目标、触发、条件、动作、确认要求、范围、最近运行、风险等级。
- [ ] 支持启用/暂停策略。
- [ ] 使用 mock 运行历史展示 Watch、Organize、Clean、Summarize、Diagnose、Recommend 等模式。
- [ ] 从 Mission 完成页或 Atlas Collection 提供“设为 Autopilot”的入口。

### Checkpoint：Autopilot

- [ ] 用户不需要写规则表单，也能得到策略卡。
- [ ] 策略启用前可检查、可解释、可暂停。
- [ ] Autopilot 与 Atlas/Missions 有明确连接。

## Phase 7：System、验证和 Demo 收口

- [ ] System 收纳 Nodes、Integrations、Providers、Storage、Permissions、Workspace Settings。
- [ ] 节点状态只在 System 和 Mission 执行记录中出现。
- [ ] 准备一条端到端 Demo fixture：AI Inbox -> Mission -> Atlas -> Ask Atlas -> Autopilot。
- [ ] 补齐空状态、加载状态、错误状态、权限/无节点降级状态。
- [ ] 更新 README 或产品文档，说明五模块 IA 和旧模型映射。

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
| AI Studio 再次变成 Agent 管理台 | 中 | 模板以角色、能力、配方命名，技术字段放次级。 |
| Autopilot 变成规则表单 | 中 | 自然语言目标优先，规则字段只作为 AI 生成策略卡展示。 |
| 过早改数据库/后端造成回归 | 高 | Phase 1-7 保留 issue/agent/runtime/skill/squad 作为实现细节。 |

## 并行机会

- AI Studio 模板、Atlas fixture、Autopilot mock 策略可以并行准备。
- IA Reset 和 Onboarding 必须先做，否则后续页面会继续沿用旧导航。
- Mission 详情和 Atlas Collection 共享 artifacts/fixture contract，需先约定字段。

## 待确认问题

- 产品名继续叫 Didian，还是换成更贴近迅雷体系的新名称？
- 登录后默认首页是否直接进入 AI Inbox？
- Atlas 第一版只用 fixture，还是从现有 issue attachments/artifacts 推导？
- Autopilot 是否进入 MVP 一级导航，还是作为预览模块？
- App 是否中文优先，英文文案后续补齐？
