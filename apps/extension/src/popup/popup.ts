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

type MessageTone = "neutral" | "success" | "error" | "pending" | "processing";

function setMessage(text: string, tone: MessageTone = "neutral") {
  ui.message.textContent = text;
  ui.message.dataset.tone = tone;
  ui.statusPill.textContent = statusPillLabel(tone);
}

function statusPillLabel(tone: MessageTone): string {
  if (tone === "error") return "Error";
  if (tone === "success") return "Ready";
  if (tone === "processing") return "Processing";
  if (tone === "pending") return "Pending";
  return "Ready";
}

function describeCaptureResult(result: CaptureResult): { text: string; tone: MessageTone } {
  const prefix = result.duplicate ? "Already saved." : "Captured.";
  switch (result.memoryStatus) {
    case "ready":
      return { text: `${prefix} AI enrichment is ready.`, tone: "success" };
    case "processing":
      return { text: `${prefix} AI is organizing it now.`, tone: "processing" };
    case "failed":
      return { text: result.failureReason ? `${prefix} AI enrichment failed: ${result.failureReason}` : `${prefix} AI enrichment failed.`, tone: "error" };
    case "pending":
      return { text: `${prefix} Waiting for AI enrichment.`, tone: "pending" };
    default:
      return { text: result.duplicate ? "Already saved in Didian." : "Captured in Didian.", tone: "success" };
  }
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
    const next = describeCaptureResult(result);
    setMessage(next.text, next.tone);
  })()
    .catch((error) => setMessage(error instanceof Error ? error.message : "Capture failed", "error"))
    .finally(() => {
      ui.captureButton.disabled = false;
    });
});

void loadSettings().catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load settings", "error"));
