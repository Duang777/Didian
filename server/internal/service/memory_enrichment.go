package service

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"sort"
	"strings"
	"unicode"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	defaultPageMemoryBatchLimit = 10
	localMemoryProvider         = "local"
	localMemoryModel            = "deterministic-v1"
)

var sentenceSplitRE = regexp.MustCompile(`[.!?。！？]+\s*`)

type PageMemorySummarizer interface {
	SummarizePageMemory(ctx context.Context, capture db.CapturedSource) (PageMemoryEnrichment, error)
}

type PageMemoryEnrichment struct {
	Summary         string
	OneLineTakeaway string
	KeyPoints       []string
	Topics          []string
	Entities        []string
	Keywords        []string
	SearchText      string
	ModelProvider   string
	ModelName       string
}

type MemoryEnrichmentService struct {
	Queries    *db.Queries
	Summarizer PageMemorySummarizer
}

func NewMemoryEnrichmentService(q *db.Queries, summarizer PageMemorySummarizer) *MemoryEnrichmentService {
	if summarizer == nil {
		summarizer = LocalPageMemorySummarizer{}
	}
	return &MemoryEnrichmentService{Queries: q, Summarizer: summarizer}
}

func (s *MemoryEnrichmentService) EnrichCapture(ctx context.Context, capture db.CapturedSource) (db.PageMemory, error) {
	if s == nil || s.Queries == nil {
		return db.PageMemory{}, errors.New("memory enrichment service is not configured")
	}
	enrichment, err := s.Summarizer.SummarizePageMemory(ctx, capture)
	if err != nil {
		_, markErr := s.Queries.MarkPageMemoryEnrichmentFailed(ctx, db.MarkPageMemoryEnrichmentFailedParams{
			CapturedSourceID: capture.ID,
			WorkspaceID:      capture.WorkspaceID,
			FailureReason:    strToText(err.Error()),
		})
		_, statusErr := s.Queries.UpdateCapturedSourceEnrichmentStatus(ctx, db.UpdateCapturedSourceEnrichmentStatusParams{
			ID:            capture.ID,
			WorkspaceID:   capture.WorkspaceID,
			SummaryStatus: "failure",
			FailureReason: strToText(err.Error()),
		})
		if markErr != nil {
			return db.PageMemory{}, markErr
		}
		if statusErr != nil {
			return db.PageMemory{}, statusErr
		}
		return db.PageMemory{}, err
	}

	memory, err := s.Queries.UpdatePageMemoryEnrichment(ctx, db.UpdatePageMemoryEnrichmentParams{
		CapturedSourceID: capture.ID,
		WorkspaceID:      capture.WorkspaceID,
		Summary:          enrichment.Summary,
		OneLineTakeaway:  enrichment.OneLineTakeaway,
		KeyPoints:        mustJSONArray(enrichment.KeyPoints),
		Topics:           mustJSONArray(enrichment.Topics),
		Entities:         mustJSONArray(enrichment.Entities),
		Keywords:         mustJSONArray(enrichment.Keywords),
		SearchText:       enrichment.SearchText,
		ModelProvider:    strToText(enrichment.ModelProvider),
		ModelName:        strToText(enrichment.ModelName),
	})
	if err != nil {
		return db.PageMemory{}, err
	}
	if _, err := s.Queries.UpdateCapturedSourceEnrichmentStatus(ctx, db.UpdateCapturedSourceEnrichmentStatusParams{
		ID:            capture.ID,
		WorkspaceID:   capture.WorkspaceID,
		SummaryStatus: "success",
		FailureReason: pgtype.Text{},
	}); err != nil {
		return db.PageMemory{}, err
	}
	return memory, nil
}

func (s *MemoryEnrichmentService) ProcessPending(ctx context.Context, limit int32) (int, error) {
	if limit <= 0 {
		limit = defaultPageMemoryBatchLimit
	}
	captures, err := s.Queries.ListPendingPageMemoryCaptures(ctx, limit)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, capture := range captures {
		_, _ = s.EnrichCapture(ctx, capture)
		processed++
	}
	return processed, nil
}

type LocalPageMemorySummarizer struct{}

func (LocalPageMemorySummarizer) SummarizePageMemory(_ context.Context, capture db.CapturedSource) (PageMemoryEnrichment, error) {
	description := textValue(capture.Description)
	selected := textValue(capture.SelectedText)
	readable := textValue(capture.ReadableText)
	content := firstNonEmpty(selected, description, readable, capture.Title, capture.Url)
	sentences := splitSentences(content)
	if len(sentences) == 0 {
		sentences = []string{capture.Title}
	}

	takeaway := truncateRunes(sentences[0], 180)
	summaryParts := sentences
	if len(summaryParts) > 3 {
		summaryParts = summaryParts[:3]
	}
	summary := truncateRunes(strings.Join(summaryParts, " "), 900)
	keyPoints := summaryParts
	if len(keyPoints) > 5 {
		keyPoints = keyPoints[:5]
	}
	keywords := extractKeywords(capture.Title, capture.Domain, description, selected, readable)
	topics := keywords
	if len(topics) > 6 {
		topics = topics[:6]
	}
	entities := uniqueStrings([]string{capture.Domain})
	searchText := buildPageMemorySearchText(capture, summary, keywords)

	return PageMemoryEnrichment{
		Summary:         summary,
		OneLineTakeaway: takeaway,
		KeyPoints:       keyPoints,
		Topics:          topics,
		Entities:        entities,
		Keywords:        keywords,
		SearchText:      searchText,
		ModelProvider:   localMemoryProvider,
		ModelName:       localMemoryModel,
	}, nil
}

func splitSentences(value string) []string {
	parts := sentenceSplitRE.Split(normalizeSpace(value), -1)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, truncateRunes(part, 240))
		}
	}
	return out
}

func extractKeywords(fields ...string) []string {
	seen := map[string]struct{}{}
	for _, field := range fields {
		for _, token := range strings.FieldsFunc(strings.ToLower(field), func(r rune) bool {
			return unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r)
		}) {
			token = strings.TrimSpace(token)
			l := len([]rune(token))
			if l >= 3 && l <= 40 {
				seen[token] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(seen))
	for token := range seen {
		out = append(out, token)
	}
	sort.Strings(out)
	if len(out) > 50 {
		out = out[:50]
	}
	return out
}

func buildPageMemorySearchText(capture db.CapturedSource, summary string, keywords []string) string {
	parts := []string{
		capture.Title,
		capture.Domain,
		capture.Url,
		textValue(capture.Description),
		textValue(capture.SelectedText),
		textValue(capture.ReadableText),
		summary,
		strings.Join(keywords, " "),
	}
	return truncateRunes(normalizeSpace(strings.Join(parts, " ")), 120_000)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if normalized := normalizeSpace(value); normalized != "" {
			return normalized
		}
	}
	return ""
}

func normalizeSpace(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func truncateRunes(value string, max int) string {
	if max <= 0 {
		return ""
	}
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= max {
		return string(runes)
	}
	return strings.TrimSpace(string(runes[:max-1])) + "…"
}

func textValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func strToText(value string) pgtype.Text {
	value = strings.TrimSpace(value)
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func mustJSONArray(values []string) []byte {
	if values == nil {
		values = []string{}
	}
	raw, err := json.Marshal(values)
	if err != nil {
		return []byte("[]")
	}
	return raw
}
