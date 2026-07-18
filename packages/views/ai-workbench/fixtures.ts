import type {
  BrowserCapture,
  AiInboxInput,
  AiIntent,
  AiStudioCapability,
  AiStudioRecipe,
  AiStudioRole,
  AiUnderstanding,
  AtlasContextScope,
  AtlasCollection,
  AtlasWorkspace,
  AtlasWorkspaceFile,
  AutopilotStrategy,
  BrowserCapturePayload,
  MissionView,
} from "./types";
import { BrowserCapturePayloadSchema } from "./schemas";

export function inferAiUnderstanding(rawInput: string): AiUnderstanding {
  const normalized = rawInput.toLowerCase();
  const urlCount = (rawInput.match(/https?:\/\//g) ?? []).length;
  const hasLearning = /学习|教程|course|learn|tutorial/.test(normalized);
  const hasCompare = /对比|比较|compare|versus|vs\.?/.test(normalized);
  const hasDiagnose = /失败|错误|坏链|diagnose|failed|error/.test(normalized);
  const hasMonitor = /监控|更新|watch|monitor|weekly|每天|每周/.test(normalized);
  const hasResourceIntent = /资源|资料|链接|整理|收集|收藏|索引|agent|resource|link|collect|organize|research/.test(normalized);

  let intent: AiIntent = "collect";
  if (hasDiagnose) intent = "diagnose";
  else if (hasMonitor) intent = "monitor";
  else if (hasLearning) intent = "learning_plan";
  else if (hasCompare) intent = "compare";
  else if (urlCount === 1) intent = "summarize";
  else if (urlCount > 1 || hasResourceIntent) intent = "research_pack";

  const suggestedMissionTitle = (() => {
    if (intent === "learning_plan") return "整理学习资料路线";
    if (intent === "compare") return "生成资源对比分析";
    if (intent === "diagnose") return "诊断失败资源";
    if (intent === "monitor") return "创建资源监控策略";
    if (intent === "summarize") return "总结单个资源";
    if (intent === "collect") return "记录输入";
    return "整理 AI Agent 资源包";
  })();

  const isResourceLike = intent !== "collect";
  return {
    intent,
    suggestedMissionTitle,
    summary: urlCount > 1
      ? `检测到 ${urlCount} 个链接，适合创建一个带计划的 Mission。`
      : isResourceLike
        ? "检测到一段资源线索，可以先生成 Mission 计划再沉淀到 Atlas。"
        : "检测到一段普通输入，可以创建 Mission 继续澄清或处理。",
    suggestedOutputs: isResourceLike ? ["资源索引", "重点摘要", "相关关系", "下一步建议"] : ["任务记录", "下一步建议"],
    missingInfo: urlCount === 0 && isResourceLike ? ["如果有原始链接，补充后可以提升来源引用质量。"] : [],
    confidence: urlCount > 0 ? 0.82 : isResourceLike ? 0.68 : 0.5,
  };
}

function truncateText(value: string | undefined, maxLength: number): string {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function displaySource(payload: BrowserCapturePayload): string {
  if (payload.domain) return payload.domain;
  try {
    const url = new URL(payload.url);
    return url.host + url.pathname.replace(/\/$/, "");
  } catch {
    return payload.url;
  }
}

function browserCaptureLabel(capture: BrowserCapture): string {
  if (capture.capture_scope === "selection") return "选区收藏";
  if (capture.capture_scope === "bookmark") return "浏览器书签";
  if (capture.source === "extension") return "网页收藏";
  return "收藏";
}

function browserMemoryStatus(capture: BrowserCapture): Pick<AiInboxInput, "enrichmentStatus" | "enrichmentLabel" | "enrichmentDescription" | "failureReason"> {
  const status = capture.memory?.status;
  if (status === "ready") {
    return {
      enrichmentStatus: "ready",
      enrichmentLabel: "AI ready",
      enrichmentDescription: "已整理",
      failureReason: null,
    };
  }
  if (status === "processing") {
    return {
      enrichmentStatus: "processing",
      enrichmentLabel: "AI processing",
      enrichmentDescription: "AI 正在整理",
      failureReason: null,
    };
  }
  if (status === "failed" || capture.summary_status === "failure" || capture.status === "failed") {
    return {
      enrichmentStatus: "failed",
      enrichmentLabel: "AI failed",
      enrichmentDescription: "整理失败",
      failureReason: capture.failure_reason ?? null,
    };
  }
  return {
    enrichmentStatus: "pending",
    enrichmentLabel: "AI pending",
    enrichmentDescription: "等待整理",
    failureReason: null,
  };
}

export function browserCaptureToInboxInput(payload: BrowserCapturePayload): AiInboxInput {
  const preview = truncateText(payload.selectedText, 240)
    || truncateText(payload.description, 240)
    || truncateText(payload.readableText, 240)
    || displaySource(payload);

  return {
    id: `capture-${payload.capturedAt}-${payload.url}`,
    kind: "browser_capture",
    title: payload.title,
    preview,
    source: displaySource(payload),
    sourceUrl: payload.url,
    sourceLabel: payload.captureScope === "selection" ? "选区收藏" : "网页收藏",
    previewImageUrl: payload.previewImageUrl,
    faviconUrl: payload.faviconUrl,
    confidence: payload.selectedText || payload.readableText ? 0.9 : 0.72,
  };
}

export function browserCaptureRecordToInboxInput(capture: BrowserCapture): AiInboxInput {
  const memoryStatus = browserMemoryStatus(capture);
  const preview = truncateText(capture.memory?.one_line_takeaway, 240)
    || truncateText(capture.memory?.summary, 240)
    || truncateText(capture.selected_text ?? undefined, 240)
    || truncateText(capture.description ?? undefined, 240)
    || truncateText(capture.readable_text ?? undefined, 240)
    || capture.domain
    || capture.normalized_url
    || capture.url;

  return {
    id: `capture-${capture.id}`,
    captureId: capture.id,
    kind: "browser_capture",
    title: capture.title || capture.normalized_url || capture.url,
    preview,
    source: capture.domain || displaySource({
      source: "extension",
      captureScope: "page",
      url: capture.url,
      title: capture.title || capture.url,
      capturedAt: capture.captured_at || capture.created_at || new Date(0).toISOString(),
    }),
    sourceUrl: capture.url,
    sourceLabel: browserCaptureLabel(capture),
    previewImageUrl: capture.preview_image_url ?? undefined,
    faviconUrl: capture.favicon_url ?? undefined,
    ...memoryStatus,
    confidence: capture.selected_text || capture.readable_text ? 0.9 : 0.72,
  };
}

export function parseBrowserCaptureInboxInput(rawPayload: unknown): AiInboxInput {
  return browserCaptureToInboxInput(BrowserCapturePayloadSchema.parse(rawPayload));
}

export const demoBrowserCapturePayload: BrowserCapturePayload = {
  source: "extension",
  captureScope: "page",
  url: "https://github.com/karakeep-app/karakeep",
  title: "Karakeep GitHub",
  domain: "github.com/karakeep-app/karakeep",
  faviconUrl: "https://github.com/favicon.ico",
  description: "A self-hostable bookmark-everything app with AI-powered tagging and full-text search.",
  previewImageUrl: "https://opengraph.githubassets.com/example/karakeep-app/karakeep",
  selectedText: "A self-hostable bookmark-everything app with AI-powered tagging and full-text search.",
  readableText: "Karakeep is a bookmark manager that can save links, text and assets, then enrich them with summaries and tags.",
  links: [
    { url: "https://github.com/karakeep-app/karakeep", title: "Repository" },
  ],
  capturedAt: "2026-07-14T02:40:00.000Z",
};

export const demoInboxInputs: AiInboxInput[] = [
  browserCaptureToInboxInput(demoBrowserCapturePayload),
  {
    id: "input-browser-use",
    kind: "url",
    title: "browser-use GitHub",
    preview: "Open-source browser automation agent project.",
    source: "github.com/browser-use/browser-use",
    confidence: 0.92,
  },
  {
    id: "input-stagehand",
    kind: "url",
    title: "Stagehand documentation",
    preview: "Browser automation docs and examples for AI agents.",
    source: "docs.stagehand.dev",
    confidence: 0.87,
  },
  {
    id: "input-note",
    kind: "text",
    title: "用户目标",
    preview: "帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。",
    confidence: 0.78,
  },
];

export const demoUnderstanding = inferAiUnderstanding(
  "https://github.com/browser-use/browser-use https://docs.stagehand.dev 帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。",
);

export const demoMissions: MissionView[] = [
  {
    id: "mission-ai-agent-pack",
    title: "整理 AI Agent 学习资料包",
    goal: "把浏览器自动化和 AI Agent 相关资源整理成可学习、可追问、可持续更新的资料包。",
    state: "review",
    inputs: demoInboxInputs,
    understanding: demoUnderstanding,
    plan: [
      { id: "scan", title: "识别输入", description: "提取链接、文本目标和资源类型。", state: "done", evidence: "识别到 GitHub、Docs 和学习目标。" },
      { id: "cluster", title: "组织主题", description: "按入门、工具和实战项目聚类。", state: "done", evidence: "browser-use 和 Stagehand 均属于工具/实战主题。" },
      { id: "review", title: "等待确认", description: "确认是否创建 Atlas Collection 和周期摘要策略。", state: "active" },
      { id: "save", title: "沉淀到 Atlas", description: "确认后生成资源索引、摘要和关系。", state: "pending" },
    ],
    reviewItems: [
      {
        id: "review-create-atlas",
        title: "创建 Atlas Collection",
        description: "将 3 条输入整理为 AI Agent 学习资料包，并保留来源证据。",
        riskLevel: "low",
      },
    ],
    artifacts: [
      { id: "artifact-index", name: "资源索引", description: "按主题整理的入口索引。", kind: "index" },
      { id: "artifact-plan", name: "两周学习路线", description: "按概念、工具、实战安排学习顺序。", kind: "report" },
    ],
    workspaceId: "workspace-ai-agent-pack",
    relatedAtlasIds: ["atlas-ai-agent-learning"],
    updatedAt: "刚刚",
  },
  {
    id: "mission-broken-links",
    title: "诊断失败资源",
    goal: "解释一组资源链接无法打开的原因并给出替代动作。",
    state: "needs_attention",
    inputs: [],
    understanding: inferAiUnderstanding("这些下载链接失败了，帮我诊断原因"),
    plan: [
      { id: "check", title: "检查失败原因", description: "识别坏链、权限不足和来源失效。", state: "blocked", evidence: "缺少可访问源链接。" },
    ],
    reviewItems: [],
    artifacts: [],
    relatedAtlasIds: [],
    updatedAt: "12 分钟前",
  },
];

export function missionToAtlasWorkspace(mission: MissionView): AtlasWorkspace {
  const sourceFiles = mission.inputs.map((input) => sourceInputToWorkspaceFile(input));
  const outputFiles = defaultWorkspaceOutputFiles(mission);
  const files: AtlasWorkspaceFile[] = [
    {
      id: `${mission.id}-mission-md`,
      path: "mission.md",
      title: "mission.md",
      kind: "mission",
      content: missionDocumentContent(mission),
      updatedAt: mission.updatedAt,
    },
    ...sourceFiles,
    {
      id: `${mission.id}-evidence-md`,
      path: "evidence.md",
      title: "evidence.md",
      kind: "evidence",
      content: evidenceDocumentContent(mission),
      readonly: true,
      updatedAt: mission.updatedAt,
    },
    {
      id: `${mission.id}-decisions-md`,
      path: "decisions.md",
      title: "decisions.md",
      kind: "decision",
      content: decisionsDocumentContent(mission),
      updatedAt: mission.updatedAt,
    },
    ...outputFiles,
    {
      id: `${mission.id}-agent-log-md`,
      path: "agent-log.md",
      title: "agent-log.md",
      kind: "log",
      content: agentLogDocumentContent(mission),
      readonly: true,
      updatedAt: mission.updatedAt,
    },
  ];

  return {
    id: mission.workspaceId ?? `workspace-${mission.id}`,
    missionId: mission.id,
    title: mission.title,
    rootPath: workspaceRootPath(mission),
    summary: "这个 Atlas Workspace 保存 Mission 目标、来源、证据、决策和可写回产物，供 Codex 或其他 Agent 后续继续工作。",
    files,
    contextScopes: defaultWorkspaceContextScopes(files),
    updatedAt: mission.updatedAt,
  };
}

function workspaceRootPath(mission: MissionView) {
  if (mission.id === "mission-ai-agent-pack") return "AI Agent 项目调研";
  return mission.title.replace(/[\\/:*?\"<>|]/g, " ").replace(/\s+/g, " ").trim() || "Mission Workspace";
}

function sourceInputToWorkspaceFile(input: MissionView["inputs"][number]): AtlasWorkspaceFile {
  const basename = sourceFileBasename(input);
  return {
    id: `source-${input.id}`,
    path: `sources/${basename}.md`,
    title: `${basename}.md`,
    kind: "source",
    content: [
      `# ${input.title}`,
      "",
      "## 来源",
      input.sourceUrl ? `- URL: ${input.sourceUrl}` : input.source ? `- 来源: ${input.source}` : "- 来源: 用户输入",
      input.sourceLabel ? `- 类型: ${input.sourceLabel}` : `- 类型: ${input.kind}`,
      `- 置信度: ${Math.round(input.confidence * 100)}%`,
      "",
      "## 摘要",
      input.preview,
      "",
      "## Agent 备注",
      "保留原始上下文，后续分析必须引用本来源或说明为什么不采用。",
    ].join("\n"),
    readonly: true,
    sourceUrl: input.sourceUrl,
  };
}

function sourceFileBasename(input: MissionView["inputs"][number]) {
  if (input.source?.includes("browser-use")) return "browser-use";
  if (input.source?.includes("stagehand")) return "stagehand";
  if (input.kind === "text") return "用户目标";
  const source = input.sourceUrl ?? input.source ?? input.title;
  try {
    const url = new URL(source);
    const pathParts = url.pathname.split("/").filter(Boolean);
    return sanitizeWorkspaceBasename(pathParts.at(-1) || url.hostname);
  } catch {
    return sanitizeWorkspaceBasename(input.title);
  }
}

function sanitizeWorkspaceBasename(value: string) {
  return value.replace(/\.md$/i, "").replace(/[\\/:*?\"<>|#\[\]()]/g, " ").replace(/\s+/g, " ").trim() || "source";
}

function missionDocumentContent(mission: MissionView) {
  return [
    `# ${mission.title}`,
    "",
    "## Agent 工作目标",
    mission.goal,
    "",
    "## AI 理解",
    `- 意图: ${mission.understanding.intent}`,
    `- 摘要: ${mission.understanding.summary}`,
    `- 置信度: ${Math.round(mission.understanding.confidence * 100)}%`,
    "",
    "## Workspace 使用方式",
    "- 先阅读 `sources/` 和 `evidence.md`。",
    "- 需要用户确认的动作写入 `decisions.md`。",
    "- 可交付内容写入 `outputs/`。",
    "- 所有结论保留来源引用，不要把聊天回答停留在临时对话里。",
    "",
    "## Mission Plan",
    ...mission.plan.map((step, index) => `${index + 1}. ${step.title} - ${step.description}`),
    "",
    "## 预期产出",
    ...workspaceOutputNames().map((name) => `- outputs/${name}.md`),
  ].join("\n");
}

function evidenceDocumentContent(mission: MissionView) {
  const evidence = mission.plan.flatMap((step) => step.evidence ? [`- ${step.title}: ${step.evidence}`] : []);
  return [
    `# ${mission.title} / Evidence`,
    "",
    evidence.length > 0 ? evidence.join("\n") : "- 暂无证据，Agent 需要先读取来源。",
    "",
    "## 来源索引",
    ...mission.inputs.map((input) => `- ${input.title}: ${input.sourceUrl ?? input.source ?? "用户输入"}`),
  ].join("\n");
}

function decisionsDocumentContent(mission: MissionView) {
  return [
    `# ${mission.title} / Decisions`,
    "",
    mission.reviewItems.length > 0 ? mission.reviewItems.map((item) => `- [ ] ${item.title}: ${item.description}`).join("\n") : "暂无待确认决策。",
    "",
    "## 安全边界",
    "- 允许创建 Markdown 产物。",
    "- 允许保存链接副本。",
    "- 删除、覆盖、批量移动必须进入 Review。",
  ].join("\n");
}

function agentLogDocumentContent(mission: MissionView) {
  return [
    `# ${mission.title} / Agent Log`,
    "",
    ...mission.plan.map((step) => `- ${step.state}: ${step.title}`),
    "",
    "后续真实 Codex Runtime 日志会追加到这里。",
  ].join("\n");
}

function defaultWorkspaceOutputFiles(mission: MissionView): AtlasWorkspaceFile[] {
  return workspaceOutputNames().map((name) => ({
    id: `${mission.id}-output-${name}`,
    path: `outputs/${name}.md`,
    title: `${name}.md`,
    kind: "output",
    content: outputDocumentContent(name, mission),
    updatedAt: mission.updatedAt,
  }));
}

function workspaceOutputNames() {
  return ["资源索引", "项目对比表", "可复用清单", "下一步行动"];
}

function outputDocumentContent(name: string, mission: MissionView) {
  if (name === "资源索引") {
    return [
      "# 资源索引",
      "",
      ...mission.inputs.map((input) => `- [${input.title}](${input.sourceUrl ?? input.source ?? "#"}) - ${input.preview}`),
    ].join("\n");
  }
  if (name === "项目对比表") {
    return [
      "# 项目对比表",
      "",
      "| 项目 | 类型 | 可复用点 | 来源 |",
      "| --- | --- | --- | --- |",
      ...mission.inputs.filter((input) => input.kind !== "text").map((input) => `| ${input.title} | ${input.kind} | 待 Agent 补充 | ${input.sourceUrl ?? input.source ?? "-"} |`),
    ].join("\n");
  }
  if (name === "可复用清单") {
    return "# 可复用清单\n\n- [ ] 提取可复用前端组件。\n- [ ] 提取可复用浏览器自动化方案。\n- [ ] 标记许可证和商业化风险。";
  }
  return "# 下一步行动\n\n1. 补齐每个来源的证据引用。\n2. 完成项目对比表。\n3. 根据 Review 结果写入 Atlas。";
}

function defaultWorkspaceContextScopes(files: AtlasWorkspaceFile[]): AtlasContextScope[] {
  const sourcePaths = files.filter((file) => file.kind === "source").map((file) => file.path);
  const outputPaths = files.filter((file) => file.kind === "output").map((file) => file.path);
  return [
    { id: "current_document", label: "当前文档", description: "只把当前打开的 Markdown 交给 Agent。", enabled: true, filePaths: ["mission.md"] },
    { id: "current_workspace", label: "当前 Workspace", description: "包含 Mission、证据、决策、日志和产物。", enabled: true, filePaths: files.map((file) => file.path) },
    { id: "captured_sources", label: "已捕获来源", description: "允许 Agent 使用 sources/ 下的网页、文档和用户目标。", enabled: true, filePaths: sourcePaths },
    { id: "workspace_outputs", label: "Workspace Outputs", description: "允许 Agent 读取和更新 outputs/ 下的产物。", enabled: true, filePaths: outputPaths },
    { id: "entire_atlas", label: "整个 Atlas", description: "允许 Agent 参考其它 Collection 和历史 Mission。", enabled: false, filePaths: [] },
    { id: "local_downloads", label: "本地下载目录", description: "允许 Agent 读取用户授权的本地下载目录。", enabled: false, filePaths: [] },
    { id: "cloud_drive_resources", label: "云盘已有资源", description: "允许 Agent 和云盘 Adapter 比对已有资源。", enabled: false, filePaths: [] },
  ];
}

export const demoAtlasWorkspaces: AtlasWorkspace[] = [missionToAtlasWorkspace(demoMissions[0]!)];

export const demoAtlasCollections: AtlasCollection[] = [
  {
    id: "atlas-ai-agent-learning",
    title: "AI Agent 学习资料包",
    summary: "围绕浏览器自动化 Agent 的入门、工具和实战资源合集，适合形成两周学习路线。",
    topic: "AI Agent / Browser Automation",
    sourceMissionId: "mission-ai-agent-pack",
    workspaceId: "workspace-ai-agent-pack",
    updatedAt: "刚刚",
    resources: [
      {
        id: "resource-browser-use",
        title: "browser-use 项目",
        originalTitle: "browser-use/browser-use",
        kind: "repo",
        sourceUrl: "https://github.com/browser-use/browser-use",
        summary: "用于浏览器自动化 Agent 的开源项目，适合作为实战参考。",
        evidence: [
          { id: "ev-browser-use", label: "GitHub", source: "github.com", quote: "仓库标题和 README 指向浏览器自动化 Agent。" },
        ],
        relationships: [
          { id: "rel-stagehand", kind: "similar", label: "同属浏览器自动化工具", targetTitle: "Stagehand documentation" },
        ],
      },
      {
        id: "resource-stagehand",
        title: "Stagehand 文档",
        kind: "document",
        sourceUrl: "https://docs.stagehand.dev",
        summary: "浏览器控制和示例文档，可用于比较不同 Agent 浏览器控制方案。",
        evidence: [
          { id: "ev-stagehand", label: "Docs", source: "docs.stagehand.dev", quote: "文档包含 examples 和 browser automation API。" },
        ],
        relationships: [
          { id: "rel-browser-use", kind: "similar", label: "可用于工具对比", targetTitle: "browser-use 项目" },
        ],
      },
    ],
  },
];

export const demoRoles: AiStudioRole[] = [
  { id: "role-detective", name: "资源侦探", description: "识别输入类型、来源可信度和用户意图。", bestFor: ["AI Inbox", "Atlas"], outputs: ["输入理解", "来源摘要"] },
  { id: "role-organizer", name: "整理助手", description: "把资源组织成 Collection、索引和学习路线。", bestFor: ["Missions", "Atlas"], outputs: ["资源索引", "主题合集"] },
  { id: "role-diagnostician", name: "失败诊断师", description: "解释坏链、权限和节点失败。", bestFor: ["Missions"], outputs: ["诊断卡", "修复建议"] },
];

export const demoCapabilities: AiStudioCapability[] = [
  { id: "cap-link", name: "链接分类", description: "判断 URL 是仓库、文档、视频还是下载线索。", appliesTo: ["URL", "browser_capture"] },
  { id: "cap-summary", name: "摘要生成", description: "为资源和 Collection 生成简短摘要。", appliesTo: ["document", "repo", "note"] },
  { id: "cap-dedupe", name: "重复检测", description: "发现相似、重复或不同版本资源。", appliesTo: ["Atlas", "Missions"] },
];

export const demoRecipes: AiStudioRecipe[] = [
  { id: "recipe-learning", name: "学习路线配方", description: "把教程、文档和项目组织成阶段化学习路径。", steps: ["识别资源", "聚类主题", "排序难度", "生成路线"], outputs: ["学习计划", "资源索引"] },
  { id: "recipe-compare", name: "开源项目对比配方", description: "比较多个项目的定位、成熟度和可复用点。", steps: ["读取来源", "提取指标", "生成对比", "标出风险"], outputs: ["对比表", "复用建议"] },
];

export const demoAutopilotStrategies: AutopilotStrategy[] = [
  {
    id: "strategy-weekly-ai-agent",
    goal: "每周整理新增 AI Agent 学习资源并生成摘要。",
    mode: "summarize",
    trigger: "每周一 09:00 或 Atlas Collection 有新增资源时",
    conditions: ["主题包含 AI Agent", "资源类型为文档、仓库或视频"],
    actions: ["更新 Collection", "生成本周新增摘要", "标出需要人工确认的重复资源"],
    confirmationsRequired: ["合并重复资源", "删除或隐藏低质量资源"],
    riskLevel: "medium",
    enabled: false,
    recentOutcome: "预览策略，尚未启用。",
  },
];
