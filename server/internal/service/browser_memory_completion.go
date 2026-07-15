package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/didian-ai/didian/server/internal/util"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/didian-ai/didian/server/pkg/protocol"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	browserMemoryTakeawayMaxRunes = 200
	browserMemorySummaryMaxRunes  = 1200
	browserMemoryListItemMaxRunes = 240
	browserMemoryListMaxItems     = 12
)

type browserMemoryCompletionOutput struct {
	OneLineTakeaway string   `json:"one_line_takeaway"`
	Summary         string   `json:"summary"`
	KeyPoints       []string `json:"key_points"`
	Topics          []string `json:"topics"`
	Entities        []string `json:"entities"`
	Keywords        []string `json:"keywords"`
}

var errBrowserMemoryInvalidOutput = errors.New("browser memory invalid output")

func (s *TaskService) completeBrowserMemoryEnrichment(ctx context.Context, qtx *db.Queries, bm BrowserMemoryEnrichmentContext, result []byte) error {
	workspaceID, err := util.ParseUUID(bm.WorkspaceID)
	if err != nil {
		return fmt.Errorf("parse browser memory workspace id: %w", err)
	}
	captureID, err := util.ParseUUID(bm.CaptureID)
	if err != nil {
		return fmt.Errorf("parse browser memory capture id: %w", err)
	}
	enrichment, err := parseBrowserMemoryCompletion(result)
	if err != nil {
		return err
	}
	if _, err := qtx.UpdatePageMemoryEnrichment(ctx, db.UpdatePageMemoryEnrichmentParams{
		CapturedSourceID: captureID,
		WorkspaceID:      workspaceID,
		Summary:          enrichment.Summary,
		OneLineTakeaway:  enrichment.OneLineTakeaway,
		KeyPoints:        mustJSONArray(enrichment.KeyPoints),
		Topics:           mustJSONArray(enrichment.Topics),
		Entities:         mustJSONArray(enrichment.Entities),
		Keywords:         mustJSONArray(enrichment.Keywords),
		SearchText:       buildBrowserMemoryEnrichmentSearchText(enrichment),
		ModelProvider:    strToText("codex"),
		ModelName:        strToText("runtime-enrichment"),
	}); err != nil {
		return fmt.Errorf("update browser memory enrichment: %w", err)
	}
	if _, err := qtx.UpdateCapturedSourceEnrichmentStatus(ctx, db.UpdateCapturedSourceEnrichmentStatusParams{
		ID:            captureID,
		WorkspaceID:   workspaceID,
		SummaryStatus: "success",
		FailureReason: pgtype.Text{},
	}); err != nil {
		return fmt.Errorf("update browser capture enrichment status: %w", err)
	}
	return nil
}

func (s *TaskService) failBrowserMemoryEnrichment(ctx context.Context, qtx *db.Queries, bm BrowserMemoryEnrichmentContext, errMsg string) error {
	workspaceID, err := util.ParseUUID(bm.WorkspaceID)
	if err != nil {
		return fmt.Errorf("parse browser memory workspace id: %w", err)
	}
	captureID, err := util.ParseUUID(bm.CaptureID)
	if err != nil {
		return fmt.Errorf("parse browser memory capture id: %w", err)
	}
	failure := strToText(errMsg)
	if _, err := qtx.MarkPageMemoryEnrichmentFailed(ctx, db.MarkPageMemoryEnrichmentFailedParams{
		CapturedSourceID: captureID,
		WorkspaceID:      workspaceID,
		FailureReason:    failure,
	}); err != nil {
		return fmt.Errorf("mark browser memory enrichment failed: %w", err)
	}
	if _, err := qtx.UpdateCapturedSourceEnrichmentStatus(ctx, db.UpdateCapturedSourceEnrichmentStatusParams{
		ID:            captureID,
		WorkspaceID:   workspaceID,
		SummaryStatus: "failure",
		FailureReason: failure,
	}); err != nil {
		return fmt.Errorf("update browser capture enrichment failure status: %w", err)
	}
	return nil
}

func parseBrowserMemoryCompletion(result []byte) (PageMemoryEnrichment, error) {
	var completed protocol.TaskCompletedPayload
	if err := json.Unmarshal(result, &completed); err != nil {
		return PageMemoryEnrichment{}, fmt.Errorf("%w: parse completion payload: %v", errBrowserMemoryInvalidOutput, err)
	}
	output := strings.TrimSpace(completed.Output)
	if output == "" {
		return PageMemoryEnrichment{}, fmt.Errorf("%w: empty output", errBrowserMemoryInvalidOutput)
	}
	var parsed browserMemoryCompletionOutput
	if err := json.Unmarshal([]byte(output), &parsed); err != nil {
		return PageMemoryEnrichment{}, fmt.Errorf("%w: parse output JSON: %v", errBrowserMemoryInvalidOutput, err)
	}
	parsed.OneLineTakeaway = truncateRunes(parsed.OneLineTakeaway, browserMemoryTakeawayMaxRunes)
	parsed.Summary = truncateRunes(parsed.Summary, browserMemorySummaryMaxRunes)
	if parsed.OneLineTakeaway == "" {
		return PageMemoryEnrichment{}, fmt.Errorf("%w: one_line_takeaway is required", errBrowserMemoryInvalidOutput)
	}
	if parsed.Summary == "" {
		return PageMemoryEnrichment{}, fmt.Errorf("%w: summary is required", errBrowserMemoryInvalidOutput)
	}

	return PageMemoryEnrichment{
		Summary:         parsed.Summary,
		OneLineTakeaway: parsed.OneLineTakeaway,
		KeyPoints:       normalizeBrowserMemoryStringList(parsed.KeyPoints, 6),
		Topics:          normalizeBrowserMemoryStringList(parsed.Topics, browserMemoryListMaxItems),
		Entities:        normalizeBrowserMemoryStringList(parsed.Entities, browserMemoryListMaxItems),
		Keywords:        normalizeBrowserMemoryStringList(parsed.Keywords, browserMemoryListMaxItems),
		ModelProvider:   "codex",
		ModelName:       "runtime-enrichment",
	}, nil
}

func normalizeBrowserMemoryStringList(values []string, maxItems int) []string {
	if maxItems <= 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, min(len(values), maxItems))
	for _, value := range values {
		value = truncateRunes(value, browserMemoryListItemMaxRunes)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
		if len(out) >= maxItems {
			break
		}
	}
	return out
}

func buildBrowserMemoryEnrichmentSearchText(enrichment PageMemoryEnrichment) string {
	parts := []string{enrichment.OneLineTakeaway, enrichment.Summary}
	parts = append(parts, enrichment.KeyPoints...)
	parts = append(parts, enrichment.Topics...)
	parts = append(parts, enrichment.Entities...)
	parts = append(parts, enrichment.Keywords...)
	return strings.TrimSpace(strings.Join(uniqueStrings(parts), "\n"))
}
