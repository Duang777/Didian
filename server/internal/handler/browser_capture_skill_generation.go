package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/didian-ai/didian/server/internal/logger"
	"github.com/didian-ai/didian/server/internal/middleware"
	"github.com/didian-ai/didian/server/internal/service"
	"github.com/didian-ai/didian/server/internal/util"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/didian-ai/didian/server/pkg/protocol"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateBrowserCaptureSkillGenerationMissionResponse struct {
	Issue           IssueResponse `json:"issue"`
	Skill           SkillResponse `json:"skill"`
	PlanningStatus  string        `json:"planningStatus"`
	PlanningAgentID *string       `json:"planningAgentId,omitempty"`
}

type CreateBrowserCaptureSkillDirectionMissionResponse struct {
	Issue           IssueResponse `json:"issue"`
	PlanningStatus  string        `json:"planningStatus"`
	PlanningAgentID *string       `json:"planningAgentId,omitempty"`
}

type CreateBrowserCaptureSkillDirectionMissionRequest struct {
	UserNeed string `json:"userNeed,omitempty"`
}

type CreateBrowserCaptureSkillGenerationMissionRequest struct {
	Direction BrowserCaptureSkillDirectionRequest `json:"direction"`
}

type BrowserCaptureSkillDirectionRequest struct {
	Title           string   `json:"title"`
	Capability      string   `json:"capability"`
	PrimaryUseCase  string   `json:"primaryUseCase"`
	TriggerExamples []string `json:"triggerExamples"`
	ExpectedInputs  []string `json:"expectedInputs"`
	ExpectedOutputs []string `json:"expectedOutputs"`
	Boundaries      string   `json:"boundaries"`
	Notes           string   `json:"notes,omitempty"`
}

const (
	issueMetadataInternalKey            = "didian_internal"
	issueMetadataInternalKindKey        = "didian_internal_kind"
	issueMetadataSkillDirectionAnalysis = "skill_direction_analysis"
)

func (h *Handler) CreateBrowserCaptureSkillDirectionMission(w http.ResponseWriter, r *http.Request) {
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
	captureID, err := util.ParseUUID(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid browser capture id")
		return
	}

	capture, err := h.Queries.GetCapturedSourceInWorkspace(r.Context(), db.GetCapturedSourceInWorkspaceParams{
		ID:          captureID,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "browser capture not found")
		return
	}

	var req CreateBrowserCaptureSkillDirectionMissionRequest
	if err := decodeOptionalJSONBody(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	userNeed := truncateTrimmed(req.UserNeed, 2000)

	opportunity, manual := skillOpportunityForCaptureOrManual(capture)
	description := buildBrowserCaptureSkillDirectionMissionDescription(capture, opportunity, userNeed, manual)
	if utf8.RuneCountInString(description) > maxAIInboxInputRunes {
		description = truncateTrimmed(description, maxAIInboxInputRunes)
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
		Title:          truncateTrimmed("分析 Skill 方向："+capture.Title, 120),
		Description:    strToText(description),
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
	})
	if errors.Is(err, service.ErrActiveDuplicate) {
		dup := *res.DuplicateIssue
		queuedExisting := false
		if assigneeID.Valid {
			updated, queued, queueErr := h.queueExistingBrowserCaptureSkillMission(r, dup, assigneeID, creatorID)
			if queueErr != nil {
				slog.Warn("queue existing browser capture skill direction mission failed", append(logger.RequestAttrs(r), "error", queueErr, "workspace_id", uuidToString(workspaceID), "issue_id", uuidToString(dup.ID), "agent_id", uuidToString(assigneeID))...)
				writeError(w, http.StatusInternalServerError, "failed to queue existing skill direction mission")
				return
			}
			dup = updated
			queuedExisting = queued
		}
		existingPlanningStatus := "existing"
		var existingPlanningAgentID *string
		if queuedExisting {
			existingPlanningStatus = "queued"
			existingPlanningAgentID = planningAgentID
		} else if !assigneeID.Valid && !dup.AssigneeID.Valid {
			existingPlanningStatus = "no_codex_agent"
		}
		if hidden, err := h.markIssueAsInternalSkillDirectionAnalysis(r, dup); err == nil {
			dup = hidden
		} else {
			slog.Warn("mark existing skill direction mission internal failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "issue_id", uuidToString(dup.ID))...)
		}
		writeJSON(w, http.StatusOK, CreateBrowserCaptureSkillDirectionMissionResponse{
			Issue:           issueToResponse(dup, h.getIssuePrefix(r.Context(), dup.WorkspaceID)),
			PlanningStatus:  existingPlanningStatus,
			PlanningAgentID: existingPlanningAgentID,
		})
		return
	}
	if err != nil {
		slog.Warn("create browser capture skill direction mission failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "capture_id", uuidToString(captureID))...)
		writeError(w, http.StatusInternalServerError, "failed to create skill direction mission")
		return
	}

	issue := res.Issue
	if hidden, err := h.markIssueAsInternalSkillDirectionAnalysis(r, issue); err == nil {
		issue = hidden
	} else {
		slog.Warn("mark skill direction mission internal failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "issue_id", uuidToString(issue.ID))...)
	}
	writeJSON(w, http.StatusCreated, CreateBrowserCaptureSkillDirectionMissionResponse{
		Issue:           issueToResponse(issue, prefix),
		PlanningStatus:  planningStatus,
		PlanningAgentID: planningAgentID,
	})
}

func (h *Handler) markIssueAsInternalSkillDirectionAnalysis(r *http.Request, issue db.Issue) (db.Issue, error) {
	updated, err := h.Queries.SetIssueMetadataKey(r.Context(), db.SetIssueMetadataKeyParams{
		Key:         issueMetadataInternalKey,
		Value:       []byte("true"),
		ID:          issue.ID,
		WorkspaceID: issue.WorkspaceID,
	})
	if err != nil {
		return issue, err
	}
	updated, err = h.Queries.SetIssueMetadataKey(r.Context(), db.SetIssueMetadataKeyParams{
		Key:         issueMetadataInternalKindKey,
		Value:       []byte(strconv.Quote(issueMetadataSkillDirectionAnalysis)),
		ID:          issue.ID,
		WorkspaceID: issue.WorkspaceID,
	})
	if err != nil {
		return updated, err
	}
	return updated, nil
}

func (h *Handler) CreateBrowserCaptureSkillGenerationMission(w http.ResponseWriter, r *http.Request) {
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
	captureID, err := util.ParseUUID(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid browser capture id")
		return
	}

	capture, err := h.Queries.GetCapturedSourceInWorkspace(r.Context(), db.GetCapturedSourceInWorkspaceParams{
		ID:          captureID,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "browser capture not found")
		return
	}

	var req CreateBrowserCaptureSkillGenerationMissionRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	opportunity, _ := skillOpportunityForCaptureOrManual(capture)
	direction, err := normalizeBrowserCaptureSkillDirection(req.Direction, opportunity)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	skill, _, err := h.ensureBrowserCaptureSkillDraft(r, workspaceID, creatorUUID, capture, opportunity, direction)
	if err != nil {
		slog.Warn("create browser capture skill draft failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "capture_id", uuidToString(captureID))...)
		writeError(w, http.StatusInternalServerError, "failed to create skill draft")
		return
	}

	description := buildBrowserCaptureSkillMissionDescription(capture, opportunity, direction, skill)
	if utf8.RuneCountInString(description) > maxAIInboxInputRunes {
		description = truncateTrimmed(description, maxAIInboxInputRunes)
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
		Title:          truncateTrimmed("完善 Skill："+skill.Name, 120),
		Description:    strToText(description),
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
		BroadcastPayload: func(issue db.Issue, atts []db.Attachment) map[string]any {
			return map[string]any{"issue": issueToResponse(issue, prefix)}
		},
	})
	if errors.Is(err, service.ErrActiveDuplicate) {
		dup := *res.DuplicateIssue
		queuedExisting := false
		if assigneeID.Valid {
			updated, queued, queueErr := h.queueExistingBrowserCaptureSkillMission(r, dup, assigneeID, creatorID)
			if queueErr != nil {
				slog.Warn("queue existing browser capture skill generation mission failed", append(logger.RequestAttrs(r), "error", queueErr, "workspace_id", uuidToString(workspaceID), "issue_id", uuidToString(dup.ID), "agent_id", uuidToString(assigneeID))...)
				writeError(w, http.StatusInternalServerError, "failed to queue existing skill generation mission")
				return
			}
			dup = updated
			queuedExisting = queued
		}
		existing := issueToResponse(dup, h.getIssuePrefix(r.Context(), dup.WorkspaceID))
		existingPlanningStatus := "existing"
		var existingPlanningAgentID *string
		if queuedExisting {
			existingPlanningStatus = "queued"
			existingPlanningAgentID = planningAgentID
		} else if !assigneeID.Valid && !dup.AssigneeID.Valid {
			existingPlanningStatus = "no_codex_agent"
		}
		writeJSON(w, http.StatusOK, CreateBrowserCaptureSkillGenerationMissionResponse{
			Issue:           existing,
			Skill:           skill,
			PlanningStatus:  existingPlanningStatus,
			PlanningAgentID: existingPlanningAgentID,
		})
		return
	}
	if err != nil {
		slog.Warn("create browser capture skill generation mission failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "capture_id", uuidToString(captureID))...)
		writeError(w, http.StatusInternalServerError, "failed to create skill generation mission")
		return
	}

	writeJSON(w, http.StatusCreated, CreateBrowserCaptureSkillGenerationMissionResponse{
		Issue:           issueToResponse(res.Issue, prefix),
		Skill:           skill,
		PlanningStatus:  planningStatus,
		PlanningAgentID: planningAgentID,
	})
}

func (h *Handler) queueExistingBrowserCaptureSkillMission(r *http.Request, issue db.Issue, agentID pgtype.UUID, actorID string) (db.Issue, bool, error) {
	activeTasks, err := h.Queries.ListActiveTasksByIssue(r.Context(), issue.ID)
	if err != nil {
		return issue, false, fmt.Errorf("list active tasks: %w", err)
	}
	if len(activeTasks) > 0 {
		return issue, false, nil
	}

	alreadyAssignedToAgent := issue.AssigneeType.Valid && issue.AssigneeType.String == "agent" && issue.AssigneeID.Valid && issue.AssigneeID == agentID
	if issue.AssigneeType.Valid || issue.AssigneeID.Valid {
		if !alreadyAssignedToAgent {
			return issue, false, nil
		}
	} else {
		updated, err := h.Queries.UpdateIssue(r.Context(), db.UpdateIssueParams{
			ID:            issue.ID,
			AssigneeType:  pgtype.Text{String: "agent", Valid: true},
			AssigneeID:    agentID,
			StartDate:     issue.StartDate,
			DueDate:       issue.DueDate,
			ParentIssueID: issue.ParentIssueID,
			ProjectID:     issue.ProjectID,
			Stage:         issue.Stage,
		})
		if err != nil {
			return issue, false, fmt.Errorf("assign issue: %w", err)
		}
		prefix := h.getIssuePrefix(r.Context(), updated.WorkspaceID)
		h.publish(protocol.EventIssueUpdated, uuidToString(updated.WorkspaceID), "member", actorID, map[string]any{
			"issue":              issueToResponse(updated, prefix),
			"assignee_changed":   true,
			"status_changed":     false,
			"priority_changed":   false,
			"project_changed":    false,
			"start_date_changed": false,
			"due_date_changed":   false,
			"prev_title":         issue.Title,
			"prev_assignee_type": textToPtr(issue.AssigneeType),
			"prev_assignee_id":   uuidToPtr(issue.AssigneeID),
			"prev_status":        issue.Status,
			"prev_priority":      issue.Priority,
		})
		issue = updated
	}

	if !h.shouldEnqueueAgentTask(r.Context(), issue) {
		return issue, false, nil
	}
	if _, err := h.TaskService.EnqueueTaskForIssue(r.Context(), issue); err != nil {
		return issue, false, fmt.Errorf("enqueue issue task: %w", err)
	}
	return issue, true, nil
}

func (h *Handler) ensureBrowserCaptureSkillDraft(r *http.Request, workspaceID, creatorID pgtype.UUID, capture db.CapturedSource, opportunity *SkillOpportunityResponse, direction BrowserCaptureSkillDirectionRequest) (SkillResponse, bool, error) {
	existing, err := h.Queries.GetSkillByWorkspaceAndName(r.Context(), db.GetSkillByWorkspaceAndNameParams{
		WorkspaceID: workspaceID,
		Name:        direction.Title,
	})
	if err == nil {
		return skillToResponse(existing), false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return SkillResponse{}, false, err
	}

	created, err := h.createSkillWithFiles(r.Context(), skillCreateInput{
		WorkspaceID: workspaceID,
		CreatorID:   creatorID,
		Name:        direction.Title,
		Description: direction.Capability,
		Content:     buildBrowserCaptureSkillDraftContent(capture, opportunity, direction),
		Config:      buildBrowserCaptureSkillConfig(capture, opportunity, direction, "draft"),
	})
	if err != nil {
		if isUniqueViolation(err) {
			skill, lookupErr := h.Queries.GetSkillByWorkspaceAndName(r.Context(), db.GetSkillByWorkspaceAndNameParams{
				WorkspaceID: workspaceID,
				Name:        direction.Title,
			})
			if lookupErr == nil {
				return skillToResponse(skill), false, nil
			}
		}
		return SkillResponse{}, false, err
	}

	actorType, actorID := h.resolveActor(r, uuidToString(creatorID), uuidToString(workspaceID))
	h.publish(protocol.EventSkillCreated, uuidToString(workspaceID), actorType, actorID, map[string]any{"skill": created})
	return created.SkillResponse, true, nil
}

func decodeOptionalJSONBody(r *http.Request, v any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(v); err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	return nil
}

func skillOpportunityForCaptureOrManual(capture db.CapturedSource) (*SkillOpportunityResponse, bool) {
	if opportunity := skillOpportunityForCapture(capture); opportunity != nil {
		return opportunity, false
	}
	return manualSkillOpportunityForCapture(capture), true
}

func skillOpportunityForCapture(capture db.CapturedSource) *SkillOpportunityResponse {
	if len(capture.SkillOpportunity) > 0 {
		var opportunity SkillOpportunityResponse
		if err := json.Unmarshal(capture.SkillOpportunity, &opportunity); err == nil && opportunity.ShouldSuggest {
			return &opportunity
		}
	}

	return buildSkillOpportunity(CreateBrowserCaptureRequest{
		URL:          capture.Url,
		Title:        capture.Title,
		Domain:       capture.Domain,
		Description:  textToString(capture.Description),
		SelectedText: textToString(capture.SelectedText),
		ReadableText: textToString(capture.ReadableText),
	})
}

func manualSkillOpportunityForCapture(capture db.CapturedSource) *SkillOpportunityResponse {
	req := CreateBrowserCaptureRequest{
		URL:          capture.Url,
		Title:        capture.Title,
		Domain:       capture.Domain,
		Description:  textToString(capture.Description),
		SelectedText: textToString(capture.SelectedText),
		ReadableText: textToString(capture.ReadableText),
	}
	pageType := inferSkillOpportunityPageType(req)
	subject := deriveSkillOpportunitySubject(req)
	return &SkillOpportunityResponse{
		ShouldSuggest:           false,
		Confidence:              0.5,
		PageType:                pageType,
		ProposedTitle:           subject + " 助手",
		ProposedCapability:      "根据用户指定的目标，把这个收藏网页沉淀成可复用的个人 Skill。",
		WhyUseful:               "用户主动选择把这个收藏做成 Skill，需要本地 Codex 先阅读来源并判断最合适的能力方向。",
		TriggerExamples:         []string{"基于这个收藏帮我完成相关任务", "按这个收藏沉淀的流程处理我的问题"},
		ExpectedInputs:          []string{"用户目标", "使用场景", "当前上下文"},
		ExpectedOutputs:         []string{"可执行步骤", "检查清单", "注意事项"},
		ReusableWorkflowScore:   0.5,
		InstructionDensityScore: 0.5,
		FutureUseScore:          0.5,
		EvidenceSnippets:        collectSkillOpportunityEvidence(req),
		RiskNotes:               []string{"这是用户主动发起的 Skill 方向分析，生成前需要 Codex 判断网页是否适合沉淀为可复用能力。"},
	}
}

func normalizeBrowserCaptureSkillDirection(direction BrowserCaptureSkillDirectionRequest, opportunity *SkillOpportunityResponse) (BrowserCaptureSkillDirectionRequest, error) {
	direction.Title = truncateTrimmed(normalizeSpace(firstNonEmpty(direction.Title, opportunity.ProposedTitle)), 120)
	direction.Capability = truncateTrimmed(normalizeSpace(firstNonEmpty(direction.Capability, opportunity.ProposedCapability)), 500)
	direction.PrimaryUseCase = truncateTrimmed(normalizeSpace(direction.PrimaryUseCase), 800)
	direction.Boundaries = truncateTrimmed(normalizeSpace(direction.Boundaries), 1000)
	direction.Notes = truncateTrimmed(normalizeSpace(direction.Notes), 1200)
	direction.TriggerExamples = normalizeSkillDirectionList(direction.TriggerExamples, opportunity.TriggerExamples, 6, 160)
	direction.ExpectedInputs = normalizeSkillDirectionList(direction.ExpectedInputs, opportunity.ExpectedInputs, 8, 80)
	direction.ExpectedOutputs = normalizeSkillDirectionList(direction.ExpectedOutputs, opportunity.ExpectedOutputs, 8, 80)

	if direction.Title == "" {
		return BrowserCaptureSkillDirectionRequest{}, errors.New("direction.title is required")
	}
	if direction.Capability == "" {
		return BrowserCaptureSkillDirectionRequest{}, errors.New("direction.capability is required")
	}
	if direction.PrimaryUseCase == "" {
		return BrowserCaptureSkillDirectionRequest{}, errors.New("direction.primaryUseCase is required")
	}
	if len(direction.ExpectedInputs) == 0 {
		return BrowserCaptureSkillDirectionRequest{}, errors.New("direction.expectedInputs is required")
	}
	if len(direction.ExpectedOutputs) == 0 {
		return BrowserCaptureSkillDirectionRequest{}, errors.New("direction.expectedOutputs is required")
	}
	if direction.Boundaries == "" {
		direction.Boundaries = "不要只总结网页内容；要沉淀成 agent 可执行、可复用的 Skill。"
	}
	return direction, nil
}

func normalizeSkillDirectionList(values, fallback []string, limit, maxRunes int) []string {
	if len(values) == 0 {
		values = fallback
	}
	out := make([]string, 0, min(len(values), limit))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = truncateTrimmed(normalizeSpace(value), maxRunes)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
		if len(out) == limit {
			break
		}
	}
	return out
}

func skillDirectionConfig(direction BrowserCaptureSkillDirectionRequest) map[string]any {
	return map[string]any{
		"title":           direction.Title,
		"capability":      direction.Capability,
		"primaryUseCase":  direction.PrimaryUseCase,
		"triggerExamples": direction.TriggerExamples,
		"expectedInputs":  direction.ExpectedInputs,
		"expectedOutputs": direction.ExpectedOutputs,
		"boundaries":      direction.Boundaries,
		"notes":           direction.Notes,
	}
}

func buildBrowserCaptureSkillDirectionMissionDescription(capture db.CapturedSource, opportunity *SkillOpportunityResponse, userNeed string, manual bool) string {
	var b strings.Builder
	b.WriteString("请阅读这个收藏链接，判断它最适合沉淀成哪些具体的 Didian Skill 方向。此任务只做方向分析，不要创建或更新 Skill。\n")
	b.WriteString("如果页面正文摘录缺失或提示被清洗，请优先打开 URL 重新读取来源页面，不要把 GitHub/dev 的前端 payload、tree JSON 或错误页文本当作真实网页内容。\n\n")
	b.WriteString("## 收藏来源\n")
	b.WriteString(fmt.Sprintf("- Capture ID：%s\n", uuidToString(capture.ID)))
	b.WriteString(fmt.Sprintf("- 标题：%s\n", capture.Title))
	b.WriteString(fmt.Sprintf("- URL：%s\n", capture.Url))
	b.WriteString(fmt.Sprintf("- 页面类型：%s\n", opportunity.PageType))
	if manual {
		b.WriteString("- 触发方式：用户主动选择把这个收藏做成 Skill，平台没有自动强推荐。\n")
		b.WriteString("- 判断要求：请先判断它是否真的适合沉淀为 Skill；如果不适合，要明确说明不建议生成以及原因。\n")
	} else {
		b.WriteString(fmt.Sprintf("- 平台初筛置信度：%.0f%%\n", opportunity.Confidence*100))
		b.WriteString(fmt.Sprintf("- 平台初筛理由：%s\n", opportunity.WhyUseful))
	}
	if userNeed != "" {
		b.WriteString(fmt.Sprintf("- 用户需求：%s\n", userNeed))
	}
	b.WriteString("\n")

	appendSkillMissionExcerpt(&b, "页面描述", textToString(capture.Description), 700)
	appendSkillMissionExcerpt(&b, "用户选中内容", textToString(capture.SelectedText), 1200)
	appendSkillMissionCleanExcerpt(&b, "页面正文摘录", textToString(capture.ReadableText), 5000)
	appendSkillMissionList(&b, "平台证据片段", opportunity.EvidenceSnippets)
	appendSkillMissionList(&b, "平台风险提示", opportunity.RiskNotes)

	b.WriteString("## 请输出\n")
	b.WriteString("请先基于链接内容和上面的页面摘录做判断，然后输出 2-3 个高质量 Skill 方向。每个方向必须包含：\n")
	b.WriteString("- 方向名称：例如“选型尽调”“接入落地”“排障修复”“学习上手”，也可以提出更具体的方向。\n")
	b.WriteString("- Skill 名称：面向用户日后直接调用的名称。\n")
	b.WriteString("- 适用场景：什么任务会触发这个 Skill。\n")
	b.WriteString("- 必要输入：用户或 agent 需要提供什么上下文。\n")
	b.WriteString("- 期望输出：最终应该交付什么。\n")
	b.WriteString("- 不要做：哪些泛化、过度承诺或失真内容要避免。\n")
	b.WriteString("- 证据：引用你从页面里看到的具体信号，说明为什么这个方向成立。\n\n")
	b.WriteString("## 输出格式\n")
	b.WriteString("用中文回复，结构如下：\n\n")
	b.WriteString("### 推荐方向 1：<方向名>\n")
	b.WriteString("- Skill 名称：...\n")
	b.WriteString("- 适用场景：...\n")
	b.WriteString("- 必要输入：...\n")
	b.WriteString("- 期望输出：...\n")
	b.WriteString("- 不要做：...\n")
	b.WriteString("- 页面证据：...\n\n")
	b.WriteString("最后给出你的首选方向，并列出需要问用户确认的 1-3 个问题。")
	return b.String()
}

func buildBrowserCaptureSkillMissionDescription(capture db.CapturedSource, opportunity *SkillOpportunityResponse, direction BrowserCaptureSkillDirectionRequest, skill SkillResponse) string {
	configJSON, _ := json.Marshal(buildBrowserCaptureSkillConfig(capture, opportunity, direction, "agent_refined"))

	var b strings.Builder
	b.WriteString("请基于这个收藏网页，完善一个已经创建在 Didian Skill 库里的平台 Skill。\n\n")
	b.WriteString("## Didian Skill\n")
	b.WriteString(fmt.Sprintf("- Skill ID：%s\n", skill.ID))
	b.WriteString(fmt.Sprintf("- Skill 名称：%s\n", skill.Name))
	b.WriteString(fmt.Sprintf("- 当前描述：%s\n\n", skill.Description))

	b.WriteString("## 来源\n")
	b.WriteString(fmt.Sprintf("- 标题：%s\n", capture.Title))
	b.WriteString(fmt.Sprintf("- URL：%s\n", capture.Url))
	b.WriteString(fmt.Sprintf("- 类型：%s\n", opportunity.PageType))
	b.WriteString(fmt.Sprintf("- 推荐置信度：%.0f%%\n\n", opportunity.Confidence*100))

	appendSkillMissionExcerpt(&b, "页面描述", textToString(capture.Description), 700)
	appendSkillMissionExcerpt(&b, "用户选中内容", textToString(capture.SelectedText), 1200)
	appendSkillMissionCleanExcerpt(&b, "页面正文摘录", textToString(capture.ReadableText), 4500)

	b.WriteString("## 建议 Skill\n")
	b.WriteString(fmt.Sprintf("- 名称：%s\n", direction.Title))
	b.WriteString(fmt.Sprintf("- 能力：%s\n", direction.Capability))
	b.WriteString(fmt.Sprintf("- 用户确认的主要用途：%s\n", direction.PrimaryUseCase))
	b.WriteString(fmt.Sprintf("- 边界和不要做：%s\n", direction.Boundaries))
	if direction.Notes != "" {
		b.WriteString(fmt.Sprintf("- 用户补充说明：%s\n", direction.Notes))
	}
	b.WriteString(fmt.Sprintf("- 为什么值得沉淀：%s\n\n", opportunity.WhyUseful))

	appendSkillMissionList(&b, "触发示例", direction.TriggerExamples)
	appendSkillMissionList(&b, "期望输入", direction.ExpectedInputs)
	appendSkillMissionList(&b, "期望输出", direction.ExpectedOutputs)
	appendSkillMissionList(&b, "证据片段", opportunity.EvidenceSnippets)
	appendSkillMissionList(&b, "风险提示", opportunity.RiskNotes)

	b.WriteString("## 执行要求\n")
	b.WriteString("1. 读取来源网页内容和当前工作区上下文，按用户确认的方向判断这个 Skill 应该解决的真实重复任务。\n")
	b.WriteString("2. 写出一个可直接使用的 `SKILL.md`，包含清晰触发场景、输入要求、操作步骤、输出格式和质量检查。\n")
	b.WriteString("3. 不要只复述网页内容；要把网页沉淀为用户以后能反复调用的操作能力。\n")
	b.WriteString("4. 如果网页不适合当前方向，先在 Mission 里说明原因和建议调整方向，再谨慎更新 Skill。\n")
	b.WriteString("5. 用下面的 CLI 命令更新这个已经存在的 Didian Skill，让 Skill 库里的内容变成最终版本。\n\n")

	b.WriteString("```bash\n")
	b.WriteString(fmt.Sprintf("didian skill update %s \\\n", skill.ID))
	b.WriteString(fmt.Sprintf("  --description %q \\\n", direction.Capability))
	b.WriteString("  --content-file ./SKILL.md \\\n")
	b.WriteString(fmt.Sprintf("  --config %q \\\n", string(configJSON)))
	b.WriteString("  --output json\n")
	b.WriteString("```\n\n")
	b.WriteString("完成后，在 Mission 里说明已经更新的 Skill、适用场景、以及后续可以如何改进。")
	return b.String()
}

func buildBrowserCaptureSkillConfig(capture db.CapturedSource, opportunity *SkillOpportunityResponse, direction BrowserCaptureSkillDirectionRequest, status string) map[string]any {
	return map[string]any{
		"origin": map[string]any{
			"type":       "browser_capture",
			"capture_id": uuidToString(capture.ID),
			"source_url": capture.Url,
			"page_type":  opportunity.PageType,
			"confidence": opportunity.Confidence,
		},
		"generation": map[string]any{
			"type":      "browser_capture_skill_generation",
			"status":    status,
			"direction": skillDirectionConfig(direction),
		},
	}
}

func buildBrowserCaptureSkillDraftContent(capture db.CapturedSource, opportunity *SkillOpportunityResponse, direction BrowserCaptureSkillDirectionRequest) string {
	var b strings.Builder
	b.WriteString("# ")
	b.WriteString(direction.Title)
	b.WriteString("\n\n")
	b.WriteString("Use this skill when the user wants to turn the saved page into a repeatable workflow. This is a Didian-generated draft and should be refined by a local agent before heavy reuse.\n\n")
	b.WriteString("## Capability\n")
	b.WriteString(direction.Capability)
	b.WriteString("\n\n")
	b.WriteString("## Primary Use Case\n")
	b.WriteString(direction.PrimaryUseCase)
	b.WriteString("\n\n")
	appendSkillMissionList(&b, "Trigger Examples", direction.TriggerExamples)
	appendSkillMissionList(&b, "Expected Inputs", direction.ExpectedInputs)
	appendSkillMissionList(&b, "Expected Outputs", direction.ExpectedOutputs)
	b.WriteString("## Boundaries\n")
	b.WriteString(direction.Boundaries)
	b.WriteString("\n\n")
	if direction.Notes != "" {
		b.WriteString("## User Notes\n")
		b.WriteString(direction.Notes)
		b.WriteString("\n\n")
	}
	appendSkillMissionList(&b, "Source Evidence", opportunity.EvidenceSnippets)
	appendSkillMissionList(&b, "Risk Notes", opportunity.RiskNotes)
	b.WriteString("## Source\n")
	b.WriteString(fmt.Sprintf("- Title: %s\n", capture.Title))
	b.WriteString(fmt.Sprintf("- URL: %s\n", capture.Url))
	b.WriteString(fmt.Sprintf("- Page type: %s\n", opportunity.PageType))
	b.WriteString(fmt.Sprintf("- Confidence: %.0f%%\n\n", opportunity.Confidence*100))
	appendSkillMissionCleanExcerpt(&b, "Page Excerpt", textToString(capture.ReadableText), 3000)
	b.WriteString("## Quality Check\n")
	b.WriteString("- Replace this draft with concrete steps that an agent can execute.\n")
	b.WriteString("- Keep the source URL for future refreshes.\n")
	b.WriteString("- Call out version, license, maintenance, security, and integration risks when relevant.\n")
	return b.String()
}

func appendSkillMissionList(b *strings.Builder, title string, values []string) {
	if len(values) == 0 {
		return
	}
	b.WriteString("## ")
	b.WriteString(title)
	b.WriteString("\n")
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		b.WriteString("- ")
		b.WriteString(value)
		b.WriteString("\n")
	}
	b.WriteString("\n")
}

func appendSkillMissionExcerpt(b *strings.Builder, title, value string, maxRunes int) {
	value = truncateTrimmed(normalizeSpace(value), maxRunes)
	if value == "" {
		return
	}
	b.WriteString("## ")
	b.WriteString(title)
	b.WriteString("\n")
	b.WriteString(value)
	b.WriteString("\n\n")
}

func appendSkillMissionCleanExcerpt(b *strings.Builder, title, value string, maxRunes int) {
	value = normalizeSpace(value)
	if value == "" {
		return
	}
	if isNoisyBrowserCaptureText(value) {
		b.WriteString("## ")
		b.WriteString(title)
		b.WriteString("\n")
		b.WriteString("浏览器捕获的正文像前端应用 payload 或错误页，已从提示中省略。请打开来源 URL 重新读取真实内容。\n\n")
		return
	}
	appendSkillMissionExcerpt(b, title, value, maxRunes)
}

func isNoisyBrowserCaptureText(value string) bool {
	if value == "" {
		return false
	}
	lower := strings.ToLower(value)
	noisySignals := 0
	for _, signal := range []string{
		`"payload"`,
		`"tree":{"items"`,
		`"codeviewreporoute"`,
		`"contenttype":"directory"`,
		`github.dev`,
		`加载时出错`,
		`糟糕`,
	} {
		if strings.Contains(lower, signal) {
			noisySignals++
		}
	}
	if noisySignals >= 2 {
		return true
	}
	return strings.Count(value, `{"`) >= 12 && strings.Count(value, `":"`) >= 12
}
