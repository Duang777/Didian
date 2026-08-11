-- Skill Proposal: a draft skill generated from a detected SkillOpportunity.
-- This is the V2 "个人 Skill 草稿" entity. It is intentionally separate from the
-- workspace-level `skill` table (migration 008) — personal skills are private to
-- the user and must not alter the shared/agent-facing skill semantics (PRD 16).

CREATE TABLE skill_proposal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    captured_source_id UUID REFERENCES captured_source(id) ON DELETE SET NULL,

    -- Imported verbatim from the detector's SkillOpportunity.
    proposed_title TEXT NOT NULL,
    proposed_capability TEXT NOT NULL,
    page_type TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    why_useful TEXT NOT NULL DEFAULT '',
    trigger_examples JSONB NOT NULL DEFAULT '[]',
    expected_inputs JSONB NOT NULL DEFAULT '[]',
    expected_outputs JSONB NOT NULL DEFAULT '[]',
    reusable_workflow_score DOUBLE PRECISION,
    instruction_density_score DOUBLE PRECISION,
    future_use_score DOUBLE PRECISION,
    evidence_snippets JSONB NOT NULL DEFAULT '[]',
    risk_notes JSONB NOT NULL DEFAULT '[]',

    -- Draft fields the user reviews / edits before enabling.
    draft_description TEXT NOT NULL DEFAULT '',
    draft_trigger TEXT NOT NULL DEFAULT '',
    draft_instructions TEXT NOT NULL DEFAULT '',

    -- draft | enabled | dismissed
    status TEXT NOT NULL DEFAULT 'draft',

    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_proposal_workspace ON skill_proposal(workspace_id);
CREATE INDEX idx_skill_proposal_captured_source ON skill_proposal(captured_source_id);
CREATE INDEX idx_skill_proposal_status ON skill_proposal(workspace_id, status);
