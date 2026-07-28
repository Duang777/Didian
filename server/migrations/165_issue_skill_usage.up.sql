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

CREATE INDEX idx_issue_skill_usage_issue ON issue_skill_usage(issue_id);
CREATE INDEX idx_issue_skill_usage_skill ON issue_skill_usage(skill_id);
CREATE INDEX idx_issue_skill_usage_workspace ON issue_skill_usage(workspace_id);
CREATE INDEX idx_issue_skill_usage_planned ON issue_skill_usage(issue_id, status) WHERE status = 'planned';
