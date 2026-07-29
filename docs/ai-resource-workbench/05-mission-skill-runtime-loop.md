# PRD: 收藏网页到 Mission Skill 使用闭环

## 1. Objective

Didian 要把用户收藏的网页转化成可复用的 Skill，并让这些 Skill 被用户本地连接的 agent runtime 在 Mission 执行时真实使用。成功体验不是“Skill 库里多了一张卡”，也不是系统替用户武断决定 Skill 方向，而是：

```text
收藏网页 -> 自动评估是否适合做 Skill -> 向用户解释可做成什么能力
-> 用户点击生成 -> 弹出方向确认问题 -> 本地 Codex 生成/完善 Skill -> Skill 入库
-> 创建 Mission 时推荐使用 -> 用户确认 -> 本地 runtime 注入 Skill
-> Mission 页面展示使用记录 -> 结果沉淀回 Skill / Atlas
```

第一版聚焦个人工作区和本地 runtime。团队共享、市场分发、自动更新和跨 workspace 复制后置。

## 2. Users And Jobs

### 主要用户

- 个人用户：收藏 GitHub repo、技术文档、论文、博客、产品页、教程，希望后续本地 agent 能用这些网页沉淀出的能力完成分析、集成、整理和复盘。
- 高级用户：关心某次 Mission 到底使用了哪些 Skill、哪个 runtime 使用、版本是否可追溯。

### 核心 Job

用户希望 Didian 自动发现“这个网页能变成什么能力”，生成后能在后续 Mission 里直接复用，并且在 Mission 页面清楚看到 Skill 参与了执行。

## 3. Product Principles

- Skill 是 runtime 能力包，不只是展示卡片。
- Mission 是 Skill 使用的审计现场，必须展示 used/injected/planned 记录。
- 平台负责发现、保存、推荐、分发、审计；本地 runtime 负责执行和生成结果。
- Skill 使用默认是 Mission 级临时选择，不默认永久污染 agent 的全局 skill set。
- 用户确认优先。自动推荐可以高置信显示，但第一版不静默注入。
- 推荐不是生成。推荐阶段只说明“这个网页可能适合沉淀成什么能力”；生成阶段必须先确认方向。
- 生成 Skill 前必须问清楚：用户要解决的重复任务、触发场景、必要输入、期望输出、边界和命名偏好。
- 每条 Skill 使用记录必须可回溯来源网页、Skill 版本、agent、runtime、task。

## 4. Scope

### MVP In Scope

- Skill 详情和收藏卡片能显示来源网页和生成状态。
- Mission 可保存 Skill 使用记录。
- Mission 详情可渲染 Used Skills 区块。
- 用户可以在 Mission 中手动添加/移除 Skill。
- task claim 时可读取 Mission planned skills 并注入给本地 runtime。
- claim 成功后记录 `injected` 状态、task、agent、runtime。
- API 和类型契约覆盖 Skill usage list/add/remove。

### Later

- 自动推荐 Skill。
- Mission 创建页推荐确认条。
- runtime 本地文件同步状态。
- agent 完成后回传“实际使用/跳过/建议更新 Skill”。
- Skill 版本 diff、发布流、团队共享、marketplace。
- embedding/semantic matching。

## 5. Data Model

### issue_skill_usage

Mission 级 Skill 使用记录。`issue` 是当前后端实现名，产品上显示为 Mission。

```sql
CREATE TABLE issue_skill_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issue(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_task_queue(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agent(id) ON DELETE SET NULL,
  runtime_id UUID REFERENCES agent_runtime(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'recommendation', 'capture_origin', 'slash_command', 'agent_default')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'injected', 'used', 'failed', 'skipped')),
  reason TEXT NOT NULL DEFAULT '',
  skill_version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(issue_id, skill_id)
);
```

Rationale:

- `agent_skill` 表示 agent 默认能力。
- `issue_skill_usage` 表示本次 Mission 使用能力。
- 两者分开，避免用户一次选择导致 agent 永久携带该 Skill。

### Later: issue_skill_suggestion

推荐记录后续单独建表。当前 MVP 在 capture 的 `skill_opportunity` JSON 中保存自动评估结果，并在用户确认生成时把方向确认写入 Skill `config.generation.direction`。

### Browser Capture Skill Direction

用户点击“生成 Skill”后，前端必须先收集方向确认，而不是直接创建 Skill。请求体：

```ts
type BrowserCaptureSkillDirection = {
  title: string;
  capability: string;
  primaryUseCase: string;
  triggerExamples: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  boundaries: string;
  notes?: string;
};
```

Rules:

- 默认值来自自动评估的 `SkillOpportunity`。
- 用户可以修改 Skill 名称和能力描述。
- 至少要有 `primaryUseCase`、`expectedInputs`、`expectedOutputs`。
- `boundaries` 用来阻止 Codex 把 Skill 做成泛泛总结，例如：“不要只总结 README；要沉淀成接入/排障/尽调流程”。
- 后端创建的 Skill 草稿和 Codex 生成 Mission 都必须引用这份 direction。

## 6. API Contract

### List Mission Skill Usage

```http
GET /api/issues/{issueId}/skills
```

Response:

```ts
type IssueSkillUsage = {
  id: string;
  issue_id: string;
  skill_id: string;
  skill_name: string;
  skill_description: string;
  skill_config?: Record<string, unknown>;
  source: "manual" | "recommendation" | "capture_origin" | "slash_command" | "agent_default";
  status: "planned" | "injected" | "used" | "failed" | "skipped";
  reason: string;
  task_id?: string;
  agent_id?: string;
  agent_name?: string;
  runtime_id?: string;
  runtime_name?: string;
  skill_version?: string;
  created_at: string;
  updated_at: string;
};
```

### Add Mission Skill

```http
POST /api/issues/{issueId}/skills
Content-Type: application/json

{
  "skill_id": "...",
  "source": "manual",
  "reason": "User selected this Skill for this Mission"
}
```

Rules:

- `skill_id` must belong to the same workspace as the issue.
- Duplicate add is idempotent and returns the existing row.
- Initial status is `planned`.

### Remove Mission Skill

```http
DELETE /api/issues/{issueId}/skills/{skillId}
```

Rules:

- Allowed for `planned` skills.
- For `injected/used/failed/skipped`, preserve audit history and return `409`.

### Manual Selection UI Contract

Mission 详情页提供第一版手动选择入口：

- `Skills` section header includes an add button.
- Add opens a command-style popover backed by workspace Skill list.
- Already selected Skills are hidden from the add list.
- Empty Skill library shows `No Skills available`.
- `POST` success closes popover and refreshes `GET /api/issues/{issueId}/skills`.
- Rows with status `planned` show a remove icon button.
- Rows with status other than `planned` do not show remove; they are audit history from runtime execution.
- `DELETE` success refreshes usage list.
- API errors show toast and keep existing UI state.
- Implemented in the right sidebar Mission `Skills` section: `+` opens the picker, planned rows expose remove, and injected/used records stay read-only.

This keeps the first UX intentionally simple: users decide which Skill a Mission should use before the next local runtime claim. The system does not silently attach generated Skills yet.

### Browser Capture Generated Skill CTA

Capture card has three phases:

1. **Skill 候选**：系统自动评估网页是否适合沉淀成 Skill，并展示推荐方向、置信度和原因。
2. **方向确认**：用户点击生成后弹窗确认 Skill 名称、用途、触发场景、输入、输出和边界；提交后才创建本地 Codex 生成 Mission。
3. **已生成/可使用**：一旦 Skill 入库，卡片展示 Skill 库链接和“用 Skill 创建 Mission”。

Once a browser capture has a generated platform Skill, the capture card becomes an entry point into Mission execution:

- The card reads Skill provenance from `skill.config.origin.capture_id`.
- The primary generation button stays disabled as `已生成` instead of offering duplicate generation.
- The card shows `打开 Skill`.
- The card exposes `用 Skill 创建 Mission` when the mapped Skill has a concrete `skill_id`.
- Clicking it creates a Mission from the capture title, URL, preview and Skill name.
- After the Mission is created, the client calls `POST /api/issues/{issueId}/skills` with:
  - `skill_id`: generated Skill id
  - `source`: `capture_origin`
  - `reason`: `Created from browser capture: {capture title}`
- Success shows the created Mission link in the same card status block.

This completes the MVP path: browser capture -> generated Skill -> Mission selected Skill -> local runtime injection on claim.

## 7. Runtime Injection Contract

When daemon claims a task:

1. Load agent default skills through existing `LoadAgentSkillBundles`.
2. Load `issue_skill_usage.status = planned` for the task issue.
3. Merge by `skill_id`, preserving agent default skills and issue selected skills.
4. Return merged `skills/skill_refs` in claim payload.
5. Mark matching usage rows as `injected` with `task_id`, `agent_id`, `runtime_id`.

The prompt should include a clear block:

```text
Mission selected skills:
- spider-rs/spider 尽调助手
  Reason: User selected this Skill for GitHub repo due diligence.
```

This block is trusted platform metadata. Skill file contents remain user/workspace-authored and should be treated as runtime context, not system authority.

## 8. UI Requirements

### AI Inbox Capture Card

- If Skill generated: show `已生成 Skill`.
- Show `打开 Skill`.
- Later: show `已用于 N 个 Mission`.

### Skill Library

- Left nav has Skills.
- Skill detail shows source page, generation Mission, usage count.
- Later: runtime sync status and version history.

### Mission Detail

Add `Used Skills` section:

- Empty state: `这个 Mission 还没有选择 Skill。`
- `+` action opens workspace Skill picker.
- Planned row: `Planned`.
- Injected row: `Injected into local Codex`.
- Used row: `Used`.
- Failed/skipped rows include reason.
- Each row links to Skill detail.
- Planned rows can be removed before runtime claim.
- If task/agent/runtime known, render them as compact metadata.

Right-side properties can show a compact `Skills` list after the main section is available.

## 9. Testing Strategy

- Backend handler tests:
  - list empty usage.
  - add skill from same workspace.
  - duplicate add is idempotent.
  - reject cross-workspace skill.
  - delete planned skill.
- Service/task tests:
  - issue planned Skill appears in claim bundle.
  - claim marks usage `injected`.
  - agent default and issue selected Skill de-dupe.
- Frontend tests:
  - Mission detail renders empty state.
  - Mission detail renders planned/injected usage rows.
  - Skill link points to `/workspace/skills/{id}`.

## 10. Success Criteria

- A generated Skill can be selected for a Mission.
- The Mission page shows that Skill as planned/injected.
- A local runtime claim receives the selected Skill bundle.
- The usage record stores task/agent/runtime after injection.
- Tests cover backend API, runtime injection, and Mission UI rendering.

## 11. Open Questions

- Should `DELETE` on injected usage become `skipped` instead of 409?
- Should Mission selected Skills be visible to all workspace members or only creator before team sharing exists?
- Should high-confidence generated Skill be auto-selected for the originating generation Mission, or only future Missions?
