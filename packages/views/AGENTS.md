# 共享视图 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/views/` 存放 Web 和桌面端共享的业务页面与功能组件。

## 职责

- 资源工作台页面、面板、表单、任务看板、时间线和 artifact 视图。
- 组合 `@didian/core` 的 hooks/types 与 `@didian/ui` 组件。
- 为共享功能组件编写 UI 行为测试。

## AI Workbench 方向

当前第一版主线是 `AI Inbox -> Missions / Codex Run -> Atlas -> System`。新产品页面优先放在 `packages/views/ai-workbench/`，旧 `packages/views/resources/` 可作为 fixture/artifact preview 来源，不再作为新 IA 的主目录。

建议子模块：

- `ai-inbox`：万能输入、capture card、AI 理解面板、创建 Mission。
- `missions`：Mission 队列和 Codex Run 执行现场。
- `atlas`：Collection、Resource、Evidence、Ask Atlas。
- `system`：Runtime、Settings、Advanced 入口，以及 Skill Center 这类个人能力管理入口。

MVP 不新增 AI Studio / Autopilot 主页面。Agents/Skills/Squads/Autopilots 只从 System / Advanced 或旧兼容路由进入；Skill Center 只管理收藏生成的个人能力，不替代 workspace Skills 资产页。

## 边界

- 不允许导入 `next/*`。
- 不允许导入 `react-router-dom`。
- 这里不放 Zustand store；store 放在 `packages/core/`。
- 不直接调用具体 adapter；通过 core hooks/contracts 使用能力。
- 不重复实现应该属于 `packages/ui/` 的通用组件。

## 验证

- 组件测试放在 `packages/views/` 对应模块附近。
- 先跑聚焦测试，风险较高时再跑 `pnpm test`。
