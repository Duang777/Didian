package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
	"github.com/didian-ai/didian/server/internal/util"
)

// Skill proposal lifecycle statuses (V2 personal-skill draft).
const (
	skillProposalStatusPending   = "pending"   // generated, not yet edited
	skillProposalStatusDraft     = "draft"     // user edited the draft fields
	skillProposalStatusConfirmed = "confirmed" // promoted into a personal_skill
	skillProposalStatusRejected  = "rejected"  // user dismissed
)

// ---- request / response shapes ----

type createSkillProposalRequest struct {
	CaptureID string `json:"capture_id"`
}

type updateSkillProposalRequest struct {
	DraftDescription  *string `json:"draft_description"`
	DraftTrigger      *string `json:"draft_trigger"`
	DraftInstructions *string `json:"draft_instructions"`
	Status            *string `json:"status"`
}

type skillProposalResponse struct {
	ID                      string    `json:"id"`
	WorkspaceID            string    `json:"workspace_id"`
	CapturedSourceID       string    `json:"captured_source_id"`
	ProposedTitle          string    `json:"proposed_title"`
	ProposedCapability     string    `json:"proposed_capability"`
	PageType               string    `json:"page_type"`
	Confidence             float64   `json:"confidence"`
	WhyUseful              string    `json:"why_useful"`
	TriggerExamples        []string  `json:"trigger_examples"`
	ExpectedInputs         []string  `json:"expected_inputs"`
	ExpectedOutputs        []string  `json:"expected_outputs"`
	ReusableWorkflowScore  *float64  `json:"reusable_workflow_score,omitempty"`
	InstructionDensityScore *float64 `json:"instruction_density_score,omitempty"`
	FutureUseScore         *float64  `json:"future_use_score,omitempty"`
	EvidenceSnippets       []string  `json:"evidence_snippets"`
	RiskNotes              []string  `json:"risk_notes"`
	DraftDescription       string    `json:"draft_description"`
	DraftTrigger           string    `json:"draft_trigger"`
	DraftInstructions      string    `json:"draft_instructions"`
	Status                 string    `json:"status"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type personalSkillResponse struct {
	ID               string    `json:"id"`
	WorkspaceID      string    `json:"workspace_id"`
	ProposalID       string    `json:"proposal_id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Capability       string    `json:"capability"`
	PageType         string    `json:"page_type"`
	Trigger          string    `json:"trigger"`
	ExpectedInput    string    `json:"expected_input"`
	ExpectedOutput   string    `json:"expected_output"`
	Instructions     string    `json:"instructions"`
	SourceUrl        string    `json:"source_url"`
	SourceDomain     string    `json:"source_domain"`
	EvidenceSnippets []string  `json:"evidence_snippets"`
	RiskNotes        []string  `json:"risk_notes"`
	Enabled          bool      `json:"enabled"`
	UseCount         int32     `json:"use_count"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// ---- small helpers ----

func toSkillProposalResponse(p db.SkillProposal) skillProposalResponse {
	return skillProposalResponse{
		ID:                      util.UUIDToString(p.ID),
		WorkspaceID:             util.UUIDToString(p.WorkspaceID),
		CapturedSourceID:        util.UUIDToString(p.CapturedSourceID),
		ProposedTitle:           p.ProposedTitle,
		ProposedCapability:      p.ProposedCapability,
		PageType:                p.PageType,
		Confidence:              p.Confidence,
		WhyUseful:               p.WhyUseful,
		TriggerExamples:         unmarshalStringSlice(p.TriggerExamples),
		ExpectedInputs:          unmarshalStringSlice(p.ExpectedInputs),
		ExpectedOutputs:         unmarshalStringSlice(p.ExpectedOutputs),
		ReusableWorkflowScore:   float8Ptr(p.ReusableWorkflowScore),
		InstructionDensityScore: float8Ptr(p.InstructionDensityScore),
		FutureUseScore:          float8Ptr(p.FutureUseScore),
		EvidenceSnippets:        unmarshalStringSlice(p.EvidenceSnippets),
		RiskNotes:               unmarshalStringSlice(p.RiskNotes),
		DraftDescription:         p.DraftDescription,
		DraftTrigger:             p.DraftTrigger,
		DraftInstructions:        p.DraftInstructions,
		Status:                   p.Status,
		CreatedAt:                p.CreatedAt.Time,
		UpdatedAt:                p.UpdatedAt.Time,
	}
}

func toPersonalSkillResponse(p db.PersonalSkill) personalSkillResponse {
	return personalSkillResponse{
		ID:               util.UUIDToString(p.ID),
		WorkspaceID:      util.UUIDToString(p.WorkspaceID),
		ProposalID:       util.UUIDToString(p.ProposalID),
		Name:             p.Name,
		Description:      p.Description,
		Capability:       p.Capability,
		PageType:         p.PageType,
		Trigger:          p.Trigger,
		ExpectedInput:    p.ExpectedInput,
		ExpectedOutput:   p.ExpectedOutput,
		Instructions:     p.Instructions,
		SourceUrl:        p.SourceUrl.String,
		SourceDomain:     p.SourceDomain.String,
		EvidenceSnippets: unmarshalStringSlice(p.EvidenceSnippets),
		RiskNotes:        unmarshalStringSlice(p.RiskNotes),
		Enabled:          p.Enabled,
		UseCount:         p.UseCount,
		CreatedAt:        p.CreatedAt.Time,
		UpdatedAt:        p.UpdatedAt.Time,
	}
}

func unmarshalStringSlice(b []byte) []string {
	if len(b) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(b, &out); err != nil {
		return []string{}
	}
	return out
}

func float8Ptr(f pgtype.Float8) *float64 {
	if !f.Valid {
		return nil
	}
	v := f.Float64
	return &v
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func f8(v float64) pgtype.Float8 {
	return pgtype.Float8{Float64: v, Valid: true}
}

func txt(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

// buildSkillProposalDraft turns a detected SkillOpportunity + capture into the
// editable draft fields. Pure + deterministic so it always runs without an LLM;
// the user can refine the draft before confirming it into a personal skill.
func buildSkillProposalDraft(opp SkillOpportunityResponse, sourceURL, domain string) (desc, trigger, instructions string) {
	title := strings.TrimSpace(opp.ProposedTitle)
	desc = strings.TrimSpace(opp.ProposedCapability + " " + opp.WhyUseful)

	if len(opp.TriggerExamples) > 0 {
		trigger = opp.TriggerExamples[0]
	} else {
		trigger = "帮我使用 " + title
	}

	inputs := opp.ExpectedInputs
	if len(inputs) == 0 {
		inputs = []string{"项目栈", "集成目标"}
	}
	outputs := opp.ExpectedOutputs
	if len(outputs) == 0 {
		outputs = []string{"可执行步骤", "示例代码", "排查清单"}
	}
	risks := opp.RiskNotes
	if len(risks) == 0 {
		risks = []string{"文档版本可能更新，启用前保留来源 URL 以便回溯。"}
	}

	var b strings.Builder
	b.WriteString("# ")
	b.WriteString(title)
	b.WriteString("\n\n")
	b.WriteString("## 适用场景\n")
	b.WriteString(strings.TrimSpace(opp.WhyUseful))
	b.WriteString("\n\n")
	b.WriteString("## 触发方式\n")
	b.WriteString("当用户说：")
	b.WriteString(trigger)
	b.WriteString("\n\n")
	b.WriteString("## 处理步骤\n")
	b.WriteString("1. 读取来源页面 ")
	b.WriteString(domain)
	b.WriteString(" 的内容，并保留 URL 以便回溯。\n")
	b.WriteString("2. ")
	b.WriteString(strings.TrimSpace(opp.ProposedCapability))
	b.WriteString("\n")
	b.WriteString("3. 结合用户当前项目栈与上下文，给出可直接执行的建议，而不是泛泛而谈。\n\n")
	b.WriteString("## 预期输入\n")
	for _, in := range inputs {
		b.WriteString("- ")
		b.WriteString(in)
		b.WriteString("\n")
	}
	b.WriteString("\n## 预期输出\n")
	for _, out := range outputs {
		b.WriteString("- ")
		b.WriteString(out)
		b.WriteString("\n")
	}
	b.WriteString("\n## 风险提示\n")
	for _, risk := range risks {
		b.WriteString("- ")
		b.WriteString(risk)
		b.WriteString("\n")
	}
	b.WriteString("\n## 来源\n")
	b.WriteString(sourceURL)
	b.WriteString("\n")

	instructions = b.String()
	return desc, trigger, instructions
}

// ---- handlers ----

func (h *Handler) CreateSkillProposalHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	var req createSkillProposalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CaptureID == "" {
		writeError(w, http.StatusBadRequest, "capture_id is required")
		return
	}

	ctx := r.Context()
	cap, err := h.Queries.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          parseUUID(req.CaptureID),
		WorkspaceID: parseUUID(wsID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "capture not found")
		return
	}

	var opp SkillOpportunityResponse
	if len(cap.SkillOpportunity) > 0 {
		if err := json.Unmarshal(cap.SkillOpportunity, &opp); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to parse skill opportunity")
			return
		}
	}
	if !opp.ShouldSuggest {
		writeError(w, http.StatusUnprocessableEntity, "this capture has no suggested skill opportunity")
		return
	}

	// Avoid duplicate pending proposals for the same capture.
	existing, _ := h.Queries.ListSkillProposalsByWorkspace(ctx, db.ListSkillProposalsByWorkspaceParams{
		WorkspaceID: parseUUID(wsID),
		Status:      pgtype.Text{String: skillProposalStatusPending, Valid: true},
	})
	for _, e := range existing {
		if util.UUIDToString(e.CapturedSourceID) == req.CaptureID {
			writeJSON(w, http.StatusOK, toSkillProposalResponse(e))
			return
		}
	}

	desc, trigger, instructions := buildSkillProposalDraft(opp, cap.Url, cap.Domain)

	row, err := h.Queries.CreateSkillProposal(ctx, db.CreateSkillProposalParams{
		WorkspaceID:             parseUUID(wsID),
		CapturedSourceID:        parseUUID(req.CaptureID),
		ProposedTitle:           opp.ProposedTitle,
		ProposedCapability:      opp.ProposedCapability,
		PageType:                opp.PageType,
		Confidence:              opp.Confidence,
		WhyUseful:               opp.WhyUseful,
		TriggerExamples:         mustJSON(opp.TriggerExamples),
		ExpectedInputs:          mustJSON(opp.ExpectedInputs),
		ExpectedOutputs:         mustJSON(opp.ExpectedOutputs),
		ReusableWorkflowScore:   f8(opp.ReusableWorkflowScore),
		InstructionDensityScore: f8(opp.InstructionDensityScore),
		FutureUseScore:          f8(opp.FutureUseScore),
		EvidenceSnippets:        mustJSON(opp.EvidenceSnippets),
		RiskNotes:               mustJSON(opp.RiskNotes),
		DraftDescription:        desc,
		DraftTrigger:            trigger,
		DraftInstructions:       instructions,
		Status:                  skillProposalStatusPending,
		CreatedBy:               parseUUID(userID),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create skill proposal")
		return
	}
	writeJSON(w, http.StatusCreated, toSkillProposalResponse(row))
}

func (h *Handler) ListSkillProposals(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	arg := db.ListSkillProposalsByWorkspaceParams{WorkspaceID: parseUUID(wsID)}
	if status := r.URL.Query().Get("status"); status != "" {
		arg.Status = pgtype.Text{String: status, Valid: true}
	}
	rows, err := h.Queries.ListSkillProposalsByWorkspace(r.Context(), arg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list skill proposals")
		return
	}
	out := make([]skillProposalResponse, 0, len(rows))
	for _, p := range rows {
		out = append(out, toSkillProposalResponse(p))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) GetSkillProposalHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "proposalId"), "proposalId")
	if !ok {
		return
	}
	row, err := h.Queries.GetSkillProposal(r.Context(), db.GetSkillProposalParams{ID: id, WorkspaceID: parseUUID(wsID)})
	if err != nil {
		writeError(w, http.StatusNotFound, "skill proposal not found")
		return
	}
	writeJSON(w, http.StatusOK, toSkillProposalResponse(row))
}

func (h *Handler) UpdateSkillProposalHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "proposalId"), "proposalId")
	if !ok {
		return
	}

	var req updateSkillProposalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	arg := db.UpdateSkillProposalDraftParams{ID: id, WorkspaceID: parseUUID(wsID)}
	if req.DraftDescription != nil {
		arg.DraftDescription = txt(*req.DraftDescription)
	}
	if req.DraftTrigger != nil {
		arg.DraftTrigger = txt(*req.DraftTrigger)
	}
	if req.DraftInstructions != nil {
		arg.DraftInstructions = txt(*req.DraftInstructions)
	}
	if req.Status != nil {
		arg.Status = txt(*req.Status)
	}

	row, err := h.Queries.UpdateSkillProposalDraft(r.Context(), arg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update skill proposal")
		return
	}
	writeJSON(w, http.StatusOK, toSkillProposalResponse(row))
}

// ConfirmSkillProposal promotes a draft into an enabled personal_skill and
// marks the proposal confirmed. Idempotent: re-confirming returns the existing
// personal skill without duplicating.
func (h *Handler) ConfirmSkillProposal(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "proposalId"), "proposalId")
	if !ok {
		return
	}

	ctx := r.Context()
	prop, err := h.Queries.GetSkillProposal(ctx, db.GetSkillProposalParams{ID: id, WorkspaceID: parseUUID(wsID)})
	if err != nil {
		writeError(w, http.StatusNotFound, "skill proposal not found")
		return
	}
	if prop.Status == skillProposalStatusConfirmed {
		// Already confirmed: return the linked personal skill if present.
		ps, perr := h.Queries.GetPersonalSkillByProposalID(ctx, db.GetPersonalSkillByProposalIDParams{
			ProposalID:  prop.ID,
			WorkspaceID: parseUUID(wsID),
		})
		if perr == nil {
			writeJSON(w, http.StatusOK, toPersonalSkillResponse(ps))
			return
		}
		writeError(w, http.StatusConflict, "skill proposal already confirmed")
		return
	}

	cap, err := h.Queries.GetCapturedSourceInWorkspace(ctx, db.GetCapturedSourceInWorkspaceParams{
		ID:          prop.CapturedSourceID,
		WorkspaceID: parseUUID(wsID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "source capture not found")
		return
	}

	ps, err := h.Queries.CreatePersonalSkill(ctx, db.CreatePersonalSkillParams{
		WorkspaceID:      parseUUID(wsID),
		ProposalID:       prop.ID,
		Name:             prop.ProposedTitle,
		Description:      prop.DraftDescription,
		Capability:       prop.ProposedCapability,
		PageType:         prop.PageType,
		Trigger:          prop.DraftTrigger,
		ExpectedInput:    strings.Join(unmarshalStringSlice(prop.ExpectedInputs), "、"),
		ExpectedOutput:   strings.Join(unmarshalStringSlice(prop.ExpectedOutputs), "、"),
		Instructions:     prop.DraftInstructions,
		SourceUrl:        txt(cap.Url),
		SourceDomain:     txt(cap.Domain),
		EvidenceSnippets: prop.EvidenceSnippets,
		RiskNotes:        prop.RiskNotes,
		Enabled:          true,
		CreatedBy:        prop.CreatedBy,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create personal skill")
		return
	}

	if _, err := h.Queries.UpdateSkillProposalDraft(ctx, db.UpdateSkillProposalDraftParams{
		ID:          prop.ID,
		WorkspaceID: parseUUID(wsID),
		Status:      pgtype.Text{String: skillProposalStatusConfirmed, Valid: true},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark proposal confirmed")
		return
	}

	writeJSON(w, http.StatusCreated, toPersonalSkillResponse(ps))
}

func (h *Handler) DeleteSkillProposalHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "proposalId"), "proposalId")
	if !ok {
		return
	}
	if err := h.Queries.DeleteSkillProposal(r.Context(), db.DeleteSkillProposalParams{ID: id, WorkspaceID: parseUUID(wsID)}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete skill proposal")
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

// ---- personal skill handlers ----

func (h *Handler) ListPersonalSkills(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	arg := db.ListPersonalSkillsByWorkspaceParams{WorkspaceID: parseUUID(wsID)}
	if enabled := r.URL.Query().Get("enabled"); enabled == "true" || enabled == "false" {
		arg.Enabled = pgtype.Bool{Bool: enabled == "true", Valid: true}
	}
	rows, err := h.Queries.ListPersonalSkillsByWorkspace(r.Context(), arg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list personal skills")
		return
	}
	out := make([]personalSkillResponse, 0, len(rows))
	for _, p := range rows {
		out = append(out, toPersonalSkillResponse(p))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) GetPersonalSkillHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "skillId"), "skillId")
	if !ok {
		return
	}
	row, err := h.Queries.GetPersonalSkill(r.Context(), db.GetPersonalSkillParams{ID: id, WorkspaceID: parseUUID(wsID)})
	if err != nil {
		writeError(w, http.StatusNotFound, "personal skill not found")
		return
	}
	writeJSON(w, http.StatusOK, toPersonalSkillResponse(row))
}

type updatePersonalSkillRequest struct {
	Name         *string `json:"name"`
	Description  *string `json:"description"`
	Capability   *string `json:"capability"`
	PageType     *string `json:"page_type"`
	Trigger      *string `json:"trigger"`
	ExpectedInput  *string `json:"expected_input"`
	ExpectedOutput *string `json:"expected_output"`
	Instructions *string `json:"instructions"`
	Enabled      *bool   `json:"enabled"`
}

func (h *Handler) UpdatePersonalSkillHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "skillId"), "skillId")
	if !ok {
		return
	}
	var req updatePersonalSkillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	arg := db.UpdatePersonalSkillParams{ID: id, WorkspaceID: parseUUID(wsID)}
	if req.Name != nil {
		arg.Name = txt(*req.Name)
	}
	if req.Description != nil {
		arg.Description = txt(*req.Description)
	}
	if req.Capability != nil {
		arg.Capability = txt(*req.Capability)
	}
	if req.PageType != nil {
		arg.PageType = txt(*req.PageType)
	}
	if req.Trigger != nil {
		arg.Trigger = txt(*req.Trigger)
	}
	if req.ExpectedInput != nil {
		arg.ExpectedInput = txt(*req.ExpectedInput)
	}
	if req.ExpectedOutput != nil {
		arg.ExpectedOutput = txt(*req.ExpectedOutput)
	}
	if req.Instructions != nil {
		arg.Instructions = txt(*req.Instructions)
	}
	if req.Enabled != nil {
		arg.Enabled = pgtype.Bool{Bool: *req.Enabled, Valid: true}
	}
	row, err := h.Queries.UpdatePersonalSkill(r.Context(), arg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update personal skill")
		return
	}
	writeJSON(w, http.StatusOK, toPersonalSkillResponse(row))
}

func (h *Handler) UsePersonalSkill(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "skillId"), "skillId")
	if !ok {
		return
	}
	row, err := h.Queries.IncrementPersonalSkillUse(r.Context(), db.IncrementPersonalSkillUseParams{ID: id, WorkspaceID: parseUUID(wsID)})
	if err != nil {
		writeError(w, http.StatusNotFound, "personal skill not found")
		return
	}
	writeJSON(w, http.StatusOK, toPersonalSkillResponse(row))
}

func (h *Handler) DeletePersonalSkillHandler(w http.ResponseWriter, r *http.Request) {
	wsID := h.resolveWorkspaceID(r)
	if wsID == "" {
		writeError(w, http.StatusBadRequest, "missing workspace")
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "skillId"), "skillId")
	if !ok {
		return
	}
	if err := h.Queries.DeletePersonalSkill(r.Context(), db.DeletePersonalSkillParams{ID: id, WorkspaceID: parseUUID(wsID)}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete personal skill")
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}
