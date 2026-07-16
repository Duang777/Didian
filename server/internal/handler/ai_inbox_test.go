package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/didian-ai/didian/server/pkg/llm"
)

func TestAnalyzeAIInboxFallsBackToLocalUnderstanding(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	w := httptest.NewRecorder()
	testHandler.AnalyzeAIInbox(w, newRequest(http.MethodPost, "/api/ai-inbox/analyze", map[string]any{
		"input": "https://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。",
	}))
	if w.Code != http.StatusOK {
		t.Fatalf("AnalyzeAIInbox: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp AnalyzeAIInboxResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Provider != "local" {
		t.Fatalf("provider = %q, want local", resp.Provider)
	}
	if resp.Understanding.Intent != "learning_plan" {
		t.Fatalf("intent = %q, want learning_plan", resp.Understanding.Intent)
	}
	if resp.Understanding.SuggestedMissionTitle == "" || !strings.Contains(resp.Understanding.Summary, "链接") {
		t.Fatalf("unexpected understanding: %+v", resp.Understanding)
	}
}

func TestAnalyzeAIInboxUsesConfiguredLLMWithCaptureContext(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	captureID := createAIInboxAnalyzeCapture(t)
	var upstreamPrompt string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		upstreamPrompt = string(raw)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"cmpl-ai-inbox","object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"{\"intent\":\"research_pack\",\"suggested_mission_title\":\"Codex 整理浏览器资料\",\"summary\":\"Codex 可以把收藏和输入整理成研究包。\",\"suggested_outputs\":[\"资源索引\",\"下一步建议\"],\"missing_info\":[],\"confidence\":0.91}"},"finish_reason":"stop"}]}`)
	}))
	t.Cleanup(srv.Close)
	previousLLM := testHandler.LLM
	testHandler.LLM = llm.New(llm.Config{APIKey: "test-key", BaseURL: srv.URL, DefaultModel: "test-model"})
	t.Cleanup(func() { testHandler.LLM = previousLLM })

	w := httptest.NewRecorder()
	testHandler.AnalyzeAIInbox(w, newRequest(http.MethodPost, "/api/ai-inbox/analyze", map[string]any{
		"input":      "帮我整理这个收藏。",
		"captureIds": []string{captureID},
	}))
	if w.Code != http.StatusOK {
		t.Fatalf("AnalyzeAIInbox: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp AnalyzeAIInboxResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Provider != "llm" || resp.Model != "test-model" {
		t.Fatalf("provider/model = %q/%q, want llm/test-model", resp.Provider, resp.Model)
	}
	if resp.Understanding.SuggestedMissionTitle != "Codex 整理浏览器资料" || resp.Understanding.Confidence != 0.91 {
		t.Fatalf("unexpected understanding: %+v", resp.Understanding)
	}
	if !strings.Contains(upstreamPrompt, "AI Inbox analyze capture") || !strings.Contains(upstreamPrompt, "Useful capture summary") {
		t.Fatalf("LLM prompt did not include capture context: %s", upstreamPrompt)
	}
}

func TestCreateAIInboxMissionAssignsOwnedOnlineCodexAgent(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	_, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	title := "AI Inbox Mission " + strconv.FormatInt(time.Now().UnixNano(), 10)

	w := httptest.NewRecorder()
	testHandler.CreateAIInboxMission(w, newRequest(http.MethodPost, "/api/ai-inbox/missions", map[string]any{
		"title":       title,
		"description": "Created from AI Inbox and should be planned by Codex.",
	}))
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateAIInboxMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp CreateAIInboxMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.PlanningStatus != "queued" || resp.PlanningAgentID == nil || *resp.PlanningAgentID != agentID {
		t.Fatalf("planning status/agent = %q/%v, want queued/%s", resp.PlanningStatus, resp.PlanningAgentID, agentID)
	}
	if resp.Issue.Title != title || resp.Issue.AssigneeID == nil || *resp.Issue.AssigneeID != agentID {
		t.Fatalf("issue response = %+v, want assigned to %s", resp.Issue, agentID)
	}

	var taskCount int
	if err := testPool.QueryRow(context.Background(), `
		SELECT count(*) FROM agent_task_queue
		WHERE issue_id = $1 AND agent_id = $2 AND status = 'queued'
	`, resp.Issue.ID, agentID).Scan(&taskCount); err != nil {
		t.Fatalf("count queued task: %v", err)
	}
	if taskCount != 1 {
		t.Fatalf("queued task count = %d, want 1", taskCount)
	}
	t.Cleanup(func() {
		ctx := context.Background()
		testPool.Exec(ctx, `DELETE FROM agent_task_queue WHERE issue_id = $1`, resp.Issue.ID)
		testPool.Exec(ctx, `DELETE FROM issue WHERE id = $1`, resp.Issue.ID)
	})
}

func TestCreateAIInboxMissionSucceedsWithoutOwnedCodexAgent(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	otherUserID, _ := createEphemeralMember(t, testWorkspaceID, "ai-inbox-codex-owner", "member")
	_, _ = seedAIInboxMissionCodexAgentForOwner(t, otherUserID)
	title := "AI Inbox No Planner " + strconv.FormatInt(time.Now().UnixNano(), 10)

	w := httptest.NewRecorder()
	testHandler.CreateAIInboxMission(w, newRequest(http.MethodPost, "/api/ai-inbox/missions", map[string]any{
		"title":       title,
		"description": "Created from AI Inbox without a caller-owned Codex agent.",
	}))
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateAIInboxMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp CreateAIInboxMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.PlanningStatus != "no_codex_agent" || resp.PlanningAgentID != nil {
		t.Fatalf("planning status/agent = %q/%v, want no_codex_agent/nil", resp.PlanningStatus, resp.PlanningAgentID)
	}
	if resp.Issue.AssigneeID != nil || resp.Issue.AssigneeType != nil {
		t.Fatalf("issue should be unassigned, got %+v", resp.Issue)
	}

	var taskCount int
	if err := testPool.QueryRow(context.Background(), `SELECT count(*) FROM agent_task_queue WHERE issue_id = $1`, resp.Issue.ID).Scan(&taskCount); err != nil {
		t.Fatalf("count tasks: %v", err)
	}
	if taskCount != 0 {
		t.Fatalf("task count = %d, want 0", taskCount)
	}
	t.Cleanup(func() {
		ctx := context.Background()
		testPool.Exec(ctx, `DELETE FROM agent_task_queue WHERE issue_id = $1`, resp.Issue.ID)
		testPool.Exec(ctx, `DELETE FROM issue WHERE id = $1`, resp.Issue.ID)
	})
}

func createAIInboxAnalyzeCapture(t *testing.T) string {
	t.Helper()
	suffix := time.Now().UnixNano()
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          "https://example.com/ai-inbox-analyze-" + strconv.FormatInt(suffix, 10),
		"title":        "AI Inbox analyze capture",
		"domain":       "example.com",
		"readableText": "Useful capture summary for Codex planning.",
		"capturedAt":   "2026-07-14T10:00:00Z",
	}
	w := httptest.NewRecorder()
	testHandler.CreateBrowserCapture(w, newRequest(http.MethodPost, "/api/browser-captures", body))
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCapture: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var created CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM captured_source WHERE id = $1`, created.CaptureID)
	})
	waitForBrowserCaptureMemory(t, created.CaptureID)
	return created.CaptureID
}

func seedAIInboxMissionCodexAgentForOwner(t *testing.T, ownerID string) (string, string) {
	t.Helper()
	ctx := context.Background()
	suffix := time.Now().UnixNano()
	var runtimeID string
	if err := testPool.QueryRow(ctx, `
		INSERT INTO agent_runtime (
			workspace_id, daemon_id, name, runtime_mode, provider,
			status, device_info, metadata, owner_id, last_seen_at
		)
		VALUES ($1, NULL, $2, 'local', 'codex', 'online', 'ai inbox mission codex runtime', '{}'::jsonb, $3, now())
		RETURNING id
	`, testWorkspaceID, fmt.Sprintf("AI Inbox Mission Codex Runtime %d", suffix), ownerID).Scan(&runtimeID); err != nil {
		t.Fatalf("create codex runtime: %v", err)
	}

	var agentID string
	if err := testPool.QueryRow(ctx, `
		INSERT INTO agent (
			workspace_id, name, description, runtime_mode, runtime_config,
			runtime_id, visibility, permission_mode, max_concurrent_tasks, owner_id
		)
		VALUES ($1, $2, '', 'local', '{}'::jsonb, $3, 'private', 'private', 1, $4)
		RETURNING id
	`, testWorkspaceID, fmt.Sprintf("AI Inbox Mission Codex Agent %d", suffix), runtimeID, ownerID).Scan(&agentID); err != nil {
		t.Fatalf("create codex agent: %v", err)
	}

	t.Cleanup(func() {
		c := context.Background()
		testPool.Exec(c, `DELETE FROM agent_task_queue WHERE agent_id = $1`, agentID)
		testPool.Exec(c, `DELETE FROM agent WHERE id = $1`, agentID)
		testPool.Exec(c, `DELETE FROM agent_runtime WHERE id = $1`, runtimeID)
	})

	return runtimeID, agentID
}
