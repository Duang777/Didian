import { describe, expect, it } from "vitest";
import { buildPageCapturePayload } from "./capture-page";

function makeDocument(html: string) {
  document.body.innerHTML = html;
  document.title = "Example Article";
  return document;
}

describe("buildPageCapturePayload", () => {
  it("captures page title, URL, readable text, links, and selection", () => {
    const doc = makeDocument(`
      <meta name="description" content="Plain meta description">
      <meta property="og:description" content="Open Graph description">
      <meta property="og:image" content="/preview.png">
      <main>
        <p>Useful research note</p>
        <a href="https://example.com/one">One</a>
        <a href="javascript:alert(1)">Bad</a>
      </main>
    `);
    window.getSelection()?.selectAllChildren(document.querySelector("p")!);

    const payload = buildPageCapturePayload({
      doc,
      win: window,
      pageUrl: "https://example.com/article",
      tabId: "7",
      faviconUrl: "https://example.com/favicon.ico",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(payload).toMatchObject({
      source: "extension",
      sourceType: "selection",
      captureScope: "selection",
      sourceTabId: "7",
      url: "https://example.com/article",
      title: "Example Article",
      domain: "example.com",
      selectedText: "Useful research note",
      description: "Open Graph description",
      previewImageUrl: "https://example.com/preview.png",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });
    expect(payload.readableText).toContain("Useful research note");
    expect(payload.links).toEqual([{ url: "https://example.com/one", title: "One" }]);
  });

  it("rejects non-http pages", () => {
    const doc = makeDocument("<main>Extension page</main>");

    expect(() => buildPageCapturePayload({ doc, win: window, pageUrl: "chrome://extensions" })).toThrow("Only http(s) pages can be captured");
  });

  it("caps extracted text and links", () => {
    const links = Array.from({ length: 250 }, (_, index) => `<a href="https://example.com/${index}">Link ${index}</a>`).join("");
    const doc = makeDocument(`<main>${"x".repeat(70_000)}${links}</main>`);

    const payload = buildPageCapturePayload({ doc, win: window, pageUrl: "https://example.com/article" });

    expect(payload.readableText).toHaveLength(60_000);
    expect(payload.links).toHaveLength(200);
  });
});
