# PRD: Atlas Native Capabilities

Date: 2026-08-01
Status: Draft

## 0. 前提假设

1. 这不是一个普通收藏页，而是 Didian 的知识与能力总入口。
2. 用户不只想“存住信息”，还想让本地 Codex 能直接做事。
3. 现有 `Skill` 仍然作为内部实现名保留，产品上可以继续使用“能力 / 能力库 / 能力方向”等更自然的说法。
4. Atlas 第一版优先服务个人工作区，但设计上要允许后续扩展到团队共享、知识路由和自动化建议。
5. 本 PRD 不复刻开源项目源码，只借鉴公开产品形态、信息架构和用户预期。

## 1. 产品愿景

Atlas 不是“资源列表页”，而是 Didian 的长期记忆与能力路由层。

用户把网页、收藏、Mission、证据、结论、生成过的能力、使用记录都放进 Atlas 后，Atlas 应该回答三个问题：

1. 这是什么？
2. 它和什么有关？
3. 我下一步可以让 Codex 做什么？

一句话定位：

> Atlas 是 Didian 的知识图谱 + 能力发射台 + 证据问答面板。

Atlas 的目标不是把页面堆成图，而是让用户从“看见资源”直接走到“调用能力、形成决策、沉淀结果”。

## 2. 这页真正要做什么

Atlas 页面需要同时承担三种角色：

### 2.1 资源图谱

- 展示 Collection、Resource、Mission、Skill、Evidence 之间的关系。
- 让用户知道某个结论从哪里来。
- 让用户能从一个主题跳到相关资源、相关 Mission、相关能力。

### 2.2 能力入口

- 展示一组内置能力卡片，而不是只有收藏列表。
- 这些内置能力可以直接由本地 Codex 完成，不需要用户先创建 Skill。
- 这些能力应该是用户一眼能懂、马上想点的动作。

### 2.3 证据问答

- 用户可以直接问 Atlas 某个主题、某组收藏、某条 Mission 的来源和结论。
- 回答必须带证据引用，而不是只给一段“聪明摘要”。

## 3. 用户与任务

### 3.1 主要用户

- 个人 builder：收藏很多网页，后续希望把这些资源变成可复用的能力、路线和结论。
- 研究者 / 学习者：希望 Atlas 帮他把资料串成路径，而不是让他自己翻收藏夹。
- 重度 Codex 用户：希望看到自己已经让 Codex 做过什么、哪些知识反复被用到。

### 3.2 核心任务

- 找到和某个主题相关的资源。
- 判断某个收藏值不值得沉淀成能力。
- 从一组收藏直接发起 Mission。
- 查看某个能力被哪些 Mission 使用过。
- 通过证据链回溯一个结论是怎么来的。

## 4. 产品原则

1. **Atlas 是行动入口，不是静态墙。** 看见节点之后，用户应该能直接继续做事。
2. **能力优先于收藏形式。** 收藏只是输入方式之一，能力是输出方式之一。
3. **证据优先于感觉。** 所有结论都要能回到资源、收藏或 Mission。
4. **内置能力必须可感知。** 用户不应该只看到“收藏成功”，而看不到 Didian 还能直接帮他分析、比较、规划、生成。
5. **默认给用户主动权。** 可以推荐，但不能替用户把复杂操作静默做完。
6. **空状态也要有价值。** 即使 Atlas 里还没很多数据，页面也应该能展示可直接调用的内置能力。

## 5. 开源灵感

下面这些开源项目不是要复刻，而是给 Atlas 的功能边界、信息架构和交互感找参照。

| 项目 | 值得借鉴的点 | Atlas 可以吸收什么 |
| --- | --- | --- |
| [Karakeep](https://github.com/karakeep-app/karakeep) | 自动标签、全文搜索、自动抓取标题/描述/图片、bookmark-everything 的产品心智。 | Atlas 的资源卡应天然带摘要、信号和搜索入口；收藏后不能只变成“一个 URL 存档”。 |
| [Linkwarden](https://github.com/linkwarden/linkwarden) | 全页归档、协作式 bookmark、RSS、注释、pin。 | Atlas 的 Collection 要能保留网页快照、注释和重要资源固定入口。 |
| [ArchiveBox](https://github.com/archivebox/archivebox) | durable web archiving、provenance、多个归档格式。 | Atlas 需要强调“来源可靠”和“可追溯”，而不是只存一段摘要。 |
| [Khoj](https://github.com/khoj-ai/khoj) | second brain、agents、跨文档和网页检索、自动化。 | Atlas 的问答入口应该能把用户从资料检索带到行动建议。 |
| [OpenHands](https://github.com/OpenHands/openhands) | agent canvas、现实工程任务、issue 分解成可执行工作。 | Atlas 的“Plan / Compare / Generate”类能力可以借鉴这种任务化心智。 |
| [Stagehand](https://github.com/browserbase/stagehand) | browser agent + code 的组合，兼顾灵活和可维护。 | Atlas 的 built-in capabilities 里应有“分析网页 / 拆解网页 / 交给本地 agent 继续做”的入口。 |
| [browser-use](https://github.com/browser-use/browser-use) | 让 agent 像人一样操作浏览器。 | Atlas 作为入口页，可以把浏览器内容变成可执行任务，而不是只做收藏。 |
| [Open WebUI](https://github.com/open-webui/open-webui) | self-hosted AI platform、agents、workflow 的组合入口。 | Atlas 需要一个“能力发射台”的感觉，而不是单独 chat 或单独库。 |

### 5.1 灵感结论

- Karakeep / Linkwarden / ArchiveBox 说明：用户能接受“收藏 + 归档 + 搜索”，前提是保存后能立刻看见价值。
- Khoj / OpenHands / Open WebUI 说明：用户也接受“直接让 AI 做事”，前提是入口清楚、结果可追踪。
- Stagehand / browser-use 说明：浏览器本身就是最重要的输入面和执行面。

Atlas 应该把这三种心智合在一起：

```text
收藏 -> 记忆 -> 证据 -> 能力 -> 行动
```

## 6. 信息架构

### 6.1 Atlas 首页应该出现什么

1. 顶部：主题搜索 + 问 Atlas 输入。
2. 中部：Collection / Resource 关系视图。
3. 右侧或下方：内置能力区。
4. 底部：最近使用、最近生成、最近关联的 Mission / Skill。

### 6.2 Atlas 内置能力区

第一批建议做成 5-7 个常驻能力，不依赖用户先创建 Skill：

- **Analyze**：读一个网页 / Collection / Mission，判断它是什么、值不值得沉淀、适合什么方向。
- **Plan**：把一组资源拆成 Mission 草稿，生成下一步执行建议。
- **Compare**：比较两个资源、两个工具、两个方案的差异和取舍。
- **Connect**：找出相关收藏、相关 Mission、相关 Skill、相关证据。
- **Summarize**：把某个 Collection 或主题线总结成可追问的结构化结论。
- **Generate**：从资源直接生成能力方向、能力草稿、Mission 草稿。
- **Inspect**：检查当前 workspace 的状态，告诉用户缺什么、重复了什么、哪里值得继续深挖。

这些能力不是“功能按钮装饰品”，而是 Atlas 的默认工作方式。

## 7. 核心体验

### 7.1 从收藏到 Atlas

1. 用户收藏网页。
2. Didian 先做轻量 enrichment，给出摘要、主题、证据和可复用信号。
3. 如果页面适合沉淀成能力，AI Inbox 会提示。
4. 用户点击后，可直接走到能力方向确认或 Mission 草稿。
5. 成功后，Atlas 里可看见这个资源进入了哪条知识线。

### 7.2 从 Atlas 到 Mission

1. 用户在 Atlas 里看到一个主题或资源簇。
2. 选择“Plan”或“Generate Mission”。
3. Atlas 生成一个 Mission 草稿，并说明用到哪些资源和证据。
4. 用户确认后，Mission 进入执行。

### 7.3 从 Atlas 到 Skill

1. 用户在 Atlas 中发现一类重复任务。
2. Atlas 提示它可以沉淀成能力。
3. 用户确认方向后，本地 Codex 生成能力并写入能力库。
4. Atlas 保留来源、证据和后续使用记录。

## 8. Atlas 数据形态

Atlas 第一版不需要做成重型图数据库，但需要有明确对象：

- **Collection**：一个主题或一组资源。
- **Resource**：具体网页、文档、repo、论文或其他内容。
- **Evidence**：支撑结论的摘录、句子、截图或结构化信号。
- **Relation**：资源之间的相关、重复、引用、演化、包含关系。
- **Capability**：从资源中沉淀出来的可复用能力。
- **Mission Link**：这个资源或能力被哪些 Mission 使用过。

### 建议保留的元数据

- 来源 URL
- 收藏时间
- 页面类型
- 摘要
- 关键证据
- 相关资源
- 相关 Mission
- 相关 Skill
- 最后使用时间

## 9. MVP 范围

### In Scope

- Atlas 首页展示 Collection / Resource 卡片。
- Atlas 有一个可用的 Ask 输入框。
- Atlas 可显示资源间的简单关系和推荐跳转。
- Atlas 有一组内置能力入口，至少覆盖 Analyze / Plan / Compare / Connect / Summarize / Generate。
- Atlas 能从现有收藏和 Mission 中提取证据，作为问答引用。
- Atlas 能把资源跳转到 Mission 或 Skill 的现有页面。

### Out of Scope

- 完整图数据库。
- 自动复杂推理网络。
- 团队共享图谱编辑。
- 公开市场或能力商店。
- 复杂拖拽式 graph editing。
- 先把所有旧资源页重写成图表视图。

## 10. UX 要求

- Atlas 视觉上要像“工作台”，不是大卡片看板。
- 空状态要能告诉用户：你可以先问、先连、先看关系、先发起任务。
- 内置能力要比普通收藏更显眼，但不能压过内容本身。
- 图谱关系必须能读懂，不能只靠颜色和线条。
- 所有问答和推荐都要带出处，不要黑箱。

## 11. 成功标准

- 用户能从 Atlas 看懂自己 workspace 里正在积累什么知识。
- 用户能在不离开 Atlas 的情况下发起分析、规划、比较和生成。
- 用户能从 Atlas 一步跳到相关 Mission 或 Skill。
- 用户能清楚分辨“收藏”“证据”“能力”“Mission”四者的区别。
- 空 Atlas 也不是空白页，而是有可操作的内置能力入口。

## 12. 不做什么

- 不把 Atlas 做成单纯资源列表。
- 不把 Atlas 做成普通 chat 窗口。
- 不把 Atlas 做成只看图不行动的知识墙。
- 不让用户先手动建分类才能用。
- 不优先做复杂图编辑器。

## 13. Open Questions

- Atlas 首页首屏更适合“能力卡片 + 证据流”，还是“关系图 + 右侧问答”？
- 内置能力应该只做点击式入口，还是同时支持自然语言快捷指令？
- Atlas 中的 Built-in capability 和已生成 Skill 的边界要怎么视觉区分？
- 第一个版本要不要把 Analyze/Plan/Compare 固定在顶部常驻，还是按最近使用动态排序？
- Atlas 的关系线要不要从 Mission 反向回溯到 Skill 使用记录？

