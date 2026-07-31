package service

import (
	"encoding/json"
	"errors"
	"net/url"
	"regexp"
	"strings"

	db "github.com/didian-ai/didian/server/pkg/db/generated"
)

type SkillOpportunity struct {
	ShouldSuggest           bool     `json:"shouldSuggest"`
	Confidence              float64  `json:"confidence"`
	PageType                string   `json:"pageType"`
	ProposedTitle           string   `json:"proposedTitle"`
	ProposedCapability      string   `json:"proposedCapability"`
	WhyUseful               string   `json:"whyUseful"`
	TriggerExamples         []string `json:"triggerExamples"`
	ExpectedInputs          []string `json:"expectedInputs"`
	ExpectedOutputs         []string `json:"expectedOutputs"`
	ReusableWorkflowScore   float64  `json:"reusableWorkflowScore"`
	InstructionDensityScore float64  `json:"instructionDensityScore"`
	FutureUseScore          float64  `json:"futureUseScore"`
	EvidenceSnippets        []string `json:"evidenceSnippets"`
	RiskNotes               []string `json:"riskNotes"`
}

type BrowserSkillOpportunityInput struct {
	URL             string
	Title           string
	Domain          string
	Description     string
	SelectedText    string
	ReadableText    string
	OneLineTakeaway string
	Summary         string
	KeyPoints       []string
	Topics          []string
	Entities        []string
	Keywords        []string
}

func BuildSkillOpportunityJSON(input BrowserSkillOpportunityInput) []byte {
	opportunity := BuildSkillOpportunity(input)
	if opportunity == nil {
		return nil
	}
	payload, err := json.Marshal(opportunity)
	if err != nil {
		return nil
	}
	return payload
}

func BuildSkillOpportunity(input BrowserSkillOpportunityInput) *SkillOpportunity {
	pageType := inferSkillOpportunityPageType(input)
	if pageType == "unknown" || pageType == "blog" || pageType == "paper" || pageType == "product_page" {
		return nil
	}

	reusableWorkflowScore := scoreSkillReusableWorkflow(pageType)
	instructionDensityScore := scoreSkillInstructionDensity(input)
	futureUseScore := scoreSkillFutureUse(pageType, input)
	confidence := roundSkillOpportunityScore((reusableWorkflowScore * 0.35) + (instructionDensityScore * 0.35) + (futureUseScore * 0.3))
	evidenceSnippets := collectSkillOpportunityEvidence(input)

	if confidence < 0.75 || reusableWorkflowScore < 0.7 || instructionDensityScore < 0.65 || futureUseScore < 0.7 || len(evidenceSnippets) < 2 {
		return nil
	}

	return &SkillOpportunity{
		ShouldSuggest:           true,
		Confidence:              confidence,
		PageType:                pageType,
		ProposedTitle:           proposedSkillTitle(pageType, input),
		ProposedCapability:      proposedSkillCapability(pageType),
		WhyUseful:               proposedSkillWhyUseful(pageType),
		TriggerExamples:         proposedSkillTriggerExamples(pageType, input),
		ExpectedInputs:          proposedSkillInputs(pageType),
		ExpectedOutputs:         proposedSkillOutputs(pageType),
		ReusableWorkflowScore:   reusableWorkflowScore,
		InstructionDensityScore: instructionDensityScore,
		FutureUseScore:          futureUseScore,
		EvidenceSnippets:        evidenceSnippets,
		RiskNotes:               proposedSkillRiskNotes(pageType),
	}
}

func BuildSkillOpportunityInput(capture db.CapturedSource, enrichment *PageMemoryEnrichment) BrowserSkillOpportunityInput {
	input := BrowserSkillOpportunityInput{
		URL:          capture.Url,
		Title:        capture.Title,
		Domain:       capture.Domain,
		Description:  textValue(capture.Description),
		SelectedText: textValue(capture.SelectedText),
		ReadableText: textValue(capture.ReadableText),
	}
	if enrichment != nil {
		input.OneLineTakeaway = enrichment.OneLineTakeaway
		input.Summary = enrichment.Summary
		input.KeyPoints = enrichment.KeyPoints
		input.Topics = enrichment.Topics
		input.Entities = enrichment.Entities
		input.Keywords = enrichment.Keywords
	}
	return input
}

func inferSkillOpportunityPageType(input BrowserSkillOpportunityInput) string {
	parsed, err := parseSkillOpportunityURL(input.URL)
	if err != nil {
		return "unknown"
	}

	host := strings.ToLower(parsed.Hostname())
	path := strings.ToLower(parsed.Path)
	text := searchableSkillOpportunityText(input)

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

func scoreSkillInstructionDensity(input BrowserSkillOpportunityInput) float64 {
	text := searchableSkillOpportunityText(input)
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

func scoreSkillFutureUse(pageType string, input BrowserSkillOpportunityInput) float64 {
	switch pageType {
	case "technical_doc":
		return 0.9
	case "github_repo":
		return 0.82
	case "tutorial":
		if regexp.MustCompile(`(?i)\b(error|troubleshoot|configure|setup|test)\b`).MatchString(searchableSkillOpportunityText(input)) {
			return 0.78
		}
		return 0.7
	default:
		return 0.35
	}
}

func proposedSkillTitle(pageType string, input BrowserSkillOpportunityInput) string {
	subject := deriveSkillOpportunitySubject(input)
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

func proposedSkillTriggerExamples(pageType string, input BrowserSkillOpportunityInput) []string {
	subject := deriveSkillOpportunitySubject(input)
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
		return []string{"仓库维护状态和 license 可能变化，启用能力前需要保留来源回溯。"}
	case "tutorial":
		return []string{"教程质量不稳定，生成后需要用户审查步骤是否符合当前项目版本。"}
	default:
		return []string{"文档版本可能更新，能力应保留来源 URL 以便后续重新生成。"}
	}
}

func collectSkillOpportunityEvidence(input BrowserSkillOpportunityInput) []string {
	candidates := []string{
		input.OneLineTakeaway,
	}
	candidates = append(candidates, input.KeyPoints...)
	candidates = append(candidates, input.Summary, input.Description, input.SelectedText, input.ReadableText, input.Title)

	out := make([]string, 0, 3)
	seen := map[string]struct{}{}
	for _, candidate := range candidates {
		text := truncateRunes(normalizeSpace(candidate), 150)
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

func searchableSkillOpportunityText(input BrowserSkillOpportunityInput) string {
	parts := []string{
		input.URL,
		input.Title,
		input.Domain,
		input.Description,
		input.SelectedText,
		input.ReadableText,
		input.OneLineTakeaway,
		input.Summary,
		strings.Join(input.KeyPoints, " "),
		strings.Join(input.Topics, " "),
		strings.Join(input.Entities, " "),
		strings.Join(input.Keywords, " "),
	}
	return strings.Join(parts, " ")
}

func deriveSkillOpportunitySubject(input BrowserSkillOpportunityInput) string {
	if repo := githubRepoName(input.URL); repo != "" {
		return repo
	}
	if entity := firstNonEmpty(input.Entities...); entity != "" {
		return entity
	}
	subject := cleanupSkillOpportunityTitle(input.Title)
	if subject != "" {
		return subject
	}
	if input.Domain != "" {
		return input.Domain
	}
	parsed, err := parseSkillOpportunityURL(input.URL)
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

func parseSkillOpportunityURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}
	if parsed.Host == "" {
		return nil, errors.New("missing host")
	}
	return parsed, nil
}

func roundSkillOpportunityScore(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
