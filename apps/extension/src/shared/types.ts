export type CaptureScope = "page" | "selection";

export interface CapturedLink {
  url: string;
  title?: string;
}

export interface BrowserCapturePayload {
  source: "extension";
  sourceType: "link" | "selection";
  captureScope: CaptureScope;
  sourceTabId?: string;
  url: string;
  title: string;
  domain?: string;
  faviconUrl?: string;
  description?: string;
  previewImageUrl?: string;
  selectedText?: string;
  readableText?: string;
  links?: CapturedLink[];
  capturedAt: string;
}

export interface ExtensionSettings {
  apiBaseUrl: string;
  workspaceSlug: string;
}

export interface CaptureResult {
  ok: boolean;
  captureId?: string;
  duplicate?: boolean;
  memoryStatus?: "pending" | "processing" | "failed" | "ready" | string;
  failureReason?: string | null;
  error?: string;
  /** 页面摘要，由 background 在采集链路回填，供 popup 渲染结果卡片与本地历史。 */
  summary?: CaptureSummary;
}

/** 采集到的页面摘要：仅含展示所需的稳定字段，不含未受信任的原始正文。 */
export interface CaptureSummary {
  title: string;
  url?: string;
  domain?: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  scope: CaptureScope;
  linkCount?: number;
  capturedAt: string;
}

/** 本地采集历史条目，持久化于 chrome.storage.local。 */
export interface HistoryItem {
  id: string;
  captureId?: string;
  title: string;
  url?: string;
  domain?: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  scope: CaptureScope;
  memoryStatus?: string;
  duplicate?: boolean;
  capturedAt: string;
}

export type PopupToBackgroundMessage =
  | { type: "capture-current-tab" }
  | { type: "save-settings"; settings: ExtensionSettings }
  | { type: "load-settings" };

export type ContentToBackgroundMessage = {
  type: "didian-page-capture";
  payload: BrowserCapturePayload;
};

export type ContentScriptMessage = { type: "didian-capture-page"; tabId?: string; faviconUrl?: string };
