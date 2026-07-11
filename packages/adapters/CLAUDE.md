# packages/adapters 指南

Adapters 是集成接缝。它们让资源工作台今天可以在没有真实云盘 API 的情况下运行，未来也能接入官方 API。

## 云盘规则

- MVP adapter 是 mock-only，但行为要像真实云盘：文件夹、文件、保存链接、Markdown artifacts、操作日志。
- 使用明确的 action sensitivity。MVP 期间服务端和 adapter 都要拒绝 destructive actions。
- 返回结构化错误，方便 UI 展示 blocker。
- 写入 artifact 或保存链接时保留 provenance metadata。

## 未来 Adapter 类型

- `MockDriveAdapter`：Demo 用的数据库/本地应用内存储。
- `LocalDriveAdapter`：把 artifacts 写到用户选择的本地文件夹。
- `BrowserAssistedDriveAdapter`：在用户批准下控制可见浏览器 UI。
- `OfficialCloudDriveAdapter`：封装未来迅雷 API。
