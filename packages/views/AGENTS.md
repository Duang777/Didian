# 共享视图 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/views/` 存放 Web 和桌面端共享的业务页面与功能组件。

## 职责

- 资源工作台页面、面板、表单、任务看板、时间线和 artifact 视图。
- 组合 `@multica/core` 的 hooks/types 与 `@multica/ui` 组件。
- 为共享功能组件编写 UI 行为测试。

## 资源工作台方向

开始第一条资源工作台垂直切片时，在 `packages/views/resources/` 下创建资源领域视图。

建议子模块：

- `task-board`：资源任务列和任务卡片。
- `task-detail`：动态计划、runtime 状态、时间线、确认面板。
- `library`：资源聚类、文件树、artifact。
- `ask`：资源问答对话。

## 边界

- 不允许导入 `next/*`。
- 不允许导入 `react-router-dom`。
- 这里不放 Zustand store；store 放在 `packages/core/`。
- 不直接调用具体 adapter；通过 core hooks/contracts 使用能力。
- 不重复实现应该属于 `packages/ui/` 的通用组件。

## 验证

- 组件测试放在 `packages/views/` 对应模块附近。
- 先跑聚焦测试，风险较高时再跑 `pnpm test`。
