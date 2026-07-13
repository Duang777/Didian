# packages/ui 指南

这个包只放原子 UI。如果一个组件知道 resource task、runtime、cloud drive、issue、workspace 或 agent 的业务含义，它大概率应该放在 `packages/views/`，不是这里。

## 组件规则

- 使用语义化 token，例如 `bg-background`、`text-muted-foreground`、`border-border`。
- 有状态 primitive 尽量暴露 controlled props。
- 任务卡片、工具栏、文件树、时间线等固定格式 UI 要保持尺寸稳定，避免布局跳动。
- 常见操作优先使用 lucide icons。
- 必须认真处理溢出和超长连续文本。
- 可参考 `awesome-shadcn-ui`（https://github.com/birobirobiro/awesome-shadcn-ui）发现 shadcn 生态 primitives、blocks 和 pattern；迁入前确认原项目许可证、依赖体积和维护状态。
- 可参考/迁入 `cult-ui`（https://github.com/nolly-studio/cult-ui）的开源 MIT 组件，尤其是 AI elements、动效 primitive、artifact/source/file tree 等通用 UI；必须保留必要许可证/归因，不使用 Pro blocks。

## AI 元素改造

可以把 Cult UI AI elements 改造成通用 primitives，例如 plan、checkpoint、tool call、confirmation、source list、artifact preview、file tree、conversation。它们必须保持数据无关，不夹带业务语义。
