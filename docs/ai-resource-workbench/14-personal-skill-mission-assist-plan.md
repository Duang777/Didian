# Personal Skill Mission Assist

## Goal

把个人 Skill 从“库里可查看”推进到“创建 Mission 时可被使用”。第一版不新增数据库关系表，先在 AI Inbox 中根据用户输入和链接推荐已启用的个人 Skill，由用户显式选择后创建 Mission，并把选择写入 Mission 描述，同时记录 Skill 使用次数。

## Product Flow

1. 用户在 AI Inbox 输入一个需求、链接或资源集合。
2. 前端读取当前 workspace 已启用的个人 Skill。
3. 系统用本地确定性匹配给出少量推荐：来源域名、触发词、能力说明、页面类型和任务意图。
4. 用户可以点选一个或多个 Skill，也可以完全忽略推荐。
5. 创建 Mission 时，Mission 描述包含“使用的个人能力”交接块，告诉本地 Codex 应该按哪些能力执行。
6. Mission 创建成功后调用个人 Skill 使用接口，更新使用次数；使用记录失败不回滚 Mission。

## Non-Goals

- 不在本切片做 Mission-Skill 数据库关联表。
- 不改 Agent runtime 执行协议。
- 不把推荐逻辑伪装成 AI 判断；本切片是轻量匹配，后续可替换为后端 AI 评分。
- 不改变已有收藏、Atlas、Mission 创建和重复 Mission 检查逻辑。

## API And Interface Contract

使用现有接口：

- `GET /workspaces/:id/personal-skills?enabled=true`
- `POST /workspaces/:id/personal-skills/:skillId/use`
- `POST /ai-inbox/missions`

前端内部新增匹配结果模型：

```ts
type PersonalSkillRecommendation = {
  skill: PersonalSkill;
  score: number;
  reasons: string[];
};
```

匹配规则只影响前端展示，不作为后端可信判断。

## UI Rules

- 推荐区只在用户输入后出现。
- 最多展示 3 个推荐，避免把 AI Inbox 变成 Skill 列表页。
- 推荐项是可切换按钮，使用 `aria-pressed` 表达选中态。
- 文案避免“魔法感”：使用“匹配到个人能力”，明确用户可以不选。
- 不新增大面积装饰，不破坏 AI Inbox 当前任务输入的主路径。

## Implementation Slice

本次只做一个可验证闭环：

- AI Inbox 读取已启用 Personal Skills。
- 根据输入和链接给出最多 3 个推荐。
- 用户点选推荐。
- 创建 Mission 的描述包含选中的 Skill 交接块。
- Mission 创建成功后记录 Skill use count。
- 测试覆盖推荐展示、选择、Mission payload 和 use-count 调用。

## Quality Bar

- 推荐逻辑是纯函数，便于测试和替换。
- Mission 创建成功不依赖 Skill 使用统计成功。
- 未登录、无 Skill、Skill 查询失败时不阻断 Mission 创建。
- 不提交无关未跟踪文件。

## Future Work

- 后端 AI 初筛：收藏入库后生成更具体的能力方向和问题。
- Mission-Skill 关联表：在 Mission 侧栏展示已使用 Skill、运行产物和效果反馈。
- Agent runtime 注入：把选中 Skill 以结构化上下文传给本地 runtime，而不是仅写入描述。
- 使用反馈：Mission 完成后让用户评价 Skill 是否有用，反哺推荐。
