import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CaptureDetailPage } from "./capture-detail-page";

function makeCapture(overrides: Partial<{ id: string; domain: string; title: string; favicon_url?: string | null }> = {}) {
  return {
    id: "cap-1",
    workspace_id: "ws-1",
    creator_id: "u-1",
    source_type: "link" as const,
    source: "extension" as const,
    capture_scope: "page" as const,
    url: "https://example.com/a",
    normalized_url: "https://example.com/a",
    title: "Example A",
    domain: "example.com",
    favicon_url: "https://example.com/favicon.ico",
    description: null,
    preview_image_url: null,
    selected_text: null,
    readable_text: null,
    links: [],
    status: "ready",
    metadata_status: "ready",
    archive_status: "ready",
    summary_status: "ready",
    embedding_status: "ready",
    memory_state: "active" as const,
    failure_reason: null,
    memory: null,
    captured_at: "2026-08-11T00:00:00Z",
    created_at: "2026-08-11T00:00:00Z",
    updated_at: "2026-08-11T00:00:00Z",
    ...overrides,
  };
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <CaptureDetailPage captureId="cap-1" />
    </QueryClientProvider>,
  );
}

const apiMock = vi.hoisted(() => ({
  getBrowserCapture: vi.fn(),
  listBrowserCaptures: vi.fn(),
}));

vi.mock("@didian/core/api", () => ({
  api: apiMock,
}));

vi.mock("@didian/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@didian/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@didian/core/paths")>("@didian/core/paths");
  return {
    ...actual,
    useRequiredWorkspaceSlug: () => "demo-workspace",
  };
});

vi.mock("../../navigation", () => ({
  AppLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid="related-link">
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn() }),
}));

describe("CaptureDetailPage related captures", () => {
  beforeEach(() => {
    queryClient.clear();
    apiMock.getBrowserCapture.mockReset();
    apiMock.listBrowserCaptures.mockReset();
    apiMock.getBrowserCapture.mockResolvedValue(makeCapture());
  });

  it("shows skeleton while loading", () => {
    apiMock.getBrowserCapture.mockReturnValue(new Promise(() => {}));
    apiMock.listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    const { container } = renderPage();
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("renders related captures with same-domain first and filters current id", async () => {
    const sameDomain = makeCapture({ id: "cap-2", domain: "example.com", title: "Same domain", favicon_url: null });
    const otherDomain = makeCapture({ id: "cap-3", domain: "other.com", title: "Other domain" });
    apiMock.listBrowserCaptures.mockResolvedValue({
      captures: [makeCapture({ id: "cap-1" }), otherDomain, sameDomain],
      total: 3,
    });
    renderPage();
    await waitFor(() => {
      const links = screen.getAllByTestId("related-link");
      expect(links.length).toBeGreaterThan(0);
    });
    const links = screen.getAllByTestId("related-link");
    // current capture (cap-1) must be filtered out
    expect(links.some((link) => link.getAttribute("href")?.includes("cap-1"))).toBe(false);
    // same-domain capture should be listed before the other domain
    const hrefs = links.map((link) => link.getAttribute("href"));
    const sameIndex = hrefs.findIndex((href) => href?.includes("cap-2"));
    const otherIndex = hrefs.findIndex((href) => href?.includes("cap-3"));
    expect(sameIndex).toBeGreaterThanOrEqual(0);
    expect(otherIndex).toBeGreaterThanOrEqual(0);
    expect(sameIndex).toBeLessThan(otherIndex);
  });

  it("shows empty hint when there are no other captures", async () => {
    apiMock.listBrowserCaptures.mockResolvedValue({
      captures: [makeCapture({ id: "cap-1" })],
      total: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("还没有其他收藏。")).toBeTruthy();
    });
  });
});
