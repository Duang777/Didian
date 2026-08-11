# Skill Center V1 实现计划

> 对应当前 buddy 分支的下一步收口：把 `Skill Proposal` 草稿、已启用的个人 Skill、来源追溯与删除/使用操作集中到一个可操作页面里。

---

## 1. 目标

把「收藏网页 → 生成草稿 → 审阅 → 启用 → 复用/删除」做成一个完整的 Skill Center：

- 草稿能看见，能进审阅页。
- 已启用的个人 Skill 能看见，能使用，能删除。
- 草稿和个人 Skill 都能回到来源收藏。
- 不改 workspace 级公共 `skill` 语义，只做个人能力层的管理面板。

---

## 2. 产品结构

### 2.1 入口

- 复用现有的 `/[workspaceSlug]/skill-proposals` 路由，作为 Skill Center 入口。
- 详情审阅页继续放在 `/[workspaceSlug]/skill-proposals/[id]`。

### 2.2 页面布局

Skill Center 分成两个区块：

1. **Skill 草稿**
   - 展示 `skill_proposal` 列表
   - 支持打开审阅页
   - 支持删除草稿

2. **个人 Skill 库**
   - 展示 `personal_skill` 列表
   - 支持使用一次、重新打开草稿、删除
   - 展示来源 URL / 域名 / 使用次数 / 启用状态

---

## 3. 设计原则

1. **不污染 workspace skills**：个人能力和工作区公共 skills 保持分表、分视图。
2. **所有操作可逆或可追溯**：删除草稿 / 删除个人 Skill 都有确认。
3. **保留来源链路**：每个卡片都能回到 capture 或原始 URL。
4. **先可用，再谈更智能**：V1 先把操作闭环做实，V2 再做关系图谱和反馈学习。

---

## 4. 交付切片

### 切片 A

- 新增 Skill Center 页面
- 接入 proposal / personal skill 列表
- 支持打开审阅、使用一次、删除

### 切片 B

- 审阅页确认后跳转 Skill Center
- 补齐入口与导航 CTA

### 切片 C

- 引入 Atlas / knowledge relation 的可视化
- 再做基于使用数据的质量学习

---

## 5. 验收标准

- 从 capture 生成 Skill 草稿后，能在 Skill Center 看到对应草稿。
- 启用后能在个人 Skill 库看到该 Skill。
- 草稿、个人 Skill 都能删除。
- 个人 Skill 支持使用一次并回写使用次数。
- 审阅页确认后，用户会被带到 Skill Center，而不是留在半完成状态。

