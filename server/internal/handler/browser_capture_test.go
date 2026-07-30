package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/didian-ai/didian/server/internal/service"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
)

func TestBrowserCaptureLifecycle(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	body := map[string]any{
		"source":          "extension",
		"sourceType":      "link",
		"captureScope":    "page",
		"sourceTabId":     "tab-42",
		"url":             "https://example.com/article?utm_source=newsletter&keep=1#section",
		"title":           "Example Article",
		"domain":          "example.com",
		"faviconUrl":      "https://example.com/favicon.ico",
		"description":     "A useful page about browser memory.",
		"previewImageUrl": "https://example.com/preview.png",
		"selectedText":    "This quote is why I saved it.",
		"readableText":    "This quote is why I saved it. A longer article body for recall.",
		"links": []map[string]any{
			{"url": "https://example.com/docs", "title": "Docs"},
		},
		"capturedAt": "2026-07-14T10:00:00Z",
	}

	w := httptest.NewRecorder()
	req := newRequest(http.MethodPost, "/api/browser-captures", body)
	testHandler.CreateBrowserCapture(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCapture: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var created CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if created.CaptureID == "" {
		t.Fatal("create response missing captureId")
	}
	if created.Dedupe.IsDuplicate {
		t.Fatal("first capture unexpectedly marked duplicate")
	}
	if created.Capture.NormalizedURL != "https://example.com/article?keep=1" {
		t.Errorf("normalized_url = %q", created.Capture.NormalizedURL)
	}
	if created.Capture.SummaryStatus != "pending" {
		t.Errorf("summary_status = %q, want pending", created.Capture.SummaryStatus)
	}
	if created.Capture.Description == nil || *created.Capture.Description != "A useful page about browser memory." {
		t.Fatalf("description = %v", created.Capture.Description)
	}
	if created.Capture.PreviewImageURL == nil || *created.Capture.PreviewImageURL != "https://example.com/preview.png" {
		t.Fatalf("preview_image_url = %v", created.Capture.PreviewImageURL)
	}

	listed := waitForBrowserCaptureMemory(t, created.CaptureID)
	if listed.Total < 1 || len(listed.Captures) < 1 {
		t.Fatalf("list returned total=%d len=%d, want capture", listed.Total, len(listed.Captures))
	}
	createdListCapture := findBrowserCaptureResponse(listed.Captures, created.CaptureID)
	if createdListCapture == nil {
		t.Fatalf("created capture %s not found in list", created.CaptureID)
	}
	if createdListCapture.SummaryStatus != "success" {
		t.Fatalf("summary_status = %q, want success", createdListCapture.SummaryStatus)
	}
	if createdListCapture.Memory == nil || createdListCapture.Memory.Status != "ready" {
		t.Fatalf("memory = %+v, want ready memory", createdListCapture.Memory)
	}
	if createdListCapture.Memory.OneLineTakeaway != "This quote is why I saved it" {
		t.Fatalf("one_line_takeaway = %q", createdListCapture.Memory.OneLineTakeaway)
	}

	w = httptest.NewRecorder()
	duplicateBody := cloneMap(body)
	duplicateBody["description"] = "Updated duplicate description."
	duplicateBody["previewImageUrl"] = "https://example.com/updated-preview.png"
	req = newRequest(http.MethodPost, "/api/browser-captures", duplicateBody)
	testHandler.CreateBrowserCapture(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("duplicate CreateBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var duplicate CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&duplicate); err != nil {
		t.Fatalf("decode duplicate response: %v", err)
	}
	if !duplicate.Dedupe.IsDuplicate || duplicate.Dedupe.ExistingCaptureID == nil || *duplicate.Dedupe.ExistingCaptureID != created.CaptureID {
		t.Fatalf("duplicate response = %+v, want existing capture %s", duplicate.Dedupe, created.CaptureID)
	}
	if duplicate.Capture.Description == nil || *duplicate.Capture.Description != "Updated duplicate description." {
		t.Fatalf("duplicate description = %v", duplicate.Capture.Description)
	}
	if duplicate.Capture.PreviewImageURL == nil || *duplicate.Capture.PreviewImageURL != "https://example.com/updated-preview.png" {
		t.Fatalf("duplicate preview_image_url = %v", duplicate.Capture.PreviewImageURL)
	}
}

func TestCreateBrowserCaptureDedupesURLOnlyAndRestoresArchived(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	suffix := time.Now().UnixNano()
	url := fmt.Sprintf("https://example.com/url-only-bookmark-%d?utm_source=mail&keep=1", suffix)
	body := map[string]any{
		"source":       "web",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          url,
		"title":        "example.com/url-only-bookmark",
		"domain":       "example.com",
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

	w = httptest.NewRecorder()
	testHandler.ArchiveBrowserCapture(w, withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/archive", nil), "id", created.CaptureID))
	if w.Code != http.StatusOK {
		t.Fatalf("ArchiveBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	duplicateBody := cloneMap(body)
	duplicateBody["url"] = strings.Replace(url, "utm_source=mail&keep=1", "keep=1&utm_source=ignored", 1)
	duplicateBody["faviconUrl"] = "https://example.com/favicon.ico"
	w = httptest.NewRecorder()
	testHandler.CreateBrowserCapture(w, newRequest(http.MethodPost, "/api/browser-captures", duplicateBody))
	if w.Code != http.StatusOK {
		t.Fatalf("duplicate CreateBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var duplicate CreateBrowserCaptureResponse
	if err := json.NewDecoder(w.Body).Decode(&duplicate); err != nil {
		t.Fatalf("decode duplicate response: %v", err)
	}
	if !duplicate.Dedupe.IsDuplicate || duplicate.Dedupe.ExistingCaptureID == nil || *duplicate.Dedupe.ExistingCaptureID != created.CaptureID {
		t.Fatalf("duplicate response = %+v, want existing capture %s", duplicate.Dedupe, created.CaptureID)
	}
	if duplicate.Capture.MemoryState != "active" {
		t.Fatalf("duplicate memory_state = %q, want active", duplicate.Capture.MemoryState)
	}
	if duplicate.Capture.FaviconURL == nil || *duplicate.Capture.FaviconURL != "https://example.com/favicon.ico" {
		t.Fatalf("duplicate favicon_url = %v", duplicate.Capture.FaviconURL)
	}
}

func TestCreateBrowserCaptureURLOnlyUsesLocalMemoryWhenCodexAvailable(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	ctx := context.Background()
	runtimeID, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	suffix := time.Now().UnixNano()
	url := fmt.Sprintf("https://example.com/url-only-local-memory-%d", suffix)
	body := map[string]any{
		"source":       "web",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          url,
		"title":        "URL only local memory capture",
		"domain":       "example.com",
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

	listed := waitForBrowserCaptureMemory(t, created.CaptureID)
	listedCapture := findBrowserCaptureResponse(listed.Captures, created.CaptureID)
	if listedCapture == nil || listedCapture.Memory == nil || listedCapture.Memory.Status != "ready" {
		t.Fatalf("listed capture = %+v, want ready local memory", listedCapture)
	}
	if !strings.Contains(listedCapture.Memory.OneLineTakeaway, "URL only local memory capture") {
		t.Fatalf("one_line_takeaway = %q, want title-based local memory", listedCapture.Memory.OneLineTakeaway)
	}

	var queued int
	if err := testPool.QueryRow(ctx, `
		SELECT count(*) FROM agent_task_queue
		WHERE agent_id = $1
		  AND runtime_id = $2
		  AND context->>'type' = $3
		  AND context->>'capture_id' = $4
	`, agentID, runtimeID, service.BrowserMemoryEnrichmentContextType, created.CaptureID).Scan(&queued); err != nil {
		t.Fatalf("count queued browser memory tasks: %v", err)
	}
	if queued != 0 {
		t.Fatalf("queued browser memory tasks = %d, want 0 for URL-only capture", queued)
	}
}

func TestCreateBrowserCaptureQueuesCodexEnrichmentWhenAvailable(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	ctx := context.Background()
	runtimeID, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	suffix := time.Now().UnixNano()
	url := fmt.Sprintf("https://example.com/codex-enrichment-%d", suffix)
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          url,
		"title":        "Codex enrichment capture",
		"domain":       "example.com",
		"readableText": "The saved page should be enriched by Codex instead of the local fallback.",
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
	if created.MemoryStatus != "processing" {
		t.Fatalf("memoryStatus = %q, want processing", created.MemoryStatus)
	}
	if created.Capture.Memory == nil || created.Capture.Memory.Status != "processing" {
		t.Fatalf("response memory = %+v, want processing", created.Capture.Memory)
	}

	var queued int
	if err := testPool.QueryRow(ctx, `
		SELECT count(*) FROM agent_task_queue
		WHERE agent_id = $1
		  AND runtime_id = $2
		  AND status = 'queued'
		  AND context->>'type' = $3
		  AND context->>'capture_id' = $4
	`, agentID, runtimeID, service.BrowserMemoryEnrichmentContextType, created.CaptureID).Scan(&queued); err != nil {
		t.Fatalf("count queued browser memory tasks: %v", err)
	}
	if queued != 1 {
		t.Fatalf("queued browser memory tasks = %d, want 1", queued)
	}

	memory, err := testHandler.Queries.GetPageMemory(ctx, db.GetPageMemoryParams{
		CapturedSourceID: parseUUID(created.CaptureID),
		WorkspaceID:      parseUUID(testWorkspaceID),
	})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "processing" || !memory.EnrichmentTaskID.Valid {
		t.Fatalf("page memory status/task = %q/%+v, want processing with task", memory.Status, memory.EnrichmentTaskID)
	}
}

func TestBrowserCaptureSearchArchiveAndRestore(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	suffix := time.Now().UnixNano()
	url := fmt.Sprintf("https://example.com/searchable-capture-%d", suffix)
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          url,
		"title":        "Searchable capture",
		"domain":       "example.com",
		"readableText": "This page contains the uncommon phrase nebula bookmark recall.",
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

	searchResp := listBrowserCapturesForTest(t, "/api/browser-captures?limit=5&q=nebula%20bookmark")
	if findBrowserCaptureResponse(searchResp.Captures, created.CaptureID) == nil {
		t.Fatalf("search results did not include capture %s", created.CaptureID)
	}

	w = httptest.NewRecorder()
	testHandler.ArchiveBrowserCapture(w, withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/archive", nil), "id", created.CaptureID))
	if w.Code != http.StatusOK {
		t.Fatalf("ArchiveBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	activeResp := listBrowserCapturesForTest(t, "/api/browser-captures?limit=5&state=active&q=nebula%20bookmark")
	if findBrowserCaptureResponse(activeResp.Captures, created.CaptureID) != nil {
		t.Fatalf("archived capture %s should not appear in active search", created.CaptureID)
	}
	archivedResp := listBrowserCapturesForTest(t, "/api/browser-captures?limit=5&state=archived&q=nebula%20bookmark")
	archived := findBrowserCaptureResponse(archivedResp.Captures, created.CaptureID)
	if archived == nil || archived.MemoryState != "archived" {
		t.Fatalf("archived search result = %+v, want archived capture", archived)
	}

	w = httptest.NewRecorder()
	testHandler.RestoreBrowserCapture(w, withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/restore", nil), "id", created.CaptureID))
	if w.Code != http.StatusOK {
		t.Fatalf("RestoreBrowserCapture: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	activeResp = listBrowserCapturesForTest(t, "/api/browser-captures?limit=5&state=active&q=nebula%20bookmark")
	restored := findBrowserCaptureResponse(activeResp.Captures, created.CaptureID)
	if restored == nil || restored.MemoryState != "active" {
		t.Fatalf("active search result = %+v, want restored active capture", restored)
	}
}

func TestCreateBrowserCaptureSkillGenerationMissionAssignsOwnedCodexAgent(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	_, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	suffix := time.Now().UnixNano()
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          fmt.Sprintf("https://docs.stripe.com/payments/checkout?skill-generation=%d", suffix),
		"title":        "Stripe Checkout documentation",
		"domain":       "docs.stripe.com",
		"description":  "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
		"selectedText": "Install the SDK and configure API keys before creating a checkout session.",
		"readableText": "Install the SDK, configure API keys, create a checkout session, handle webhooks, test common errors, and troubleshoot integration failures.",
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
	if created.Capture.SkillOpportunity == nil || !created.Capture.SkillOpportunity.ShouldSuggest {
		t.Fatalf("created capture missing skill opportunity: %+v", created.Capture.SkillOpportunity)
	}

	directionBody := map[string]any{
		"direction": map[string]any{
			"title":           "Stripe Checkout webhook 接入助手",
			"capability":      "把 Stripe Checkout 文档沉淀成项目接入、webhook 配置和排障流程。",
			"primaryUseCase":  "用于真实项目接入 Stripe Checkout，并在 webhook 或 API 错误时给出排查路径。",
			"triggerExamples": []string{"帮我接入 Stripe Checkout", "排查 Stripe Checkout webhook 错误"},
			"expectedInputs":  []string{"项目栈", "集成目标", "错误信息或现有代码"},
			"expectedOutputs": []string{"接入步骤", "示例代码", "错误排查清单"},
			"boundaries":      "不要只总结文档；必须沉淀成可执行接入流程。",
			"notes":           "优先覆盖 webhook 和测试模式。",
		},
	}

	w = httptest.NewRecorder()
	req := withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-generation-mission", directionBody), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillGenerationMission(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCaptureSkillGenerationMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp CreateBrowserCaptureSkillGenerationMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.PlanningStatus != "queued" || resp.PlanningAgentID == nil || *resp.PlanningAgentID != agentID {
		t.Fatalf("planning status/agent = %q/%v, want queued/%s", resp.PlanningStatus, resp.PlanningAgentID, agentID)
	}
	if resp.Skill.ID == "" || resp.Skill.Name != "Stripe Checkout webhook 接入助手" {
		t.Fatalf("skill response = %+v, want created skill draft", resp.Skill)
	}
	if !strings.Contains(resp.Skill.Content, "Didian-generated draft") ||
		!strings.Contains(resp.Skill.Content, "https://docs.stripe.com/payments/checkout") ||
		!strings.Contains(resp.Skill.Content, "用于真实项目接入 Stripe Checkout") ||
		!strings.Contains(resp.Skill.Content, "不要只总结文档") {
		t.Fatalf("skill draft content missing source context: %q", resp.Skill.Content)
	}
	if !strings.Contains(resp.Issue.Title, "完善 Skill：") || !strings.Contains(resp.Issue.Title, resp.Skill.Name) {
		t.Fatalf("issue title = %q, want skill generation title", resp.Issue.Title)
	}
	if resp.Issue.Description == nil ||
		!strings.Contains(*resp.Issue.Description, "didian skill update "+resp.Skill.ID) ||
		!strings.Contains(*resp.Issue.Description, created.CaptureID) ||
		!strings.Contains(*resp.Issue.Description, "browser_capture_skill_generation") ||
		!strings.Contains(*resp.Issue.Description, "用户确认的主要用途") ||
		!strings.Contains(*resp.Issue.Description, "优先覆盖 webhook 和测试模式") {
		t.Fatalf("issue description missing skill update instructions: %v", resp.Issue.Description)
	}
	if resp.Issue.AssigneeID == nil || *resp.Issue.AssigneeID != agentID {
		t.Fatalf("issue assignee = %v, want %s", resp.Issue.AssigneeID, agentID)
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
		testPool.Exec(ctx, `DELETE FROM skill WHERE id = $1`, resp.Skill.ID)
		testPool.Exec(ctx, `DELETE FROM captured_source WHERE id = $1`, created.CaptureID)
	})
}

func TestCreateBrowserCaptureSkillDirectionMissionQueuesCodexWithoutCreatingSkill(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	_, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	suffix := time.Now().UnixNano()
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          fmt.Sprintf("https://github.com/example/direction-only-%d", suffix),
		"title":        "example/direction-only",
		"domain":       "github.com",
		"description":  "A GitHub repository with README, install commands, license, and integration notes.",
		"readableText": `糟糕！ 加载时出错，请重新加载此页面。 在 github.dev 中打开 {"payload":{"codeViewRepoRoute":{"path":"/","refInfo":{"name":"main"}}},"tree":{"items":[{"name":".cargo","contentType":"directory"},{"name":"Cargo.toml","contentType":"file"},{"name":"README.md","contentType":"file"}]}}`,
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

	w = httptest.NewRecorder()
	req := withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-direction-mission", map[string]any{}), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillDirectionMission(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCaptureSkillDirectionMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp CreateBrowserCaptureSkillDirectionMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.PlanningStatus != "queued" || resp.PlanningAgentID == nil || *resp.PlanningAgentID != agentID {
		t.Fatalf("planning status/agent = %q/%v, want queued/%s", resp.PlanningStatus, resp.PlanningAgentID, agentID)
	}
	if !strings.Contains(resp.Issue.Title, "分析 Skill 方向：") {
		t.Fatalf("issue title = %q, want direction analysis title", resp.Issue.Title)
	}
	if resp.Issue.Description == nil ||
		!strings.Contains(*resp.Issue.Description, "只做方向分析，不要创建或更新 Skill") ||
		!strings.Contains(*resp.Issue.Description, "推荐方向 1") ||
		!strings.Contains(*resp.Issue.Description, created.CaptureID) {
		t.Fatalf("issue description missing direction instructions: %v", resp.Issue.Description)
	}
	if resp.Issue.Metadata["didian_internal"] != true || resp.Issue.Metadata["didian_internal_kind"] != "skill_direction_analysis" {
		t.Fatalf("direction issue metadata = %#v, want internal skill direction analysis", resp.Issue.Metadata)
	}
	if strings.Contains(*resp.Issue.Description, `"payload"`) || strings.Contains(*resp.Issue.Description, `"tree":{"items"`) {
		t.Fatalf("direction mission should not include noisy browser payload: %s", *resp.Issue.Description)
	}
	if !strings.Contains(*resp.Issue.Description, "已从提示中省略") {
		t.Fatalf("direction mission should explain noisy excerpt cleanup: %s", *resp.Issue.Description)
	}
	if strings.Contains(*resp.Issue.Description, "didian skill update") {
		t.Fatalf("direction mission must not include skill update instructions: %s", *resp.Issue.Description)
	}

	w = httptest.NewRecorder()
	listReq := newRequest(http.MethodGet, "/api/issues?metadata=%7B%22didian_internal_kind%22%3A%22skill_direction_analysis%22%7D", nil)
	testHandler.ListIssues(w, listReq)
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssues metadata filter: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var internalList struct {
		Issues []IssueResponse `json:"issues"`
	}
	if err := json.NewDecoder(w.Body).Decode(&internalList); err != nil {
		t.Fatalf("decode internal list: %v", err)
	}
	foundInternal := false
	for _, issue := range internalList.Issues {
		if issue.ID == resp.Issue.ID {
			foundInternal = true
		}
	}
	if !foundInternal {
		t.Fatalf("metadata-filtered issue list should include internal direction issue")
	}

	w = httptest.NewRecorder()
	testHandler.ListIssues(w, newRequest(http.MethodGet, "/api/issues", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("ListIssues default: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var defaultList struct {
		Issues []IssueResponse `json:"issues"`
	}
	if err := json.NewDecoder(w.Body).Decode(&defaultList); err != nil {
		t.Fatalf("decode default list: %v", err)
	}
	for _, issue := range defaultList.Issues {
		if issue.ID == resp.Issue.ID {
			t.Fatalf("default issue list should hide internal direction issue")
		}
	}

	var skillCount int
	if err := testPool.QueryRow(context.Background(), `
		SELECT count(*) FROM skill
		WHERE workspace_id = $1 AND name = 'example/direction-only 尽调助手'
	`, testWorkspaceID).Scan(&skillCount); err != nil {
		t.Fatalf("count skills: %v", err)
	}
	if skillCount != 0 {
		t.Fatalf("skill count = %d, want 0", skillCount)
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
		testPool.Exec(ctx, `DELETE FROM captured_source WHERE id = $1`, created.CaptureID)
	})
}

func TestManualBrowserCaptureSkillFlowAllowsNoAutomaticOpportunity(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	_, agentID := seedOwnedCodexBrowserMemoryAgent(t)
	suffix := time.Now().UnixNano()
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          fmt.Sprintf("https://example.com/blog/manual-skill-%d", suffix),
		"title":        "Manual skill workflow note",
		"domain":       "example.com",
		"description":  "A personal article that is useful to this user but is not an automatic platform Skill recommendation.",
		"readableText": "The page describes a personal workflow for reviewing AI output quality and tracking assumptions.",
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
	if created.Capture.SkillOpportunity != nil {
		t.Fatalf("manual test capture should not have automatic skill opportunity: %+v", created.Capture.SkillOpportunity)
	}

	w = httptest.NewRecorder()
	directionReq := map[string]any{"userNeed": "我想把它做成一个 AI 输出质量复盘助手。"}
	req := withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-direction-mission", directionReq), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillDirectionMission(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCaptureSkillDirectionMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var directionResp CreateBrowserCaptureSkillDirectionMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&directionResp); err != nil {
		t.Fatalf("decode direction response: %v", err)
	}
	if directionResp.PlanningStatus != "queued" || directionResp.PlanningAgentID == nil || *directionResp.PlanningAgentID != agentID {
		t.Fatalf("direction planning status/agent = %q/%v, want queued/%s", directionResp.PlanningStatus, directionResp.PlanningAgentID, agentID)
	}
	if directionResp.Issue.Description == nil ||
		!strings.Contains(*directionResp.Issue.Description, "用户主动选择把这个收藏做成 Skill") ||
		!strings.Contains(*directionResp.Issue.Description, "我想把它做成一个 AI 输出质量复盘助手") ||
		!strings.Contains(*directionResp.Issue.Description, "如果不适合，要明确说明不建议生成") {
		t.Fatalf("manual direction description missing user intent: %v", directionResp.Issue.Description)
	}

	w = httptest.NewRecorder()
	generationReq := map[string]any{
		"direction": map[string]any{
			"title":           fmt.Sprintf("AI 输出质量复盘助手 %d", suffix),
			"capability":      "把收藏页面沉淀成 AI 输出质量复盘流程，检查目标、证据、假设和改进动作。",
			"primaryUseCase":  "当我想复盘一次 AI 输出质量时，用它生成检查清单和改进建议。",
			"triggerExamples": []string{"帮我复盘这次 AI 输出", "按收藏里的方法检查这份回答"},
			"expectedInputs":  []string{"AI 输出", "任务目标", "用户反馈"},
			"expectedOutputs": []string{"复盘清单", "问题归因", "改进动作"},
			"boundaries":      "不要只总结网页内容；必须沉淀成可执行复盘流程。",
			"notes":           "用户主动需求：我想把它做成一个 AI 输出质量复盘助手。",
		},
	}
	req = withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-generation-mission", generationReq), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillGenerationMission(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("CreateBrowserCaptureSkillGenerationMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var generationResp CreateBrowserCaptureSkillGenerationMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&generationResp); err != nil {
		t.Fatalf("decode generation response: %v", err)
	}
	if generationResp.Skill.ID == "" || generationResp.Issue.ID == "" {
		t.Fatalf("generation response missing skill or issue: %+v", generationResp)
	}
	if generationResp.Issue.Description == nil || !strings.Contains(*generationResp.Issue.Description, "用户主动需求") {
		t.Fatalf("generation description missing manual user need: %v", generationResp.Issue.Description)
	}

	t.Cleanup(func() {
		ctx := context.Background()
		testPool.Exec(ctx, `DELETE FROM agent_task_queue WHERE issue_id = $1 OR issue_id = $2`, directionResp.Issue.ID, generationResp.Issue.ID)
		testPool.Exec(ctx, `DELETE FROM issue WHERE id = $1 OR id = $2`, directionResp.Issue.ID, generationResp.Issue.ID)
		testPool.Exec(ctx, `DELETE FROM skill WHERE id = $1`, generationResp.Skill.ID)
		testPool.Exec(ctx, `DELETE FROM captured_source WHERE id = $1`, created.CaptureID)
	})
}

func TestCreateBrowserCaptureSkillGenerationMissionQueuesExistingUnassignedMission(t *testing.T) {
	if testHandler == nil || testPool == nil {
		t.Skip("handler test fixture not available")
	}

	ctx := context.Background()
	if _, err := testPool.Exec(ctx, `
		UPDATE agent_runtime
		SET status = 'offline'
		WHERE workspace_id = $1 AND owner_id = $2 AND provider = 'codex'
	`, testWorkspaceID, testUserID); err != nil {
		t.Fatalf("mark existing codex runtimes offline: %v", err)
	}

	suffix := time.Now().UnixNano()
	body := map[string]any{
		"source":       "extension",
		"sourceType":   "link",
		"captureScope": "page",
		"url":          fmt.Sprintf("https://github.com/example/existing-skill-%d", suffix),
		"title":        "example/existing-skill",
		"domain":       "github.com",
		"description":  "A GitHub repository with setup, maintenance signals, and integration notes.",
		"readableText": "README install commands, project structure, API examples, license details, and troubleshooting notes.",
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

	directionBody := map[string]any{
		"direction": map[string]any{
			"title":           "example/existing-skill 评估助手",
			"capability":      "评估 GitHub repo 的采用价值、维护信号和集成风险。",
			"primaryUseCase":  "用于判断这个 repo 是否适合当前项目采用。",
			"triggerExamples": []string{"评估这个 repo 是否适合我的项目"},
			"expectedInputs":  []string{"项目背景", "技术栈", "评估关注点"},
			"expectedOutputs": []string{"采用建议", "上手步骤", "风险清单"},
			"boundaries":      "不要只复述 README。",
		},
	}

	w = httptest.NewRecorder()
	req := withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-generation-mission", directionBody), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillGenerationMission(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("initial CreateBrowserCaptureSkillGenerationMission: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var initial CreateBrowserCaptureSkillGenerationMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&initial); err != nil {
		t.Fatalf("decode initial response: %v", err)
	}
	if initial.PlanningStatus != "no_codex_agent" {
		t.Fatalf("initial planning status = %q, want no_codex_agent", initial.PlanningStatus)
	}
	if initial.Issue.AssigneeID != nil {
		t.Fatalf("initial issue assignee = %v, want unassigned", initial.Issue.AssigneeID)
	}

	_, agentID := seedOwnedCodexBrowserMemoryAgent(t)

	w = httptest.NewRecorder()
	req = withURLParam(newRequest(http.MethodPost, "/api/browser-captures/"+created.CaptureID+"/skill-generation-mission", directionBody), "id", created.CaptureID)
	testHandler.CreateBrowserCaptureSkillGenerationMission(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("duplicate CreateBrowserCaptureSkillGenerationMission: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp CreateBrowserCaptureSkillGenerationMissionResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode duplicate response: %v", err)
	}
	if resp.PlanningStatus != "queued" || resp.PlanningAgentID == nil || *resp.PlanningAgentID != agentID {
		t.Fatalf("duplicate planning status/agent = %q/%v, want queued/%s", resp.PlanningStatus, resp.PlanningAgentID, agentID)
	}
	if resp.Issue.ID != initial.Issue.ID {
		t.Fatalf("duplicate issue id = %s, want existing issue %s", resp.Issue.ID, initial.Issue.ID)
	}
	if resp.Issue.AssigneeID == nil || *resp.Issue.AssigneeID != agentID {
		t.Fatalf("duplicate issue assignee = %v, want %s", resp.Issue.AssigneeID, agentID)
	}

	var taskCount int
	if err := testPool.QueryRow(ctx, `
		SELECT count(*) FROM agent_task_queue
		WHERE issue_id = $1 AND agent_id = $2 AND status = 'queued'
	`, resp.Issue.ID, agentID).Scan(&taskCount); err != nil {
		t.Fatalf("count queued task: %v", err)
	}
	if taskCount != 1 {
		t.Fatalf("queued task count = %d, want 1", taskCount)
	}

	t.Cleanup(func() {
		c := context.Background()
		testPool.Exec(c, `DELETE FROM agent_task_queue WHERE issue_id = $1`, resp.Issue.ID)
		testPool.Exec(c, `DELETE FROM issue WHERE id = $1`, resp.Issue.ID)
		testPool.Exec(c, `DELETE FROM skill WHERE id = $1`, resp.Skill.ID)
		testPool.Exec(c, `DELETE FROM captured_source WHERE id = $1`, created.CaptureID)
	})
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func findBrowserCaptureResponse(captures []BrowserCaptureResponse, id string) *BrowserCaptureResponse {
	for i := range captures {
		if captures[i].ID == id {
			return &captures[i]
		}
	}
	return nil
}

func waitForBrowserCaptureMemory(t *testing.T, captureID string) ListBrowserCapturesResponse {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	var last ListBrowserCapturesResponse
	for {
		w := httptest.NewRecorder()
		req := newRequest(http.MethodGet, "/api/browser-captures?limit=5", nil)
		testHandler.ListBrowserCaptures(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("ListBrowserCaptures: expected 200, got %d: %s", w.Code, w.Body.String())
		}
		last = ListBrowserCapturesResponse{}
		if err := json.NewDecoder(w.Body).Decode(&last); err != nil {
			t.Fatalf("decode list response: %v", err)
		}
		for _, capture := range last.Captures {
			if capture.ID == captureID && capture.Memory != nil && capture.Memory.Status == "ready" {
				return last
			}
		}
		if time.Now().After(deadline) {
			return last
		}
		time.Sleep(20 * time.Millisecond)
	}
}

func listBrowserCapturesForTest(t *testing.T, path string) ListBrowserCapturesResponse {
	t.Helper()
	w := httptest.NewRecorder()
	testHandler.ListBrowserCaptures(w, newRequest(http.MethodGet, path, nil))
	if w.Code != http.StatusOK {
		t.Fatalf("ListBrowserCaptures: expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp ListBrowserCapturesResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	return resp
}

func seedOwnedCodexBrowserMemoryAgent(t *testing.T) (string, string) {
	t.Helper()
	ctx := context.Background()
	suffix := time.Now().UnixNano()
	var runtimeID string
	if err := testPool.QueryRow(ctx, `
		INSERT INTO agent_runtime (
			workspace_id, daemon_id, name, runtime_mode, provider,
			status, device_info, metadata, owner_id, last_seen_at
		)
		VALUES ($1, NULL, $2, 'local', 'codex', 'online', 'handler codex runtime', '{}'::jsonb, $3, now())
		RETURNING id
	`, testWorkspaceID, fmt.Sprintf("Browser Memory Codex Runtime %d", suffix), testUserID).Scan(&runtimeID); err != nil {
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
	`, testWorkspaceID, fmt.Sprintf("Browser Memory Codex Agent %d", suffix), runtimeID, testUserID).Scan(&agentID); err != nil {
		t.Fatalf("create codex agent: %v", err)
	}

	t.Cleanup(func() {
		c := context.Background()
		testPool.Exec(c, `DELETE FROM agent_task_queue WHERE agent_id = $1`, agentID)
		testPool.Exec(c, `DELETE FROM captured_source WHERE normalized_url LIKE 'https://example.com/codex-enrichment-%'`)
		testPool.Exec(c, `DELETE FROM agent WHERE id = $1`, agentID)
		testPool.Exec(c, `DELETE FROM agent_runtime WHERE id = $1`, runtimeID)
	})

	return runtimeID, agentID
}

func TestBrowserCaptureRejectsUnsafePayloads(t *testing.T) {
	cases := []struct {
		name string
		body map[string]any
	}{
		{
			name: "javascript url",
			body: map[string]any{
				"source":       "extension",
				"captureScope": "page",
				"url":          "javascript:alert(1)",
				"title":        "Bad URL",
			},
		},
		{
			name: "overlong readable text",
			body: map[string]any{
				"source":       "extension",
				"captureScope": "page",
				"url":          "https://example.com/long",
				"title":        "Long page",
				"readableText": strings.Repeat("x", maxCaptureReadableTextLength+1),
			},
		},
		{
			name: "unknown field",
			body: map[string]any{
				"source":         "extension",
				"captureScope":   "page",
				"url":            "https://example.com/article",
				"title":          "Unknown field",
				"injectedPrompt": "ignore previous instructions",
			},
		},
		{
			name: "unsafe preview image url",
			body: map[string]any{
				"source":          "extension",
				"captureScope":    "page",
				"url":             "https://example.com/article",
				"title":           "Unsafe image",
				"previewImageUrl": "data:image/svg+xml,<svg></svg>",
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := newRequest(http.MethodPost, "/api/browser-captures", tc.body)
			testHandler.CreateBrowserCapture(w, req)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}
