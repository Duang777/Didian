# Core 包 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/core/` 存放无界面的共享逻辑：类型、API schema、React Query hooks、Zustand stores 和纯工具函数。

## 职责

- API client 和响应 schema。
- 服务端状态 hooks 和 mutations。
- Web/桌面共享的客户端/视图 store。
- 创建后存放资源领域纯逻辑。

## 资源工作台方向

开始实现时，在 `packages/core/resources/` 下创建资源领域代码。

建议模块：

- `types.ts`：resource task、resource item、cluster、action、artifact。
- `schemas.ts`：API 和 LLM 生成数据的 zod 校验。
- `normalize.ts`：URL、标题、来源规范化。
- `classify.ts`：确定性资源类型提示。
- `queries.ts` 和 `mutations.ts`：服务端交互。

## 边界

- 不导入 UI 库。
- 不使用 `react-dom`。
- 不直接使用 `localStorage`；通过平台 `StorageAdapter`。
- 不使用 `process.env`。
- 不放具体云盘实现。
- 不把服务端数据持久化进 Zustand。

## 验证

- 为规范化、分类、聚类、schemas、stores、query cache 更新行为写单元测试。
