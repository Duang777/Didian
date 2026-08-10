import type { CaptureResult, ExtensionSettings, HistoryItem } from "../shared/types";
import { el, clear, faviconImg, formatRelativeTime } from "./dom";

type ThemePref = "light" | "dark" | "system";
type MessageTone = "neutral" | "success" | "error" | "pending" | "processing";

const MAX_HISTORY = 8;
const THEME_KEY = "theme";
const HISTORY_KEY = "history";
const THEME_ORDER: ThemePref[] = ["light", "dark", "system"];
const THEME_GLYPH: Record<ThemePref, string> = { light: "☀", dark: "☾", system: "◐" };

function ref<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

const els = {
  themeToggle: ref<HTMLButtonElement>("theme-toggle"),
  emptyState: ref<HTMLElement>("empty-state"),
  emptySettings: ref<HTMLButtonElement>("empty-settings"),
  captureZone: ref<HTMLElement>("capture-zone"),
  captureButton: ref<HTMLButtonElement>("capture-current-tab"),
  resultSlot: ref<HTMLElement>("result-slot"),
  history: ref<HTMLElement>("history"),
  historyToggle: ref<HTMLButtonElement>("history-toggle"),
  historyList: ref<HTMLUListElement>("history-list"),
  settingsDrawer: ref<HTMLElement>("settings-drawer"),
  settingsForm: ref<HTMLFormElement>("settings-form"),
  apiBaseUrl: ref<HTMLInputElement>("api-base-url"),
  workspaceSlug: ref<HTMLInputElement>("workspace-slug"),
  saveSettings: ref<HTMLButtonElement>("save-settings"),
  statusDot: ref<HTMLSpanElement>("status-dot"),
  message: ref<HTMLSpanElement>("message"),
  settingsToggle: ref<HTMLButtonElement>("settings-toggle"),
};

function sendMessage<T>(payload: unknown): Promise<T> {
  return chrome.runtime.sendMessage(payload) as Promise<T>;
}

function getLocal<T>(key: string): Promise<T | undefined> {
  return chrome.storage.local.get([key]).then((res) => (res[key] as T | undefined) ?? undefined);
}

function setLocal(key: string, value: unknown): Promise<void> {
  return chrome.storage.local.set({ [key]: value });
}

// ---------- Theme ----------
function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return pref;
}

function applyTheme(pref: ThemePref): void {
  document.documentElement.dataset.theme = resolveTheme(pref);
  els.themeToggle.textContent = THEME_GLYPH[pref];
  els.themeToggle.dataset.theme = pref;
  els.themeToggle.setAttribute("aria-label", `Theme: ${pref}`);
}

async function initTheme(): Promise<void> {
  const pref = (await getLocal<ThemePref>(THEME_KEY)) ?? "system";
  applyTheme(pref);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    void getLocal<ThemePref>(THEME_KEY).then((p) => {
      if ((p ?? "system") === "system") applyTheme("system");
    });
  });
  els.themeToggle.addEventListener("click", async () => {
    const current = (await getLocal<ThemePref>(THEME_KEY)) ?? "system";
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length] ?? "system";
    await setLocal(THEME_KEY, next);
    applyTheme(next);
  });
}

// ---------- Status ----------
function setStatus(text: string, tone: MessageTone = "neutral"): void {
  els.message.textContent = text;
  els.message.dataset.tone = tone;
  els.statusDot.dataset.tone = tone === "neutral" ? "ready" : tone;
}

// ---------- Settings + connection state ----------
function readSettings(): ExtensionSettings {
  return {
    apiBaseUrl: els.apiBaseUrl.value.trim(),
    workspaceSlug: els.workspaceSlug.value.trim(),
  };
}

function openSettings(): void {
  els.settingsDrawer.hidden = false;
  els.apiBaseUrl.focus();
}

function closeSettings(): void {
  els.settingsDrawer.hidden = true;
}

function refreshConnectionState(): void {
  const connected = els.workspaceSlug.value.trim().length > 0;
  els.emptyState.hidden = connected;
  els.captureZone.hidden = !connected;
  els.history.hidden = !connected;
}

async function loadSettings(): Promise<void> {
  const res = await sendMessage<{ ok: boolean; settings?: ExtensionSettings; error?: string }>({ type: "load-settings" });
  if (!res.ok || !res.settings) {
    setStatus(res.error || "Failed to load settings", "error");
    return;
  }
  els.apiBaseUrl.value = res.settings.apiBaseUrl;
  els.workspaceSlug.value = res.settings.workspaceSlug;
  refreshConnectionState();
}

async function saveSettings(): Promise<void> {
  const res = await sendMessage<{ ok: boolean; settings?: ExtensionSettings; error?: string }>({
    type: "save-settings",
    settings: readSettings(),
  });
  if (!res.ok) {
    setStatus(res.error || "Failed to save settings", "error");
    return;
  }
  setStatus("Settings saved", "success");
  closeSettings();
  refreshConnectionState();
}

// ---------- Capture ----------
function memoryTone(status?: string): MessageTone {
  if (status === "failed") return "error";
  if (status === "processing") return "processing";
  if (status === "pending") return "pending";
  return "success";
}

function statusLabel(result: CaptureResult): { text: string; tone: MessageTone } {
  const base = result.duplicate ? "Already saved." : "Captured.";
  switch (result.memoryStatus) {
    case "ready":
      return { text: `${base} AI enrichment ready.`, tone: "success" };
    case "processing":
      return { text: `${base} AI is organizing it.`, tone: "processing" };
    case "failed":
      return { text: result.failureReason ? `${base} Failed: ${result.failureReason}` : `${base} Failed.`, tone: "error" };
    case "pending":
      return { text: `${base} Waiting for AI.`, tone: "pending" };
    default:
      return { text: result.duplicate ? "Already saved in Didian." : "Captured in Didian.", tone: "success" };
  }
}

function safeThumb(url: string | undefined): HTMLElement {
  if (url && /^https?:\/\//i.test(url)) {
    return el("img", { class: "result-thumb", attrs: { src: url, alt: "", width: "40", height: "40" } });
  }
  return el("div", { class: "result-thumb" });
}

function renderResultCard(result: CaptureResult): void {
  if (!result.ok || !result.summary) return;
  const s = result.summary;

  const title = el("div", { class: "result-title", text: s.title, title: s.title });
  const meta = el("div", { class: "result-meta" }, [
    faviconImg(s.faviconUrl, s.title, 14),
    el("span", { class: "result-domain", text: s.domain ?? "" }),
  ]);
  const body = el("div", { class: "result-body" }, [title, meta]);

  const tags = el("div", { class: "result-tags" });
  tags.append(el("span", { class: "tag", text: s.scope === "selection" ? "Selection" : "Page" }));
  if (typeof s.linkCount === "number") tags.append(el("span", { class: "tag", text: `${s.linkCount} links` }));
  const tone = result.duplicate ? "duplicate" : memoryTone(result.memoryStatus);
  const toneText = result.duplicate ? "Saved" : (result.memoryStatus ?? "done");
  tags.append(el("span", { class: "status-badge", dataset: { tone }, text: toneText }));
  body.append(tags);

  const card = el("div", { class: "result-card" }, [safeThumb(s.previewImageUrl), body]);
  clear(els.resultSlot);
  els.resultSlot.append(card);
}

// ---------- History ----------
async function loadHistory(): Promise<HistoryItem[]> {
  return (await getLocal<HistoryItem[]>(HISTORY_KEY)) ?? [];
}

function renderHistory(items: HistoryItem[]): void {
  clear(els.historyList);
  if (items.length === 0) {
    els.historyList.append(el("li", { class: "history-empty", text: "No captures yet." }));
    return;
  }
  for (const item of items) {
    const main = el("div", { class: "history-item-main" }, [
      el("div", { class: "history-item-title", text: item.title, title: item.title }),
      el("div", {
        class: "history-item-sub",
        text: item.domain ? `${item.domain} · ${formatRelativeTime(item.capturedAt)}` : formatRelativeTime(item.capturedAt),
      }),
    ]);
    const tone = item.duplicate ? "duplicate" : (item.memoryStatus ?? "ready");
    const dot = el("span", { class: "history-dot", dataset: { tone } });
    const li = el("li", { class: "history-item" }, [faviconImg(item.faviconUrl, item.title, 16), main, dot]);
    if (item.url && /^https?:\/\//i.test(item.url)) {
      const target = item.url;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => void chrome.tabs.create({ url: target }));
    }
    els.historyList.append(li);
  }
}

async function pushHistory(result: CaptureResult): Promise<void> {
  if (!result.summary) return;
  const s = result.summary;
  const item: HistoryItem = {
    id: result.captureId ?? `local-${Date.now()}`,
    captureId: result.captureId,
    title: s.title,
    url: s.url,
    domain: s.domain,
    faviconUrl: s.faviconUrl,
    previewImageUrl: s.previewImageUrl,
    scope: s.scope,
    memoryStatus: result.memoryStatus,
    duplicate: result.duplicate,
    capturedAt: s.capturedAt,
  };
  const items = await loadHistory();
  const next = [item, ...items.filter((i) => i.id !== item.id)].slice(0, MAX_HISTORY);
  await setLocal(HISTORY_KEY, next);
  renderHistory(next);
}

// ---------- Wiring ----------
function wireEvents(): void {
  els.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    void saveSettings();
  });
  els.emptySettings.addEventListener("click", openSettings);
  els.settingsToggle.addEventListener("click", () => {
    if (els.settingsDrawer.hidden) openSettings();
    else closeSettings();
  });
  els.historyToggle.addEventListener("click", () => {
    const willHide = !els.historyList.hidden;
    els.historyList.hidden = willHide;
    els.historyToggle.textContent = willHide ? "Show" : "Hide";
    els.historyToggle.setAttribute("aria-expanded", String(!willHide));
  });
  els.captureButton.addEventListener("click", () => {
    els.captureButton.classList.add("is-loading");
    els.captureButton.append(el("span", { class: "spinner" }));
    setStatus("Capturing…", "processing");
    void (async () => {
      const result = await sendMessage<CaptureResult>({ type: "capture-current-tab" });
      if (!result.ok) throw new Error(result.error || "Capture failed");
      renderResultCard(result);
      await pushHistory(result);
      const label = statusLabel(result);
      setStatus(label.text, label.tone);
    })()
      .catch((err) => setStatus(err instanceof Error ? err.message : "Capture failed", "error"))
      .finally(() => {
        els.captureButton.classList.remove("is-loading");
        els.captureButton.querySelector(".spinner")?.remove();
      });
  });
}

async function init(): Promise<void> {
  await initTheme();
  await loadSettings();
  const history = await loadHistory();
  renderHistory(history);
  wireEvents();
}

void init().catch((err) => setStatus(err instanceof Error ? err.message : "Initialization failed", "error"));
