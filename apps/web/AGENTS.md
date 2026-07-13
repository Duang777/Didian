# Web 应用 Agent 指南

先阅读仓库根目录的 `CLAUDE.md`。`apps/web/` 是资源工作台的 Next.js 平台层。

## 职责

- 定义路由和 Next.js App Router 接线。
- 放置无法下沉到共享包的服务端/客户端平台桥接逻辑。
- 处理 Web 专属 provider、runtime URL 配置、cookie、redirect、search params。
- 挂载 `packages/views/` 中的共享页面。

## AI Workbench 方向

- Web 应用负责暴露 Runtime-first 外壳，同时在迁移期保持现有后端兼容。
- 第一版主路由是 `/ai-inbox`、`/missions`、`/atlas`、`/system`。
- 不新增 MVP 主路由 `/ai-studio` 或 `/autopilot`；旧 agents/skills/squads/autopilots 路由如存在，只作为 System / Advanced 兼容入口。
- 业务页面创建后应放在 `packages/views/ai-workbench/`，本应用主要负责路由挂载。
- 只有在依赖 Next.js 能力时，浏览器扩展回调/API 胶水代码才放在这里。

## 边界

- 不要把共享 UI 或业务逻辑直接写进 `apps/web/`。
- 不要导入 Electron 或桌面端专属 API。
- 不要绕过 `@didian/core` 的 API schema 直接消费后端数据。
- 路由组件不要直接调用具体云盘 adapter。

## 组件参考

- `awesome-shadcn-ui`（https://github.com/birobirobiro/awesome-shadcn-ui）用于发现 shadcn 生态组件和 blocks；采纳前确认原项目许可证和依赖。
- `cult-ui`（https://github.com/nolly-studio/cult-ui）用于参考开源动效和 AI UI elements；不要复制 Pro blocks。
- Web route 不直接沉淀组件。通用 primitive 放 `packages/ui/`，业务组合放 `packages/views/`。

## 验证

- 类型检查：`pnpm typecheck`
- Web 开发：`pnpm dev:web`
- 相关测试：`apps/web/` 下的应用层 Vitest 测试
