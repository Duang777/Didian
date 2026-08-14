import type {
  BrowserCapturePayload,
  CaptureResult,
  ExtensionSettings,
  PopupToBackgroundMessage,
} from "./shared/types";

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: "http://localhost:18957",
  workspaceSlug: "didian-submission-demo",
  authToken: "",
};

const LEGACY_LOCAL_API_URLS = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:13877",
  "http://127.0.0.1:13877",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const LEGACY_WORKSPACE_SLUGS = new Set(["", "duang-test", "didian-test"]);

type ContentCaptureResponse =
  | { ok: true; payload: BrowserCapturePayload }
  | { ok: false; error?: string };

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get<Partial<ExtensionSettings>>({ ...DEFAULT_SETTINGS });
  const loaded = {
    apiBaseUrl: normalizeBaseUrl(String(stored.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl)),
    workspaceSlug: String(stored.workspaceSlug || DEFAULT_SETTINGS.workspaceSlug).trim(),
    authToken: String(stored.authToken || "").trim(),
  };
  const migrated = {
    apiBaseUrl: LEGACY_LOCAL_API_URLS.has(loaded.apiBaseUrl) ? DEFAULT_SETTINGS.apiBaseUrl : loaded.apiBaseUrl,
    workspaceSlug: LEGACY_WORKSPACE_SLUGS.has(loaded.workspaceSlug) ? DEFAULT_SETTINGS.workspaceSlug : loaded.workspaceSlug,
    authToken: loaded.authToken,
  };
  if (migrated.apiBaseUrl !== loaded.apiBaseUrl || migrated.workspaceSlug !== loaded.workspaceSlug) {
    await chrome.storage.sync.set(migrated);
    return migrated;
  }
  return loaded;
}

async function saveSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get<Partial<ExtensionSettings>>({ ...DEFAULT_SETTINGS });
  const next = {
    apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl),
    workspaceSlug: settings.workspaceSlug.trim(),
    authToken: String(settings.authToken ?? stored.authToken ?? "").trim(),
  };
  await chrome.storage.sync.set(next);
  return next;
}

async function issueDemoToken(apiBaseUrl: string): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/demo`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Client-Platform": "chrome-extension",
    },
  });
  const body = await response.json().catch(() => ({})) as { token?: string; error?: string };
  if (!response.ok || !body.token) {
    throw new Error(body.error || `Demo login failed with HTTP ${response.status}`);
  }
  return body.token;
}

async function ensureAuthToken(settings: ExtensionSettings): Promise<string> {
  if (settings.authToken) return settings.authToken;
  const token = await issueDemoToken(settings.apiBaseUrl);
  await chrome.storage.sync.set({ ...settings, authToken: token });
  return token;
}

async function postCapture(payload: BrowserCapturePayload, settings: ExtensionSettings): Promise<CaptureResult> {
  if (!settings.workspaceSlug) return { ok: false, error: "Workspace slug is required. For the local demo, use didian-submission-demo." };
  if (!settings.apiBaseUrl) return { ok: false, error: "API base URL is required. For the local demo, use http://localhost:18957." };

  let authToken: string;
  try {
    authToken = await ensureAuthToken(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo login failed";
    return { ok: false, error: `Cannot log in to the Didian demo at ${settings.apiBaseUrl}. ${message}` };
  }

  let response: Response;
  try {
    response = await fetch(`${settings.apiBaseUrl}/api/browser-captures`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "X-Workspace-Slug": settings.workspaceSlug,
        "X-Client-Platform": "chrome-extension",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    return {
      ok: false,
      error: `Cannot reach Didian API at ${settings.apiBaseUrl}. Start the local desktop service, then reload this extension. ${message}`,
    };
  }

  const body = await response.json().catch(() => ({})) as {
    captureId?: string;
    memoryStatus?: string;
    capture?: { memory?: { status?: string }; failure_reason?: string | null };
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
    memoryStatus: body.capture?.memory?.status || body.memoryStatus,
    failureReason: body.capture?.failure_reason ?? null,
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
  const result = await postCapture(captured.payload, await loadSettings());
  return {
    ...result,
    summary: result.ok
      ? {
          title: captured.payload.title,
          url: captured.payload.url,
          domain: captured.payload.domain,
          faviconUrl: captured.payload.faviconUrl,
          previewImageUrl: captured.payload.previewImageUrl,
          scope: captured.payload.captureScope,
          linkCount: captured.payload.links?.length,
          capturedAt: captured.payload.capturedAt,
        }
      : undefined,
  };
}

async function detectSelection(tabId: number): Promise<boolean> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const sel = (window.getSelection?.()?.toString() ?? "").trim();
        return sel.length > 0;
      },
    });
    const first = results?.[0];
    return typeof first?.result === "boolean" ? first.result : false;
  } catch {
    return false;
  }
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

  if (request.type === "detect-selection") {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const hasSelection = tab?.id ? await detectSelection(tab.id) : false;
      sendResponse({ hasSelection });
    })();
    return true;
  }

  return false;
});
