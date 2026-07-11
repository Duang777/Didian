# UI 包 Agent 指南

先阅读根目录 `CLAUDE.md`。`packages/ui/` 只存放原子级、可复用 UI 组件。

## 职责

- shadcn/Base UI primitives。
- 复制并改造用于工作台的开源 Cult UI 组件。
- 不带业务数据请求的 Markdown、代码、artifact 基础组件。
- 共享样式和设计 token。

## 边界

- 不允许导入 `@multica/core`。
- 不放业务逻辑、API 调用、路由逻辑或云盘概念。
- 不使用 localStorage 或平台 API。
- 组件保持通用、可组合。

## Cult UI 使用规则

- 只使用 MIT 许可证的开源 Cult UI 组件。
- 未获授权不要复制 Cult UI Pro blocks。
- 复制代码时在项目文档中保留归因和许可证要求。
- 视觉风格要适配操作型工作台：克制、信息密度高、清晰。

## 验证

- 组件 API 变更后运行类型检查。
- 行为不简单的组件需要补组件测试。
