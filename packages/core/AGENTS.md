# Core 包 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/core/` 存放无界面的共享逻辑：类型、API schema、React Query hooks、Zustand stores 和纯工具函数。

## 职责

- API client 和响应 schema。
- 服务端状态 hooks 和 mutations。
- Web/桌面共享的客户端/视图 store。
- 创建后存放资源领域纯逻辑。

## AI Workbench 方向

第一版优先用前端 view model / adapter 包住旧 issue/runtime 模型。只有当 UI contract 稳定并需要跨页面复用时，才在 `packages/core/ai-workbench/` 或现有领域目录下沉纯逻辑。

建议模块：

- `types.ts`：AI Inbox input、Mission view、Codex Run、Atlas resource、evidence、artifact。
- `schemas.ts`：API、fixture、LLM 生成数据的 zod 校验。
- `normalize.ts`：URL、标题、来源规范化。
- `classify.ts`：确定性输入类型和 intent 提示。
- `queries.ts` 和 `mutations.ts`：服务端交互。

Autopilot strategy 不进入第一版 core model；后续基于真实 capture/run/memory 行为再沉淀。

## 边界

- 不导入 UI 库。
- 不使用 `react-dom`。
- 不直接使用 `localStorage`；通过平台 `StorageAdapter`。
- 不使用 `process.env`。
- 不放具体云盘实现。
- 不把服务端数据持久化进 Zustand。

## 验证

- 为规范化、分类、聚类、schemas、stores、query cache 更新行为写单元测试。
