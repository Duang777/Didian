# packages/views 指南

这个包负责共享产品界面。它可以理解资源任务、runtime、确认面板和 artifact，但不能知道平台路由细节或具体存储实现。

## UI 产品标准

- 构建操作型工作台：紧凑、可扫读、可靠。
- 优先使用面板、表格、列表、时间线和明确状态，不使用装饰性营销布局。
- AI 判断必须展示证据：来源链接、匹配理由、置信度、建议操作详情。
- 确认面板必须在执行前列出准确操作。
- 长标题、URL、日志和 Markdown 不能撑坏布局。

## AI Workbench 视图模式

- 新产品页面优先放在 `packages/views/ai-workbench/`。
- 第一版主入口是 AI Inbox、Missions、Atlas、System。
- 不把 AI Studio / Autopilot 做成 MVP 主页面；相关旧页面只作为 System / Advanced 兼容入口。
- Skill Center 属于 System 侧的个人能力管理入口，承载收藏生成的草稿和个人 Skill 库，不替代旧 workspace Skills 资产页。
- Mission 卡片：目标、状态、runtime、输入数、Review 数、artifact 预览、当前步骤。
- Mission 详情：Inputs、Plan、Activity、Evidence、Review、Outputs、Related Atlas。
- Runtime 展示：provider、版本、状态、最后心跳、当前任务。
- Artifact 预览：Markdown 内容和来源引用。

## 测试

- 测可见状态和用户决策，不测实现细节。
- 关键资源任务视图要覆盖 empty、loading、failed、blocked、needs-confirmation 状态。
