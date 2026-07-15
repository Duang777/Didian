package service

import (
	"context"
	"encoding/json"
	"errors"
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

func TestEnqueueBrowserMemoryEnrichmentTaskMarksMemoryProcessing(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createBrowserMemoryTaskFixture(t, ctx, pool, q, "codex", "online")
	wakeup := &stubWakeup{}
	svc := NewTaskService(q, pool, nil, events.New(), wakeup)

	task, err := svc.EnqueueBrowserMemoryEnrichmentTask(ctx, fixture.workspaceID, fixture.userID, fixture.capture.ID, fixture.agentID)
	if err != nil {
		t.Fatalf("EnqueueBrowserMemoryEnrichmentTask: %v", err)
	}

	if task.Priority != priorityToInt("low") {
		t.Fatalf("priority = %d, want low", task.Priority)
	}
	var payload BrowserMemoryEnrichmentContext
	if err := json.Unmarshal(task.Context, &payload); err != nil {
		t.Fatalf("unmarshal task context: %v", err)
	}
	if payload.Type != BrowserMemoryEnrichmentContextType {
		t.Fatalf("context type = %q, want %q", payload.Type, BrowserMemoryEnrichmentContextType)
	}
	if payload.CaptureID != util.UUIDToString(fixture.capture.ID) || payload.WorkspaceID != util.UUIDToString(fixture.workspaceID) || payload.RequesterID != util.UUIDToString(fixture.userID) {
		t.Fatalf("unexpected context payload: %+v", payload)
	}
	if got := svc.ResolveTaskWorkspaceID(ctx, task); got != util.UUIDToString(fixture.workspaceID) {
		t.Fatalf("ResolveTaskWorkspaceID = %q, want workspace", got)
	}

	memory, err := q.GetPageMemory(ctx, db.GetPageMemoryParams{
		CapturedSourceID: fixture.capture.ID,
		WorkspaceID:      fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "processing" {
		t.Fatalf("page_memory.status = %q, want processing", memory.Status)
	}
	if memory.EnrichmentTaskID != task.ID {
		t.Fatalf("enrichment_task_id = %s, want %s", util.UUIDToString(memory.EnrichmentTaskID), util.UUIDToString(task.ID))
	}
	if len(wakeup.calls) != 1 || wakeup.calls[0].taskID != util.UUIDToString(task.ID) || wakeup.calls[0].runtimeID != util.UUIDToString(fixture.runtimeID) {
		t.Fatalf("wakeup calls = %#v, want one call for task/runtime", wakeup.calls)
	}
}

func TestCompleteTaskWritesBrowserMemoryEnrichment(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createBrowserMemoryTaskFixture(t, ctx, pool, q, "codex", "online")
	svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

	task, err := svc.EnqueueBrowserMemoryEnrichmentTask(ctx, fixture.workspaceID, fixture.userID, fixture.capture.ID, fixture.agentID)
	if err != nil {
		t.Fatalf("EnqueueBrowserMemoryEnrichmentTask: %v", err)
	}
	markTaskRunning(t, ctx, pool, task.ID)

	result, err := json.Marshal(map[string]any{
		"task_id": util.UUIDToString(task.ID),
		"output": `{
			"one_line_takeaway":"Capture explains browser memory.",
			"summary":"Browser memory helps recall saved pages and selected text.",
			"key_points":["Saves page context","Supports later search"],
			"topics":["browser memory","recall"],
			"entities":["Didian"],
			"keywords":["capture","memory","search"]
		}`,
	})
	if err != nil {
		t.Fatalf("marshal result: %v", err)
	}

	if _, err := svc.CompleteTask(ctx, task.ID, result, "", ""); err != nil {
		t.Fatalf("CompleteTask: %v", err)
	}

	memory, err := q.GetPageMemory(ctx, db.GetPageMemoryParams{
		CapturedSourceID: fixture.capture.ID,
		WorkspaceID:      fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "ready" {
		t.Fatalf("page_memory.status = %q, want ready", memory.Status)
	}
	if memory.OneLineTakeaway != "Capture explains browser memory." || !strings.Contains(memory.SearchText, "Supports later search") {
		t.Fatalf("unexpected memory fields: %+v", memory)
	}
	if !memory.ModelProvider.Valid || memory.ModelProvider.String != "codex" {
		t.Fatalf("model_provider = %+v, want codex", memory.ModelProvider)
	}
	if memory.FailureReason.Valid {
		t.Fatalf("failure_reason = %+v, want null", memory.FailureReason)
	}

	capture, err := q.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          fixture.capture.ID,
		WorkspaceID: fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetCapturedSourceInWorkspace: %v", err)
	}
	if capture.SummaryStatus != "success" || capture.Status != "ready" || capture.FailureReason.Valid {
		t.Fatalf("unexpected capture enrichment status: status=%q summary=%q failure=%+v", capture.Status, capture.SummaryStatus, capture.FailureReason)
	}
}

func TestCompleteTaskMarksBrowserMemoryFailedOnInvalidOutput(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createBrowserMemoryTaskFixture(t, ctx, pool, q, "codex", "online")
	svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

	task, err := svc.EnqueueBrowserMemoryEnrichmentTask(ctx, fixture.workspaceID, fixture.userID, fixture.capture.ID, fixture.agentID)
	if err != nil {
		t.Fatalf("EnqueueBrowserMemoryEnrichmentTask: %v", err)
	}
	markTaskRunning(t, ctx, pool, task.ID)

	result, err := json.Marshal(map[string]any{
		"task_id": util.UUIDToString(task.ID),
		"output":  "not json",
	})
	if err != nil {
		t.Fatalf("marshal result: %v", err)
	}

	if _, err := svc.CompleteTask(ctx, task.ID, result, "", ""); err != nil {
		t.Fatalf("CompleteTask: %v", err)
	}

	taskAfter, err := q.GetAgentTask(ctx, task.ID)
	if err != nil {
		t.Fatalf("GetAgentTask: %v", err)
	}
	if taskAfter.Status != "completed" {
		t.Fatalf("task status = %q, want completed", taskAfter.Status)
	}
	memory, err := q.GetPageMemory(ctx, db.GetPageMemoryParams{CapturedSourceID: fixture.capture.ID, WorkspaceID: fixture.workspaceID})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "failed" || !memory.FailureReason.Valid || !strings.Contains(memory.FailureReason.String, "browser memory invalid output") {
		t.Fatalf("unexpected page_memory failure state: status=%q reason=%+v", memory.Status, memory.FailureReason)
	}
}

func TestFailTaskMarksBrowserMemoryEnrichmentFailed(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createBrowserMemoryTaskFixture(t, ctx, pool, q, "codex", "online")
	svc := NewTaskService(q, pool, nil, events.New(), &stubWakeup{})

	task, err := svc.EnqueueBrowserMemoryEnrichmentTask(ctx, fixture.workspaceID, fixture.userID, fixture.capture.ID, fixture.agentID)
	if err != nil {
		t.Fatalf("EnqueueBrowserMemoryEnrichmentTask: %v", err)
	}
	markTaskRunning(t, ctx, pool, task.ID)

	if _, err := svc.FailTask(ctx, task.ID, "model refused output", "", "", "agent_error"); err != nil {
		t.Fatalf("FailTask: %v", err)
	}
	memory, err := q.GetPageMemory(ctx, db.GetPageMemoryParams{CapturedSourceID: fixture.capture.ID, WorkspaceID: fixture.workspaceID})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "failed" || !memory.FailureReason.Valid || memory.FailureReason.String != "model refused output" {
		t.Fatalf("unexpected page_memory failure state: status=%q reason=%+v", memory.Status, memory.FailureReason)
	}
	capture, err := q.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{ID: fixture.capture.ID, WorkspaceID: fixture.workspaceID})
	if err != nil {
		t.Fatalf("GetCapturedSourceInWorkspace: %v", err)
	}
	if capture.SummaryStatus != "failure" || capture.Status != "failed" {
		t.Fatalf("unexpected capture state: status=%q summary=%q", capture.Status, capture.SummaryStatus)
	}
}

func TestEnqueueBrowserMemoryEnrichmentTaskRequiresOnlineCodexRuntime(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		status   string
		want     string
	}{
		{name: "non codex", provider: "claude", status: "online", want: "requires a Codex runtime"},
		{name: "offline", provider: "codex", status: "offline", want: "agent runtime is offline"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			pool := newHeadShaDedupPool(t)
			ctx := context.Background()
			q := db.New(pool)
			fixture := createBrowserMemoryTaskFixture(t, ctx, pool, q, tc.provider, tc.status)
			svc := NewTaskService(q, pool, nil, events.New())

			_, err := svc.EnqueueBrowserMemoryEnrichmentTask(ctx, fixture.workspaceID, fixture.userID, fixture.capture.ID, fixture.agentID)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %v, want containing %q", err, tc.want)
			}
		})
	}
}

func TestParseBrowserMemoryCompletionNormalizesOutput(t *testing.T) {
	long := strings.Repeat("x", browserMemoryTakeawayMaxRunes+20)
	result, err := json.Marshal(map[string]any{
		"task_id": "task-1",
		"output": map[string]any{
			"one_line_takeaway": long,
			"summary":           "  Browser memory summary.  ",
			"key_points":        []string{"First", "first", "", "Second"},
			"topics":            []string{"Recall"},
			"entities":          []string{"Didian"},
			"keywords":          []string{"memory", "Memory"},
		},
	})
	if err != nil {
		t.Fatalf("marshal result: %v", err)
	}
	var envelope struct {
		TaskID string          `json:"task_id"`
		Output json.RawMessage `json:"output"`
	}
	if err := json.Unmarshal(result, &envelope); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}
	result, err = json.Marshal(map[string]any{
		"task_id": envelope.TaskID,
		"output":  string(envelope.Output),
	})
	if err != nil {
		t.Fatalf("marshal daemon-style result: %v", err)
	}

	got, err := parseBrowserMemoryCompletion(result)
	if err != nil {
		t.Fatalf("parseBrowserMemoryCompletion: %v", err)
	}
	if len([]rune(got.OneLineTakeaway)) > browserMemoryTakeawayMaxRunes {
		t.Fatalf("one_line_takeaway length = %d, want <= %d", len([]rune(got.OneLineTakeaway)), browserMemoryTakeawayMaxRunes)
	}
	if got.Summary != "Browser memory summary." {
		t.Fatalf("summary = %q, want trimmed summary", got.Summary)
	}
	if len(got.KeyPoints) != 2 || got.KeyPoints[0] != "First" || got.KeyPoints[1] != "Second" {
		t.Fatalf("key_points = %#v, want deduped non-empty items", got.KeyPoints)
	}
	if len(got.Keywords) != 1 || got.Keywords[0] != "memory" {
		t.Fatalf("keywords = %#v, want case-insensitive dedupe", got.Keywords)
	}
}

func TestParseBrowserMemoryCompletionRejectsInvalidOutput(t *testing.T) {
	tests := []struct {
		name   string
		result string
		want   string
	}{
		{name: "empty output", result: `{"task_id":"t","output":""}`, want: "empty output"},
		{name: "invalid json", result: `{"task_id":"t","output":"not json"}`, want: "parse output JSON"},
		{name: "missing summary", result: `{"task_id":"t","output":"{\"one_line_takeaway\":\"one\"}"}`, want: "summary is required"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := parseBrowserMemoryCompletion([]byte(tc.result))
			if err == nil || !errors.Is(err, errBrowserMemoryInvalidOutput) || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %v, want sentinel and containing %q", err, tc.want)
			}
		})
	}
}

type browserMemoryTaskFixture struct {
	workspaceID pgtype.UUID
	userID      pgtype.UUID
	runtimeID   pgtype.UUID
	agentID     pgtype.UUID
	capture     db.CapturedSource
}

func createBrowserMemoryTaskFixture(t *testing.T, ctx context.Context, pool *pgxpool.Pool, q *db.Queries, provider, runtimeStatus string) browserMemoryTaskFixture {
	t.Helper()
	suffix := time.Now().UnixNano()
	email := fmt.Sprintf("browser-memory-task-%d@didian.ai", suffix)
	slug := fmt.Sprintf("browser-memory-task-%d", suffix)

	var userID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO "user" (name, email) VALUES ($1, $2) RETURNING id
	`, "Browser Memory Task Test", email).Scan(&userID); err != nil {
		t.Fatalf("create user: %v", err)
	}

	var workspaceID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO workspace (name, slug, description, issue_prefix)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, "Browser Memory Task Test", slug, "temporary browser memory task test workspace", "BMT").Scan(&workspaceID); err != nil {
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
		VALUES ($1, NULL, $2, 'local', $3, $4, 'test runtime', '{}'::jsonb, now(), 'private', $5)
		RETURNING id
	`, workspaceID, "Browser Memory Runtime", provider, runtimeStatus, userID).Scan(&runtimeID); err != nil {
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
	`, workspaceID, "Browser Memory Agent", runtimeID, userID).Scan(&agentID); err != nil {
		t.Fatalf("create agent: %v", err)
	}

	capture, err := q.CreateCapturedSource(ctx, db.CreateCapturedSourceParams{
		WorkspaceID:     workspaceID,
		CreatorID:       userID,
		SourceType:      "link",
		Source:          "extension",
		CaptureScope:    "page",
		Url:             "https://example.com/browser-memory-task",
		NormalizedUrl:   "https://example.com/browser-memory-task",
		Title:           "Browser memory task notes",
		Domain:          "example.com",
		Description:     pgtype.Text{String: "A useful page about browser memory tasks.", Valid: true},
		ReadableText:    pgtype.Text{String: "Long article body about browser memory task enrichment.", Valid: true},
		Links:           []byte("[]"),
		Status:          "captured",
		MetadataStatus:  "pending",
		ArchiveStatus:   "skipped",
		SummaryStatus:   "pending",
		EmbeddingStatus: "skipped",
		MemoryState:     "active",
		CapturedAt:      pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	})
	if err != nil {
		t.Fatalf("CreateCapturedSource: %v", err)
	}

	if _, err := q.CreatePendingPageMemory(ctx, db.CreatePendingPageMemoryParams{
		CapturedSourceID: capture.ID,
		WorkspaceID:      workspaceID,
		SearchText:       "Browser memory task notes",
		Keywords:         []byte(`[]`),
	}); err != nil {
		t.Fatalf("CreatePendingPageMemory: %v", err)
	}

	t.Cleanup(func() {
		c := context.Background()
		pool.Exec(c, `DELETE FROM agent_task_queue WHERE agent_id = $1`, agentID)
		pool.Exec(c, `DELETE FROM captured_source WHERE id = $1`, capture.ID)
		pool.Exec(c, `DELETE FROM agent WHERE id = $1`, agentID)
		pool.Exec(c, `DELETE FROM agent_runtime WHERE id = $1`, runtimeID)
		pool.Exec(c, `DELETE FROM member WHERE workspace_id = $1`, workspaceID)
		pool.Exec(c, `DELETE FROM workspace WHERE id = $1`, workspaceID)
		pool.Exec(c, `DELETE FROM "user" WHERE id = $1`, userID)
	})

	return browserMemoryTaskFixture{workspaceID: workspaceID, userID: userID, runtimeID: runtimeID, agentID: agentID, capture: capture}
}

func markTaskRunning(t *testing.T, ctx context.Context, pool *pgxpool.Pool, taskID pgtype.UUID) {
	t.Helper()
	if _, err := pool.Exec(ctx, `
		UPDATE agent_task_queue
		SET status = 'running', dispatched_at = now(), started_at = now()
		WHERE id = $1
	`, taskID); err != nil {
		t.Fatalf("mark task running: %v", err)
	}
}
