import type {
  BrowserCapturePayload,
  CaptureResult,
  ExtensionSettings,
  PopupToBackgroundMessage,
} from "./shared/types";

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: "http://localhost:8080",
  workspaceSlug: "",
};

type ContentCaptureResponse =
  | { ok: true; payload: BrowserCapturePayload }
  | { ok: false; error?: string };

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function readCsrfToken(apiBaseUrl: string): Promise<string | null> {
  const cookie = await chrome.cookies.get({ url: apiBaseUrl, name: "didian_csrf" });
  return cookie?.value ?? null;
}

async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get<Partial<ExtensionSettings>>({ ...DEFAULT_SETTINGS });
  return {
    apiBaseUrl: normalizeBaseUrl(String(stored.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl)),
    workspaceSlug: String(stored.workspaceSlug || "").trim(),
  };
}

async function saveSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  const next = {
    apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl),
    workspaceSlug: settings.workspaceSlug.trim(),
  };
  await chrome.storage.sync.set(next);
  return next;
}

async function postCapture(payload: BrowserCapturePayload, settings: ExtensionSettings): Promise<CaptureResult> {
  if (!settings.workspaceSlug) return { ok: false, error: "Workspace slug is required" };
  if (!settings.apiBaseUrl) return { ok: false, error: "API base URL is required" };
  const csrfToken = await readCsrfToken(settings.apiBaseUrl);
  if (!csrfToken) return { ok: false, error: "Didian CSRF cookie not found. Log in to Didian and try again." };

  const response = await fetch(`${settings.apiBaseUrl}/api/browser-captures`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-Slug": settings.workspaceSlug,
      "X-CSRF-Token": csrfToken,
      "X-Client-Platform": "chrome-extension",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({})) as {
    captureId?: string;
    dedupe?: { isDuplicate?: boolean };
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: body.error || `Capture failed with HTTP ${response.status}` };
  }

  return {
    ok: true,
    captureId: body.captureId,
    duplicate: body.dedupe?.isDuplicate === true,
  };
}

async function captureCurrentTab(): Promise<CaptureResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab" };
  if (!tab.url?.startsWith("http://") && !tab.url?.startsWith("https://")) {
    return { ok: false, error: "Only http(s) pages can be captured" };
  }

  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  const captured = await chrome.tabs.sendMessage(tab.id, {
    type: "didian-capture-page",
    tabId: String(tab.id),
    faviconUrl: tab.favIconUrl,
  }) as ContentCaptureResponse;

  if (!captured.ok) return { ok: false, error: captured.error || "Page capture failed" };
  return postCapture(captured.payload, await loadSettings());
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as PopupToBackgroundMessage;

  if (request.type === "load-settings") {
    void loadSettings().then((settings) => sendResponse({ ok: true, settings })).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed to load settings" });
    });
    return true;
  }

  if (request.type === "save-settings") {
    void saveSettings(request.settings).then((settings) => sendResponse({ ok: true, settings })).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed to save settings" });
    });
    return true;
  }

  if (request.type === "capture-current-tab") {
    void captureCurrentTab().then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Capture failed" });
    });
    return true;
  }

  return false;
});
