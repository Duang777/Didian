import type { Issue } from "../types/issue";

export type BrowserCaptureSource = "web" | "extension" | "api" | "cli" | "rss" | "import" | "singlefile";

export type BrowserCaptureSourceType = "link" | "text" | "asset" | "selection" | "rss_item" | "imported_bookmark";

export type BrowserCaptureScope = "page" | "selection" | "tab_group" | "bookmark";

export type BrowserCaptureMemoryState = "active" | "muted" | "pinned" | "archived";

export interface BrowserCaptureLink {
  url: string;
  title?: string;
}

export interface PageMemory {
  summary: string;
  one_line_takeaway: string;
  key_points: string[];
  topics: string[];
  entities: string[];
  keywords: string[];
  status: string;
  generated_at?: string | null;
  updated_at: string;
}

export interface CreateBrowserCaptureRequest {
  source?: BrowserCaptureSource;
  sourceType?: BrowserCaptureSourceType;
  captureScope?: BrowserCaptureScope;
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
  capturedAt?: string;
}

export interface BrowserCapture {
  id: string;
  workspace_id: string;
  creator_id: string;
  source_type: BrowserCaptureSourceType;
  source: BrowserCaptureSource;
  capture_scope: BrowserCaptureScope;
  source_tab_id?: string | null;
  url: string;
  normalized_url: string;
  title: string;
  domain: string;
  favicon_url?: string | null;
  description?: string | null;
  preview_image_url?: string | null;
  selected_text?: string | null;
  readable_text?: string | null;
  links: BrowserCaptureLink[];
  status: string;
  metadata_status: string;
  archive_status: string;
  summary_status: string;
  embedding_status: string;
  memory_state: BrowserCaptureMemoryState;
  failure_reason?: string | null;
  memory?: PageMemory | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export interface BrowserCaptureDedupe {
  isDuplicate: boolean;
  existingCaptureId?: string | null;
}

export interface CreateBrowserCaptureResponse {
  capture: BrowserCapture;
  captureId: string;
  status: string;
  memoryStatus: string;
  dedupe: BrowserCaptureDedupe;
}

export interface ListBrowserCapturesResponse {
  captures: BrowserCapture[];
  total: number;
}

export interface ListBrowserCapturesParams {
  limit?: number;
  offset?: number;
  state?: BrowserCaptureMemoryState;
  q?: string;
}

export interface AnalyzeAiInboxRequest {
  input: string;
  captureIds?: string[];
}

export interface AiInboxUnderstanding {
  intent: string;
  suggestedMissionTitle: string;
  summary: string;
  suggestedOutputs: string[];
  missingInfo: string[];
  confidence: number;
}

export interface AnalyzeAiInboxResponse {
  understanding: AiInboxUnderstanding;
  provider: "local" | "llm" | string;
  model?: string;
}

export interface CreateAiInboxMissionRequest {
  title: string;
  description: string;
  understanding?: AiInboxUnderstanding;
}

export interface CreateAiInboxMissionResponse {
  issue: Issue;
  planningStatus: "queued" | "no_codex_agent" | string;
  planningAgentId?: string;
}
