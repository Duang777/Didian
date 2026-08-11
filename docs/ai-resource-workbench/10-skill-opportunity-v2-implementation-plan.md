# V2 实现规划：个人 Skill 草稿生成（Personal Skill Draft）

> 配套 PRD：`09-personal-skills-from-bookmarks-prd.md`（V2 见第 15 节）。
> 本文是「Skill Opportunity V1 前端缺口」之后的下一步实现蓝图，落点在 `packages/core/personal-skills/*`、`server/internal/{service,handler}/*`、`packages/views/skills/*`。
> **状态：规划已就绪，DB 迁移部分待用户确认（PRD 12.2 Ask First）后方可落地。**

---

## 1. 目标与范围

对齐 PRD V2（第 4.4 / 7 / 9.3 / 9.4 / 15 节）：

- 用户在 capture 详情页点「生成 Skill」→ 创建 **SkillProposal**（`accepted`）→ 异步生成 **PersonalSkill 草稿** → **Skill Draft Review** → 用户确认启用（`active`）/ 编辑后启用 / 保留草稿 / 放弃。
- 全程可追溯来源 capture 与 URL；草稿 review 之前绝不进个人 Skill 库。
- 复用现有 **Mission / Codex Run** 语义做深处理生成（PRD 11.1、4.4），产品上表现为「生成个人 Skill 草稿」。
- 本次**不含** V3 关系图谱表与 V4 反馈学习（见第 9 节切片），但数据模型预留扩展位。

**非目标（PRD 3.2 / 12.3）**：不团队共享、不公开、不自动启用、不改公共 `skill` 表语义、不复制网页大段内容进 Skill。

---

## 2. 设计原则（硬约束）

1. 网页正文 = 不可信输入；LLM 产出必须过 schema 校验（12.1）。
2. Skill 生成必须保留来源卡片 + 证据（12.1）。
3. 启用必须用户确认（12.1 / 12.3 Never）。
4. 生成失败不能污染原 capture 卡片（12.1 / 12.3）。
5. **不修改公共 `skill` 表语义**：V2 走独立 `personal_skill` 适配器（PRD 16 风险项），公共 `skill` 表保持 workspace 级不变。
6. **新增 DB 迁移属于 PRD 12.2 Ask First**：本文 §3 的迁移 SQL 在用户明确批准前**不创建、不应用**。

---

## 3. 数据模型与迁移（Ask First）

现有 `skill` 表（迁移 008）是 workspace 级公共模型（`content`/`config`/agent 多对多），**V2 不动它**。新增三张表：

### 3.1 `skill_proposal`（候选建议持久化，对齐 PRD 7.2）

```sql
CREATE TABLE skill_proposal (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    owner_user_id   UUID REFERENCES "user"(id),
    source_card_id  UUID NOT NULL REFERENCES captured_source(id) ON DELETE CASCADE,
    page_type       TEXT NOT NULL DEFAULT 'unknown',
    title           TEXT NOT NULL,
    capability      TEXT NOT NULL DEFAULT '',
    why_useful      TEXT NOT NULL DEFAULT '',
    confidence      DOUBLE PRECISION NOT NULL DEFAULT 0,
    trigger_examples JSONB NOT NULL DEFAULT '[]',
    expected_inputs  JSONB NOT NULL DEFAULT '[]',
    expected_outputs JSONB NOT NULL DEFAULT '[]',
    evidence_snippets JSONB NOT NULL DEFAULT '[]',
    risk_notes       JSONB NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested','accepted','dismissed','muted','converted_to_draft')),
    generated_skill_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_skill_proposal_workspace ON skill_proposal(workspace_id);
CREATE INDEX idx_skill_proposal_card ON skill_proposal(source_card_id);
```

### 3.2 `personal_skill`（个人 Skill 草稿/启用，对齐 PRD 7.1）

```sql
CREATE TABLE personal_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    owner_user_id   UUID REFERENCES "user"(id),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('api_integration','repo_research','tutorial_workflow','debugging','evaluation','other')),
    source_card_ids JSONB NOT NULL DEFAULT '[]',
    source_urls     JSONB NOT NULL DEFAULT '[]',
    trigger_examples JSONB NOT NULL DEFAULT '[]',
    input_schema    JSONB,
    output_format   TEXT,
    instructions    TEXT NOT NULL DEFAULT '',
    evidence_summary TEXT NOT NULL DEFAULT '',
    limitations     JSONB NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','archived')),
    proposal_id     UUID REFERENCES skill_proposal(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_personal_skill_workspace ON personal_skill(workspace_id);
CREATE INDEX idx_personal_skill_status ON personal_skill(workspace_id, status);
```

### 3.3 `knowledge_relation`（V3 局部关系，本次预留，可选落地）

对齐 PRD 7.3，轻量关系表，不引图数据库。本次可只建表 + 写入 `capture → personal_skill` 的 `derived_skill` 边，Atlas 展示留到 V3。

> **迁移编号**：当前最大已应用为 164。新增 165（`skill_proposal`）、166（`personal_skill`）、167（`knowledge_relation`，若本次含 V3）。

---

## 4. 后端架构

对齐 PRD 11.3 建议目录：

```
server/internal/service/
  skill_opportunity.go        # 已有：规则判断（V1）
  personal_skill_generation.go # 新增：proposal 落库 + 触发 Codex Run + 草稿落库
server/internal/handler/
  skill_proposal.go           # 新增：CRUD + generate
  personal_skill.go           # 新增：list / get / enable / update / discard
server/pkg/db/queries/
  skill_proposal.sql          # 新增（sqlc）
  personal_skill.sql          # 新增（sqlc）
```

**生成流程（`personal_skill_generation.go`）**：

1. `POST /api/skill-proposals`：`{ captureId, opportunitySnapshot }` → 写入 `skill_proposal`（status=`accepted`）。
2. 同一请求或 `POST /api/skill-proposals/{id}/generate` → 用 `captured_source` 正文 + `skill_opportunity` + 固定生成 prompt，投递一个 **Codex Run（Mission）**。
3. Codex Run 产出结构化草稿，过 JSON schema 校验（名称/描述/分类/触发/输入输出/说明/证据/限制）→ 写入 `personal_skill`（status=`draft`），`skill_proposal.status=converted_to_draft`、`generated_skill_id` 回写。
4. 写入 `knowledge_relation`（capture → personal_skill，`derived_skill`）。
5. 任一环节失败：原 `skill_proposal` 标记 `dismissed`/保留，原 capture 卡片不受影响（12.1）。

**Codex Run 输出 schema（必须校验）**：

```ts
type GeneratedSkillDraft = {
  title: string
  description: string
  category: "api_integration" | "repo_research" | "tutorial_workflow" | "debugging" | "evaluation" | "other"
  triggerExamples: string[]
  inputSchema?: Record<string, unknown>
  outputFormat?: string
  instructions: string
  evidenceSummary: string
  limitations: string[]
}
```

---

## 5. API 契约

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/skill-proposals` | 从 capture 创建并 accepted（body: captureId + opportunity 快照） |
| GET | `/api/skill-proposals/{id}` | 取 proposal + 关联草稿状态 |
| POST | `/api/skill-proposals/{id}/generate` | 触发 Codex Run 生成草稿 |
| GET | `/api/personal-skills?workspace_id=&status=` | 个人 Skill 库列表 |
| GET | `/api/personal-skills/{id}` | 草稿/已启用详情 |
| PUT | `/api/personal-skills/{id}` | 编辑草稿 |
| POST | `/api/personal-skills/{id}/enable` | 启用（active） |
| POST | `/api/personal-skills/{id}/discard` | 放弃（保留 proposal，标记草稿归档） |

> 详情接口**必须带 `workspace_id`（或 slug）**，否则 400（与现有 `/api/browser-captures`、`/api/issues` 一致，见 2026-08-11 验收记录）。

---

## 6. 前端

对齐 PRD 11.3 建议目录：

```
packages/core/personal-skills/
  types.ts        # PersonalSkill / SkillProposal / KnowledgeRelation + API req/res
  queries.ts      # useSkillProposal / usePersonalSkillLibrary / usePersonalSkill
  mutations.ts    # createSkillProposal / generateSkillDraft / enable / update / discard
packages/views/skills/
  skill-draft-review.tsx     # PRD 9.3：review + 启用/编辑/保留/放弃
  personal-skill-library.tsx # PRD 9.4：搜索/分类/状态/来源追溯/归档
```

**接入点**：`capture-detail-page.tsx` 的 `SkillOpportunityCard` 当前 `onGenerate` 为 `undefined`（禁用）。V2 改为：

```tsx
<SkillOpportunityCard
  opportunity={capture.skillOpportunity}
  domain={capture.domain}
  onGenerate={() => handleGenerateSkill(capture)}
  onKeepAsKnowledge={...}
  onMutePageType={handleMutePageType}
/>
```

`handleGenerateSkill`：`createSkillProposal` → 路由到 `/skills/draft/{proposalId}`（Skill Draft Review 页，轮询生成状态）。

**文案**：沿用 PRD 10 原则——描述能力不炫耀 AI；状态文案「Skill 草稿已生成 / 已加入个人 Skill 库」。

---

## 7. 质量门槛与验收（对齐 PRD 13 / 14）

- Skill 草稿 100% 带来源证据与来源卡片可追溯。
- 启用前必须 review + 确认；生成失败原卡片可重试、不丢数据。
- 低置信度页面只进知识卡，不推荐 Skill（V1 已控）。
- 单测覆盖：proposal 状态机、Codex 输出 schema 校验失败降级、来源关系写入。前端覆盖：onGenerate 跳转、draft review 四动作、library 过滤。
- 指标埋点（PRD 14）：候选接受率、草稿启用率、少推荐点击率。

---

## 8. 风险与注意

| 风险 | 应对 |
| --- | --- |
| 与公共 `skill` 表冲突 | 独立 `personal_skill` 表 + adapter，不改公共语义（PRD 16） |
| LLM 输出污染库 | 严格 schema 校验 + 状态机 + 失败可重试 |
| 生成质量不稳 | Draft Review 人工确认 + 来源证据 + 结构化输入输出 |
| 迁移需审批 | §3 三张表均属 12.2 Ask First，用户批准后再建 |

---

## 9. 交付切片（建议顺序）

- **切片 1（无迁移，可立即做）**：`packages/core/personal-skills/types.ts` 契约 + 前端 `skill-draft-review.tsx` / `personal-skill-library.tsx` 骨架（按契约 mock）+ `capture-detail-page` 的 `onGenerate` 接线。→ 提交（本地回滚点）。
- **切片 2（需 Ask First 批准）**：§3 迁移 SQL（165/166/167）+ `server` service/handler/sqlc + 接真实 API。→ 批准后再提交。
- **切片 3（可选，V3）**：`knowledge_relation` 写入 + Atlas 局部节点视图。

> 当前阻塞点：切片 2 的新增迁移需用户按 PRD 12.2 明确确认。切片 1 不依赖迁移，可先行交付。
