package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/didian-ai/didian/server/internal/logger"
	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	maxCaptureTitleLength        = 500
	maxCaptureDomainLength       = 255
	maxCaptureURLLength          = 4096
	maxCaptureDescriptionLength  = 2000
	maxCaptureSelectedTextLength = 10_000
	maxCaptureReadableTextLength = 60_000
	maxCaptureLinks              = 200
	maxCaptureLinkTitleLength    = 300
	defaultCaptureListLimit      = 20
	maxCaptureListLimit          = 100
)

var trackingQueryParams = map[string]struct{}{
	"fbclid": {},
	"gclid":  {},
	"spm":    {},
}

type BrowserCaptureLinkRequest struct {
	URL   string `json:"url"`
	Title string `json:"title,omitempty"`
}

type CreateBrowserCaptureRequest struct {
	Source          string                      `json:"source"`
	SourceType      string                      `json:"sourceType"`
	CaptureScope    string                      `json:"captureScope"`
	SourceTabID     string                      `json:"sourceTabId"`
	URL             string                      `json:"url"`
	Title           string                      `json:"title"`
	Domain          string                      `json:"domain"`
	FaviconURL      string                      `json:"faviconUrl"`
	Description     string                      `json:"description"`
	PreviewImageURL string                      `json:"previewImageUrl"`
	SelectedText    string                      `json:"selectedText"`
	ReadableText    string                      `json:"readableText"`
	Links           []BrowserCaptureLinkRequest `json:"links"`
	CapturedAt      string                      `json:"capturedAt"`
}

type BrowserCaptureDedupeResponse struct {
	IsDuplicate       bool    `json:"isDuplicate"`
	ExistingCaptureID *string `json:"existingCaptureId"`
}

type BrowserCaptureResponse struct {
	ID               string                      `json:"id"`
	WorkspaceID      string                      `json:"workspace_id"`
	CreatorID        string                      `json:"creator_id"`
	SourceType       string                      `json:"source_type"`
	Source           string                      `json:"source"`
	CaptureScope     string                      `json:"capture_scope"`
	SourceTabID      *string                     `json:"source_tab_id"`
	URL              string                      `json:"url"`
	NormalizedURL    string                      `json:"normalized_url"`
	Title            string                      `json:"title"`
	Domain           string                      `json:"domain"`
	FaviconURL       *string                     `json:"favicon_url"`
	Description      *string                     `json:"description"`
	PreviewImageURL  *string                     `json:"preview_image_url"`
	SelectedText     *string                     `json:"selected_text"`
	ReadableText     *string                     `json:"readable_text"`
	Links            []BrowserCaptureLinkRequest `json:"links"`
	Status           string                      `json:"status"`
	MetadataStatus   string                      `json:"metadata_status"`
	ArchiveStatus    string                      `json:"archive_status"`
	SummaryStatus    string                      `json:"summary_status"`
	EmbeddingStatus  string                      `json:"embedding_status"`
	MemoryState      string                      `json:"memory_state"`
	FailureReason    *string                     `json:"failure_reason"`
	Memory           *PageMemoryResponse         `json:"memory,omitempty"`
	SkillOpportunity *SkillOpportunityResponse   `json:"skillOpportunity,omitempty"`
	CapturedAt       string                      `json:"captured_at"`
	CreatedAt        string                      `json:"created_at"`
	UpdatedAt        string                      `json:"updated_at"`
}

type PageMemoryResponse struct {
	Summary         string   `json:"summary"`
	OneLineTakeaway string   `json:"one_line_takeaway"`
	KeyPoints       []string `json:"key_points"`
	Topics          []string `json:"topics"`
	Entities        []string `json:"entities"`
	Keywords        []string `json:"keywords"`
	Status          string   `json:"status"`
	GeneratedAt     *string  `json:"generated_at"`
	UpdatedAt       string   `json:"updated_at"`
}

type CreateBrowserCaptureResponse struct {
	Capture      BrowserCaptureResponse       `json:"capture"`
	CaptureID    string                       `json:"captureId"`
	Status       string                       `json:"status"`
	MemoryStatus string                       `json:"memoryStatus"`
	Dedupe       BrowserCaptureDedupeResponse `json:"dedupe"`
}

type ListBrowserCapturesResponse struct {
	Captures []BrowserCaptureResponse `json:"captures"`
	Total    int64                    `json:"total"`
}

type normalizedBrowserCapture struct {
	req           CreateBrowserCaptureRequest
	normalizedURL string
	textHash      string
	pageHash      string
	linksJSON     []byte
	capturedAt    time.Time
}

func (h *Handler) CreateBrowserCapture(w http.ResponseWriter, r *http.Request) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}
	userUUID, ok := parseUUIDOrBadRequest(w, userID, "user id")
	if !ok {
		return
	}

	var req CreateBrowserCaptureRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	normalized, err := normalizeBrowserCaptureRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	skillOpportunityJSON := h.buildSkillOpportunityJSON(r.Context(), normalized.req)

	var dedupe BrowserCaptureDedupeResponse
	existing, err := h.Queries.FindCapturedSourceDuplicate(r.Context(), db.FindCapturedSourceDuplicateParams{
		WorkspaceID:   workspaceID,
		NormalizedUrl: normalized.normalizedURL,
		TextHash:      optionalText(normalized.textHash),
	})
	if err == nil {
		capture := existing
		updated, updateErr := h.Queries.UpdateCapturedSourcePreviewMetadata(r.Context(), db.UpdateCapturedSourcePreviewMetadataParams{
			ID:               existing.ID,
			WorkspaceID:      workspaceID,
			FaviconUrl:       optionalText(normalized.req.FaviconURL),
			Description:      optionalText(normalized.req.Description),
			PreviewImageUrl:  optionalText(normalized.req.PreviewImageURL),
			SkillOpportunity: skillOpportunityJSON,
		})
		if updateErr == nil {
			capture = updated
		} else {
			slog.Warn("UpdateCapturedSourcePreviewMetadata failed", append(logger.RequestAttrs(r), "error", updateErr, "capture_id", uuidToString(existing.ID))...)
		}
		if capture.MemoryState == "archived" {
			restored, restoreErr := h.Queries.UpdateCapturedSourceMemoryState(r.Context(), db.UpdateCapturedSourceMemoryStateParams{
				ID:          capture.ID,
				WorkspaceID: workspaceID,
				MemoryState: "active",
			})
			if restoreErr == nil {
				capture = restored
			} else {
				slog.Warn("UpdateCapturedSourceMemoryState restore duplicate failed", append(logger.RequestAttrs(r), "error", restoreErr, "capture_id", uuidToString(capture.ID))...)
			}
		}
		if isURLOnlyCapture(normalized.req) {
			h.enrichBrowserCaptureAsync(capture)
		}
		id := uuidToString(existing.ID)
		resp := h.browserCaptureToResponseWithMemory(r.Context(), capture)
		memoryStatus := capture.SummaryStatus
		if resp.Memory != nil {
			memoryStatus = resp.Memory.Status
		}
		dedupe = BrowserCaptureDedupeResponse{IsDuplicate: true, ExistingCaptureID: &id}
		writeJSON(w, http.StatusOK, CreateBrowserCaptureResponse{
			Capture:      resp,
			CaptureID:    id,
			Status:       capture.Status,
			MemoryStatus: memoryStatus,
			Dedupe:       dedupe,
		})
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		slog.Warn("FindCapturedSourceDuplicate failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to save browser capture")
		return
	}

	capture, err := h.Queries.CreateCapturedSource(r.Context(), db.CreateCapturedSourceParams{
		WorkspaceID:      workspaceID,
		CreatorID:        userUUID,
		SourceType:       normalized.req.SourceType,
		Source:           normalized.req.Source,
		CaptureScope:     normalized.req.CaptureScope,
		SourceTabID:      optionalText(normalized.req.SourceTabID),
		Url:              normalized.req.URL,
		NormalizedUrl:    normalized.normalizedURL,
		Title:            normalized.req.Title,
		Domain:           normalized.req.Domain,
		FaviconUrl:       optionalText(normalized.req.FaviconURL),
		Description:      optionalText(normalized.req.Description),
		PreviewImageUrl:  optionalText(normalized.req.PreviewImageURL),
		SkillOpportunity: skillOpportunityJSON,
		SelectedText:     optionalText(normalized.req.SelectedText),
		ReadableText:     optionalText(normalized.req.ReadableText),
		Links:            normalized.linksJSON,
		TextHash:         optionalText(normalized.textHash),
		PageHash:         optionalText(normalized.pageHash),
		Status:           "captured",
		MetadataStatus:   "pending",
		ArchiveStatus:    "skipped",
		SummaryStatus:    "pending",
		EmbeddingStatus:  "skipped",
		MemoryState:      "active",
		CapturedAt:       timeToTimestamptz(normalized.capturedAt),
	})
	if err != nil {
		slog.Warn("CreateCapturedSource failed", append(logger.RequestAttrs(r), "error", err)...)
		writeError(w, http.StatusInternalServerError, "failed to save browser capture")
		return
	}

	memoryStatus := capture.SummaryStatus
	resp := browserCaptureToResponse(capture)
	memory, err := h.Queries.CreatePendingPageMemory(r.Context(), db.CreatePendingPageMemoryParams{
		CapturedSourceID: capture.ID,
		WorkspaceID:      workspaceID,
		SearchText:       buildCaptureSearchText(normalized.req),
		Keywords:         captureKeywordsJSON(normalized.req),
	})
	if err != nil {
		slog.Warn("CreatePendingPageMemory failed", append(logger.RequestAttrs(r), "error", err, "capture_id", uuidToString(capture.ID))...)
	} else {
		if !isURLOnlyCapture(normalized.req) {
			if _, queued := h.tryEnqueueBrowserMemoryEnrichment(r.Context(), workspaceID, userUUID, capture.ID); queued {
				memory.Status = "processing"
			} else {
				h.enrichBrowserCaptureAsync(capture)
			}
		} else {
			h.enrichBrowserCaptureAsync(capture)
		}
		memoryStatus = memory.Status
		resp.Memory = pageMemoryToResponse(memory)
	}

	id := uuidToString(capture.ID)
	writeJSON(w, http.StatusCreated, CreateBrowserCaptureResponse{
		Capture:      resp,
		CaptureID:    id,
		Status:       capture.Status,
		MemoryStatus: memoryStatus,
		Dedupe:       dedupe,
	})
}

func (h *Handler) ListBrowserCaptures(w http.ResponseWriter, r *http.Request) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}
	limit, offset := parseCaptureLimitOffset(r)
	memoryState := strings.TrimSpace(r.URL.Query().Get("state"))
	if memoryState != "" && !validMemoryState(memoryState) {
		writeError(w, http.StatusBadRequest, "invalid memory state")
		return
	}
	query := normalizeSpace(r.URL.Query().Get("q"))
	if len([]rune(query)) > 200 {
		writeError(w, http.StatusBadRequest, "query is too long")
		return
	}
	stateParam := pgtype.Text{}
	if memoryState != "" {
		stateParam = strToText(memoryState)
	}
	queryParam := pgtype.Text{}
	if query != "" {
		queryParam = strToText(query)
	}

	rows, err := h.Queries.ListCapturedSources(r.Context(), db.ListCapturedSourcesParams{
		WorkspaceID: workspaceID,
		Limit:       int32(limit),
		Offset:      int32(offset),
		MemoryState: stateParam,
		Query:       queryParam,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list browser captures")
		return
	}
	total, err := h.Queries.CountCapturedSources(r.Context(), db.CountCapturedSourcesParams{
		WorkspaceID: workspaceID,
		MemoryState: stateParam,
		Query:       queryParam,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count browser captures")
		return
	}

	resp := make([]BrowserCaptureResponse, len(rows))
	for i, row := range rows {
		resp[i] = h.browserCaptureToResponseWithMemory(r.Context(), row)
	}
	writeJSON(w, http.StatusOK, ListBrowserCapturesResponse{Captures: resp, Total: total})
}

func (h *Handler) ArchiveBrowserCapture(w http.ResponseWriter, r *http.Request) {
	h.setBrowserCaptureMemoryState(w, r, "archived")
}

func (h *Handler) RestoreBrowserCapture(w http.ResponseWriter, r *http.Request) {
	h.setBrowserCaptureMemoryState(w, r, "active")
}

func (h *Handler) setBrowserCaptureMemoryState(w http.ResponseWriter, r *http.Request, state string) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}
	captureID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "id"), "capture id")
	if !ok {
		return
	}
	capture, err := h.Queries.UpdateCapturedSourceMemoryState(r.Context(), db.UpdateCapturedSourceMemoryStateParams{
		ID:          captureID,
		WorkspaceID: workspaceID,
		MemoryState: state,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "browser capture not found")
		return
	}
	writeJSON(w, http.StatusOK, h.browserCaptureToResponseWithMemory(r.Context(), capture))
}

func parseCaptureLimitOffset(r *http.Request) (int, int) {
	limit := defaultCaptureListLimit
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > maxCaptureListLimit {
		limit = maxCaptureListLimit
	}
	offset := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			offset = parsed
		}
	}
	return limit, offset
}

func (h *Handler) GetBrowserCapture(w http.ResponseWriter, r *http.Request) {
	workspaceID, ok := parseUUIDOrBadRequest(w, h.resolveWorkspaceID(r), "workspace id")
	if !ok {
		return
	}
	captureID, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "id"), "capture id")
	if !ok {
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
	writeJSON(w, http.StatusOK, h.browserCaptureToResponseWithMemory(r.Context(), capture))
}

func (h *Handler) enrichBrowserCaptureAsync(capture db.CapturedSource) {
	if h.MemoryEnrichment == nil {
		return
	}
	go func() {
		if _, err := h.MemoryEnrichment.EnrichCapture(context.Background(), capture); err != nil {
			slog.Warn("EnrichCapture failed", "error", err, "capture_id", uuidToString(capture.ID), "workspace_id", uuidToString(capture.WorkspaceID))
		}
	}()
}

func (h *Handler) tryEnqueueBrowserMemoryEnrichment(ctx context.Context, workspaceID, userID, captureID pgtype.UUID) (db.AgentTaskQueue, bool) {
	if h == nil || h.Queries == nil || h.TaskService == nil {
		return db.AgentTaskQueue{}, false
	}
	agent, err := h.Queries.FindOwnedOnlineCodexAgent(ctx, db.FindOwnedOnlineCodexAgentParams{
		WorkspaceID: workspaceID,
		OwnerID:     userID,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			slog.Warn("FindOwnedOnlineCodexAgent failed", "error", err, "workspace_id", uuidToString(workspaceID), "user_id", uuidToString(userID), "capture_id", uuidToString(captureID))
		}
		return db.AgentTaskQueue{}, false
	}
	task, err := h.TaskService.EnqueueBrowserMemoryEnrichmentTask(ctx, workspaceID, userID, captureID, agent.ID)
	if err != nil {
		slog.Warn("EnqueueBrowserMemoryEnrichmentTask failed", "error", err, "workspace_id", uuidToString(workspaceID), "user_id", uuidToString(userID), "capture_id", uuidToString(captureID), "agent_id", uuidToString(agent.ID))
		return db.AgentTaskQueue{}, false
	}
	return task, true
}

func isURLOnlyCapture(req CreateBrowserCaptureRequest) bool {
	return normalizeSpace(req.Description) == "" &&
		normalizeSpace(req.SelectedText) == "" &&
		normalizeSpace(req.ReadableText) == "" &&
		len(req.Links) == 0
}

func normalizeBrowserCaptureRequest(req CreateBrowserCaptureRequest) (normalizedBrowserCapture, error) {
	req.Source = strings.TrimSpace(req.Source)
	if req.Source == "" {
		req.Source = "extension"
	}
	if !validCaptureSource(req.Source) {
		return normalizedBrowserCapture{}, errors.New("invalid capture source")
	}
	req.SourceType = strings.TrimSpace(req.SourceType)
	if req.SourceType == "" {
		req.SourceType = "link"
	}
	if !validCaptureSourceType(req.SourceType) {
		return normalizedBrowserCapture{}, errors.New("invalid source type")
	}
	req.CaptureScope = strings.TrimSpace(req.CaptureScope)
	if req.CaptureScope == "" {
		req.CaptureScope = "page"
	}
	if !validCaptureScope(req.CaptureScope) {
		return normalizedBrowserCapture{}, errors.New("invalid capture scope")
	}

	req.URL = strings.TrimSpace(req.URL)
	if req.URL == "" {
		return normalizedBrowserCapture{}, errors.New("url is required")
	}
	if len(req.URL) > maxCaptureURLLength {
		return normalizedBrowserCapture{}, errors.New("url is too long")
	}
	parsed, err := parseHTTPURL(req.URL)
	if err != nil {
		return normalizedBrowserCapture{}, err
	}
	normalizedURL := normalizeCaptureURL(parsed)

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return normalizedBrowserCapture{}, errors.New("title is required")
	}
	if len([]rune(req.Title)) > maxCaptureTitleLength {
		return normalizedBrowserCapture{}, errors.New("title is too long")
	}

	req.Domain = strings.TrimSpace(req.Domain)
	if req.Domain == "" {
		req.Domain = parsed.Hostname()
	}
	if len(req.Domain) > maxCaptureDomainLength {
		return normalizedBrowserCapture{}, errors.New("domain is too long")
	}

	if req.FaviconURL = strings.TrimSpace(req.FaviconURL); req.FaviconURL != "" {
		if len(req.FaviconURL) > maxCaptureURLLength {
			return normalizedBrowserCapture{}, errors.New("faviconUrl is too long")
		}
		if _, err := parseHTTPURL(req.FaviconURL); err != nil {
			return normalizedBrowserCapture{}, errors.New("faviconUrl must be an http(s) URL")
		}
	}
	req.Description = normalizeSpace(req.Description)
	if len([]rune(req.Description)) > maxCaptureDescriptionLength {
		return normalizedBrowserCapture{}, errors.New("description is too long")
	}
	if req.PreviewImageURL = strings.TrimSpace(req.PreviewImageURL); req.PreviewImageURL != "" {
		if len(req.PreviewImageURL) > maxCaptureURLLength {
			return normalizedBrowserCapture{}, errors.New("previewImageUrl is too long")
		}
		if _, err := parseHTTPURL(req.PreviewImageURL); err != nil {
			return normalizedBrowserCapture{}, errors.New("previewImageUrl must be an http(s) URL")
		}
	}

	req.SourceTabID = truncateTrimmed(req.SourceTabID, 128)
	req.SelectedText = normalizeSpace(req.SelectedText)
	if len([]rune(req.SelectedText)) > maxCaptureSelectedTextLength {
		return normalizedBrowserCapture{}, errors.New("selectedText is too long")
	}
	req.ReadableText = normalizeSpace(req.ReadableText)
	if len([]rune(req.ReadableText)) > maxCaptureReadableTextLength {
		return normalizedBrowserCapture{}, errors.New("readableText is too long")
	}

	linksJSON, links, err := normalizeCaptureLinks(req.Links)
	if err != nil {
		return normalizedBrowserCapture{}, err
	}
	req.Links = links

	capturedAt := time.Now().UTC()
	if strings.TrimSpace(req.CapturedAt) != "" {
		parsedTime, err := time.Parse(time.RFC3339, strings.TrimSpace(req.CapturedAt))
		if err != nil {
			return normalizedBrowserCapture{}, errors.New("capturedAt must be an RFC3339 timestamp")
		}
		capturedAt = parsedTime.UTC()
	}

	textForHash := req.SelectedText
	if textForHash == "" {
		textForHash = req.ReadableText
	}
	textHash := ""
	if textForHash != "" {
		textHash = sha256Hex(textForHash)
	}
	pageHash := sha256Hex(strings.Join([]string{normalizedURL, req.Title, req.SelectedText, req.ReadableText}, "\n"))

	return normalizedBrowserCapture{
		req:           req,
		normalizedURL: normalizedURL,
		textHash:      textHash,
		pageHash:      pageHash,
		linksJSON:     linksJSON,
		capturedAt:    capturedAt,
	}, nil
}

func normalizeCaptureLinks(input []BrowserCaptureLinkRequest) ([]byte, []BrowserCaptureLinkRequest, error) {
	if len(input) > maxCaptureLinks {
		return nil, nil, errors.New("links cannot exceed 200 items")
	}
	links := make([]BrowserCaptureLinkRequest, 0, len(input))
	for _, link := range input {
		link.URL = strings.TrimSpace(link.URL)
		if link.URL == "" {
			continue
		}
		if len(link.URL) > maxCaptureURLLength {
			return nil, nil, errors.New("link url is too long")
		}
		if _, err := parseHTTPURL(link.URL); err != nil {
			return nil, nil, errors.New("link url must be an http(s) URL")
		}
		link.Title = truncateTrimmed(link.Title, maxCaptureLinkTitleLength)
		links = append(links, link)
	}
	out, err := json.Marshal(links)
	if err != nil {
		return nil, nil, err
	}
	return out, links, nil
}

func parseHTTPURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return nil, errors.New("url must be a valid http(s) URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, errors.New("url must be a valid http(s) URL")
	}
	return parsed, nil
}

func normalizeCaptureURL(u *url.URL) string {
	clone := *u
	clone.Scheme = strings.ToLower(clone.Scheme)
	clone.Host = strings.ToLower(clone.Host)
	query := clone.Query()
	for key := range query {
		lower := strings.ToLower(key)
		if strings.HasPrefix(lower, "utm_") {
			query.Del(key)
			continue
		}
		if _, ok := trackingQueryParams[lower]; ok {
			query.Del(key)
		}
	}
	clone.RawQuery = query.Encode()
	clone.Fragment = ""
	if clone.Path == "" {
		clone.Path = "/"
	}
	if clone.Path != "/" {
		clone.Path = strings.TrimRight(clone.Path, "/")
	}
	return clone.String()
}

func browserCaptureToResponse(c db.CapturedSource) BrowserCaptureResponse {
	links := []BrowserCaptureLinkRequest{}
	if len(c.Links) > 0 {
		_ = json.Unmarshal(c.Links, &links)
	}
	var skillOpportunity *SkillOpportunityResponse
	if len(c.SkillOpportunity) > 0 {
		var parsed SkillOpportunityResponse
		if err := json.Unmarshal(c.SkillOpportunity, &parsed); err == nil {
			skillOpportunity = &parsed
		}
	}
	return BrowserCaptureResponse{
		ID:               uuidToString(c.ID),
		WorkspaceID:      uuidToString(c.WorkspaceID),
		CreatorID:        uuidToString(c.CreatorID),
		SourceType:       c.SourceType,
		Source:           c.Source,
		CaptureScope:     c.CaptureScope,
		SourceTabID:      textToPtr(c.SourceTabID),
		URL:              c.Url,
		NormalizedURL:    c.NormalizedUrl,
		Title:            c.Title,
		Domain:           c.Domain,
		FaviconURL:       textToPtr(c.FaviconUrl),
		Description:      textToPtr(c.Description),
		PreviewImageURL:  textToPtr(c.PreviewImageUrl),
		SelectedText:     textToPtr(c.SelectedText),
		ReadableText:     textToPtr(c.ReadableText),
		Links:            links,
		Status:           c.Status,
		MetadataStatus:   c.MetadataStatus,
		ArchiveStatus:    c.ArchiveStatus,
		SummaryStatus:    c.SummaryStatus,
		EmbeddingStatus:  c.EmbeddingStatus,
		MemoryState:      c.MemoryState,
		FailureReason:    textToPtr(c.FailureReason),
		SkillOpportunity: skillOpportunity,
		CapturedAt:       timestampToString(c.CapturedAt),
		CreatedAt:        timestampToString(c.CreatedAt),
		UpdatedAt:        timestampToString(c.UpdatedAt),
	}
}

func (h *Handler) browserCaptureToResponseWithMemory(ctx context.Context, c db.CapturedSource) BrowserCaptureResponse {
	resp := browserCaptureToResponse(c)
	if h == nil || h.Queries == nil {
		return resp
	}
	memory, err := h.Queries.GetPageMemory(ctx, db.GetPageMemoryParams{
		CapturedSourceID: c.ID,
		WorkspaceID:      c.WorkspaceID,
	})
	if err == nil {
		resp.Memory = pageMemoryToResponse(memory)
	}
	return resp
}

func pageMemoryToResponse(memory db.PageMemory) *PageMemoryResponse {
	return &PageMemoryResponse{
		Summary:         memory.Summary,
		OneLineTakeaway: memory.OneLineTakeaway,
		KeyPoints:       stringArrayFromJSON(memory.KeyPoints),
		Topics:          stringArrayFromJSON(memory.Topics),
		Entities:        stringArrayFromJSON(memory.Entities),
		Keywords:        stringArrayFromJSON(memory.Keywords),
		Status:          memory.Status,
		GeneratedAt:     timestampToPtr(memory.GeneratedAt),
		UpdatedAt:       timestampToString(memory.UpdatedAt),
	}
}

func browserMemoryToClaimData(capture db.CapturedSource) *BrowserMemoryData {
	return &BrowserMemoryData{
		CaptureID:    uuidToString(capture.ID),
		URL:          capture.Url,
		Title:        capture.Title,
		Domain:       capture.Domain,
		Description:  textOrEmpty(capture.Description),
		SelectedText: textOrEmpty(capture.SelectedText),
		ReadableText: textOrEmpty(capture.ReadableText),
		Links:        linksFromJSON(capture.Links),
	}
}

func textOrEmpty(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func stringArrayFromJSON(raw []byte) []string {
	values := []string{}
	if len(raw) == 0 {
		return values
	}
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	return values
}

func linksFromJSON(raw []byte) []BrowserCaptureLinkRequest {
	links := []BrowserCaptureLinkRequest{}
	if len(raw) == 0 {
		return links
	}
	if err := json.Unmarshal(raw, &links); err != nil {
		return []BrowserCaptureLinkRequest{}
	}
	return links
}

func buildCaptureSearchText(req CreateBrowserCaptureRequest) string {
	parts := []string{req.Title, req.Domain, req.URL, req.Description, req.SelectedText, req.ReadableText}
	for _, link := range req.Links {
		parts = append(parts, link.Title, link.URL)
	}
	return truncateTrimmed(normalizeSpace(strings.Join(parts, " ")), 120_000)
}

func captureKeywordsJSON(req CreateBrowserCaptureRequest) []byte {
	tokens := map[string]struct{}{}
	for _, field := range []string{req.Title, req.Domain, req.SelectedText} {
		for _, token := range strings.Fields(strings.ToLower(field)) {
			token = strings.Trim(token, " .,:;!?()[]{}<>\"'`|/\\")
			if len([]rune(token)) >= 3 && len([]rune(token)) <= 40 {
				tokens[token] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(tokens))
	for token := range tokens {
		out = append(out, token)
	}
	sort.Strings(out)
	if len(out) > 50 {
		out = out[:50]
	}
	buf, _ := json.Marshal(out)
	return buf
}

func validCaptureSource(value string) bool {
	switch value {
	case "web", "extension", "api", "cli", "rss", "import", "singlefile":
		return true
	default:
		return false
	}
}

func validCaptureSourceType(value string) bool {
	switch value {
	case "link", "text", "asset", "selection", "rss_item", "imported_bookmark":
		return true
	default:
		return false
	}
}

func validCaptureScope(value string) bool {
	switch value {
	case "page", "selection", "tab_group", "bookmark":
		return true
	default:
		return false
	}
}

func validMemoryState(value string) bool {
	switch value {
	case "active", "muted", "pinned", "archived":
		return true
	default:
		return false
	}
}

func optionalText(value string) pgtype.Text {
	value = strings.TrimSpace(value)
	if value == "" {
		return pgtype.Text{}
	}
	return strToText(value)
}

func timeToTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func normalizeSpace(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func truncateTrimmed(value string, maxRunes int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return strings.TrimSpace(string(runes[:maxRunes]))
}
