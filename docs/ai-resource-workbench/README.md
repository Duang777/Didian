# AI 资源工作台方案文档

本目录只放当前正在实施的新方案，按审查顺序编号。旧 Multica/历史方案文档已从 `docs/` 根目录移除，审查当前方案时只需要从这里进入。

## 审查顺序

1. [01-product-requirements.md](./01-product-requirements.md)：产品方向、目标用户、Runtime-first IA、核心闭环和验收标准。
2. [02-technical-plan.md](./02-technical-plan.md)：技术落地策略、旧模型复用、新路由兼容、view model 和分模块方案。
3. [03-implementation-review.md](./03-implementation-review.md)：方案审核结论、实施顺序、风险提醒和第一阶段任务拆分。
4. [04-browser-memory-bookmarks.md](./04-browser-memory-bookmarks.md)：浏览器收藏记忆、页面摘要、搜索召回提示的功能可行性和实施方案。
5. [05-mission-skill-runtime-loop.md](./05-mission-skill-runtime-loop.md)：收藏网页到 Mission Skill 使用闭环。
6. [06-skill-operating-loop-prd.md](./06-skill-operating-loop-prd.md)：Skill 从生成卡片到使用、审计、删除、再生成的操作闭环。
7. [07-atlas-native-capabilities-prd.md](./07-atlas-native-capabilities-prd.md)：Atlas 作为知识图谱与内置能力发射台的产品方向。

## 当前实施状态

- 已完成新产品路由骨架、AI workbench 前端 view model/fixtures、主导航 IA 收敛和 AI Inbox 首次 onboarding。
- 进度和验收记录以 [../../tasks/todo.md](../../tasks/todo.md) 为准。
- 阶段计划以 [../../tasks/plan.md](../../tasks/plan.md) 为准。

## 文档边界

- 本目录是新方案权威入口。
- `docs/assets/` 只保留图片和品牌资源，不承载方案说明。
- 新增方案文档继续使用两位编号前缀，例如 `04-demo-script.md`、`05-launch-checklist.md`。
