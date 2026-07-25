import type { BrowserCapture as CoreBrowserCapture } from "@didian/core/browser-memory";

export type MissionState =
  | "understanding"
  | "planned"
  | "running"
  | "review"
  | "completed"
  | "needs_attention";

export type AiInboxInputKind = "url" | "text" | "file" | "browser_capture";

export type AiInboxInput = {
  id: string;
  captureId?: string;
  kind: AiInboxInputKind;
  title: string;
  preview: string;
  source?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  previewImageUrl?: string;
  faviconUrl?: string;
  enrichmentStatus?: "pending" | "processing" | "failed" | "ready";
  enrichmentLabel?: string;
  enrichmentDescription?: string;
  failureReason?: string | null;
  skillOpportunity?: SkillOpportunity | null;
  confidence: number;
};

export type SkillOpportunityPageType = "technical_doc" | "github_repo" | "tutorial" | "blog" | "paper" | "product_page" | "unknown";

export type SkillOpportunity = {
  shouldSuggest: boolean;
  confidence: number;
  pageType: SkillOpportunityPageType;
  proposedTitle: string;
  proposedCapability: string;
  whyUseful: string;
  triggerExamples: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  reusableWorkflowScore: number;
  instructionDensityScore: number;
  futureUseScore: number;
  evidenceSnippets: string[];
  riskNotes: string[];
};

export type BrowserCaptureSource = "extension" | "import" | "api";

export type BrowserCaptureSourceType = "link" | "text" | "asset" | "selection" | "rss_item" | "imported_bookmark";

export type BrowserCaptureScope = "page" | "selection" | "tab_group" | "bookmark";

export type BrowserCaptureLink = {
  url: string;
  title?: string;
};

export type BrowserCapturePayload = {
  source: BrowserCaptureSource;
  sourceType?: BrowserCaptureSourceType;
  captureScope: BrowserCaptureScope;
  sourceTabId?: string;
  url: string;
  title: string;
  domain?: string;
  faviconUrl?: string;
  description?: string;
  previewImageUrl?: string;
  selectedText?: string;
  readableText?: string;
  links?: BrowserCaptureLink[];
  capturedAt: string;
};

export type BrowserCapture = CoreBrowserCapture;

export type AiIntent =
  | "research_pack"
  | "learning_plan"
  | "collect"
  | "compare"
  | "deduplicate"
  | "summarize"
  | "monitor"
  | "diagnose"
  | "archive_only";

export type AiUnderstanding = {
  intent: AiIntent;
  suggestedMissionTitle: string;
  summary: string;
  suggestedOutputs: string[];
  missingInfo: string[];
  confidence: number;
};

export type MissionPlanStepState = "done" | "active" | "waiting" | "blocked" | "pending";

export type MissionPlanStep = {
  id: string;
  title: string;
  description: string;
  state: MissionPlanStepState;
  evidence?: string;
};

export type MissionReviewItem = {
  id: string;
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
};

export type MissionArtifact = {
  id: string;
  name: string;
  description: string;
  kind: "summary" | "table" | "index" | "report" | "markdown";
};

export type MissionView = {
  id: string;
  title: string;
  goal: string;
  state: MissionState;
  inputs: AiInboxInput[];
  understanding: AiUnderstanding;
  plan: MissionPlanStep[];
  reviewItems: MissionReviewItem[];
  artifacts: MissionArtifact[];
  relatedAtlasIds: string[];
  updatedAt: string;
};

export type AtlasEvidence = {
  id: string;
  label: string;
  source: string;
  quote: string;
};

export type AtlasRelationship = {
  id: string;
  kind: "duplicate" | "similar" | "version" | "source" | "summary_of";
  label: string;
  targetTitle: string;
};

export type AtlasResource = {
  id: string;
  title: string;
  originalTitle?: string;
  kind: "link" | "file" | "note" | "repo" | "video" | "document" | "artifact";
  sourceUrl?: string;
  summary: string;
  evidence: AtlasEvidence[];
  relationships: AtlasRelationship[];
};

export type AtlasCollection = {
  id: string;
  title: string;
  summary: string;
  topic: string;
  sourceMissionId: string;
  updatedAt: string;
  resources: AtlasResource[];
};

export type AutopilotMode = "watch" | "organize" | "clean" | "summarize" | "diagnose" | "recommend";

export type AutopilotStrategy = {
  id: string;
  goal: string;
  mode: AutopilotMode;
  trigger: string;
  conditions: string[];
  actions: string[];
  confirmationsRequired: string[];
  riskLevel: "low" | "medium" | "high";
  enabled: boolean;
  recentOutcome: string;
};

export type AiStudioRole = {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  outputs: string[];
};

export type AiStudioCapability = {
  id: string;
  name: string;
  description: string;
  appliesTo: string[];
};

export type AiStudioRecipe = {
  id: string;
  name: string;
  description: string;
  steps: string[];
  outputs: string[];
};
