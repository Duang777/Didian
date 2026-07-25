import type { BrowserCapture, SkillOpportunity, SkillOpportunityPageType } from "./types";

const allowedSkillPageTypes = new Set<SkillOpportunityPageType>(["technical_doc", "github_repo", "tutorial"]);

export function inferSkillOpportunity(capture: BrowserCapture): SkillOpportunity | null {
  const pageType = inferPageType(capture);
  if (!allowedSkillPageTypes.has(pageType)) return null;

  const reusableWorkflowScore = scoreReusableWorkflow(pageType);
  const instructionDensityScore = scoreInstructionDensity(capture);
  const futureUseScore = scoreFutureUse(pageType, capture);
  const confidence = roundScore((reusableWorkflowScore * 0.35) + (instructionDensityScore * 0.35) + (futureUseScore * 0.3));
  const evidenceSnippets = collectEvidenceSnippets(capture);

  if (
    confidence < 0.75
    || reusableWorkflowScore < 0.7
    || instructionDensityScore < 0.65
    || futureUseScore < 0.7
    || evidenceSnippets.length < 2
  ) {
    return null;
  }

  return {
    shouldSuggest: true,
    confidence,
    pageType,
    ...proposalForPageType(pageType, capture),
    reusableWorkflowScore,
    instructionDensityScore,
    futureUseScore,
    evidenceSnippets,
    riskNotes: riskNotesForPageType(pageType),
  };
}

function inferPageType(capture: BrowserCapture): SkillOpportunityPageType {
  const url = parseUrl(capture.url);
  const hostname = url?.hostname.toLowerCase() ?? capture.domain.toLowerCase();
  const pathname = url?.pathname.toLowerCase() ?? "";
  const text = searchableText(capture);

  if (hostname === "github.com" && githubRepoName(capture)) return "github_repo";
  if (hostname.includes("arxiv.org") || /\b(paper|abstract|doi|dataset|methodology)\b/i.test(text)) return "paper";
  if (/\/(pricing|contact-sales|features|product|solutions)(\/|$)/.test(pathname) || /\b(pricing|contact sales|enterprise plan)\b/i.test(text)) return "product_page";
  if (/\/(blog|posts|news|article)(\/|$)/.test(pathname) || /\b(opinion|essay|newsletter|thoughts)\b/i.test(text)) return "blog";
  if (hasTechnicalDocSurface(hostname, pathname)) return "technical_doc";
  if (hasTutorialSurface(pathname, text)) return "tutorial";
  if (isTechnicalDoc(hostname, pathname, text)) return "technical_doc";
  if (isTutorial(pathname, text)) return "tutorial";
  return "unknown";
}

function hasTechnicalDocSurface(hostname: string, pathname: string): boolean {
  return hostname.startsWith("docs.")
    || hostname.includes(".docs.")
    || hostname.includes("developer.")
    || hostname.includes("developers.")
    || /\/(docs|documentation|api|reference|sdk|developers?)(\/|$)/.test(pathname);
}

function hasTutorialSurface(pathname: string, text: string): boolean {
  return /\/(tutorials?|how-to|learn)(\/|$)/.test(pathname)
    || /\b(how to|tutorial|step by step|walkthrough)\b/i.test(text)
    || /教程|步骤/.test(text);
}

function isTechnicalDoc(hostname: string, pathname: string, text: string): boolean {
  return hasTechnicalDocSurface(hostname, pathname)
    || /\b(api|sdk|webhook|endpoint|parameter|authentication|authorization|quickstart)\b/i.test(text)
    || /接口|参数|鉴权|错误码|环境变量/.test(text);
}

function isTutorial(pathname: string, text: string): boolean {
  return hasTutorialSurface(pathname, text)
    || /\/guides?(\/|$)/.test(pathname)
    || /\b(how to|tutorial|step by step|guide|walkthrough|get started|getting started)\b/i.test(text)
    || /教程|步骤|入门|配置指南/.test(text);
}

function scoreReusableWorkflow(pageType: SkillOpportunityPageType): number {
  if (pageType === "technical_doc") return 0.88;
  if (pageType === "github_repo") return 0.84;
  if (pageType === "tutorial") return 0.78;
  return 0.35;
}

function scoreInstructionDensity(capture: BrowserCapture): number {
  const text = searchableText(capture);
  const matches = [
    /\b(api|sdk|endpoint|parameter|webhook|auth|authentication|authorization)\b/gi,
    /\b(install|configure|setup|quickstart|example|command|step|test)\b/gi,
    /\b(error|troubleshoot|debug|license|readme|deploy|integration)\b/gi,
    /接口|参数|鉴权|错误|排查|安装|配置|步骤|示例|环境变量/g,
  ].reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);

  if (matches >= 8) return 0.9;
  if (matches >= 5) return 0.78;
  if (matches >= 3) return 0.66;
  return 0.4;
}

function scoreFutureUse(pageType: SkillOpportunityPageType, capture: BrowserCapture): number {
  if (pageType === "technical_doc") return 0.9;
  if (pageType === "github_repo") return 0.82;
  if (pageType === "tutorial") {
    return /\b(error|troubleshoot|configure|setup|test)\b/i.test(searchableText(capture)) ? 0.78 : 0.7;
  }
  return 0.35;
}

function proposalForPageType(
  pageType: SkillOpportunityPageType,
  capture: BrowserCapture,
): Pick<SkillOpportunity, "proposedTitle" | "proposedCapability" | "whyUseful" | "triggerExamples" | "expectedInputs" | "expectedOutputs"> {
  if (pageType === "github_repo") {
    const repoName = githubRepoName(capture) ?? deriveSubject(capture);
    return {
      proposedTitle: `${repoName} 尽调助手`,
      proposedCapability: "检查 README、安装方式、license、维护信号和集成风险，并生成是否采用的建议。",
      whyUseful: "GitHub 仓库经常被收藏用于选型、上手和后续集成，适合沉淀成可重复的评估流程。",
      triggerExamples: [`评估 ${repoName} 是否适合我的项目`, `帮我快速上手 ${repoName}`],
      expectedInputs: ["项目背景", "技术栈", "评估关注点"],
      expectedOutputs: ["采用建议", "上手步骤", "风险清单"],
    };
  }

  if (pageType === "tutorial") {
    const subject = deriveSubject(capture);
    return {
      proposedTitle: `${subject} 配置助手`,
      proposedCapability: "把教程步骤整理成可执行清单，并根据项目情况生成配置、测试和排障建议。",
      whyUseful: "教程类页面包含明确步骤，适合变成以后可以反复调用的个人操作流程。",
      triggerExamples: [`按我的项目情况执行 ${subject} 教程`, `检查我的 ${subject} 配置是否完整`],
      expectedInputs: ["项目栈", "当前配置", "遇到的错误"],
      expectedOutputs: ["步骤清单", "配置建议", "排障清单"],
    };
  }

  const subject = deriveSubject(capture);
  return {
    proposedTitle: `${subject} 接入助手`,
    proposedCapability: "根据项目栈生成接入步骤、请求示例、环境变量清单和常见错误排查。",
    whyUseful: "技术文档包含稳定 API、参数和限制，适合沉淀成可复用的集成能力。",
    triggerExamples: [`帮我接入 ${subject}`, `根据这份文档排查 ${subject} 集成错误`],
    expectedInputs: ["项目栈", "集成目标", "错误信息或现有代码"],
    expectedOutputs: ["接入步骤", "示例代码", "错误排查清单"],
  };
}

function riskNotesForPageType(pageType: SkillOpportunityPageType): string[] {
  if (pageType === "github_repo") return ["仓库维护状态和 license 可能变化，启用 Skill 前需要保留来源回溯。"];
  if (pageType === "tutorial") return ["教程质量不稳定，生成后需要用户审查步骤是否符合当前项目版本。"];
  return ["文档版本可能更新，Skill 应保留来源 URL 以便后续重新生成。"];
}

function collectEvidenceSnippets(capture: BrowserCapture): string[] {
  const candidates = [
    capture.memory?.one_line_takeaway,
    ...(capture.memory?.key_points ?? []),
    capture.memory?.summary,
    capture.description ?? undefined,
    capture.readable_text ?? undefined,
  ];
  const snippets = candidates
    .map((value) => truncateText(value, 150))
    .filter(Boolean);
  return Array.from(new Set(snippets)).slice(0, 3);
}

function deriveSubject(capture: BrowserCapture): string {
  const entity = capture.memory?.entities.find((value) => value.trim().length > 0);
  const titleSubject = cleanupTitleSubject(capture.title);
  if (entity && titleSubject && !titleSubject.toLowerCase().includes(entity.toLowerCase())) {
    return `${entity} ${titleSubject}`;
  }
  if (titleSubject) return titleSubject;
  if (entity) return entity;
  return capture.domain || parseUrl(capture.url)?.hostname || "网页";
}

function cleanupTitleSubject(title: string): string {
  return title
    .replace(/\s*[-|–—]\s*(docs?|documentation|developer docs?|guide).*$/i, "")
    .replace(/\b(documentation|docs?|guide|tutorial)\b/gi, "")
    .replace(/^how to\s+(configure|set up|setup|build|create|use)\s+/i, "")
    .replace(/\bauthentication\b/gi, "Auth")
    .replace(/\s+/g, " ")
    .trim();
}

function githubRepoName(capture: BrowserCapture): string | null {
  const url = parseUrl(capture.url);
  if (!url || url.hostname.toLowerCase() !== "github.com") return null;
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return null;
  return `${owner}/${repo.replace(/\.git$/, "")}`;
}

function searchableText(capture: BrowserCapture): string {
  return [
    capture.url,
    capture.title,
    capture.domain,
    capture.description,
    capture.selected_text,
    capture.readable_text,
    capture.memory?.one_line_takeaway,
    capture.memory?.summary,
    ...(capture.memory?.key_points ?? []),
    ...(capture.memory?.topics ?? []),
    ...(capture.memory?.entities ?? []),
    ...(capture.memory?.keywords ?? []),
  ].filter(Boolean).join(" ");
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function truncateText(value: string | null | undefined, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
