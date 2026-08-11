package handler

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
)

func TestBuildSkillProposalDraft(t *testing.T) {
	opp := SkillOpportunityResponse{
		ShouldSuggest:      true,
		ProposedTitle:      "GitHub 仓库 尽调助手",
		ProposedCapability: "检查 README、安装方式、license。",
		WhyUseful:          "GitHub 仓库适合沉淀成可重复的评估流程。",
		TriggerExamples:    []string{"评估 acme/foo 是否适合我的项目"},
		ExpectedInputs:     []string{"项目背景", "技术栈"},
		ExpectedOutputs:    []string{"采用建议", "风险清单"},
		RiskNotes:          []string{"仓库维护状态可能变化。"},
		PageType:           "github_repo",
		Confidence:         0.88,
	}

	desc, trigger, instructions := buildSkillProposalDraft(opp, "https://github.com/acme/foo", "github.com")

	if strings.TrimSpace(desc) == "" {
		t.Fatal("draft description should not be empty")
	}
	if trigger != "评估 acme/foo 是否适合我的项目" {
		t.Fatalf("unexpected trigger: %q", trigger)
	}
	for _, want := range []string{"GitHub 仓库 尽调助手", "github.com", "https://github.com/acme/foo"} {
		if !strings.Contains(instructions, want) {
			t.Fatalf("instructions missing %q\n%s", want, instructions)
		}
	}
}

func TestUnmarshalStringSlice(t *testing.T) {
	if got := unmarshalStringSlice(nil); len(got) != 0 {
		t.Fatalf("nil should yield empty slice, got %v", got)
	}
	if got := unmarshalStringSlice([]byte("not-json")); len(got) != 0 {
		t.Fatalf("invalid json should yield empty slice, got %v", got)
	}
	raw, _ := json.Marshal([]string{"a", "b"})
	if got := unmarshalStringSlice(raw); len(got) != 2 || got[0] != "a" {
		t.Fatalf("valid json should decode, got %v", got)
	}
}

func TestToSkillProposalResponseDecodesJSONB(t *testing.T) {
	trig, _ := json.Marshal([]string{"t1", "t2"})
	ev, _ := json.Marshal([]string{"e1"})
	row := db.SkillProposal{
		ProposedTitle:    "T",
		PageType:         "tutorial",
		Confidence:       0.8,
		TriggerExamples:  trig,
		EvidenceSnippets: ev,
		Status:           "pending",
	}
	out := toSkillProposalResponse(row)
	if len(out.TriggerExamples) != 2 || out.TriggerExamples[0] != "t1" {
		t.Fatalf("trigger examples not decoded: %v", out.TriggerExamples)
	}
	if len(out.EvidenceSnippets) != 1 {
		t.Fatalf("evidence not decoded: %v", out.EvidenceSnippets)
	}
	if out.Status != "pending" {
		t.Fatalf("status not mapped: %q", out.Status)
	}
}

func TestFloat8Ptr(t *testing.T) {
	if float8Ptr(pgtype.Float8{}) != nil {
		t.Fatal("invalid float8 should map to nil")
	}
	v := float8Ptr(pgtype.Float8{Float64: 0.7, Valid: true})
	if v == nil || *v != 0.7 {
		t.Fatalf("valid float8 should map to pointer, got %v", v)
	}
}
