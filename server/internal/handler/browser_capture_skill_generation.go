package handler

import (
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

	opportunity := skillOpportunityForCapture(capture)
	if opportunity == nil || !opportunity.ShouldSuggest {
		writeError(w, http.StatusUnprocessableEntity, "browser capture has no skill opportunity")
		return
	}

	skill, _, err := h.ensureBrowserCaptureSkillDraft(r, workspaceID, creatorUUID, capture, opportunity)
	if err != nil {
		slog.Warn("create browser capture skill draft failed", append(logger.RequestAttrs(r), "error", err, "workspace_id", uuidToString(workspaceID), "capture_id", uuidToString(captureID))...)
		writeError(w, http.StatusInternalServerError, "failed to create skill draft")
		return
	}

	description := buildBrowserCaptureSkillMissionDescription(capture, opportunity, skill)
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

func (h *Handler) ensureBrowserCaptureSkillDraft(r *http.Request, workspaceID, creatorID pgtype.UUID, capture db.CapturedSource, opportunity *SkillOpportunityResponse) (SkillResponse, bool, error) {
	existing, err := h.Queries.GetSkillByWorkspaceAndName(r.Context(), db.GetSkillByWorkspaceAndNameParams{
		WorkspaceID: workspaceID,
		Name:        opportunity.ProposedTitle,
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
		Name:        opportunity.ProposedTitle,
		Description: opportunity.ProposedCapability,
		Content:     buildBrowserCaptureSkillDraftContent(capture, opportunity),
		Config:      buildBrowserCaptureSkillConfig(capture, opportunity, "draft"),
	})
	if err != nil {
		if isUniqueViolation(err) {
			skill, lookupErr := h.Queries.GetSkillByWorkspaceAndName(r.Context(), db.GetSkillByWorkspaceAndNameParams{
				WorkspaceID: workspaceID,
				Name:        opportunity.ProposedTitle,
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

func buildBrowserCaptureSkillMissionDescription(capture db.CapturedSource, opportunity *SkillOpportunityResponse, skill SkillResponse) string {
	configJSON, _ := json.Marshal(buildBrowserCaptureSkillConfig(capture, opportunity, "agent_refined"))

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
	appendSkillMissionExcerpt(&b, "页面正文摘录", textToString(capture.ReadableText), 4500)

	b.WriteString("## 建议 Skill\n")
	b.WriteString(fmt.Sprintf("- 名称：%s\n", opportunity.ProposedTitle))
	b.WriteString(fmt.Sprintf("- 能力：%s\n", opportunity.ProposedCapability))
	b.WriteString(fmt.Sprintf("- 为什么值得沉淀：%s\n\n", opportunity.WhyUseful))

	appendSkillMissionList(&b, "触发示例", opportunity.TriggerExamples)
	appendSkillMissionList(&b, "期望输入", opportunity.ExpectedInputs)
	appendSkillMissionList(&b, "期望输出", opportunity.ExpectedOutputs)
	appendSkillMissionList(&b, "证据片段", opportunity.EvidenceSnippets)
	appendSkillMissionList(&b, "风险提示", opportunity.RiskNotes)

	b.WriteString("## 执行要求\n")
	b.WriteString("1. 读取来源网页内容和当前工作区上下文，判断这个 Skill 应该解决的真实重复任务。\n")
	b.WriteString("2. 写出一个可直接使用的 `SKILL.md`，包含清晰触发场景、输入要求、操作步骤、输出格式和质量检查。\n")
	b.WriteString("3. 不要只复述网页内容；要把网页沉淀为用户以后能反复调用的操作能力。\n")
	b.WriteString("4. 用下面的 CLI 命令更新这个已经存在的 Didian Skill，让 Skill 库里的内容变成最终版本。\n\n")

	b.WriteString("```bash\n")
	b.WriteString(fmt.Sprintf("didian skill update %s \\\n", skill.ID))
	b.WriteString(fmt.Sprintf("  --description %q \\\n", opportunity.ProposedCapability))
	b.WriteString("  --content-file ./SKILL.md \\\n")
	b.WriteString(fmt.Sprintf("  --config %q \\\n", string(configJSON)))
	b.WriteString("  --output json\n")
	b.WriteString("```\n\n")
	b.WriteString("完成后，在 Mission 里说明已经更新的 Skill、适用场景、以及后续可以如何改进。")
	return b.String()
}

func buildBrowserCaptureSkillConfig(capture db.CapturedSource, opportunity *SkillOpportunityResponse, status string) map[string]any {
	return map[string]any{
		"origin": map[string]any{
			"type":       "browser_capture",
			"capture_id": uuidToString(capture.ID),
			"source_url": capture.Url,
			"page_type":  opportunity.PageType,
			"confidence": opportunity.Confidence,
		},
		"generation": map[string]any{
			"type":   "browser_capture_skill_generation",
			"status": status,
		},
	}
}

func buildBrowserCaptureSkillDraftContent(capture db.CapturedSource, opportunity *SkillOpportunityResponse) string {
	var b strings.Builder
	b.WriteString("# ")
	b.WriteString(opportunity.ProposedTitle)
	b.WriteString("\n\n")
	b.WriteString("Use this skill when the user wants to turn the saved page into a repeatable workflow. This is a Didian-generated draft and should be refined by a local agent before heavy reuse.\n\n")
	b.WriteString("## Capability\n")
	b.WriteString(opportunity.ProposedCapability)
	b.WriteString("\n\n")
	appendSkillMissionList(&b, "Trigger Examples", opportunity.TriggerExamples)
	appendSkillMissionList(&b, "Expected Inputs", opportunity.ExpectedInputs)
	appendSkillMissionList(&b, "Expected Outputs", opportunity.ExpectedOutputs)
	appendSkillMissionList(&b, "Source Evidence", opportunity.EvidenceSnippets)
	appendSkillMissionList(&b, "Risk Notes", opportunity.RiskNotes)
	b.WriteString("## Source\n")
	b.WriteString(fmt.Sprintf("- Title: %s\n", capture.Title))
	b.WriteString(fmt.Sprintf("- URL: %s\n", capture.Url))
	b.WriteString(fmt.Sprintf("- Page type: %s\n", opportunity.PageType))
	b.WriteString(fmt.Sprintf("- Confidence: %.0f%%\n\n", opportunity.Confidence*100))
	appendSkillMissionExcerpt(&b, "Page Excerpt", textToString(capture.ReadableText), 3000)
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
