package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/didian-ai/didian/server/pkg/llm"
)

type SkillOpportunityResponse struct {
	ShouldSuggest           bool     `json:"shouldSuggest"`
	Confidence              float64  `json:"confidence"`
	PageType                string   `json:"pageType"`
	ProposedTitle           string   `json:"proposedTitle"`
	ProposedCapability      string   `json:"proposedCapability"`
	WhyUseful               string   `json:"whyUseful"`
	DirectionQuestions      []string `json:"directionQuestions"`
	TriggerExamples         []string `json:"triggerExamples"`
	ExpectedInputs          []string `json:"expectedInputs"`
	ExpectedOutputs         []string `json:"expectedOutputs"`
	ReusableWorkflowScore   float64  `json:"reusableWorkflowScore"`
	InstructionDensityScore float64  `json:"instructionDensityScore"`
	FutureUseScore          float64  `json:"futureUseScore"`
	EvidenceSnippets        []string `json:"evidenceSnippets"`
	RiskNotes               []string `json:"riskNotes"`
}

func (h *Handler) buildSkillOpportunityJSON(ctx context.Context, req CreateBrowserCaptureRequest) []byte {
	if h != nil && h.LLM != nil && h.LLM.Enabled() {
		if opportunity, err := h.buildSkillOpportunityWithLLM(ctx, req); err == nil {
			if opportunity == nil || !opportunity.ShouldSuggest {
				return nil
			}
			if payload, err := json.Marshal(opportunity); err == nil {
				return payload
			}
		}
	}
	return buildLocalSkillOpportunityJSON(req)
}

func buildLocalSkillOpportunityJSON(req CreateBrowserCaptureRequest) []byte {
	opportunity := buildSkillOpportunity(req)
	if opportunity == nil {
		return nil
	}
	payload, err := json.Marshal(opportunity)
	if err != nil {
		return nil
	}
	return payload
}

func (h *Handler) buildSkillOpportunityWithLLM(ctx context.Context, req CreateBrowserCaptureRequest) (*SkillOpportunityResponse, error) {
	if h.LLM == nil || !h.LLM.Enabled() {
		return nil, llm.ErrNotConfigured
	}
	text, err := h.LLM.GenerateText(ctx, "", skillOpportunitySystemPrompt(), skillOpportunityUserPrompt(req))
	if err != nil {
		return nil, err
	}
	var parsed SkillOpportunityResponse
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &parsed); err != nil {
		return nil, err
	}
	return normalizeSkillOpportunity(parsed, req), nil
}

func buildSkillOpportunity(req CreateBrowserCaptureRequest) *SkillOpportunityResponse {
	pageType := inferSkillOpportunityPageType(req)
	if pageType == "unknown" || pageType == "blog" || pageType == "paper" || pageType == "product_page" {
		return nil
	}

	reusableWorkflowScore := scoreSkillReusableWorkflow(pageType)
	instructionDensityScore := scoreSkillInstructionDensity(req)
	futureUseScore := scoreSkillFutureUse(pageType, req)
	confidence := roundSkillOpportunityScore((reusableWorkflowScore * 0.35) + (instructionDensityScore * 0.35) + (futureUseScore * 0.3))
	evidenceSnippets := collectSkillOpportunityEvidence(req)

	if confidence < 0.75 || reusableWorkflowScore < 0.7 || instructionDensityScore < 0.65 || futureUseScore < 0.7 || len(evidenceSnippets) < 2 {
		return nil
	}

	return &SkillOpportunityResponse{
		ShouldSuggest:           true,
		Confidence:              confidence,
		PageType:                pageType,
		ProposedTitle:           proposedSkillTitle(pageType, req),
		ProposedCapability:      proposedSkillCapability(pageType),
		WhyUseful:               proposedSkillWhyUseful(pageType),
		DirectionQuestions:      proposedSkillDirectionQuestions(pageType),
		TriggerExamples:         proposedSkillTriggerExamples(pageType, req),
		ExpectedInputs:          proposedSkillInputs(pageType),
		ExpectedOutputs:         proposedSkillOutputs(pageType),
		ReusableWorkflowScore:   reusableWorkflowScore,
		InstructionDensityScore: instructionDensityScore,
		FutureUseScore:          futureUseScore,
		EvidenceSnippets:        evidenceSnippets,
		RiskNotes:               proposedSkillRiskNotes(pageType),
	}
}

func skillOpportunitySystemPrompt() string {
	return strings.Join([]string{
		"You judge whether a saved web page should become a reusable Didian personal capability.",
		"Return exactly one JSON object using camelCase keys matching: shouldSuggest, confidence, pageType, proposedTitle, proposedCapability, whyUseful, directionQuestions, triggerExamples, expectedInputs, expectedOutputs, reusableWorkflowScore, instructionDensityScore, futureUseScore, evidenceSnippets, riskNotes.",
		"Allowed pageType: technical_doc, github_repo, tutorial, blog, paper, product_page, unknown.",
		"Only suggest when the page can become a repeatable workflow for a local coding/research agent, not just a one-off summary.",
		"directionQuestions must ask 2-4 concrete questions the user should answer before generating the capability.",
		"Do not include markdown fences or extra commentary.",
	}, "\n")
}

func skillOpportunityUserPrompt(req CreateBrowserCaptureRequest) string {
	return fmt.Sprintf(
		"URL: %s\nTitle: %s\nDomain: %s\nDescription: %s\nSelected text: %s\nReadable text preview: %s\n",
		req.URL,
		req.Title,
		req.Domain,
		req.Description,
		truncateTrimmed(req.SelectedText, 900),
		truncateTrimmed(req.ReadableText, 1800),
	)
}

func normalizeSkillOpportunity(opp SkillOpportunityResponse, req CreateBrowserCaptureRequest) *SkillOpportunityResponse {
	if !opp.ShouldSuggest {
		return &SkillOpportunityResponse{ShouldSuggest: false}
	}
	opp.PageType = normalizeSkillOpportunityPageType(opp.PageType, req)
	opp.Confidence = clampOpportunityScore(opp.Confidence)
	opp.ReusableWorkflowScore = clampOpportunityScore(opp.ReusableWorkflowScore)
	opp.InstructionDensityScore = clampOpportunityScore(opp.InstructionDensityScore)
	opp.FutureUseScore = clampOpportunityScore(opp.FutureUseScore)
	opp.ProposedTitle = truncateTrimmed(firstNonEmpty(opp.ProposedTitle, proposedSkillTitle(opp.PageType, req)), 120)
	opp.ProposedCapability = truncateTrimmed(firstNonEmpty(opp.ProposedCapability, proposedSkillCapability(opp.PageType)), 240)
	opp.WhyUseful = truncateTrimmed(firstNonEmpty(opp.WhyUseful, proposedSkillWhyUseful(opp.PageType)), 360)
	opp.DirectionQuestions = normalizeStringList(opp.DirectionQuestions, proposedSkillDirectionQuestions(opp.PageType), 4, 140)
	opp.TriggerExamples = normalizeStringList(opp.TriggerExamples, proposedSkillTriggerExamples(opp.PageType, req), 4, 120)
	opp.ExpectedInputs = normalizeStringList(opp.ExpectedInputs, proposedSkillInputs(opp.PageType), 5, 80)
	opp.ExpectedOutputs = normalizeStringList(opp.ExpectedOutputs, proposedSkillOutputs(opp.PageType), 5, 80)
	opp.EvidenceSnippets = normalizeStringList(opp.EvidenceSnippets, collectSkillOpportunityEvidence(req), 4, 180)
	opp.RiskNotes = normalizeStringList(opp.RiskNotes, proposedSkillRiskNotes(opp.PageType), 4, 160)
	if opp.Confidence <= 0 {
		opp.Confidence = roundSkillOpportunityScore((opp.ReusableWorkflowScore * 0.35) + (opp.InstructionDensityScore * 0.35) + (opp.FutureUseScore * 0.3))
	}
	return &opp
}

func inferSkillOpportunityPageType(req CreateBrowserCaptureRequest) string {
	parsed, err := parseHTTPURL(req.URL)
	if err != nil {
		return "unknown"
	}

	host := strings.ToLower(parsed.Hostname())
	path := strings.ToLower(parsed.Path)
	text := searchableSkillOpportunityText(req)

	switch {
	case isGitHubRepoCapture(host, parsed.Path):
		return "github_repo"
	case isPaperCapture(host, path, text):
		return "paper"
	case isProductCapture(path, text):
		return "product_page"
	case isBlogCapture(path, text):
		return "blog"
	case hasTechnicalDocSurface(host, path):
		return "technical_doc"
	case hasTutorialSurface(path, text):
		return "tutorial"
	case isTechnicalDocCapture(host, path, text):
		return "technical_doc"
	case isTutorialCapture(path, text):
		return "tutorial"
	default:
		return "unknown"
	}
}

func normalizeSkillOpportunityPageType(pageType string, req CreateBrowserCaptureRequest) string {
	pageType = strings.TrimSpace(pageType)
	switch pageType {
	case "technical_doc", "github_repo", "tutorial", "blog", "paper", "product_page":
		return pageType
	default:
		return inferSkillOpportunityPageType(req)
	}
}

func isGitHubRepoCapture(host, path string) bool {
	if host != "github.com" {
		return false
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	return len(parts) >= 2 && parts[0] != "" && parts[1] != ""
}

func hasTechnicalDocSurface(host, path string) bool {
	return strings.HasPrefix(host, "docs.") ||
		strings.Contains(host, ".docs.") ||
		strings.Contains(host, "developer.") ||
		strings.Contains(host, "developers.") ||
		regexp.MustCompile(`/(docs|documentation|api|reference|sdk|developers?)(/|$)`).MatchString(path)
}

func hasTutorialSurface(path, text string) bool {
	return regexp.MustCompile(`/(tutorials?|how-to|learn)(/|$)`).MatchString(path) ||
		regexp.MustCompile(`(?i)\b(how to|tutorial|step by step|walkthrough)\b`).MatchString(text) ||
		regexp.MustCompile(`教程|步骤`).MatchString(text)
}

func isTechnicalDocCapture(host, path, text string) bool {
	return hasTechnicalDocSurface(host, path) ||
		regexp.MustCompile(`(?i)\b(api|sdk|webhook|endpoint|parameter|authentication|authorization|quickstart)\b`).MatchString(text) ||
		regexp.MustCompile(`接口|参数|鉴权|错误码|环境变量`).MatchString(text)
}

func isTutorialCapture(path, text string) bool {
	return hasTutorialSurface(path, text) ||
		regexp.MustCompile(`/(guides?)(/|$)`).MatchString(path) ||
		regexp.MustCompile(`(?i)\b(how to|tutorial|step by step|guide|walkthrough|get started|getting started)\b`).MatchString(text) ||
		regexp.MustCompile(`教程|步骤|入门|配置指南`).MatchString(text)
}

func isPaperCapture(host, path, text string) bool {
	return strings.Contains(host, "arxiv.org") ||
		regexp.MustCompile(`(?i)\b(paper|abstract|doi|dataset|methodology)\b`).MatchString(text) ||
		regexp.MustCompile(`(?i)\b(论文|方法|数据集)\b`).MatchString(text) ||
		strings.Contains(path, "/abs/")
}

func isProductCapture(path, text string) bool {
	return regexp.MustCompile(`/(pricing|contact-sales|features|product|solutions)(/|$)`).MatchString(path) ||
		regexp.MustCompile(`(?i)\b(pricing|contact sales|enterprise plan)\b`).MatchString(text)
}

func isBlogCapture(path, text string) bool {
	return regexp.MustCompile(`/(blog|posts|news|article)(/|$)`).MatchString(path) ||
		regexp.MustCompile(`(?i)\b(opinion|essay|newsletter|thoughts)\b`).MatchString(text)
}

func scoreSkillReusableWorkflow(pageType string) float64 {
	switch pageType {
	case "technical_doc":
		return 0.88
	case "github_repo":
		return 0.84
	case "tutorial":
		return 0.78
	default:
		return 0.35
	}
}

func scoreSkillInstructionDensity(req CreateBrowserCaptureRequest) float64 {
	text := searchableSkillOpportunityText(req)
	count := 0
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)\b(api|sdk|endpoint|parameter|webhook|auth|authentication|authorization)\b`),
		regexp.MustCompile(`(?i)\b(install|configure|setup|quickstart|example|command|step|test)\b`),
		regexp.MustCompile(`(?i)\b(error|troubleshoot|debug|license|readme|deploy|integration)\b`),
		regexp.MustCompile(`接口|参数|鉴权|错误|排查|安装|配置|步骤|示例|环境变量`),
	}
	for _, pattern := range patterns {
		count += len(pattern.FindAllString(text, -1))
	}
	switch {
	case count >= 8:
		return 0.9
	case count >= 5:
		return 0.78
	case count >= 3:
		return 0.66
	default:
		return 0.4
	}
}

func scoreSkillFutureUse(pageType string, req CreateBrowserCaptureRequest) float64 {
	switch pageType {
	case "technical_doc":
		return 0.9
	case "github_repo":
		return 0.82
	case "tutorial":
		if regexp.MustCompile(`(?i)\b(error|troubleshoot|configure|setup|test)\b`).MatchString(searchableSkillOpportunityText(req)) {
			return 0.78
		}
		return 0.7
	default:
		return 0.35
	}
}

func proposedSkillTitle(pageType string, req CreateBrowserCaptureRequest) string {
	subject := deriveSkillOpportunitySubject(req)
	switch pageType {
	case "github_repo":
		return subject + " 尽调助手"
	case "tutorial":
		return subject + " 配置助手"
	default:
		return subject + " 接入助手"
	}
}

func proposedSkillCapability(pageType string) string {
	switch pageType {
	case "github_repo":
		return "检查 README、安装方式、license、维护信号和集成风险，并生成是否采用的建议。"
	case "tutorial":
		return "把教程步骤整理成可执行清单，并根据项目情况生成配置、测试和排障建议。"
	default:
		return "根据项目栈生成接入步骤、请求示例、环境变量清单和常见错误排查。"
	}
}

func proposedSkillWhyUseful(pageType string) string {
	switch pageType {
	case "github_repo":
		return "GitHub 仓库经常被收藏用于选型、上手和后续集成，适合沉淀成可重复的评估流程。"
	case "tutorial":
		return "教程类页面包含明确步骤，适合变成以后可以反复调用的个人操作流程。"
	default:
		return "技术文档包含稳定 API、参数和限制，适合沉淀成可复用的集成能力。"
	}
}

func proposedSkillTriggerExamples(pageType string, req CreateBrowserCaptureRequest) []string {
	subject := deriveSkillOpportunitySubject(req)
	switch pageType {
	case "github_repo":
		return []string{"评估 " + subject + " 是否适合我的项目", "帮我快速上手 " + subject}
	case "tutorial":
		return []string{"按我的项目情况执行 " + subject + " 教程", "检查我的 " + subject + " 配置是否完整"}
	default:
		return []string{"帮我接入 " + subject, "根据这份文档排查 " + subject + " 集成错误"}
	}
}

func proposedSkillInputs(pageType string) []string {
	switch pageType {
	case "github_repo":
		return []string{"项目背景", "技术栈", "评估关注点"}
	case "tutorial":
		return []string{"项目栈", "当前配置", "遇到的错误"}
	default:
		return []string{"项目栈", "集成目标", "错误信息或现有代码"}
	}
}

func proposedSkillOutputs(pageType string) []string {
	switch pageType {
	case "github_repo":
		return []string{"采用建议", "上手步骤", "风险清单"}
	case "tutorial":
		return []string{"步骤清单", "配置建议", "排障清单"}
	default:
		return []string{"接入步骤", "示例代码", "错误排查清单"}
	}
}

func proposedSkillRiskNotes(pageType string) []string {
	switch pageType {
	case "github_repo":
		return []string{"仓库维护状态和 license 可能变化，启用 Skill 前需要保留来源回溯。"}
	case "tutorial":
		return []string{"教程质量不稳定，生成后需要用户审查步骤是否符合当前项目版本。"}
	default:
		return []string{"文档版本可能更新，Skill 应保留来源 URL 以便后续重新生成。"}
	}
}

func proposedSkillDirectionQuestions(pageType string) []string {
	switch pageType {
	case "github_repo":
		return []string{"这个能力主要用于选型、上手，还是正式集成？", "需要重点检查哪些风险：license、维护活跃度、性能、部署成本，还是语言生态？", "希望输出 Adopt / Pilot / Defer / Reject 这类结论，还是生成上手计划？"}
	case "tutorial":
		return []string{"这个能力要服务哪种项目栈或运行环境？", "用户执行前需要提供哪些当前配置或错误信息？", "最终更需要步骤清单、自动化脚本，还是排障清单？"}
	case "technical_doc":
		return []string{"这个能力主要面向接入、排错，还是 API 查询？", "需要用户提供哪些项目上下文：框架、语言、鉴权方式，还是错误日志？", "输出更偏示例代码、环境变量清单，还是检查清单？"}
	default:
		return []string{"这个能力要解决哪个可重复任务？", "用户触发时需要提供哪些上下文？", "最终输出应该是什么格式？"}
	}
}

func clampOpportunityScore(value float64) float64 {
	switch {
	case value < 0:
		return 0
	case value > 1:
		return 1
	default:
		return roundSkillOpportunityScore(value)
	}
}

func normalizeStringList(values, fallback []string, maxItems, maxLen int) []string {
	out := make([]string, 0, maxItems)
	seen := map[string]struct{}{}
	appendValue := func(value string) {
		if len(out) >= maxItems {
			return
		}
		value = truncateTrimmed(normalizeSpace(value), maxLen)
		if value == "" {
			return
		}
		if _, ok := seen[value]; ok {
			return
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	for _, value := range values {
		appendValue(value)
	}
	if len(out) == 0 {
		for _, value := range fallback {
			appendValue(value)
		}
	}
	return out
}

func collectSkillOpportunityEvidence(req CreateBrowserCaptureRequest) []string {
	candidates := []string{
		req.Description,
		req.SelectedText,
		req.ReadableText,
		req.Title,
	}
	out := make([]string, 0, 3)
	seen := map[string]struct{}{}
	for _, candidate := range candidates {
		text := truncateTrimmed(normalizeSpace(candidate), 150)
		if text == "" {
			continue
		}
		if _, ok := seen[text]; ok {
			continue
		}
		seen[text] = struct{}{}
		out = append(out, text)
		if len(out) == 3 {
			break
		}
	}
	return out
}

func searchableSkillOpportunityText(req CreateBrowserCaptureRequest) string {
	parts := []string{req.URL, req.Title, req.Domain, req.Description, req.SelectedText, req.ReadableText}
	return strings.Join(parts, " ")
}

func deriveSkillOpportunitySubject(req CreateBrowserCaptureRequest) string {
	if repo := githubRepoName(req.URL); repo != "" {
		return repo
	}
	subject := cleanupSkillOpportunityTitle(req.Title)
	if subject != "" {
		return subject
	}
	if req.Domain != "" {
		return req.Domain
	}
	parsed, err := parseHTTPURL(req.URL)
	if err == nil {
		return parsed.Hostname()
	}
	return "网页"
}

func cleanupSkillOpportunityTitle(title string) string {
	title = strings.TrimSpace(title)
	title = regexp.MustCompile(`\s*[-|–—]\s*(docs?|documentation|developer docs?|guide).*?$`).ReplaceAllString(title, "")
	title = regexp.MustCompile(`(?i)\b(documentation|docs?|guide|tutorial)\b`).ReplaceAllString(title, "")
	title = regexp.MustCompile(`(?i)^how to\s+(configure|set up|setup|build|create|use)\s+`).ReplaceAllString(title, "")
	title = regexp.MustCompile(`(?i)\bauthentication\b`).ReplaceAllString(title, "Auth")
	title = strings.Join(strings.Fields(title), " ")
	return strings.TrimSpace(title)
}

func githubRepoName(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || strings.ToLower(parsed.Hostname()) != "github.com" {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return ""
	}
	return parts[0] + "/" + strings.TrimSuffix(parts[1], ".git")
}

func roundSkillOpportunityScore(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
