-- Link Missions (issues) to the personal capabilities selected for the work.
-- The capability itself lives in personal_skill; this table records usage intent
-- and gives Mission detail a durable, structured source of truth.

CREATE TABLE issue_personal_skill (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issue(id) ON DELETE CASCADE,
    personal_skill_id UUID NOT NULL REFERENCES personal_skill(id) ON DELETE CASCADE,
    selected_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    usage_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(issue_id, personal_skill_id)
);

CREATE INDEX idx_issue_personal_skill_issue ON issue_personal_skill(issue_id);
CREATE INDEX idx_issue_personal_skill_workspace ON issue_personal_skill(workspace_id);
CREATE INDEX idx_issue_personal_skill_skill ON issue_personal_skill(personal_skill_id);
