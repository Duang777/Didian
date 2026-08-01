# Didian 验证路线图

## 1. 验证原则

第一阶段不要验证“能不能做一个完整云盘 AI 平台”，而要验证一个更窄的问题：

> 用户是否真的需要一个在资料进入云盘前工作的 AI 资源处理层？

只要这件事成立，浏览器采集、Codex Runtime、Mock Drive、Atlas、搜索召回都有继续投入的理由。若这件事不成立，做再完整的云盘问答或 Agent 管理台也会变成好看但不尖锐的功能堆叠。

## 2. 风险排序

| 优先级 | 假设 | 如果错误会怎样 | 最小验证 |
| --- | --- | --- | --- |
| P0 | 用户有“保存前整理”的强需求 | 产品会退化成普通收藏夹或云盘聊天 | 让 5 个目标用户看 Demo，观察是否主动说出自己的场景。 |
| P0 | AI Inbox 能降低用户整理成本 | 用户仍觉得要填很多东西 | 粘贴一组真实链接，30 秒内展示可接受的 Mission 建议。 |
| P0 | Workspace 比聊天记录更可信 | 用户只想要摘要，不关心证据 | 观察用户是否点击 `sources/`、`evidence.md`、`outputs/`。 |
| P1 | Mock Drive 足以支撑第一版 | Demo 被质疑“没接云盘不算” | 用 Adapter 解释和可见写入日志化解质疑。 |
| P1 | 本地 Codex Runtime 是优势 | 用户觉得 setup 太重 | 演示“隐私、本地环境、已有工具复用”的好处，并简化 setup。 |
| P2 | 搜索页召回能产生 aha moment | 召回时机不够高频 | 做浏览器扩展概念验证，测试搜索时提示点击率。 |

## 3. 两周 MVP 验证切片

### Week 1：讲清楚闭环

- 完成 AI Inbox fixture：粘贴链接和备注后展示理解结果。
- 完成 Mission Workspace fixture：文件树、Markdown、计划、证据、Review。
- 完成 Mock Drive 写入日志：创建目录、保存链接、写入 Markdown。
- 完成 Atlas fixture：Collection、资源卡、Ask Atlas 带引用回答。
- 准备 5 分钟 Demo 脚本和一页 HTML 概念稿。

### Week 2：让闭环有真实动作

- 浏览器扩展采集当前页或标签组的真实 payload。
- 后端保存 captured source，并能从 AI Inbox 引用 capture id。
- Mission 创建时写入 workspace handoff prompt。
- Codex Runtime 能基于 fixture 或 capture payload 产出 artifact。
- Atlas 能从 Mission artifact 打开对应 Workspace。

## 4. 指标

### Demo 指标

- 5 分钟内完成端到端演示。
- 评审或用户能复述：Didian 在浏览器和云盘之间工作。
- 用户能说出至少一个自己的使用场景。
- 用户能理解为什么需要 Review Gate。
- 用户不需要解释三次才明白 Runtime-first。

### 产品行为指标

- AI Inbox 到 Mission 创建转化率。
- Mission 完成率。
- Review 操作确认率和拒绝率。
- 每个 Mission 生成 artifact 数量。
- Atlas Collection 被再次打开次数。
- Ask Atlas 追问次数。
- 搜索召回提示点击率。

### 质量指标

- AI 产物有来源引用的比例。
- 去重建议被接受比例。
- 写入操作失败率。
- Runtime 离线导致的阻塞比例。
- 用户手动改标题、目录或产物结构的比例。

## 5. 版本路线

### V0：概念可演示

目标：评审能看懂完整故事。

- AI Inbox fixture。
- Mission Workspace fixture。
- Mock Drive fixture。
- Atlas fixture。
- HTML 概念页。
- Demo 脚本。

### V1：真实输入可运行

目标：用户能把真实链接交给 Didian。

- 浏览器扩展采集当前页。
- captured source 数据模型。
- 页面轻量 enrichment。
- AI Inbox 真实 payload。
- Mission 创建真实记录。
- Codex Run 产物回传。

### V2：真实沉淀可复用

目标：Atlas 从展示页变成长期资源记忆。

- Atlas resource 和 collection 持久化。
- Artifact 与 source 引用关系持久化。
- Mock Drive / Local Drive Adapter 稳定写入。
- Ask Atlas 引用式回答。
- 重复和相似资源建议。

### V3：浏览器记忆主动召回

目标：Didian 在用户再次搜索时主动出现。

- 搜索页 query extractor。
- 相关收藏召回接口。
- 搜索页轻提示 UI。
- 静音、归档、打开、创建 Mission。
- 召回原因解释。

### V4：Later Autopilot

目标：从真实重复行为生成自动化策略。

- 识别重复 Mission 模式。
- 生成 dry-run 策略建议。
- 用户确认后启用。
- 可暂停、可解释、可回滚。

### V5：多场景资源工作流

目标：让 Didian 不只服务参赛调研，而能覆盖高频资料工作。

- 学习路线：课程、教程、PDF、视频自动组织成阶段计划。
- 论文综述：论文、数据集、实验记录和引用证据进入同一个 Workspace。
- 开源选型：GitHub 仓库、issue、文档、许可证和集成风险自动对比。
- 内容创作：选题、素材、案例、脚本和发布清单进入 Atlas Collection。
- 竞品监控：网页、更新日志、价格页和社媒线索定期刷新。

### V6：个人 AI 资源操作系统

目标：Didian 成为用户资料流、AI 执行和长期记忆之间的中枢。

- 多云盘 Adapter：Mock Drive、Local Drive、官方云盘、WebDAV、对象存储。
- 多 Runtime 调度：Codex、Claude Code、Cursor Agent、OpenCode 和轻量服务端模型按任务类型选择。
- 跨应用召回：浏览器搜索、GitHub、文档工具、云盘搜索、聊天输入框中提示相关 Atlas 记忆。
- 资源健康检查：失效链接、过期版本、许可证变化、重复文件和证据缺口提醒。
- Workspace 模板市场：把高质量 Mission 输出变成可复用模板，例如“开源项目选型”“课程学习路线”“竞品周报”。

## 6. 关键产品约束

- AI 判断必须展示证据。
- 云盘写入前必须确认。
- MVP 禁止删除、覆盖、批量移动。
- 浏览器采集文本按不可信输入处理。
- LLM 输出必须过 schema 校验后再持久化或执行。
- Agents、Skills、Squads、Autopilot 不进入 MVP 主导航。
- Mock 和 fixture 要与生产路径分离。
- 后续能力必须从 AI Inbox、Mission Workspace、Atlas、System 这条主线长出来，不能变成平行功能入口。

## 7. 访谈问题

每次 Demo 后问 6 个问题即可：

1. 你最近一次打开很多标签页做资料调研是什么时候？
2. 当时你最后把资料保存到了哪里？
3. 一周后你还能想起每个链接为什么重要吗？
4. 这个 Demo 里哪一步最像你真实会用的？
5. 哪一步你觉得多余或不可信？
6. 如果只能保留一个能力，你会选 AI Inbox、Mission Workspace、Atlas、搜索召回，还是 Mock Drive 写入？

## 8. 退出条件

继续投入的条件：

- 目标用户能主动说出自己的使用场景。
- 用户认为“保存前整理”比“保存后问答”更有价值。
- 用户愿意把一组真实链接交给 Didian 试一次。
- Demo 中 Mission Workspace 和 Atlas 至少一个产生明显 aha moment。

需要调整方向的条件：

- 用户只想要普通收藏夹，不需要 Mission。
- 用户不关心来源、证据和后续召回。
- 本地 Runtime setup 成为核心阻力，且优势解释无效。
- 云盘 API 缺失被认为是不可接受阻塞。
