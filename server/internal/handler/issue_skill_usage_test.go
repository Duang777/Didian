package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/didian-ai/didian/server/internal/service"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestListIssueSkillsReturnsEmptyList(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Empty")

	w := httptest.NewRecorder()
	req := newRequest(http.MethodGet, "/api/issues/"+issueID+"/skills", nil)
	req = withURLParam(req, "id", issueID)
	testHandler.ListIssueSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssueSkills: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Skills []map[string]any `json:"skills"`
		Total  int              `json:"total"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp.Skills) != 0 || resp.Total != 0 {
		t.Fatalf("expected empty skill usage list, got %+v", resp)
	}
}

func TestAddIssueSkillCreatesPlannedUsageAndIsIdempotent(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Add")
	skillID := insertHandlerTestSkill(t, "issue-skill-add", "skill body")

	for attempt := 0; attempt < 2; attempt++ {
		w := httptest.NewRecorder()
		req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
			"skill_id": skillID,
			"reason":   "Use this Skill for the Mission",
		})
		req = withURLParam(req, "id", issueID)
		testHandler.AddIssueSkill(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("AddIssueSkill attempt %d: expected 201, got %d: %s", attempt+1, w.Code, w.Body.String())
		}
	}

	w := httptest.NewRecorder()
	req := newRequest(http.MethodGet, "/api/issues/"+issueID+"/skills", nil)
	req = withURLParam(req, "id", issueID)
	testHandler.ListIssueSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssueSkills after add: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Skills []map[string]any `json:"skills"`
		Total  int              `json:"total"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp.Skills) != 1 || resp.Total != 1 {
		t.Fatalf("expected one usage row, got %+v", resp)
	}
	if resp.Skills[0]["skill_id"] != skillID {
		t.Fatalf("skill_id = %v, want %s", resp.Skills[0]["skill_id"], skillID)
	}
	if resp.Skills[0]["status"] != "planned" {
		t.Fatalf("status = %v, want planned", resp.Skills[0]["status"])
	}
	if resp.Skills[0]["source"] != "manual" {
		t.Fatalf("source = %v, want manual", resp.Skills[0]["source"])
	}
}

func TestAddIssueSkillRejectsCrossWorkspaceSkill(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Cross Workspace")
	foreignSkillID := insertHandlerTestSkillInForeignWorkspace(t, "issue-skill-cross", "foreign body")

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
		"skill_id": foreignSkillID,
	})
	req = withURLParam(req, "id", issueID)
	testHandler.AddIssueSkill(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("AddIssueSkill: expected 404 for cross-workspace skill, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteIssueSkillRemovesPlannedUsage(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Delete")
	skillID := insertHandlerTestSkill(t, "issue-skill-delete", "skill body")

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
		"skill_id": skillID,
	})
	req = withURLParam(req, "id", issueID)
	testHandler.AddIssueSkill(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("AddIssueSkill: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	req = newRequest(http.MethodDelete, "/api/issues/"+issueID+"/skills/"+skillID, nil)
	req = withURLParams(req, "id", issueID, "skillId", skillID)
	testHandler.DeleteIssueSkill(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("DeleteIssueSkill: expected 204, got %d: %s", w.Code, w.Body.String())
	}

	w = httptest.NewRecorder()
	req = newRequest(http.MethodGet, "/api/issues/"+issueID+"/skills", nil)
	req = withURLParam(req, "id", issueID)
	testHandler.ListIssueSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssueSkills after delete: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp struct {
		Skills []map[string]any `json:"skills"`
		Total  int              `json:"total"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp.Skills) != 0 || resp.Total != 0 {
		t.Fatalf("expected no usage rows after delete, got %+v", resp)
	}
}

func TestDeleteIssueSkillRejectsInjectedUsage(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Injected Delete")
	skillID := insertHandlerTestSkill(t, "issue-skill-injected-delete", "skill body")

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
		"skill_id": skillID,
	})
	req = withURLParam(req, "id", issueID)
	testHandler.AddIssueSkill(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("AddIssueSkill: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	if _, err := testPool.Exec(context.Background(), `
		UPDATE issue_skill_usage
		SET status = 'injected'
		WHERE issue_id = $1 AND skill_id = $2
	`, issueID, skillID); err != nil {
		t.Fatalf("mark injected: %v", err)
	}

	w = httptest.NewRecorder()
	req = newRequest(http.MethodDelete, "/api/issues/"+issueID+"/skills/"+skillID, nil)
	req = withURLParams(req, "id", issueID, "skillId", skillID)
	testHandler.DeleteIssueSkill(w, req)
	if w.Code != http.StatusConflict {
		t.Fatalf("DeleteIssueSkill: expected 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestFinalizeTaskClaimMarksIssueSkillInjected(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Inject")
	skillID := insertHandlerTestSkill(t, "issue-skill-inject", "skill body")
	agentID := createHandlerTestAgent(t, "Issue Skill Usage Inject Agent", nil)
	taskID := createHandlerTestTaskForAgentOnIssue(t, agentID, issueID)
	ctx := context.Background()

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
		"skill_id": skillID,
		"source":   "recommendation",
	})
	req = withURLParam(req, "id", issueID)
	testHandler.AddIssueSkill(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("AddIssueSkill: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	task, err := testHandler.Queries.GetAgentTask(ctx, parseUUID(taskID))
	if err != nil {
		t.Fatalf("load task: %v", err)
	}
	tokenHash := "issue-skill-injected-token-" + taskID
	_, err = testHandler.TaskService.FinalizeTaskClaim(ctx, task, db.CreateTaskTokenParams{
		TokenHash:   tokenHash,
		TaskID:      task.ID,
		AgentID:     task.AgentID,
		WorkspaceID: parseUUID(testWorkspaceID),
		UserID:      parseUUID(testUserID),
		ExpiresAt:   pgtype.Timestamptz{Time: time.Now().Add(time.Hour), Valid: true},
	}, nil, false, &service.IssueSkillInjection{
		WorkspaceID: parseUUID(testWorkspaceID),
		IssueID:     parseUUID(issueID),
		TaskID:      parseUUID(taskID),
		AgentID:     parseUUID(agentID),
		RuntimeID:   parseUUID(testRuntimeID),
	})
	if err != nil {
		t.Fatalf("FinalizeTaskClaim: %v", err)
	}

	var status, gotTaskID, gotAgentID, gotRuntimeID string
	if err := testPool.QueryRow(ctx, `
		SELECT status, task_id::text, agent_id::text, runtime_id::text
		FROM issue_skill_usage
		WHERE issue_id = $1 AND skill_id = $2
	`, issueID, skillID).Scan(&status, &gotTaskID, &gotAgentID, &gotRuntimeID); err != nil {
		t.Fatalf("load issue skill usage: %v", err)
	}
	if status != "injected" {
		t.Fatalf("status = %q, want injected", status)
	}
	if gotTaskID != taskID || gotAgentID != agentID || gotRuntimeID != testRuntimeID {
		t.Fatalf("claim refs = task %s agent %s runtime %s, want %s %s %s", gotTaskID, gotAgentID, gotRuntimeID, taskID, agentID, testRuntimeID)
	}
}

func insertHandlerTestRuntime(t *testing.T, name string) string {
	t.Helper()

	var runtimeID string
	if err := testPool.QueryRow(context.Background(), `
		INSERT INTO agent_runtime (
			workspace_id, daemon_id, name, runtime_mode, provider, status, device_info, metadata, owner_id, last_seen_at
		)
		VALUES ($1, NULL, $2, 'cloud', 'test', 'online', $3, '{}'::jsonb, $4, now())
		RETURNING id
	`, testWorkspaceID, name, "Issue Skill Usage Test Runtime", testUserID).Scan(&runtimeID); err != nil {
		t.Fatalf("create handler test runtime: %v", err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM agent_runtime WHERE id = $1`, runtimeID)
	})
	return runtimeID
}

func TestReportIssueSkillUsageMarksRuntimeActualUse(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Report")
	skillID := insertHandlerTestSkill(t, "issue-skill-report-used", "skill body")
	agentID := createHandlerTestAgent(t, "Issue Skill Usage Report Agent", nil)
	taskID := createHandlerTestTaskForAgentOnIssue(t, agentID, issueID)
	ctx := context.Background()

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues/"+issueID+"/skills", map[string]any{
		"skill_id": skillID,
		"reason":   "Selected from Mission detail",
	})
	req = withURLParam(req, "id", issueID)
	testHandler.AddIssueSkill(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("AddIssueSkill: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	_, err := testHandler.Queries.MarkPlannedIssueSkillsInjected(ctx, db.MarkPlannedIssueSkillsInjectedParams{
		WorkspaceID: parseUUID(testWorkspaceID),
		IssueID:     parseUUID(issueID),
		TaskID:      parseUUID(taskID),
		AgentID:     parseUUID(agentID),
		RuntimeID:   parseUUID(testRuntimeID),
	})
	if err != nil {
		t.Fatalf("mark injected: %v", err)
	}

	w = httptest.NewRecorder()
	req = newDaemonTokenRequest(http.MethodPost, "/api/daemon/runtimes/"+testRuntimeID+"/tasks/"+taskID+"/skills/report", map[string]any{
		"skill_id": skillID,
		"status":   "used",
		"reason":   "Used to structure the browser automation plan",
		"metadata": map[string]any{
			"evidence": "runtime-selected",
		},
	}, testWorkspaceID, "issue-skill-report-daemon")
	req = withURLParams(req, "runtimeId", testRuntimeID, "taskId", taskID)
	testHandler.ReportIssueSkillUsage(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ReportIssueSkillUsage: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var reportResp IssueSkillUsageResponse
	if err := json.NewDecoder(w.Body).Decode(&reportResp); err != nil {
		t.Fatalf("decode report response: %v", err)
	}
	if reportResp.Status != "used" {
		t.Fatalf("reported status = %q, want used", reportResp.Status)
	}
	if reportResp.Reason != "Used to structure the browser automation plan" {
		t.Fatalf("reported reason = %q", reportResp.Reason)
	}

	w = httptest.NewRecorder()
	req = newRequest(http.MethodGet, "/api/issues/"+issueID+"/skills", nil)
	req = withURLParam(req, "id", issueID)
	testHandler.ListIssueSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssueSkills after report: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var listResp struct {
		Skills []IssueSkillUsageResponse `json:"skills"`
		Total  int                       `json:"total"`
	}
	if err := json.NewDecoder(w.Body).Decode(&listResp); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if listResp.Total != 1 || len(listResp.Skills) != 1 {
		t.Fatalf("expected one usage row, got %+v", listResp)
	}
	got := listResp.Skills[0]
	if got.Status != "used" || got.TaskID == nil || *got.TaskID != taskID || got.RuntimeID == nil || *got.RuntimeID != testRuntimeID {
		t.Fatalf("listed usage = status %s task %v runtime %v, want used/%s/%s", got.Status, got.TaskID, got.RuntimeID, taskID, testRuntimeID)
	}
	if got.Metadata == nil {
		t.Fatalf("expected runtime metadata to be stored")
	}
}

func TestReportIssueSkillUsageRejectsInvalidStatus(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Report Invalid Status")
	skillID := insertHandlerTestSkill(t, "issue-skill-report-invalid-status", "skill body")
	agentID := createHandlerTestAgent(t, "Issue Skill Usage Report Invalid Status Agent", nil)
	taskID := createHandlerTestTaskForAgentOnIssue(t, agentID, issueID)

	w := httptest.NewRecorder()
	req := newDaemonTokenRequest(http.MethodPost, "/api/daemon/runtimes/"+testRuntimeID+"/tasks/"+taskID+"/skills/report", map[string]any{
		"skill_id": skillID,
		"status":   "suggested_update",
	}, testWorkspaceID, "issue-skill-report-daemon")
	req = withURLParams(req, "runtimeId", testRuntimeID, "taskId", taskID)
	testHandler.ReportIssueSkillUsage(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("ReportIssueSkillUsage invalid status: expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestReportIssueSkillUsageRejectsDifferentRuntime(t *testing.T) {
	issueID := createIssueSkillUsageTestIssue(t, "Issue Skill Usage Report Runtime Scope")
	skillID := insertHandlerTestSkill(t, "issue-skill-report-runtime-scope", "skill body")
	agentID := createHandlerTestAgent(t, "Issue Skill Usage Report Runtime Scope Agent", nil)
	taskID := createHandlerTestTaskForAgentOnIssue(t, agentID, issueID)

	otherRuntimeID := insertHandlerTestRuntime(t, "Issue Skill Usage Other Runtime")

	w := httptest.NewRecorder()
	req := newDaemonTokenRequest(http.MethodPost, "/api/daemon/runtimes/"+otherRuntimeID+"/tasks/"+taskID+"/skills/report", map[string]any{
		"skill_id": skillID,
		"status":   "used",
	}, testWorkspaceID, "issue-skill-report-other-daemon")
	req = withURLParams(req, "runtimeId", otherRuntimeID, "taskId", taskID)
	testHandler.ReportIssueSkillUsage(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("ReportIssueSkillUsage other runtime: expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func createIssueSkillUsageTestIssue(t *testing.T, title string) string {
	t.Helper()

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/issues?workspace_id="+testWorkspaceID, map[string]any{
		"title":    title + " " + t.Name(),
		"status":   "todo",
		"priority": "medium",
	})
	testHandler.CreateIssue(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateIssue: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var created IssueResponse
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("decode created issue: %v", err)
	}
	t.Cleanup(func() {
		w := httptest.NewRecorder()
		req := newRequest(http.MethodDelete, "/api/issues/"+created.ID, nil)
		req = withURLParam(req, "id", created.ID)
		testHandler.DeleteIssue(w, req)
	})
	return created.ID
}
