package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestMemoryEnrichmentServiceEnrichesPendingCapture(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createMemoryEnrichmentFixture(t, ctx, pool, q)

	svc := NewMemoryEnrichmentService(q, nil)
	memory, err := svc.EnrichCapture(ctx, fixture.capture)
	if err != nil {
		t.Fatalf("EnrichCapture: %v", err)
	}

	if memory.Status != "ready" {
		t.Fatalf("page_memory.status = %q, want ready", memory.Status)
	}
	if memory.OneLineTakeaway != "This quote is why I saved the page" {
		t.Fatalf("one_line_takeaway = %q", memory.OneLineTakeaway)
	}
	if !strings.Contains(memory.Summary, "This quote is why I saved the page") {
		t.Fatalf("summary = %q, want selected text", memory.Summary)
	}
	if !strings.Contains(memory.SearchText, "browser memory") || !strings.Contains(memory.SearchText, "This quote is why I saved the page") {
		t.Fatalf("search_text = %q, want original and derived text", memory.SearchText)
	}
	if !memory.GeneratedAt.Valid {
		t.Fatal("generated_at was not set")
	}
	if string(memory.KeyPoints) == "[]" || string(memory.Keywords) == "[]" {
		t.Fatalf("expected key_points and keywords, got key_points=%s keywords=%s", memory.KeyPoints, memory.Keywords)
	}

	updated, err := q.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          fixture.capture.ID,
		WorkspaceID: fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetCapturedSourceInWorkspace: %v", err)
	}
	if updated.Status != "ready" || updated.SummaryStatus != "success" {
		t.Fatalf("captured_source status=%q summary_status=%q, want ready/success", updated.Status, updated.SummaryStatus)
	}
	if updated.FailureReason.Valid {
		t.Fatalf("failure_reason = %q, want null", updated.FailureReason.String)
	}
}

func TestMemoryEnrichmentServiceWritesSkillOpportunityFromAIEnrichment(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createMemoryEnrichmentFixture(t, ctx, pool, q)

	svc := NewMemoryEnrichmentService(q, staticPageMemorySummarizer{
		enrichment: PageMemoryEnrichment{
			OneLineTakeaway: "Stripe Checkout API setup with SDK configuration and webhook testing.",
			Summary:         "Use the Stripe Checkout API to create sessions, configure SDK keys, handle webhooks, test errors, and verify integration.",
			KeyPoints:       []string{"Create Checkout sessions with API parameters.", "Configure SDK keys and webhook endpoints.", "Test common integration errors."},
			Topics:          []string{"api", "sdk", "webhook"},
			Entities:        []string{"Stripe"},
			Keywords:        []string{"api", "sdk", "webhook", "integration", "test"},
			SearchText:      "Stripe Checkout API SDK webhook integration test",
			ModelProvider:   "codex",
			ModelName:       "runtime-enrichment",
		},
	})
	if _, err := svc.EnrichCapture(ctx, fixture.capture); err != nil {
		t.Fatalf("EnrichCapture: %v", err)
	}

	updated, err := q.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          fixture.capture.ID,
		WorkspaceID: fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetCapturedSourceInWorkspace: %v", err)
	}
	if len(updated.SkillOpportunity) == 0 {
		t.Fatal("skill_opportunity was not written from enrichment")
	}
	var opportunity SkillOpportunity
	if err := json.Unmarshal(updated.SkillOpportunity, &opportunity); err != nil {
		t.Fatalf("unmarshal skill_opportunity: %v", err)
	}
	if !opportunity.ShouldSuggest || opportunity.PageType != "technical_doc" {
		t.Fatalf("unexpected opportunity: %+v", opportunity)
	}
	if !strings.Contains(opportunity.EvidenceSnippets[0], "Stripe Checkout API") {
		t.Fatalf("evidence snippets = %#v, want AI enrichment text", opportunity.EvidenceSnippets)
	}
}

func TestMemoryEnrichmentServiceMarksFailedWhenSummarizerFails(t *testing.T) {
	pool := newHeadShaDedupPool(t)
	ctx := context.Background()
	q := db.New(pool)
	fixture := createMemoryEnrichmentFixture(t, ctx, pool, q)

	svc := NewMemoryEnrichmentService(q, failingPageMemorySummarizer{})
	_, err := svc.EnrichCapture(ctx, fixture.capture)
	if err == nil || !strings.Contains(err.Error(), "summary unavailable") {
		t.Fatalf("EnrichCapture error = %v, want summary unavailable", err)
	}

	memory, err := q.GetPageMemory(ctx, db.GetPageMemoryParams{
		CapturedSourceID: fixture.capture.ID,
		WorkspaceID:      fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetPageMemory: %v", err)
	}
	if memory.Status != "failed" {
		t.Fatalf("page_memory.status = %q, want failed", memory.Status)
	}
	if !memory.FailureReason.Valid || memory.FailureReason.String != "summary unavailable" {
		t.Fatalf("page_memory.failure_reason = %+v, want summary unavailable", memory.FailureReason)
	}

	updated, err := q.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          fixture.capture.ID,
		WorkspaceID: fixture.workspaceID,
	})
	if err != nil {
		t.Fatalf("GetCapturedSourceInWorkspace: %v", err)
	}
	if updated.Status != "failed" || updated.SummaryStatus != "failure" {
		t.Fatalf("captured_source status=%q summary_status=%q, want failed/failure", updated.Status, updated.SummaryStatus)
	}
	if !updated.FailureReason.Valid || updated.FailureReason.String != "summary unavailable" {
		t.Fatalf("failure_reason = %+v, want summary unavailable", updated.FailureReason)
	}
}

type memoryEnrichmentFixture struct {
	workspaceID pgtype.UUID
	capture     db.CapturedSource
}

func createMemoryEnrichmentFixture(t *testing.T, ctx context.Context, pool *pgxpool.Pool, q *db.Queries) memoryEnrichmentFixture {
	t.Helper()
	suffix := time.Now().UnixNano()
	email := fmt.Sprintf("memory-enrichment-%d@didian.ai", suffix)
	slug := fmt.Sprintf("memory-enrichment-%d", suffix)

	var userID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO "user" (name, email) VALUES ($1, $2) RETURNING id
	`, "Memory Enrichment Test", email).Scan(&userID); err != nil {
		t.Fatalf("create user: %v", err)
	}

	var workspaceID pgtype.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO workspace (name, slug, description, issue_prefix)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, "Memory Enrichment Test", slug, "temporary memory enrichment test workspace", "MEN").Scan(&workspaceID); err != nil {
		t.Fatalf("create workspace: %v", err)
	}
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `DELETE FROM workspace WHERE id = $1`, workspaceID) })

	if _, err := pool.Exec(ctx, `
		INSERT INTO member (workspace_id, user_id, role) VALUES ($1, $2, 'owner')
	`, workspaceID, userID); err != nil {
		t.Fatalf("create member: %v", err)
	}

	capture, err := q.CreateCapturedSource(ctx, db.CreateCapturedSourceParams{
		WorkspaceID:     workspaceID,
		CreatorID:       userID,
		SourceType:      "link",
		Source:          "extension",
		CaptureScope:    "page",
		Url:             "https://example.com/browser-memory",
		NormalizedUrl:   "https://example.com/browser-memory",
		Title:           "Browser memory notes",
		Domain:          "example.com",
		Description:     pgtype.Text{String: "A useful page about browser memory.", Valid: true},
		SelectedText:    pgtype.Text{String: "This quote is why I saved the page. It explains recall.", Valid: true},
		ReadableText:    pgtype.Text{String: "Long article body about browser memory, recall, and summaries.", Valid: true},
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
		SearchText:       "Browser memory notes This quote is why I saved the page",
		Keywords:         []byte(`["browser","memory"]`),
	}); err != nil {
		t.Fatalf("CreatePendingPageMemory: %v", err)
	}

	return memoryEnrichmentFixture{workspaceID: workspaceID, capture: capture}
}

type failingPageMemorySummarizer struct{}

func (failingPageMemorySummarizer) SummarizePageMemory(context.Context, db.CapturedSource) (PageMemoryEnrichment, error) {
	return PageMemoryEnrichment{}, errors.New("summary unavailable")
}

type staticPageMemorySummarizer struct {
	enrichment PageMemoryEnrichment
}

func (s staticPageMemorySummarizer) SummarizePageMemory(context.Context, db.CapturedSource) (PageMemoryEnrichment, error) {
	return s.enrichment, nil
}
