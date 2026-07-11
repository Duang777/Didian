# packages/core 指南

Core 是无界面契约层，是 UI、后端、桌面端和未来浏览器扩展之间的窄腰。

## 资源领域规则

- LLM 输出必须先经过 zod schema，才能进入应用成为 typed data。
- 资源聚类优先使用确定性规则。模型置信度只能作为额外信号，不能作为唯一依据。
- 每个 resource item 都必须保留 provenance 字段。
- resource task 的 query key 必须包含 workspace ID。
- 只有本地可预测的视图状态可以乐观更新；不要乐观声称云盘写入成功。

## Adapter 契约

- 只有多个实现需要共享时，才在 core 中定义小接口。
- 具体 adapter 放在 core 之外。
- UI 依赖 hooks/contracts，不依赖 adapter class。
