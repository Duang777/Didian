-- Personal Skill: a Skill Proposal the user confirmed and enabled. Stored in its
-- own table so the shared `skill` table (migration 008, agent-facing) is untouched.
-- `proposal_id` keeps the lineage back to the draft that produced it.

CREATE TABLE personal_skill (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES skill_proposal(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    capability TEXT NOT NULL DEFAULT '',
    page_type TEXT NOT NULL,
    trigger TEXT NOT NULL DEFAULT '',
    expected_input TEXT NOT NULL DEFAULT '',
    expected_output TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',

    source_url TEXT,
    source_domain TEXT,
    evidence_snippets JSONB NOT NULL DEFAULT '[]',
    risk_notes JSONB NOT NULL DEFAULT '[]',

    enabled BOOLEAN NOT NULL DEFAULT true,
    use_count INTEGER NOT NULL DEFAULT 0,

    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(workspace_id, name)
);

CREATE INDEX idx_personal_skill_workspace ON personal_skill(workspace_id);
CREATE INDEX idx_personal_skill_proposal ON personal_skill(proposal_id);
CREATE INDEX idx_personal_skill_enabled ON personal_skill(workspace_id, enabled);
