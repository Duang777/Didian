import type { CaptureResult, ExtensionSettings } from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const apiBaseUrlInput = document.querySelector<HTMLInputElement>("#api-base-url");
const workspaceSlugInput = document.querySelector<HTMLInputElement>("#workspace-slug");
const captureButton = document.querySelector<HTMLButtonElement>("#capture-current-tab");
const message = document.querySelector<HTMLParagraphElement>("#message");
const statusPill = document.querySelector<HTMLSpanElement>("#status-pill");

function requireElement<T>(value: T | null, name: string): T {
  if (!value) throw new Error(`${name} not found`);
  return value;
}

const ui = {
  form: requireElement(form, "settings form"),
  apiBaseUrlInput: requireElement(apiBaseUrlInput, "api base URL input"),
  workspaceSlugInput: requireElement(workspaceSlugInput, "workspace slug input"),
  captureButton: requireElement(captureButton, "capture button"),
  message: requireElement(message, "message"),
  statusPill: requireElement(statusPill, "status pill"),
};

function setMessage(text: string, tone: "neutral" | "success" | "error" = "neutral") {
  ui.message.textContent = text;
  ui.message.dataset.tone = tone;
  ui.statusPill.textContent = tone === "error" ? "Error" : tone === "success" ? "Saved" : "Ready";
}

function readSettings(): ExtensionSettings {
  return {
    apiBaseUrl: ui.apiBaseUrlInput.value.trim(),
    workspaceSlug: ui.workspaceSlugInput.value.trim(),
  };
}

async function sendMessage<T>(payload: unknown): Promise<T> {
  return chrome.runtime.sendMessage(payload) as Promise<T>;
}

async function loadSettings() {
  const response = await sendMessage<{ ok: boolean; settings?: ExtensionSettings; error?: string }>({ type: "load-settings" });
  if (!response.ok || !response.settings) throw new Error(response.error || "Failed to load settings");
  ui.apiBaseUrlInput.value = response.settings.apiBaseUrl;
  ui.workspaceSlugInput.value = response.settings.workspaceSlug;
}

ui.form.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    const response = await sendMessage<{ ok: boolean; settings?: ExtensionSettings; error?: string }>({
      type: "save-settings",
      settings: readSettings(),
    });
    if (!response.ok) throw new Error(response.error || "Failed to save settings");
    setMessage("Settings saved.", "success");
  })().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to save settings", "error"));
});

ui.captureButton.addEventListener("click", () => {
  ui.captureButton.disabled = true;
  setMessage("Capturing current page…");
  void (async () => {
    const result = await sendMessage<CaptureResult>({ type: "capture-current-tab" });
    if (!result.ok) throw new Error(result.error || "Capture failed");
    setMessage(result.duplicate ? "Already saved in Didian." : "Captured in Didian.", "success");
  })()
    .catch((error) => setMessage(error instanceof Error ? error.message : "Capture failed", "error"))
    .finally(() => {
      ui.captureButton.disabled = false;
    });
});

void loadSettings().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load settings", "error"));
