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
