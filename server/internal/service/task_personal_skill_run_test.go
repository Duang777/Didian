package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/didian-ai/didian/server/internal/events"
	"github.com/didian-ai/didian/server/internal/util"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type personalSkillRunFixture struct {
	workspaceID pgtype.UUID
	userID      pgtype.UUID
	runtimeID   pgtype.UUID
	agentID     pgtype.UUID
	issue       db.Issue
	skill       db.PersonalSkill
}

func createPersonalSkillRunFixture(t *testing.T, ctx context.Context, pool *pgxpool.Pool, q *db.Queries) personalSkillRunFixture {
	t.Helper()

	suffix := time.Now().UnixNano()
	email := fmt.Sprintf("personal-skill-run-%d@didian.ai", suffix)
	slug := fmt.Sprintf("personal-skill-run-%d", suffix)

	var userID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO "user" (name, email) VALUES ($1, $2) RETURNING id
	`, "Personal Skill Run Test", email).Scan(&userID); err != nil {
		t.Fatalf("create user: %v", err)
	}

	var workspaceID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO workspace (name, slug, description, issue_prefix)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, "Personal Skill Run Test", slug, "temporary personal skill run test workspace", "PSR").Scan(&workspaceID); err != nil {
		t.Fatalf("create workspace: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO member (workspace_id, user_id, role) VALUES ($1, $2, 'owner')
	`, workspaceID, userID); err != nil {
		t.Fatalf("create member: %v", err)
	}

	var runtimeID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO agent_runtime (
			workspace_id, daemon_id, name, runtime_mode, provider,
			status, device_info, metadata, last_seen_at, visibility, owner_id
		)
		VALUES ($1, NULL, $2, 'local', 'codex', 'online', 'test runtime', '{}'::jsonb, now(), 'private', $3)
		RETURNING id
	`, workspaceID, "Personal Skill Runtime", userID).Scan(&runtimeID); err != nil {
		t.Fatalf("create runtime: %v", err)
	}

	var agentID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO agent (
			workspace_id, name, description, runtime_mode, runtime_config,
			runtime_id, visibility, max_concurrent_tasks, owner_id
		)
		VALUES ($1, $2, '', 'local', '{}'::jsonb, $3, 'private', 1, $4)
		RETURNING id
	`, workspaceID, "Personal Skill Agent", runtimeID, userID).Scan(&agentID); err != nil {
		t.Fatalf("create agent: %v", err)
	}

	issue, err := q.CreateIssue(ctx, db.CreateIssueParams{
		WorkspaceID:  workspaceID,
		Title:        "Use selected personal capability",
		Description:  pgtype.Text{String: "Mission should use the selected capability.", Valid: true},
		Status:       "todo",
		Priority:     "none",
		AssigneeType: pgtype.Text{String: "agent", Valid: true},
		AssigneeID:   agentID,
		CreatorType:  "member",
		CreatorID:    userID,
		Number:       1,
		Position:     1,
	})
	if err != nil {
		t.Fatalf("create issue: %v", err)
	}

	skill, err := q.CreatePersonalSkill(ctx, db.CreatePersonalSkillParams{
		WorkspaceID:      workspaceID,
		Name:             "Repo adoption assistant",
		Description:      "Evaluate whether a bookmarked repo should be adopted.",
		Capability:       "Read project facts, compare fit, and produce an adopt/pilot/defer recommendation.",
		PageType:         "github_repo",
		Trigger:          "When a Mission asks for repo adoption guidance.",
		ExpectedInput:    "Repo URL, project goal, integration constraints.",
		ExpectedOutput:   "Recommendation, risks, and next steps.",
		Instructions:     "Use upstream evidence and produce a compact recommendation.",
		SourceUrl:        pgtype.Text{String: "https://github.com/example/repo", Valid: true},
		SourceDomain:     pgtype.Text{String: "github.com", Valid: true},
		EvidenceSnippets: []byte(`["README and releases are relevant evidence."]`),
		RiskNotes:        []byte(`["Refresh upstream facts before recommending."]`),
		Enabled:          true,
		CreatedBy:        userID,
	})
	if err != nil {
		t.Fatalf("create personal skill: %v", err)
	}
	if _, err := q.CreateIssuePersonalSkill(ctx, db.CreateIssuePersonalSkillParams{
		WorkspaceID:     workspaceID,
		IssueID:         issue.ID,
		PersonalSkillID: skill.ID,
		SelectedBy:      userID,
		Source:          "test",
		UsageNote:       "Use this capability for the Mission plan.",
	}); err != nil {
		t.Fatalf("create issue personal skill link: %v", err)
	}

	t.Cleanup(func() {
		c := context.Background()
		pool.Exec(c, `DELETE FROM workspace WHERE id = $1`, workspaceID)
		pool.Exec(c, `DELETE FROM "user" WHERE id = $1`, userID)
	})

	return personalSkillRunFixture{
		workspaceID: workspaceID,
		userID:      userID,
		runtimeID:   runtimeID,
		agentID:     agentID,
		issue:       issue,
		skill:       skill,
	}
}

func mustTaskResult(t *testing.T, taskID pgtype.UUID, output string) []byte {
	t.Helper()
	result, err := json.Marshal(map[string]any{
		"task_id": util.UUIDToString(taskID),
		"output":  output,
	})
	if err != nil {
		t.Fatalf("marshal task result: %v", err)
	}
	return result
}

func requirePersonalSkillRuns(t *testing.T, ctx context.Context, q *db.Queries, fixture personalSkillRunFixture, want int) []db.ListIssuePersonalSkillRunsRow {
	t.Helper()
	runs, err := q.ListIssuePersonalSkillRuns(ctx, db.ListIssuePersonalSkillRunsParams{
		IssueID:     fixture.issue.ID,
		WorkspaceID: fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("ListIssuePersonalSkillRuns: %v", err)
	}
	if len(runs) != want {
		t.Fatalf("personal skill runs len = %d, want %d: %+v", len(runs), want, runs)
	}
	return runs
}

func claimPersonalSkillRunTask(t *testing.T, ctx context.Context, svc *TaskService, fixture personalSkillRunFixture, task db.AgentTaskQueue) db.AgentTaskQueue {
	t.Helper()
	claimed, err := svc.ClaimTask(ctx, fixture.agentID)
	if err != nil {
		t.Fatalf("ClaimTask: %v", err)
	}
	if claimed == nil {
		t.Fatal("ClaimTask returned nil task")
	}
	if claimed.ID != task.ID {
		t.Fatalf("claimed task = %s, want %s", util.UUIDToString(claimed.ID), util.UUIDToString(task.ID))
	}
	return *claimed
}

func TestEnqueueTaskForIssueCreatesQueuedPersonalSkillRun(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createPersonalSkillRunFixture(t, ctx, pool, q)
	svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

	task, err := svc.EnqueueTaskForIssue(ctx, fixture.issue)
	if err != nil {
		t.Fatalf("EnqueueTaskForIssue: %v", err)
	}

	runs := requirePersonalSkillRuns(t, ctx, q, fixture, 1)
	run := runs[0]
	if run.TaskID != task.ID || run.PersonalSkillID != fixture.skill.ID {
		t.Fatalf("run ids = task %s skill %s, want task %s skill %s", util.UUIDToString(run.TaskID), util.UUIDToString(run.PersonalSkillID), util.UUIDToString(task.ID), util.UUIDToString(fixture.skill.ID))
	}
	if run.Status != "queued" || !run.QueuedAt.Valid || run.StartedAt.Valid || run.CompletedAt.Valid {
		t.Fatalf("queued run state = %+v", run)
	}
}

func TestPersonalSkillRunFollowsTaskLifecycle(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createPersonalSkillRunFixture(t, ctx, pool, q)
	svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

	task, err := svc.EnqueueTaskForIssue(ctx, fixture.issue)
	if err != nil {
		t.Fatalf("EnqueueTaskForIssue: %v", err)
	}
	claimed := claimPersonalSkillRunTask(t, ctx, svc, fixture, task)
	if _, err := svc.StartTask(ctx, claimed.ID); err != nil {
		t.Fatalf("StartTask: %v", err)
	}
	if runs := requirePersonalSkillRuns(t, ctx, q, fixture, 1); runs[0].Status != "running" || !runs[0].StartedAt.Valid {
		t.Fatalf("running run state = %+v", runs[0])
	}

	if _, err := svc.CompleteTask(ctx, claimed.ID, mustTaskResult(t, claimed.ID, "Capability produced an adopt recommendation with risks."), "", ""); err != nil {
		t.Fatalf("CompleteTask: %v", err)
	}
	run := requirePersonalSkillRuns(t, ctx, q, fixture, 1)[0]
	if run.Status != "succeeded" || !run.CompletedAt.Valid {
		t.Fatalf("completed run state = %+v", run)
	}
	if !strings.Contains(run.ResultSummary, "adopt recommendation") || run.Error != "" {
		t.Fatalf("result/error = %q/%q, want summary without error", run.ResultSummary, run.Error)
	}
}

func TestPersonalSkillRunRecordsFailureAndCancellation(t *testing.T) {
	t.Run("failed", func(t *testing.T) {
		pool := newHeadShaDedupPool(t)
		ctx := context.Background()
		q := db.New(pool)
		fixture := createPersonalSkillRunFixture(t, ctx, pool, q)
		svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

		task, err := svc.EnqueueTaskForIssue(ctx, fixture.issue)
		if err != nil {
			t.Fatalf("EnqueueTaskForIssue: %v", err)
		}
		claimed := claimPersonalSkillRunTask(t, ctx, svc, fixture, task)
		if _, err := svc.StartTask(ctx, claimed.ID); err != nil {
			t.Fatalf("StartTask: %v", err)
		}
		if _, err := svc.FailTask(ctx, claimed.ID, "agent could not read source", "", "", "agent_error"); err != nil {
			t.Fatalf("FailTask: %v", err)
		}
		run := requirePersonalSkillRuns(t, ctx, q, fixture, 1)[0]
		if run.Status != "failed" || run.Error != "agent could not read source" || !run.CompletedAt.Valid {
			t.Fatalf("failed run state = %+v", run)
		}
	})

	t.Run("cancelled", func(t *testing.T) {
		pool := newHeadShaDedupPool(t)
		ctx := context.Background()
		q := db.New(pool)
		fixture := createPersonalSkillRunFixture(t, ctx, pool, q)
		svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

		task, err := svc.EnqueueTaskForIssue(ctx, fixture.issue)
		if err != nil {
			t.Fatalf("EnqueueTaskForIssue: %v", err)
		}
		if _, err := svc.CancelTask(ctx, task.ID); err != nil {
			t.Fatalf("CancelTask: %v", err)
		}
		run := requirePersonalSkillRuns(t, ctx, q, fixture, 1)[0]
		if run.Status != "cancelled" || run.Error == "" || !run.CompletedAt.Valid {
			t.Fatalf("cancelled run state = %+v", run)
		}
	})
}
