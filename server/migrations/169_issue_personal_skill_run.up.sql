-- Capability usage runs: tracks how selected Mission capabilities flow through
-- agent task lifecycle. `issue_personal_skill` answers "selected for this
-- Mission"; this table answers "used by this task, with this status/result".

CREATE TABLE issue_personal_skill_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES issue(id) ON DELETE CASCADE,
    issue_personal_skill_id UUID NOT NULL REFERENCES issue_personal_skill(id) ON DELETE CASCADE,
    personal_skill_id UUID NOT NULL REFERENCES personal_skill(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES agent_task_queue(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'queued',
    result_summary TEXT NOT NULL DEFAULT '',
    error TEXT NOT NULL DEFAULT '',

    queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT issue_personal_skill_run_status_check
      CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
    UNIQUE(issue_personal_skill_id, task_id)
);

CREATE INDEX idx_issue_personal_skill_run_issue ON issue_personal_skill_run(issue_id, created_at DESC);
CREATE INDEX idx_issue_personal_skill_run_task ON issue_personal_skill_run(task_id);
CREATE INDEX idx_issue_personal_skill_run_skill ON issue_personal_skill_run(personal_skill_id, created_at DESC);
CREATE INDEX idx_issue_personal_skill_run_workspace ON issue_personal_skill_run(workspace_id);
