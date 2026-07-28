package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/didian-ai/didian/server/internal/logger"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type IssueSkillUsageResponse struct {
	ID               string  `json:"id"`
	WorkspaceID      string  `json:"workspace_id"`
	IssueID          string  `json:"issue_id"`
	SkillID          string  `json:"skill_id"`
	SkillName        string  `json:"skill_name,omitempty"`
	SkillDescription string  `json:"skill_description,omitempty"`
	SkillConfig      any     `json:"skill_config,omitempty"`
	TaskID           *string `json:"task_id,omitempty"`
	AgentID          *string `json:"agent_id,omitempty"`
	AgentName        *string `json:"agent_name,omitempty"`
	RuntimeID        *string `json:"runtime_id,omitempty"`
	RuntimeName      *string `json:"runtime_name,omitempty"`
	Source           string  `json:"source"`
	Status           string  `json:"status"`
	Reason           string  `json:"reason"`
	SkillVersion     *string `json:"skill_version,omitempty"`
	Metadata         any     `json:"metadata,omitempty"`
	CreatedBy        *string `json:"created_by,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

type AddIssueSkillRequest struct {
	SkillID string `json:"skill_id"`
	Source  string `json:"source"`
	Reason  string `json:"reason"`
}

func (h *Handler) ListIssueSkills(w http.ResponseWriter, r *http.Request) {
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	rows, err := h.Queries.ListIssueSkillUsages(r.Context(), db.ListIssueSkillUsagesParams{
		WorkspaceID: issue.WorkspaceID,
		IssueID:     issue.ID,
	})
	if err != nil {
		slog.Warn("ListIssueSkills failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to list issue skills")
		return
	}

	resp := make([]IssueSkillUsageResponse, len(rows))
	for i, row := range rows {
		resp[i] = issueSkillUsageRowToResponse(row)
	}
	writeJSON(w, http.StatusOK, map[string]any{"skills": resp, "total": len(resp)})
}

func (h *Handler) AddIssueSkill(w http.ResponseWriter, r *http.Request) {
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req AddIssueSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	skillID, ok := parseUUIDOrBadRequest(w, strings.TrimSpace(req.SkillID), "skill_id")
	if !ok {
		return
	}
	createdBy, ok := parseUUIDOrBadRequest(w, userID, "user id")
	if !ok {
		return
	}
	source, ok := normalizeIssueSkillUsageSource(w, req.Source)
	if !ok {
		return
	}

	usage, err := h.Queries.UpsertIssueSkillUsagePlanned(r.Context(), db.UpsertIssueSkillUsagePlannedParams{
		WorkspaceID: issue.WorkspaceID,
		IssueID:     issue.ID,
		SkillID:     skillID,
		Source:      source,
		Reason:      strings.TrimSpace(req.Reason),
		CreatedBy:   createdBy,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "skill not found")
			return
		}
		slog.Warn("AddIssueSkill failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to add issue skill")
		return
	}

	row, err := h.issueSkillUsageResponseByID(r, issue.WorkspaceID, issue.ID, usage.ID)
	if err != nil {
		slog.Warn("AddIssueSkill reload failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to add issue skill")
		return
	}
	writeJSON(w, http.StatusCreated, row)
}

func (h *Handler) DeleteIssueSkill(w http.ResponseWriter, r *http.Request) {
	issue, ok := h.loadIssueForUser(w, r, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	skillID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "skillId"), "skill id")
	if !ok {
		return
	}

	rows, err := h.Queries.DeletePlannedIssueSkillUsage(r.Context(), db.DeletePlannedIssueSkillUsageParams{
		WorkspaceID: issue.WorkspaceID,
		IssueID:     issue.ID,
		SkillID:     skillID,
	})
	if err != nil {
		slog.Warn("DeleteIssueSkill failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to delete issue skill")
		return
	}
	if rows == 0 {
		existing, getErr := h.Queries.GetIssueSkillUsageBySkill(r.Context(), db.GetIssueSkillUsageBySkillParams{
			WorkspaceID: issue.WorkspaceID,
			IssueID:     issue.ID,
			SkillID:     skillID,
		})
		if getErr == nil && existing.Status != "planned" {
			writeError(w, http.StatusConflict, "issue skill already used")
			return
		}
		writeError(w, http.StatusNotFound, "issue skill not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func normalizeIssueSkillUsageSource(w http.ResponseWriter, raw string) (string, bool) {
	source := strings.TrimSpace(raw)
	if source == "" {
		return "manual", true
	}
	switch source {
	case "manual", "recommendation", "capture_origin", "slash_command", "agent_default":
		return source, true
	default:
		writeError(w, http.StatusBadRequest, "invalid source")
		return "", false
	}
}

func (h *Handler) issueSkillUsageResponseByID(r *http.Request, workspaceID, issueID, usageID pgtype.UUID) (IssueSkillUsageResponse, error) {
	rows, err := h.Queries.ListIssueSkillUsages(r.Context(), db.ListIssueSkillUsagesParams{
		WorkspaceID: workspaceID,
		IssueID:     issueID,
	})
	if err != nil {
		return IssueSkillUsageResponse{}, err
	}
	for _, row := range rows {
		if uuidToString(row.ID) == uuidToString(usageID) {
			return issueSkillUsageRowToResponse(row), nil
		}
	}
	return IssueSkillUsageResponse{}, pgx.ErrNoRows
}

func issueSkillUsageRowToResponse(row db.ListIssueSkillUsagesRow) IssueSkillUsageResponse {
	return IssueSkillUsageResponse{
		ID:               uuidToString(row.ID),
		WorkspaceID:      uuidToString(row.WorkspaceID),
		IssueID:          uuidToString(row.IssueID),
		SkillID:          uuidToString(row.SkillID),
		SkillName:        row.SkillName,
		SkillDescription: row.SkillDescription,
		SkillConfig:      jsonBytesToMap(row.SkillConfig),
		TaskID:           uuidToPtr(row.TaskID),
		AgentID:          uuidToPtr(row.AgentID),
		AgentName:        textToPtr(row.AgentName),
		RuntimeID:        uuidToPtr(row.RuntimeID),
		RuntimeName:      textToPtr(row.RuntimeName),
		Source:           row.Source,
		Status:           row.Status,
		Reason:           row.Reason,
		SkillVersion:     textToPtr(row.SkillVersion),
		Metadata:         jsonBytesToMap(row.Metadata),
		CreatedBy:        uuidToPtr(row.CreatedBy),
		CreatedAt:        timestampToString(row.CreatedAt),
		UpdatedAt:        timestampToString(row.UpdatedAt),
	}
}

func jsonBytesToMap(raw []byte) any {
	if len(raw) == 0 {
		return nil
	}
	var out any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}
