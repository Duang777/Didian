# Adapters 包 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/adapters/` 存放云盘类存储和其他外部系统的具体 adapter。

## 职责

- MVP/Demo 使用的 `MockDriveAdapter`。
- 未来本地文件夹 adapter。
- 未来官方云盘 adapter。
- 未来浏览器辅助云盘 adapter。

## 边界

- Adapter 接口保持小而明确。
- 不允许 UI 直接导入具体 adapter。
- MVP 不添加破坏性操作。
- 没有经过审核的 secret 管理设计前，不存储用户凭证。

## 验证

- 每个 adapter 操作都要有单元测试。
- 条件允许时，为多个 adapter 共用 contract tests。
