# 实施计划：Didian

## 概览

Didian 是一个从浏览器到云盘的资源任务工作台。第一阶段的工程目标不是重写执行底座，而是在保留本地 daemon、runtime、任务队列能力的前提下，用 Cult UI/shadcn 做出资源工作台产品表面。资源领域后端变更应在本地 runtime 路径被验证后，以薄的、可验证的垂直切片逐步进入。

## 架构决策

- **优先保留现有 daemon/runtime。** 现有 daemon 已经能检测本地 Agent CLI、注册 runtime、领取任务、在隔离 workdir 中运行 agent 并流式回传结果。过早重写风险高、收益低。
- **渐进式替换前端。** 使用 shadcn/Cult UI 组件构建资源工作台外壳，在资源 API contract 准备好之前保持现有后端契约。
- **云盘使用 adapter 接缝。** MVP 使用 `MockDriveAdapter`；未来迅雷、本地文件夹、浏览器辅助 adapter 共用同一契约。
- **使用动态任务图。** UX 展示 plan、checkpoint、tool、action 进度，而不是固定一组命名 Agent。
- **写入前必须确认。** 任何资源操作在写入云盘前都必须被用户审核，即使是 mock 模式。

## 依赖图

```text
验证现有后端/daemon
  -> 项目规则和模块上下文文件
  -> 资源工作台 UI 外壳契约
    -> 引入 Cult UI/shadcn 组件
    -> 资源任务看板/详情视图
  -> 浏览器采集契约
    -> 扩展采集 MVP
    -> 创建资源任务
  -> Runtime 执行验证
    -> 资源 prompt/任务上下文
    -> Agent 输出 artifacts
  -> Mock Drive 契约
    -> 确认门
    -> Artifact 持久化和预览
  -> 资源问答
```

## Phase 0：基线与安全

- [x] 准备 Didian 工作区。
- [x] 添加根级和模块级 Agent 指南文件。
- [ ] 运行基线安装/构建检查，了解当前项目健康状态。
- [ ] 在 `docs/setup-notes.md` 记录本地前置条件缺口。

### Checkpoint：基线

- [ ] `pnpm install` 成功。
- [ ] 记录 `pnpm typecheck` 结果。
- [ ] 记录 `make test` 或 daemon 聚焦 Go 测试结果。

## Phase 1：资源工作台前端外壳

- 创建资源工作台 route/shell，不删除现有 issue UI。
- 把需要的开源 Cult UI primitives 复制/改造到 `packages/ui/`。
- 在 `packages/views/resources/` 下用 mock 数据构建共享资源视图：sidebar、任务看板、任务详情、runtime 面板、时间线、artifacts 面板。
- 保持 `apps/web/` 路由接线轻薄。

### Checkpoint：外壳

- [ ] 资源工作台 route 能用 mock 数据渲染。
- [ ] 布局能处理长标题、URL、日志。
- [ ] 共享 views 中没有 `next/*` imports。
- [ ] `pnpm typecheck` 通过，或已记录已知失败。

## Phase 2：本地 Runtime 可见性

- 尽量复用现有 runtime APIs/hooks。
- 增加资源工作台 runtime 面板，展示本地机器、providers、版本、online/offline/busy 状态和当前任务。
- Runtime 状态仍由服务端通过 React Query 管理。

### Checkpoint：Runtime 面板

- [ ] 现有 daemon 可以注册 runtime。
- [ ] 资源工作台能展示 runtime 状态。
- [ ] 没有 runtime 连接时，UI 有清晰降级状态。

## Phase 3：浏览器采集契约

- 在 `packages/core/resources/` 定义 capture payload schema。
- 在 `apps/extension/` 下添加 Chrome extension scaffold。
- 实现当前标签页和当前窗口全部标签页的被动采集。
- 添加 ingestion endpoint 或 mutation，用采集结果创建资源任务。

### Checkpoint：采集

- [ ] Capture payload 能通过 zod 校验。
- [ ] 示例 capture 可以创建资源任务。
- [ ] 页面内容被视为数据，不被视为指令。

## Phase 4：资源任务通过本地 Agent 执行

- 创建 resource-task prompt 路径，打包目标、采集来源、约束和期望输出文件。
- 将资源任务路由到现有本地 runtime provider，例如 Codex 或 Claude Code。
- 将 messages/progress 流式回传到资源任务详情视图。
- 将生成结果保存为任务附件或资源 artifacts。

### Checkpoint：本地 Agent 执行

- [ ] 资源任务可以被本地 runtime 领取。
- [ ] 执行日志出现在工作台中。
- [ ] Agent 输出被捕获为结构化文件/artifacts。
- [ ] failure/blocker 状态可见。

## Phase 5：Mock Drive 和确认门

- 定义 `CloudDriveAdapter` 并实现 `MockDriveAdapter`。
- 添加 proposed action 模型：创建文件夹、保存 URL、写 Markdown、跳过。
- 执行安全 mock-drive 写入前展示确认 UI。
- 持久化操作日志，并在云盘工作区预览生成的 Markdown。

### Checkpoint：Mock Drive

- [ ] 用户在执行前能看到准确的 proposed operations。
- [ ] 安全操作能写入 mock drive 的文件夹、文件、链接。
- [ ] UI 和后端/adapter 都会拒绝 destructive actions。

## Phase 6：Demo 打磨和资源问答

- 准备确定性的 AI Agent 调研 fixture。
- 生成资源索引、项目对比表、复用清单和下一步行动。
- 对采集资源和生成 artifacts 增加轻量问答。
- 补齐 empty、loading、error、blocked 状态和 Demo 脚本。

### Checkpoint：参赛 Demo

- [ ] 完整 Demo 五分钟内完成。
- [ ] Demo 不依赖私有云盘 API。
- [ ] Runtime、任务图、确认门、mock drive、artifacts 和问答都可见。

## 风险和缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 第三方组件许可证限制直接复用 | 高 | 只使用可授权组件；保留必要许可证声明；不要未经 review 把受限前端源码复制进产品 |
| 前端重写触碰太多旧 UI | 高 | 先添加资源 shell；替代流程工作前不删除 issue UI |
| Daemon/runtime 回归 | 高 | 避免早期重写 daemon；为 prompt/runtime 变更补聚焦测试 |
| 没有真实云盘 API | 中 | 使用 MockDriveAdapter 和 LocalDriveAdapter 接缝；官方 API 作为未来 adapter |
| 浏览器扩展范围膨胀 | 中 | 先做被动采集；宽权限或自动化前先确认 |
| LLM 输出格式错误或不安全 | 中 | 使用 schema 校验；要求确认门；禁用 destructive actions |

## 待确认问题

- 产品名暂定 Didian，后续是否改成迅雷相关名称？
- 第一个资源 route 是与现有 route 并存，还是成为默认 dashboard？
- Demo 默认本地 Agent 用 Codex 还是 Claude Code？
- 第一版是否必须做真实 Chrome extension，还是先支持 JSON fixture 导入？
- 参赛前是否能拿到任何内部迅雷云盘 API？
