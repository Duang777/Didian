# Didian Demo Storyboard

## 1. Demo 目标

用 5 分钟让评审看懂三件事：

1. Didian 解决的是“浏览器资料到云盘沉淀”的断层。
2. AI 不是聊天框，而是可见、可审计、可确认的 Codex Run 工作流。
3. 结果不是一次性回答，而是进入 Atlas，成为后续可追问、可召回的资源记忆。

## 2. 演示主线

```text
打开一组 AI Agent 资料标签页
  -> AI Inbox 捕获并理解
  -> 创建 Mission Workspace
  -> Codex Run 生成计划和证据
  -> Review 确认写入 Mock Drive
  -> Atlas 展示资源合集并回答追问
```

## 3. 5 分钟分镜

| 时间 | 画面 | 讲述重点 | 成功信号 |
| --- | --- | --- | --- |
| 0:00 - 0:35 | 浏览器里打开多个资料页 | 用户真实痛点：标签页很多、来源混乱、保存后上下文丢失。 | 评审能理解“不是文件上传后才开始”。 |
| 0:35 - 1:20 | AI Inbox 显示捕获结果和 AI 理解 | AI 先解释输入：这是 AI Agent 项目调研，建议生成对比表、资源索引、复用清单。 | 评审看到 AI 在“理解工作”，不是让用户填表。 |
| 1:20 - 2:15 | 创建 Mission，进入 Workspace | Mission 自动生成 `mission.md`、`sources/`、`evidence.md`、`decisions.md`、`agent-log.md`。 | 评审看到 Agent 有工作现场。 |
| 2:15 - 3:20 | Codex Run 执行步骤 | 展示扫描、提取、去重、匹配、生成方案、等待确认。 | 评审看到过程可解释，不是黑盒 loading。 |
| 3:20 - 4:10 | Review 写入 Mock Drive | 用户确认创建目录、保存链接、写入 Markdown；破坏性操作被禁用。 | 评审看到安全边界和云盘 Adapter 设计。 |
| 4:10 - 5:00 | Atlas 展示合集并追问 | 问“哪个项目适合接入 Didian？”答案引用资源索引和对比表。 | 评审看到结果成为长期记忆。 |

## 4. Demo 输入

### 浏览器标签组

```text
https://github.com/browser-use/browser-use
https://github.com/browserbase/stagehand
https://github.com/sst/opencode
https://github.com/nanobrowser/nanobrowser
https://github.com/nolly-studio/cult-ui
```

### 用户备注

```text
帮我整理成参赛项目可复用资料包。重点看浏览器自动化能力、许可证风险、前端可复用组件、接入 Didian 的优先级。重复资料不要保存。
```

## 5. AI Inbox 应展示的理解结果

```text
识别意图：AI Agent 项目调研与可复用清单
资源类型：GitHub 仓库 4 个，组件库 1 个，用户备注 1 条
建议 Mission：整理 AI Agent 生态资料到云盘
建议产物：
- 资源索引.md
- 项目对比表.md
- 可复用前后端清单.md
- 下一步行动.md
缺失信息：
- 是否优先考虑商业化许可证？
- 是否需要接入浏览器扩展能力？
```

## 6. Mission Plan 样例

| 步骤 | 状态 | 展示文案 |
| --- | --- | --- |
| 扫描输入 | 完成 | 已读取 5 个来源和 1 条备注。 |
| 提取元数据 | 完成 | 已提取项目名称、用途、许可证、关键能力和来源 URL。 |
| 去重匹配 | 完成 | 未发现完全重复 URL；Stagehand 与 browser-use 同属浏览器自动化方向。 |
| 生成整理方案 | 完成 | 建议写入 `参赛项目/AI Agent 调研/`。 |
| 等待确认 | 待确认 | 需要用户批准 4 个 Markdown 写入和 5 个链接保存。 |
| 写入云盘 | 未开始 | 使用 Mock Drive Adapter；不会删除或覆盖已有文件。 |
| 进入 Atlas | 未开始 | 创建 `AI Agent 调研` Collection。 |

## 7. Review Queue 样例

| 操作 | 风险等级 | 默认策略 |
| --- | --- | --- |
| 创建文件夹 `参赛项目/AI Agent 调研/` | 安全 | 可确认执行 |
| 保存 5 个来源链接 | 安全 | 可确认执行 |
| 写入 4 个 Markdown artifact | 安全 | 可确认执行 |
| 合并相似资源说明 | 安全 | 可确认执行 |
| 删除重复文件 | 禁止 | MVP 不提供 |
| 覆盖已有文件 | 禁止 | MVP 不提供 |

## 8. 生成产物样例

### `资源索引.md`

```markdown
# AI Agent 调研资源索引

## browser-use
- 类型：浏览器自动化 Agent 项目
- 价值：验证自然语言控制浏览器的交互模式
- 来源：https://github.com/browser-use/browser-use
- 适合 Didian：可借鉴浏览器上下文采集和任务执行边界
```

### `项目对比表.md`

```markdown
| 项目 | 主要能力 | 适合复用 | 许可证待确认 | Didian 接入优先级 |
| --- | --- | --- | --- | --- |
| browser-use | 浏览器自动化 | 任务拆解、页面操作模型 | 是 | 高 |
| Stagehand | 可靠浏览器操作框架 | 页面动作抽象 | 是 | 高 |
| OpenCode | 本地代码 Agent | Runtime 执行体验 | 是 | 中 |
```

### `下一步行动.md`

```markdown
1. 先验证 Didian 扩展采集当前标签组的 payload。
2. 用 fixture 跑通 AI Inbox 到 Mission Workspace。
3. 将 Codex Run 输出写入 Mock Drive。
4. 在 Atlas 中展示来源引用和项目对比结果。
```

## 9. 评审问答预案

### 没有真实云盘 API，Demo 是否成立？

成立。Didian 的云盘层通过 Adapter 抽象，MVP 使用 Mock Drive Adapter 验证完整 AI 流程：创建目录、保存链接、写入 Markdown、展示操作日志。未来接入官方云盘 API、本地目录或浏览器辅助操作时，不需要重写 AI Inbox、Mission、Atlas 主线。

### 为什么不直接做云盘聊天？

云盘聊天解决的是“文件已经保存后怎么问”。Didian 解决的是更早、更频繁的问题：资料从浏览器进入云盘前，如何保留来源、去重、命名、整理、生成产物，并让结果以后可以召回。

### 为什么要本地 Codex Runtime？

因为用户的浏览器登录态、本地文件、CLI 工具和开发环境都在本机。本地 Runtime 让 Didian 能复用用户已有 Agent 能力，同时把执行日志、证据、权限确认和产物沉淀交给工作台管理。

## 10. 演示验收清单

- [ ] AI Inbox 首屏能解释混乱输入。
- [ ] Mission Workspace 文件树和 Markdown 内容完整。
- [ ] Codex Run 过程有阶段、日志、证据和阻塞状态。
- [ ] Review Queue 明确区分安全操作和禁止操作。
- [ ] Mock Drive 写入结果可见。
- [ ] Atlas 能打开 Collection 并回答一个带引用的问题。
- [ ] 5 分钟内能讲完整闭环。
