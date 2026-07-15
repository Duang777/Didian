import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiInboxPage } from "./ai-inbox-page";

const { archiveBrowserCapture, listBrowserCaptures, restoreBrowserCapture } = vi.hoisted(() => ({
  archiveBrowserCapture: vi.fn(),
  listBrowserCaptures: vi.fn(),
  restoreBrowserCapture: vi.fn(),
}));

vi.mock("@didian/core/api", () => ({
  api: { archiveBrowserCapture, listBrowserCaptures, restoreBrowserCapture },
}));

vi.mock("@didian/core/hooks", () => ({
  useWorkspaceId: () => "ws-test",
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <AiInboxPage />
    </QueryClientProvider>,
  );
}

function captureFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "capture-1",
    workspace_id: "ws-test",
    creator_id: "user-1",
    source_type: "link",
    source: "extension",
    capture_scope: "page",
    source_tab_id: "123",
    url: "https://example.com/research",
    normalized_url: "https://example.com/research",
    title: "Research notes",
    domain: "example.com",
    favicon_url: "https://example.com/favicon.ico",
    preview_image_url: null,
    selected_text: "The selected quote explains why this page was saved.",
    readable_text: "Long article body",
    links: [],
    status: "captured",
    metadata_status: "pending",
    archive_status: "skipped",
    summary_status: "pending",
    embedding_status: "skipped",
    memory_state: "active",
    failure_reason: null,
    memory: null,
    captured_at: "2026-07-14T02:40:00.000Z",
    created_at: "2026-07-14T02:40:00.000Z",
    updated_at: "2026-07-14T02:40:00.000Z",
    ...overrides,
  };
}

function memoryFixture(overrides: Record<string, unknown> = {}) {
  return {
    summary: "",
    one_line_takeaway: "",
    key_points: [],
    topics: [],
    entities: [],
    keywords: [],
    status: "pending",
    generated_at: null,
    updated_at: "2026-07-14T02:41:00.000Z",
    ...overrides,
  };
}

describe("AiInboxPage browser captures", () => {
  beforeEach(() => {
    listBrowserCaptures.mockReset();
    archiveBrowserCapture.mockReset();
    restoreBrowserCapture.mockReset();
  });

  it("renders browser capture cards from the real browser-captures API", async () => {
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          memory: memoryFixture({
            summary: "AI-derived summary for the saved research note.",
            one_line_takeaway: "AI takeaway explains why this page matters.",
            key_points: ["AI-derived summary for the saved research note."],
            topics: ["research"],
            entities: ["example.com"],
            keywords: ["research"],
            status: "ready",
            generated_at: "2026-07-14T02:41:00.000Z",
          }),
        }),
        captureFixture({
          id: "capture-2",
          url: "https://example.com/processing",
          normalized_url: "https://example.com/processing",
          title: "Processing note",
          selected_text: null,
          readable_text: "Waiting for the AI summary.",
          memory: memoryFixture({ status: "processing" }),
        }),
        captureFixture({
          id: "capture-3",
          url: "https://example.com/failed",
          normalized_url: "https://example.com/failed",
          title: "Failed note",
          selected_text: null,
          readable_text: "Bad model output.",
          status: "failed",
          summary_status: "failure",
          failure_reason: "browser memory invalid output",
          memory: memoryFixture({ status: "failed" }),
        }),
        captureFixture({
          id: "capture-4",
          url: "https://example.com/pending",
          normalized_url: "https://example.com/pending",
          title: "Pending note",
          selected_text: null,
          readable_text: "Queued for summary.",
        }),
      ],
      total: 4,
    });

    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText("Research notes")).toBeInTheDocument());
    expect(screen.getByText("AI takeaway explains why this page matters.")).toBeInTheDocument();
    expect(screen.getByText("AI ready")).toBeInTheDocument();
    expect(screen.getByText("AI processing")).toBeInTheDocument();
    expect(screen.getByText("AI failed")).toBeInTheDocument();
    expect(screen.getByText("AI pending")).toBeInTheDocument();
    expect(screen.getByText("browser memory invalid output")).toBeInTheDocument();
    expect(screen.queryByText("The selected quote explains why this page was saved.")).not.toBeInTheDocument();
    expect(screen.getAllByText("example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("网页收藏").length).toBeGreaterThan(0);
    expect(screen.queryByText("browser_capture")).not.toBeInTheDocument();
    expect(container.querySelector('img[src="https://example.com/favicon.ico"]')).toBeInTheDocument();
    expect(screen.getByLabelText("打开收藏页面：Research notes")).toHaveAttribute("href", "https://example.com/research");
    expect(screen.getAllByRole("button", { name: "Archive" }).length).toBeGreaterThan(0);
    expect(listBrowserCaptures).toHaveBeenCalledWith({ limit: 12, offset: 0, state: "active", q: undefined });
  });

  it("shows an honest empty state instead of fixture captures", async () => {
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getByText(/暂无浏览器收藏/)).toBeInTheDocument());
    expect(screen.queryByText("Karakeep GitHub")).not.toBeInTheDocument();
  });
});
