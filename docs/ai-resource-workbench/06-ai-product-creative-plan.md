# Didian AI 产品创意方案

## 1. 核心判断

Didian 最有机会成立的方向，不是“给云盘加 AI 问答”，而是做一个 **会工作的资源库**：用户把浏览器标签页、链接、下载线索、笔记和云盘文件丢进来，系统先理解意图，再把任务交给本机 Codex Runtime 执行，最后把结果沉淀成可追问、可复用、可召回的 Atlas。

面向参赛或产品路演时，可以把 Didian 讲成：

> Didian 是浏览器和云盘之间的 AI 资源工作台。它让用户在资料还没变成混乱文件之前，就用本地 Agent 把来源、证据、去重、对比、行动计划和云盘入库一次性处理好。

## 2. How Might We

How might we help high-frequency resource collectors turn chaotic browser and drive material into a structured, traceable, reusable library without forcing them to manually name, tag, dedupe, and summarize every file?

换成中文产品问题：

> 如何帮助高频资料收集用户，把散落在浏览器和云盘里的资料，变成有来源、有结构、有行动价值、以后还能被召回的个人资源工作区？

## 3. 目标用户和 Job

### 主要用户

- 学生：整理课程资料、教程、PDF、项目链接和学习路线。
- 研究者：整理论文、网页、数据集、GitHub 仓库和引用证据。
- 内容创作者：整理选题、脚本素材、参考案例、视频和灵感。
- 产品经理和工程师：整理竞品、开源项目、技术文档、issue、方案比较。
- 云盘重度用户：保存很多资源，但经常找不到、看不懂、用不上。

### Jobs To Be Done

When I am researching a topic across many tabs and files, I want Didian to understand, organize, deduplicate, and summarize the material, so I can reuse it later without rebuilding the context from scratch.

中文表达：

> 当我围绕一个主题打开很多网页、下载资料和云盘文件时，我希望 Didian 自动理解这些资料的关系，并生成一个可以继续工作的资源库，而不是只帮我保存一堆链接。

## 4. 创意方向发散

### 4.1 AI Inbox：把混乱输入变成任务

用户不用先填表、建文件夹、选标签。AI Inbox 接收 URL、文本、文件、浏览器标签组、下载链接、云盘链接或一句自然语言目标。系统输出“我理解你想做什么”，并建议 Mission 标题、处理计划和产物。

差异化：入口不是“新建任务”，而是“丢进混乱输入”。这比传统云盘、收藏夹和任务管理器更贴近真实调研场景。

后续可以把 AI Inbox 扩展成持续收集层：浏览器收藏、下载完成事件、搜索结果页、剪贴板、截图、邮件附件、RSS 订阅和云盘新增文件都可以进入同一个 Inbox。用户不需要记住“这类资料应该从哪个入口导入”，只要 Didian 能识别来源、意图和下一步工作。

### 4.2 Mission Workspace：Agent 的工作现场

每个 Mission 都生成一个 Markdown 文件夹结构，包括 `mission.md`、`sources/`、`evidence.md`、`decisions.md`、`agent-log.md` 和按需生成的 `outputs/`。Codex 不是在聊天框里回答，而是在这个工作区里整理、引用、对比和写文件。

差异化：把 AI 执行过程变成可读、可回放、可继续编辑的文档工作区。

后续 Workspace 可以继续升级为“可协作的 AI 文档现场”：用户选中一段 Markdown 让 Codex 改写、补证据、生成表格；团队成员可以评论某个证据；不同 Runtime 可以接力同一个 Workspace；重要输出可以一键变成模板，供下次 Mission 复用。

### 4.3 Atlas：资源从文件变成记忆

Mission 结束后，资源进入 Atlas。Atlas 不是文件列表，而是资源、合集、来源、证据、摘要、重复关系和后续问题组成的资源图谱。用户以后可以问：“这些资料里哪些适合做 Demo？”、“哪个项目许可证最稳？”、“上次为什么保存这个？”

差异化：把保存行为升级成长期可召回的资源记忆。

后续 Atlas 可以从“资源合集”长成“个人研究记忆”：自动识别主题演化、版本变化、资源过期、许可证风险、相似资料和历史结论冲突。它不仅回答“我保存过什么”，还提醒“这个资料已经过时”“你上次比较过同类项目”“这个结论缺少来源”。

### 4.4 浏览器搜索召回：旧收藏主动回来

用户以后在 Google、Bing、百度或 GitHub 搜索相似问题时，浏览器扩展提示：“你曾经收藏过 3 个相关页面”。这让 Didian 从“被动资料库”变成“主动提醒的浏览器记忆层”。

差异化：召回发生在用户重新产生需求的那一刻，而不是等用户想起来去云盘里搜。

后续召回可以覆盖更多工作场景：在 GitHub issue、Notion、飞书文档、在线课程、论文检索和云盘搜索中提示相关 Atlas 记忆。用户不是进入 Didian 才能找资料，而是在任何资料工作现场都能被 Didian 轻轻拉回旧上下文。

### 4.5 本地 Runtime：让用户已有 AI 工具变成执行力

Didian 不在云端黑盒执行所有事，而是把 Mission 派发给用户本机的 Codex、Claude Code、Cursor Agent 或 OpenCode。系统管理任务、权限、证据和结果，本机 Runtime 负责真正执行。

差异化：用户的浏览器登录态、本地文件、CLI 工具和开发环境留在本机，同时复用已有 Agent 能力。

后续 Runtime 可以变成可调度的个人 AI 执行网络：轻任务由服务端模型处理，深处理交给本机 Codex，代码阅读交给开发目录里的 Agent，下载和归档交给本地 daemon。Didian 不需要自己成为所有 AI 能力，而是成为用户已有 AI 工具的任务编排和记忆层。

### 4.6 后续 Autopilot：从真实重复行为生成策略

当系统观察到用户反复做同类整理，例如“收藏 GitHub 项目后生成对比表”，再建议 Autopilot 策略。第一版不做规则表单，等真实行为足够后再自动提出策略。

差异化：自动化来自真实使用路径，不是让用户先配置一堆规则。

后续 Autopilot 的正确形态不是“规则中心”，而是“把你已经做过三次的事情变成可审阅自动化”。例如：收藏 GitHub 仓库后自动补许可证和 star 趋势；下载课程资料后自动生成学习路线；保存论文后自动提取方法、数据集和局限；看到重复资源时先 dry-run 合并方案，再让用户确认。

## 5. 推荐方向

推荐把第一阶段产品主张收敛为：

> **浏览器资料进云盘前的 AI 处理层。**

这句话比“AI 云盘”“AI 收藏夹”“Agent 平台”都更清楚。它直接解释了 Didian 出现的位置：浏览器和云盘之间。它也解释了为什么需要 AI：因为用户保存资料前，真正缺的是理解、去重、命名、归档、证据和下一步行动。

第一版应该集中火力打穿一条 Demo 主线：

```text
浏览器标签组
  -> AI Inbox 理解资料包
  -> Mission Workspace 生成计划
  -> Codex Runtime 本地执行整理
  -> Review 确认云盘写入
  -> Mock Drive 生成 Markdown 产物
  -> Atlas 可追问和可召回
```

## 6. MVP Scope

### 必须做

- AI Inbox 支持粘贴多个 URL、文本块和浏览器 capture fixture。
- AI 理解面板展示资源类型、用户意图、建议 Mission、建议产物和缺失信息。
- Mission Workspace 展示文件树、Markdown 文档、执行步骤、证据和 Review。
- 本地 Runtime 状态可见，优先展示 Codex Run。
- Mock Drive Adapter 支持创建文件夹、保存链接、写入 Markdown、展示操作日志。
- Atlas 展示 Collection、资源卡、来源证据、重复/相似建议和 Ask Atlas fixture。
- Demo 产物包括 `资源索引.md`、`项目对比表.md`、`可复用清单.md`、`下一步行动.md`。

这些能力要故意做得“窄而完整”：先让一个资料包从浏览器进入 AI Inbox，再经过 Mission、Review、Mock Drive 和 Atlas。只要这个闭环讲通，后续功能就不是额外堆上去，而是从同一条主线自然长出来。

### 后续自然升级

- 从“粘贴链接”升级到浏览器扩展一键捕获当前标签组、选区、页面链接和搜索结果。
- 从“Mock Drive 写入”升级到 Local Drive、浏览器辅助云盘、官方云盘 API 和多云盘 Adapter。
- 从“静态 Markdown 产物”升级到可编辑 Workspace、AI 局部改写、证据补全、团队评论和版本历史。
- 从“Ask Atlas fixture”升级到带来源引用、冲突提示、过期提醒和跨 Collection 比较的资源问答。
- 从“单次 Mission”升级到重复行为识别、dry-run Autopilot、定期刷新资料包和策略推荐。
- 从“资源整理”扩展到学习路线生成、竞品监控、论文综述、开源选型、素材脚本、下载后自动归档等垂直场景。

### 暂不做

- 不做完整云盘产品。
- 不依赖真实迅雷云盘 API。
- 不做破坏性云盘操作：删除、覆盖、批量移动。
- 不把 Agents、Skills、Squads 做成主导航。
- 不把 Autopilot 放进 MVP 第一屏。
- 不承诺自动控制所有网页或下载所有资源。
- 不做完整 RAG 平台和复杂知识库配置。
- 不把后续升级包装成第一版承诺；第一版只验证主线是否成立。

## 7. 核心 Demo 场景

演示主题：

> 整理当前标签组里的 AI Agent 项目资料到云盘，重复的不要保存，并生成项目对比表和可复用清单。

输入样例：

- browser-use GitHub 页面。
- Stagehand 文档或 GitHub 页面。
- OpenCode GitHub 页面。
- nanobrowser GitHub 页面。
- Cult UI 开源组件页面。
- 一段用户备注：“重点看浏览器自动化、许可证、可复用前端。”

输出样例：

- Mock Drive 目录：`参赛项目/AI Agent 调研/`
- `资源索引.md`
- `项目对比表.md`
- `可复用前后端清单.md`
- `下一步行动.md`
- Atlas 问答：“哪个浏览器 Agent 项目最适合接入 Didian？”

## 8. 关键假设和验证

- [ ] 用户愿意把浏览器标签组交给 AI 理解。验证方式：5 个目标用户看 Demo，是否能立刻说出自己的使用场景。
- [ ] “保存前整理”比“保存后问答”更有记忆点。验证方式：对比两版话术，看用户复述时是否能说出差异。
- [ ] 本地 Codex Runtime 是优势而不是理解负担。验证方式：让用户描述它带来的好处，是否能说出隐私、本地环境、已有工具复用。
- [ ] Markdown Workspace 能让 AI 执行更可信。验证方式：观察用户是否会点击 evidence、agent-log、outputs。
- [ ] Mock Drive 足以支撑参赛 Demo。验证方式：演示中评审是否追问真实云盘 API，若追问，Adapter 解释是否能消解疑虑。

## 9. 评价标准

### 用户价值

强。痛点是高频且真实的：资料保存、去重、来源丢失、后续无法复用。Didian 要避免变成“又一个收藏夹”，必须让用户在首次 Demo 中看到结构化产物和可追问 Atlas。

### 可行性

中高。仓库已经具备 daemon/runtime/task queue、AI workbench 前端模型、Mock Drive 方向和 Markdown workspace 思路。风险主要在浏览器采集质量、AI 输出稳定性、真实云盘接入和 Demo 完整度。

### 差异化

高。相比云盘 AI，它从浏览器发现阶段开始；相比收藏工具，它能生成 Mission 和产物；相比 Agent 平台，它围绕资源工作流而不是 Agent 配置；相比 RAG 知识库，它强调本地执行、证据、Review 和入库。

## 10. 讲给评审的一句话

> Didian 不是一个会聊天的网盘，而是一个会工作的资源中转站：它在资料进入云盘之前，用本地 Codex 把混乱标签页整理成有证据、有目录、有产物、以后还能被召回的资源库。
