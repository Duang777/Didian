import { z } from "zod";

const httpUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Expected an http(s) URL");

export const BrowserCapturePayloadSchema = z.object({
  source: z.enum(["extension", "import", "api"]),
  sourceType: z.enum(["link", "text", "asset", "selection", "rss_item", "imported_bookmark"]).optional(),
  captureScope: z.enum(["page", "selection", "tab_group", "bookmark"]),
  sourceTabId: z.string().max(128).optional(),
  url: httpUrlSchema,
  title: z.string().min(1).max(500),
  domain: z.string().max(255).optional(),
  faviconUrl: httpUrlSchema.optional(),
  description: z.string().max(2000).optional(),
  previewImageUrl: httpUrlSchema.optional(),
  selectedText: z.string().max(10_000).optional(),
  readableText: z.string().max(60_000).optional(),
  links: z.array(z.object({
    url: httpUrlSchema,
    title: z.string().max(300).optional(),
  })).max(200).optional(),
  capturedAt: z.string().datetime(),
}).strict();

export const AiInboxInputSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["url", "text", "file", "browser_capture"]),
  title: z.string().min(1),
  preview: z.string(),
  source: z.string().optional(),
  previewImageUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const AiUnderstandingSchema = z.object({
  intent: z.enum([
    "research_pack",
    "learning_plan",
    "collect",
    "compare",
    "deduplicate",
    "summarize",
    "monitor",
    "diagnose",
    "archive_only",
  ]),
  suggestedMissionTitle: z.string().min(1),
  summary: z.string().min(1),
  suggestedOutputs: z.array(z.string().min(1)),
  missingInfo: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const MissionViewSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  state: z.enum(["understanding", "planned", "running", "review", "completed", "needs_attention"]),
  inputs: z.array(AiInboxInputSchema),
  understanding: AiUnderstandingSchema,
  plan: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    state: z.enum(["done", "active", "waiting", "blocked", "pending"]),
    evidence: z.string().optional(),
  })),
  reviewItems: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    riskLevel: z.enum(["low", "medium", "high"]),
  })),
  artifacts: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    kind: z.enum(["summary", "table", "index", "report", "markdown"]),
  })),
  workspaceId: z.string().optional(),
  relatedAtlasIds: z.array(z.string()),
  updatedAt: z.string(),
});

export const AtlasWorkspaceSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  title: z.string().min(1),
  rootPath: z.string().min(1),
  summary: z.string().min(1),
  files: z.array(z.object({
    id: z.string().min(1),
    path: z.string().min(1),
    title: z.string().min(1),
    kind: z.enum(["mission", "source", "evidence", "decision", "output", "log"]),
    content: z.string(),
    readonly: z.boolean().optional(),
    sourceUrl: z.string().optional(),
    updatedAt: z.string().optional(),
  })).min(1),
  contextScopes: z.array(z.object({
    id: z.enum([
      "current_document",
      "current_workspace",
      "captured_sources",
      "workspace_outputs",
      "entire_atlas",
      "local_downloads",
      "cloud_drive_resources",
    ]),
    label: z.string().min(1),
    description: z.string().min(1),
    enabled: z.boolean(),
    filePaths: z.array(z.string()),
  })),
  updatedAt: z.string(),
});

export const AtlasCollectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  topic: z.string().min(1),
  sourceMissionId: z.string().min(1),
  workspaceId: z.string().optional(),
  updatedAt: z.string(),
  resources: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    originalTitle: z.string().optional(),
    kind: z.enum(["link", "file", "note", "repo", "video", "document", "artifact"]),
    sourceUrl: z.string().optional(),
    summary: z.string(),
    evidence: z.array(z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      source: z.string().min(1),
      quote: z.string(),
    })),
    relationships: z.array(z.object({
      id: z.string().min(1),
      kind: z.enum(["duplicate", "similar", "version", "source", "summary_of"]),
      label: z.string().min(1),
      targetTitle: z.string().min(1),
    })),
  })),
});

export const AutopilotStrategySchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1),
  mode: z.enum(["watch", "organize", "clean", "summarize", "diagnose", "recommend"]),
  trigger: z.string().min(1),
  conditions: z.array(z.string()),
  actions: z.array(z.string()),
  confirmationsRequired: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high"]),
  enabled: z.boolean(),
  recentOutcome: z.string(),
});
