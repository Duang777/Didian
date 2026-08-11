package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/didian-ai/didian/server/internal/logger"
	"github.com/didian-ai/didian/server/internal/middleware"
	"github.com/didian-ai/didian/server/internal/service"
	"github.com/didian-ai/didian/server/internal/util"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/didian-ai/didian/server/pkg/llm"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	maxAIInboxInputRunes   = 20_000
	maxAIInboxCaptureIDs   = 20
	aiInboxAnalyzeProvider = "llm"
	aiInboxLocalProvider   = "local"
)

type AnalyzeAIInboxRequest struct {
	Input      string   `json:"input"`
	CaptureIDs []string `json:"captureIds"`
}

type AnalyzeAIInboxResponse struct {
	Understanding AIInboxUnderstanding `json:"understanding"`
	Provider      string               `json:"provider"`
	Model         string               `json:"model,omitempty"`
}

type CreateAIInboxMissionRequest struct {
	Title                    string                `json:"title"`
	Description              string                `json:"description"`
	Understanding            *AIInboxUnderstanding `json:"understanding,omitempty"`
	SelectedPersonalSkillIDs []string              `json:"selected_personal_skill_ids,omitempty"`
}

type CreateAIInboxMissionResponse struct {
	Issue           IssueResponse `json:"issue"`
	PlanningStatus  string        `json:"planningStatus"`
	PlanningAgentID *string       `json:"planningAgentId,omitempty"`
}

type AIInboxUnderstanding struct {
	Intent                string   `json:"intent"`
	SuggestedMissionTitle string   `json:"suggestedMissionTitle"`
	Summary               string   `json:"summary"`
	SuggestedOutputs      []string `json:"suggestedOutputs"`
	MissingInfo           []string `json:"missingInfo"`
	Confidence            float64  `json:"confidence"`
}

type aiInboxLLMUnderstanding struct {
	Intent                string   `json:"intent"`
	SuggestedMissionTitle string   `json:"suggested_mission_title"`
	Summary               string   `json:"summary"`
	SuggestedOutputs      []string `json:"suggested_outputs"`
	MissingInfo           []string `json:"missing_info"`
	Confidence            float64  `json:"confidence"`
}

type aiInboxCaptureContext struct {
	Title   string
	URL     string
	Domain  string
	Summary string
	Preview string
}

func (h *Handler) AnalyzeAIInbox(w http.ResponseWriter, r *http.Request) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}

	var req AnalyzeAIInboxRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Input = normalizeSpace(req.Input)
	if utf8.RuneCountInString(req.Input) > maxAIInboxInputRunes {
		writeError(w, http.StatusBadRequest, "input is too long")
		return
	}
	if len(req.CaptureIDs) > maxAIInboxCaptureIDs {
		writeError(w, http.StatusBadRequest, "too many captureIds")
		return
	}

	captures, err := h.loadAIInboxCaptureContext(r.Context(), workspaceID, req.CaptureIDs)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Input == "" && len(captures) == 0 {
		writeError(w, http.StatusBadRequest, "input or captureIds is required")
		return
	}

	if h.LLM != nil && h.LLM.Enabled() {
		understanding, err := h.analyzeAIInboxWithLLM(r.Context(), req.Input, captures)
		if err == nil {
			writeJSON(w, http.StatusOK, AnalyzeAIInboxResponse{Understanding: understanding, Provider: aiInboxAnalyzeProvider, Model: h.LLM.DefaultModel()})
			return
		}
	}

	writeJSON(w, http.StatusOK, AnalyzeAIInboxResponse{Understanding: localAIInboxUnderstanding(req.Input, captures), Provider: aiInboxLocalProvider})
}

func (h *Handler) CreateAIInboxMission(w http.ResponseWriter, r *http.Request) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}
	creatorID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	creatorUUID, ok := parseUUIDOrBadRequest(w, creatorID, "creator id")
	if !ok {
		return
	}

	var req CreateAIInboxMissionRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Title = truncateTrimmed(normalizeSpace(req.Title), 120)
	req.Description = strings.TrimSpace(req.Description)
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if utf8.RuneCountInString(req.Description) > maxAIInboxInputRunes {
		writeError(w, http.StatusBadRequest, "description is too long")
		return
	}
	selectedSkillIDs, ok := h.validateAIInboxPersonalSkillSelection(w, r, workspaceID, req.SelectedPersonalSkillIDs)
	if !ok {
		return
	}

	planningStatus := "no_codex_agent"
	var planningAgentID *string
	var assigneeType pgtype.Text
	var assigneeID pgtype.UUID
	if agent, err := h.Queries.FindOwnedOnlineCodexAgent(r.Context(), db.FindOwnedOnlineCodexAgentParams{
		WorkspaceID: workspaceID,
		OwnerID:     creatorUUID,
	}); err == nil && agent.ID.Valid {
		assigneeType = pgtype.Text{String: "agent", Valid: true}
		assigneeID = agent.ID
		id := uuidToString(agent.ID)
		planningAgentID = &id
		planningStatus = "queued"
	}

	prefix := h.getIssuePrefix(r.Context(), workspaceID)
	res, err := h.IssueService.Create(r.Context(), service.IssueCreateParams{
		WorkspaceID:    workspaceID,
		Title:          req.Title,
		Description:    strToText(req.Description),
		Status:         "todo",
		Priority:       "none",
		AssigneeType:   assigneeType,
		AssigneeID:     assigneeID,
		CreatorType:    "member",
		CreatorID:      creatorUUID,
		AttachmentIDs:  nil,
		AllowDuplicate: false,
	}, service.IssueCreateOpts{
		ActorID:          creatorID,
		AnalyticsAgentID: firstNonNilString(planningAgentID),
		Platform:         func() string { p, _, _ := middleware.ClientMetadataFromContext(r.Context()); return p }(),
		AfterCreate: func(ctx context.Context, issue db.Issue) error {
			if len(selectedSkillIDs) == 0 {
				return nil
			}
			return h.linkAIInboxMissionPersonalSkills(ctx, workspaceID, issue.ID, creatorUUID, selectedSkillIDs)
		},
		BroadcastPayload: func(issue db.Issue, atts []db.Attachment) map[string]any {
			return map[string]any{"issue": issueToResponse(issue, prefix)}
		},
	})
	if errors.Is(err, service.ErrActiveDuplicate) {
		dup := *res.DuplicateIssue
		existing := issueToResponse(dup, h.getIssuePrefix(r.Context(), dup.WorkspaceID))
		writeJSON(w, http.StatusConflict, map[string]any{
			"code":  "active_duplicate_issue",
			"error": duplicateIssueMessage(existing),
			"issue": existing,
		})
		return
	}
	if err != nil {
		slog.Warn("create ai inbox mission failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID))...)
		writeError(w, http.StatusInternalServerError, "failed to create mission")
		return
	}
	writeJSON(w, http.StatusCreated, CreateAIInboxMissionResponse{
		Issue:           issueToResponse(res.Issue, prefix),
		PlanningStatus:  planningStatus,
		PlanningAgentID: planningAgentID,
	})
}

func (h *Handler) validateAIInboxPersonalSkillSelection(w http.ResponseWriter, r *http.Request, workspaceID pgtype.UUID, rawIDs []string) ([]pgtype.UUID, bool) {
	if len(rawIDs) == 0 {
		return nil, true
	}
	if len(rawIDs) > 12 {
		writeError(w, http.StatusBadRequest, "too many selected personal skills")
		return nil, false
	}
	seen := map[string]struct{}{}
	out := make([]pgtype.UUID, 0, len(rawIDs))
	for _, raw := range rawIDs {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		if _, exists := seen[raw]; exists {
			continue
		}
		seen[raw] = struct{}{}
		id, err := util.ParseUUID(raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid selected personal skill id")
			return nil, false
		}
		skill, err := h.Queries.GetPersonalSkill(r.Context(), db.GetPersonalSkillParams{
			ID:          id,
			WorkspaceID: workspaceID,
		})
		if err != nil || !skill.Enabled {
			writeError(w, http.StatusBadRequest, "selected personal skill not found")
			return nil, false
		}
		out = append(out, id)
	}
	return out, true
}

func (h *Handler) linkAIInboxMissionPersonalSkills(ctx context.Context, workspaceID, issueID, selectedBy pgtype.UUID, skillIDs []pgtype.UUID) error {
	for _, skillID := range skillIDs {
		if _, err := h.Queries.CreateIssuePersonalSkill(ctx, db.CreateIssuePersonalSkillParams{
			WorkspaceID:     workspaceID,
			IssueID:         issueID,
			PersonalSkillID: skillID,
			SelectedBy:      selectedBy,
			Source:          "ai_inbox",
			UsageNote:       "Selected from AI Inbox before Mission creation.",
		}); err != nil {
			return err
		}
		if _, err := h.Queries.IncrementPersonalSkillUse(ctx, db.IncrementPersonalSkillUseParams{
			ID:          skillID,
			WorkspaceID: workspaceID,
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) loadAIInboxCaptureContext(ctx context.Context, workspaceID pgtype.UUID, ids []string) ([]aiInboxCaptureContext, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	out := make([]aiInboxCaptureContext, 0, len(ids))
	seen := map[string]struct{}{}
	for _, rawID := range ids {
		rawID = strings.TrimSpace(rawID)
		if rawID == "" {
			continue
		}
		if _, ok := seen[rawID]; ok {
			continue
		}
		seen[rawID] = struct{}{}
		captureID, err := util.ParseUUID(rawID)
		if err != nil {
			return nil, fmt.Errorf("invalid capture id")
		}
		capture, err := h.Queries.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
			ID:          captureID,
			WorkspaceID: workspaceID,
		})
		if err != nil {
			return nil, fmt.Errorf("browser capture not found")
		}
		memory, _ := h.Queries.GetPageMemory(ctx, db.GetPageMemoryParams{
			CapturedSourceID: capture.ID,
			WorkspaceID:      workspaceID,
		})
		ctxItem := aiInboxCaptureContext{
			Title:  capture.Title,
			URL:    capture.Url,
			Domain: capture.Domain,
		}
		if memory.Status == "ready" {
			ctxItem.Summary = firstNonEmpty(memory.OneLineTakeaway, memory.Summary)
		}
		ctxItem.Preview = firstNonEmpty(textToString(capture.SelectedText), textToString(capture.Description), textToString(capture.ReadableText))
		out = append(out, ctxItem)
	}
	return out, nil
}

func (h *Handler) analyzeAIInboxWithLLM(ctx context.Context, input string, captures []aiInboxCaptureContext) (AIInboxUnderstanding, error) {
	if h.LLM == nil || !h.LLM.Enabled() {
		return AIInboxUnderstanding{}, llm.ErrNotConfigured
	}
	text, err := h.LLM.GenerateText(ctx, "", aiInboxAnalyzeSystemPrompt(), aiInboxAnalyzeUserPrompt(input, captures))
	if err != nil {
		return AIInboxUnderstanding{}, err
	}
	var parsed aiInboxLLMUnderstanding
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &parsed); err != nil {
		return AIInboxUnderstanding{}, err
	}
	return normalizeAIInboxUnderstanding(AIInboxUnderstanding{
		Intent:                parsed.Intent,
		SuggestedMissionTitle: parsed.SuggestedMissionTitle,
		Summary:               parsed.Summary,
		SuggestedOutputs:      parsed.SuggestedOutputs,
		MissingInfo:           parsed.MissingInfo,
		Confidence:            parsed.Confidence,
	}), nil
}

func aiInboxAnalyzeSystemPrompt() string {
	return strings.Join([]string{
		"You analyze AI Inbox input for Didian.",
		"Return exactly one JSON object with keys: intent, suggested_mission_title, summary, suggested_outputs, missing_info, confidence.",
		"Allowed intent values: research_pack, learning_plan, collect, compare, deduplicate, summarize, monitor, diagnose, archive_only.",
		"Do not include markdown fences or extra commentary.",
	}, "\n")
}

func aiInboxAnalyzeUserPrompt(input string, captures []aiInboxCaptureContext) string {
	var b strings.Builder
	b.WriteString("User input:\n")
	b.WriteString(input)
	b.WriteString("\n\nBrowser captures:\n")
	for i, capture := range captures {
		b.WriteString(fmt.Sprintf("%d. %s\nURL: %s\nDomain: %s\nSummary: %s\nPreview: %s\n", i+1, capture.Title, capture.URL, capture.Domain, capture.Summary, truncateTrimmed(capture.Preview, 600)))
	}
	return b.String()
}

func localAIInboxUnderstanding(input string, captures []aiInboxCaptureContext) AIInboxUnderstanding {
	combined := strings.ToLower(input + " " + strings.Join(captureTitles(captures), " "))
	urlCount := strings.Count(combined, "http://") + strings.Count(combined, "https://") + len(captures)
	intent := "collect"
	title := "整理输入线索"
	summary := "检测到一段资源线索，可以先生成 Mission 计划再沉淀到 Atlas。"
	outputs := []string{"资源索引", "重点摘要", "相关关系", "下一步建议"}
	confidence := 0.68
	if strings.Contains(combined, "学习") || strings.Contains(combined, "learn") || strings.Contains(combined, "教程") {
		intent = "learning_plan"
		title = "整理学习资料路线"
		summary = fmt.Sprintf("检测到 %d 个链接或收藏，适合创建一个带计划的学习 Mission。", maxInt(urlCount, 1))
		confidence = 0.82
	} else if strings.Contains(combined, "对比") || strings.Contains(combined, "compare") {
		intent = "compare"
		title = "对比输入资源"
		summary = "检测到比较意图，适合整理差异、适用场景和下一步建议。"
		confidence = 0.78
	} else if urlCount > 0 {
		intent = "research_pack"
		title = "整理资源研究包"
		summary = fmt.Sprintf("检测到 %d 个链接或收藏，适合创建一个资源整理 Mission。", urlCount)
		confidence = 0.74
	}
	return normalizeAIInboxUnderstanding(AIInboxUnderstanding{Intent: intent, SuggestedMissionTitle: title, Summary: summary, SuggestedOutputs: outputs, MissingInfo: nil, Confidence: confidence})
}

func normalizeAIInboxUnderstanding(value AIInboxUnderstanding) AIInboxUnderstanding {
	allowed := map[string]struct{}{"research_pack": {}, "learning_plan": {}, "collect": {}, "compare": {}, "deduplicate": {}, "summarize": {}, "monitor": {}, "diagnose": {}, "archive_only": {}}
	if _, ok := allowed[value.Intent]; !ok {
		value.Intent = "collect"
	}
	value.SuggestedMissionTitle = truncateTrimmed(firstNonEmpty(value.SuggestedMissionTitle, "整理输入线索"), 120)
	value.Summary = truncateTrimmed(firstNonEmpty(value.Summary, "AI Inbox 已理解这批输入，可以继续创建 Mission。"), 500)
	if len(value.SuggestedOutputs) == 0 {
		value.SuggestedOutputs = []string{"资源索引", "重点摘要", "下一步建议"}
	}
	for i := range value.SuggestedOutputs {
		value.SuggestedOutputs[i] = truncateTrimmed(value.SuggestedOutputs[i], 40)
	}
	if value.Confidence < 0 {
		value.Confidence = 0
	}
	if value.Confidence > 1 {
		value.Confidence = 1
	}
	return value
}

func captureTitles(captures []aiInboxCaptureContext) []string {
	out := make([]string, 0, len(captures))
	for _, capture := range captures {
		out = append(out, capture.Title, capture.Summary, capture.Preview)
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func firstNonNilString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func textToString(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

var _ = errors.Is
