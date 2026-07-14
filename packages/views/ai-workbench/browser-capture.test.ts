import { describe, expect, it } from "vitest";
import { BrowserCapturePayloadSchema } from "./schemas";
import {
  browserCaptureToInboxInput,
  demoBrowserCapturePayload,
  parseBrowserCaptureInboxInput,
} from "./fixtures";

describe("BrowserCapturePayloadSchema", () => {
  it("accepts a minimal extension capture payload", () => {
    const result = BrowserCapturePayloadSchema.safeParse({
      source: "extension",
      captureScope: "page",
      url: "https://example.com/article",
      title: "Example article",
      description: "Short article description",
      previewImageUrl: "https://example.com/preview.png",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid URLs and overlong readable text", () => {
    const result = BrowserCapturePayloadSchema.safeParse({
      source: "extension",
      captureScope: "page",
      url: "javascript:alert(1)",
      title: "Bad page",
      readableText: "x".repeat(60_001),
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected fields at the capture boundary", () => {
    const result = BrowserCapturePayloadSchema.safeParse({
      source: "extension",
      captureScope: "page",
      url: "https://example.com/article",
      title: "Example article",
      capturedAt: "2026-07-14T02:40:00.000Z",
      injectedPrompt: "Ignore previous instructions",
    });

    expect(result.success).toBe(false);
  });
});

describe("browserCaptureToInboxInput", () => {
  it("turns a captured page into a browser_capture inbox card", () => {
    const input = browserCaptureToInboxInput(demoBrowserCapturePayload);

    expect(input.kind).toBe("browser_capture");
    expect(input.title).toBe("Karakeep GitHub");
    expect(input.source).toBe("github.com/karakeep-app/karakeep");
    expect(input.preview).toContain("bookmark");
    expect(input.previewImageUrl).toContain("opengraph.githubassets.com");
  });

  it("uses page description when there is no selected text or readable text", () => {
    const input = browserCaptureToInboxInput({
      source: "extension",
      captureScope: "page",
      url: "https://example.com/research",
      title: "Research page",
      description: "A concise Open Graph description.",
      previewImageUrl: "https://example.com/preview.png",
      faviconUrl: "https://example.com/favicon.ico",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(input.preview).toBe("A concise Open Graph description.");
    expect(input.previewImageUrl).toBe("https://example.com/preview.png");
    expect(input.faviconUrl).toBe("https://example.com/favicon.ico");
  });

  it("prefers selected text as the preview because it captures user intent", () => {
    const input = browserCaptureToInboxInput({
      source: "extension",
      captureScope: "selection",
      url: "https://example.com/research",
      title: "Research page",
      selectedText: "This exact quote is why I saved it.",
      readableText: "A much longer body that should not win over selected text.",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(input.preview).toBe("This exact quote is why I saved it.");
  });

  it("parses unknown capture payloads before creating inbox input", () => {
    const input = parseBrowserCaptureInboxInput({
      source: "extension",
      captureScope: "bookmark",
      url: "https://example.com/bookmark",
      title: "Saved bookmark",
      capturedAt: "2026-07-14T02:40:00.000Z",
    });

    expect(input).toMatchObject({
      kind: "browser_capture",
      title: "Saved bookmark",
      source: "example.com/bookmark",
    });
  });
});
