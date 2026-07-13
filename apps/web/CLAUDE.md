# apps/web 指南

这个目录是 Web 平台适配层，要保持轻薄。

## 规则

- Next.js API 只能在这里或 `apps/web/platform/` 使用。
- 共享资源工作台页面属于 `packages/views/`，不要直接塞进 app route。
- route 文件应该组合 provider 和共享 view，避免在 `page.tsx` 里写大型业务组件。
- API 响应必须先经过 `@didian/core` schema 解析，再交给 UI 逻辑。
- 使用 `packages/ui/styles/` 中的语义化设计 token。
- 需要找前端组件参考时，可以查 `awesome-shadcn-ui`（https://github.com/birobirobiro/awesome-shadcn-ui）和 `cult-ui`（https://github.com/nolly-studio/cult-ui）。Web 层只负责接线；可复用实现应下沉到 `packages/ui/` 或 `packages/views/`。

## 迁移说明

- 第一里程碑：在保留现有后端/daemon 流程的同时，挂载资源工作台 dashboard。
- 在新流程验证前，优先添加新路由和 feature flag 外壳，不要大规模删除旧 issue UI。
- 浏览器采集入口要放在明确 API contract 后面，方便 Chrome extension 独立演进。
