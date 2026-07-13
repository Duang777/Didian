import { z } from "zod";

export const AiInboxInputSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["url", "text", "file", "browser_capture"]),
  title: z.string().min(1),
  preview: z.string(),
  source: z.string().optional(),
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
  relatedAtlasIds: z.array(z.string()),
  updatedAt: z.string(),
});

export const AtlasCollectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  topic: z.string().min(1),
  sourceMissionId: z.string().min(1),
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
