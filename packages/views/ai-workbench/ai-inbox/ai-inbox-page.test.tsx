import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiInboxPage } from "./ai-inbox-page";

const { listBrowserCaptures } = vi.hoisted(() => ({
  listBrowserCaptures: vi.fn(),
}));

vi.mock("@didian/core/api", () => ({
  api: { listBrowserCaptures },
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

describe("AiInboxPage browser captures", () => {
  beforeEach(() => {
    listBrowserCaptures.mockReset();
  });

  it("renders browser capture cards from the real browser-captures API", async () => {
    listBrowserCaptures.mockResolvedValue({
      captures: [
        {
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
          captured_at: "2026-07-14T02:40:00.000Z",
          created_at: "2026-07-14T02:40:00.000Z",
          updated_at: "2026-07-14T02:40:00.000Z",
        },
      ],
      total: 1,
    });

    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText("Research notes")).toBeInTheDocument());
    expect(screen.getByText("The selected quote explains why this page was saved.")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("网页收藏")).toBeInTheDocument();
    expect(screen.queryByText("browser_capture")).not.toBeInTheDocument();
    expect(container.querySelector('img[src="https://example.com/favicon.ico"]')).toBeInTheDocument();
    expect(screen.getByLabelText("打开收藏页面：Research notes")).toHaveAttribute("href", "https://example.com/research");
    expect(listBrowserCaptures).toHaveBeenCalledWith({ limit: 12, offset: 0, state: "active" });
  });

  it("shows an honest empty state instead of fixture captures", async () => {
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getByText(/暂无浏览器收藏/)).toBeInTheDocument());
    expect(screen.queryByText("Karakeep GitHub")).not.toBeInTheDocument();
  });
});
