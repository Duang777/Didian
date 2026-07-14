import { buildPageCapturePayload } from "./capture-page";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const request = message as { type?: string; tabId?: string; faviconUrl?: string };
  if (request.type !== "didian-capture-page") return false;

  try {
    sendResponse({
      ok: true,
      payload: buildPageCapturePayload({
        doc: document,
        win: window,
        tabId: request.tabId,
        faviconUrl: request.faviconUrl,
      }),
    });
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : "Capture failed" });
  }

  return false;
});
