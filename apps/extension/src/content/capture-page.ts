import type { BrowserCapturePayload, CapturedLink } from "../shared/types";

const MAX_READABLE_TEXT = 60_000;
const MAX_SELECTED_TEXT = 10_000;
const MAX_LINKS = 200;
const MAX_LINK_TITLE = 300;
const MAX_DESCRIPTION = 2000;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).trimEnd();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function collectReadableText(doc: Document): string | undefined {
  const root = doc.querySelector("main, article") ?? doc.body;
  const text = collapseWhitespace(root?.textContent ?? "");
  return text ? truncate(text, MAX_READABLE_TEXT) : undefined;
}

function collectSelectedText(win: Window): string | undefined {
  const text = collapseWhitespace(win.getSelection()?.toString() ?? "");
  return text ? truncate(text, MAX_SELECTED_TEXT) : undefined;
}

function collectLinks(doc: Document): CapturedLink[] {
  const seen = new Set<string>();
  const links: CapturedLink[] = [];

  for (const anchor of Array.from(doc.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    if (links.length >= MAX_LINKS) break;
    const href = anchor.href;
    if (!isHttpUrl(href) || seen.has(href)) continue;
    seen.add(href);
    const title = truncate(collapseWhitespace(anchor.textContent ?? anchor.title ?? ""), MAX_LINK_TITLE);
    links.push(title ? { url: href, title } : { url: href });
  }

  return links;
}

function metaContent(doc: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const content = doc.querySelector<HTMLMetaElement>(selector)?.content;
    const value = collapseWhitespace(content ?? "");
    if (value) return value;
  }
  return undefined;
}

function resolveHttpUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl).href;
    return isHttpUrl(resolved) ? resolved : undefined;
  } catch {
    return undefined;
  }
}

export function buildPageCapturePayload(options: {
  doc: Document;
  win: Window;
  pageUrl?: string;
  tabId?: string;
  faviconUrl?: string;
  capturedAt?: string;
}): BrowserCapturePayload {
  const { doc, win } = options;
  const selectedText = collectSelectedText(win);
  const url = options.pageUrl ?? doc.location.href;
  if (!isHttpUrl(url)) {
    throw new Error("Only http(s) pages can be captured");
  }

  const pageUrl = new URL(url);
  const title = truncate(collapseWhitespace(doc.title || pageUrl.href), 500) || pageUrl.href;
  const description = metaContent(doc, [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
  ]);
  const previewImageUrl = resolveHttpUrl(metaContent(doc, [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[property="twitter:image"]',
    'meta[itemprop="image"]',
  ]), url);

  return {
    source: "extension",
    sourceType: selectedText ? "selection" : "link",
    captureScope: selectedText ? "selection" : "page",
    sourceTabId: options.tabId,
    url,
    title,
    domain: pageUrl.hostname,
    faviconUrl: options.faviconUrl,
    description: description ? truncate(description, MAX_DESCRIPTION) : undefined,
    previewImageUrl,
    selectedText,
    readableText: collectReadableText(doc),
    links: collectLinks(doc),
    capturedAt: options.capturedAt ?? new Date().toISOString(),
  };
}
