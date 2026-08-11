# 个人 Skill 高质量开发方法论（V2→V4 路线图）

> 配套实现计划：`10-skill-opportunity-v2-implementation-plan.md`
> 本文件回答两个问题：**后续代码怎么落地**，以及**怎么把 Skill 做成高质量的**。

---

## 0. 当前进度（截至本文件撰写时）

- **V1（已上线）**：后端 detector 判断 `skill_opportunity`，前端在 capture 详情页展示候选 + 本地降噪偏好。
- **V2（本轮已提交 `c00775c7a`）**：从候选「生成 Skill 草稿」→ 草稿审阅页微调 → 确认启用为个人 Skill。
  - 库表：`skill_proposal`(165) / `personal_skill`(166) / `knowledge_relation`(167)。
  - `personal_skill` 独立成表，**不动公共 `skill` 表语义**（PRD 16 风险规避）。
  - 生成器是**确定性**的（`provider=local`，不依赖外部 LLM），可跑、可测、零 API key。

---

## 1. 高质量 Skill 的三条铁律

| 维度 | 含义 | 落在哪 |
| --- | --- | --- |
| **可复用（reusable）** | 不是一次性笔记，而是「换一个同类网页也能用」的能力 | `reusable_workflow_score` |
| **可指令化（instruction_dense）** | 步骤清晰到能直接照做，不是泛泛而谈 | `instruction_density_score` |
| **前瞻有用（future_use）** | 现在不紧急，但未来大概率还要用 | `future_use_score` |

V2 已经在 `skill_proposal` 留了这三个评分字段（当前由 V1 detector 用规则粗填）。**高质量的核心，是让这三个分数从「规则估算」逐步升级为「真实反馈学习」**——这正是 V3/V4 的差异。

---

## 2. V3：Atlas 局部关系（让 Skill 之间能互相关联）

**目标**：个人 Skill 不是孤岛。`knowledge_relation`(167) 记录「Skill A ↔ 网页/捕获/其他 Skill」的关系边，Atlas 页面据此画出「你的能力图谱」。

**代码落地方法**
- 复用已建好的 `knowledge_relation` 表，先补 sqlc query：`UpsertKnowledgeRelation`、`ListRelationsForSkill`、`ListRelationsForSource`。
- 在 `confirmSkillProposal` 落库时，**自动建一条 `source → personal_skill` 的 `derived_from` 边**（零额外交互成本）。
- Atlas 前端新增 `personalSkills` 维度：把 `usePersonalSkills()` 的数据叠加到现有图谱节点上，enabled 的 Skill 用高亮色。
- 关系类型枚举：`derived_from`(源自捕获) / `related_to`(同类 Skill) / `supersedes`(被新版取代)。

**质量收益**：用户能在 Atlas 看到「我其实已经攒了 12 个 GitHub 类 Skill」，从而主动合并冗余、提升复用率。

---

## 3. V4：质量学习闭环（让分数真正变准）

**目标**：三个质量分数不再由规则拍脑袋，而是从**真实使用信号**回归学习。

**代码落地方法**
- 已在 `personal_skill` 留 `use_count`、`enabled` 字段；V4 加 `last_used_at`、`rejected_count`。
- `usePersonalSkill(id)` 每次被调用 → `use_count + 1`、`last_used_at = now()`（已在 V2 handler 实现）。
- 学习信号来源（按可信度排序）：
  1. **显式反馈**：用户在草稿审阅页「拒绝」→ `rejected_count + 1`；启用后手动编辑 instructions → 说明初始生成不够准。
  2. **隐式反馈**：`use_count` 高且从未被编辑 → 该 Skill 质量高；高 `rejected_count` → 该类 page_type 的 detector 阈值要调。
  3. **同类聚合**：同一 page_type 下被频繁启用的提案，其 `draft_instructions` 模板可沉淀为「该类型的默认指令骨架」。
- **不要一上来就上 ML**：V4 第一版用「规则 + 计数阈值」做轻量自适应（例如 `use_count >= 5` 且 `rejected_count == 0` 的 Skill，其 instruction 模板自动提升为该 page_type 的候选默认），等数据量够再考虑离线回归。

**质量收益**：生成器越用越懂你，误推荐率下降，降噪偏好（V1 的 localStorage mute）可以逐步「毕业」到后端（V4 后半段）。

---

## 4. 生成器本身的演进路径（确定性 → LLM）

V2 用确定性生成器是为了「永远可跑、可测、不卡 API key」。升级路线：

1. **V2（现在）**：纯规则拼装 `proposed_capability` / `draft_description` 等文案，复用 V1 detector 的 `proposedSkill*` 函数。
2. **V2.5（可选）**：把生成器抽成 `SkillDraftGenerator` 接口，`LocalGenerator`(确定性) 与 `CodexGenerator`(调 LLM) 两套实现；通过 env 开关切换，互不干扰。
3. **V3**：对 `instruction_density_score >= 0.7` 的高价值网页，默认走 LLM 生成更细的 instructions；低分仍走本地，省 token。

> 接口抽象是关键：handler 只依赖 `SkillDraftGenerator` 接口，换实现不改调用方。

---

## 5. 安全与边界（PRD 12.2 / 12.3，不可逾越）

- **Ask First**：任何新增 DB 迁移、改公共 `skill` 表语义、把个人 Skill 变「团队共享/公开/自动启用」——**先问用户再动**。
- **Never**：第一版只做个人能力，不团队共享、不公开、不自动启用。
- `personal_skill` 与公共 `skill` 永远是两张表；前者带 `source_url` / `proposal_id` 溯源，后者是工作区级 agent 关联模型，互不污染。
- LLM 生成的内容一律走「草稿 → 人工审阅 → 确认启用」，绝不直接落库为启用状态（防幻觉污染能力库）。

---

## 6. 后续代码实现 checklist（按提交粒度）

- [ ] **V3 sqlc + handler**：`knowledge_relation` 的 upsert/list；confirm 时自动建 `derived_from` 边。
- [ ] **V3 前端**：Atlas 叠加个人 Skill 节点；capture 详情页加「相关个人 Skill」区块。
- [ ] **V4 信号采集**：`rejected_count` / `last_used_at` 字段 + `rejectSkillProposal` 落库；`usePersonalSkill` 已递增 `use_count`。
- [ ] **V4 自适应**：规则版模板提升（同 page_type 高频启用的 instructions 沉淀为默认骨架）。
- [ ] **生成器接口化**：`SkillDraftGenerator` 抽象 + `LocalGenerator` / `CodexGenerator` 双实现 + env 切换。
- [ ] **降噪后端化**：V1 的 localStorage mute 在 V4 数据充足后迁移到 `knowledge_relation` 或独立 mute 表。

> 每完成一项单独 commit + push（fork `didian`），保持回滚点。
