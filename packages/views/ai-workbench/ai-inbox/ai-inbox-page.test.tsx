import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueKeys } from "@didian/core/issues/queries";
import { AiInboxPage } from "./ai-inbox-page";

const { ApiError } = vi.hoisted(() => {
  class ApiErrorImpl extends Error {
    status: number;
    statusText: string;
    body: unknown;

    constructor(message: string, status: number, statusText = "", body?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.statusText = statusText;
      this.body = body;
    }
  }

  return { ApiError: ApiErrorImpl };
});

const {
  archiveBrowserCapture,
  createAiInboxMission,
  createBrowserCapture,
  listBrowserCaptures,
  listPersonalSkills,
  restoreBrowserCapture,
  usePersonalSkill,
} = vi.hoisted(() => ({
  archiveBrowserCapture: vi.fn(),
  createAiInboxMission: vi.fn(),
  createBrowserCapture: vi.fn(),
  listBrowserCaptures: vi.fn(),
  listPersonalSkills: vi.fn(),
  restoreBrowserCapture: vi.fn(),
  usePersonalSkill: vi.fn(),
}));

const { navigationPush, toastFn, toastError, toastSuccess } = vi.hoisted(() => ({
  navigationPush: vi.fn(),
  toastFn: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@didian/core/api", async () => {
  const actual = await vi.importActual<typeof import("@didian/core/api")>("@didian/core/api");
  return {
    ...actual,
    ApiError,
    api: {
      archiveBrowserCapture,
      createAiInboxMission,
      createBrowserCapture,
      listBrowserCaptures,
      listPersonalSkills,
      restoreBrowserCapture,
      usePersonalSkill,
    },
  };
});

vi.mock("@didian/core/hooks", () => ({
  useWorkspaceId: () => "ws-test",
}));

vi.mock("@didian/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@didian/core/paths")>("@didian/core/paths");
  return {
    ...actual,
    useRequiredWorkspaceSlug: () => "acme",
  };
});

vi.mock("../../navigation", () => ({
  useNavigation: () => ({ push: navigationPush }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(toastFn, { error: toastError, success: toastSuccess }),
}));

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const view = render(
    <QueryClientProvider client={qc}>
      <AiInboxPage />
    </QueryClientProvider>,
  );
  return { ...view, queryClient: qc };
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

function personalSkillFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "skill-1",
    workspace_id: "ws-test",
    proposal_id: "proposal-1",
    name: "browser-use 尽调助手",
    description: "评估 browser-use 类 GitHub repo 是否适合接入项目。",
    capability: "检查 README、安装方式、license、维护信号和集成风险，并给出采用建议。",
    page_type: "github_repo",
    trigger: "GitHub repo 选型 评估 browser-use 集成",
    expected_input: "项目背景、技术栈、评估关注点",
    expected_output: "采用建议、上手步骤、风险清单",
    instructions: "先刷新 README、license、release 和 examples，再输出 Adopt / Pilot / Defer / Reject。",
    source_url: "https://github.com/browser-use/browser-use",
    source_domain: "github.com",
    evidence_snippets: ["GitHub 仓库经常被收藏用于选型。"],
    risk_notes: [],
    enabled: true,
    use_count: 2,
    created_at: "2026-07-14T02:42:00.000Z",
    updated_at: "2026-07-14T02:42:00.000Z",
    ...overrides,
  };
}

describe("AiInboxPage browser captures", () => {
  beforeEach(() => {
    listBrowserCaptures.mockReset();
    archiveBrowserCapture.mockReset();
    createAiInboxMission.mockReset();
    createBrowserCapture.mockReset();
    listPersonalSkills.mockReset();
    restoreBrowserCapture.mockReset();
    usePersonalSkill.mockReset();
    navigationPush.mockReset();
    toastFn.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    createBrowserCapture.mockResolvedValue({ capture: captureFixture(), captureId: "capture-new", status: "captured", memoryStatus: "pending", dedupe: { isDuplicate: false, existingCaptureId: null } });
    listPersonalSkills.mockResolvedValue([]);
    usePersonalSkill.mockResolvedValue(personalSkillFixture());
  });

  it("renders browser capture cards from the real browser-captures API", async () => {
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          preview_image_url: "https://example.com/preview.png",
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
          failure_reason: JSON.stringify({
            error: {
              message: "分组 gpt-mix-paygo 下模型 auto 无可用渠道（billing）",
            },
            request_id: "req_browser_capture_demo",
          }),
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
    expect(screen.queryByText("AI 理解")).not.toBeInTheDocument();
    expect(screen.getByText("已有收藏")).toBeInTheDocument();
    expect(screen.getByText("AI takeaway explains why this page matters.")).toBeInTheDocument();
    expect(screen.getByText("AI ready")).toBeInTheDocument();
    expect(screen.getByText("AI processing")).toBeInTheDocument();
    expect(screen.getByText("AI failed")).toBeInTheDocument();
    expect(screen.getByText("AI pending")).toBeInTheDocument();
    expect(screen.getByText("分组 gpt-mix-paygo 下模型 auto 无可用渠道（billing）")).toBeInTheDocument();
    expect(screen.queryByText(/\{"error"/)).not.toBeInTheDocument();
    expect(screen.queryByText("The selected quote explains why this page was saved.")).not.toBeInTheDocument();
    expect(screen.getAllByText("example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("网页收藏").length).toBeGreaterThan(0);
    expect(screen.queryByText("browser_capture")).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll("div")).some((element) => element.className.includes("lg:grid-cols-2") && !element.className.includes("2xl:grid-cols-3"))).toBe(true);
    expect(container.querySelector('img[src="https://example.com/preview.png"].max-h-44.object-contain')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://example.com/preview.png"]')?.parentElement).toHaveClass("max-h-44");
    expect(container.querySelector("article.break-inside-avoid")).not.toBeInTheDocument();
    expect(screen.getByLabelText("打开收藏页面：Research notes")).toHaveAttribute("href", "https://example.com/research");
    expect(screen.getAllByRole("button", { name: "Archive" }).length).toBeGreaterThan(0);
    expect(listBrowserCaptures).toHaveBeenCalledWith({ limit: 12, offset: 0, state: "active", q: undefined });
  });

  it("falls back to the Didian icon when a capture favicon is missing or broken", async () => {
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          favicon_url: null,
          title: "No favicon note",
        }),
        captureFixture({
          id: "capture-broken-favicon",
          favicon_url: "https://docs.stagehand.dev/favicon.ico",
          title: "Broken favicon note",
        }),
      ],
      total: 2,
    });

    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText("No favicon note")).toBeInTheDocument());
    expect(container.querySelectorAll("svg path").length).toBeGreaterThan(0);

    const brokenFavicon = container.querySelector('img[src="https://docs.stagehand.dev/favicon.ico"]');
    expect(brokenFavicon).toBeInTheDocument();
    fireEvent.error(brokenFavicon!);

    expect(container.querySelector('img[src="https://docs.stagehand.dev/favicon.ico"]')).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg path").length).toBeGreaterThan(1);
  });

  it("shows an honest empty state instead of fixture captures", async () => {
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });

    renderPage();

    await waitFor(() => expect(screen.getByText(/暂无浏览器收藏/)).toBeInTheDocument());
    expect(screen.queryByText("Karakeep GitHub")).not.toBeInTheDocument();
  });

  it("starts with an empty mission input instead of demo text", async () => {
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });

    renderPage();

    expect(screen.getByLabelText("AI Inbox input")).toHaveValue("");
    expect(screen.queryByText("本次输入链接")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建 Mission" })).toBeDisabled();
  });

  it("previews the Atlas Workspace generated from the current input", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });

    renderPage();

    await user.type(screen.getByLabelText("AI Inbox input"), "https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料");

    expect(screen.getByText("Atlas Workspace Preview")).toBeInTheDocument();
    expect(screen.getByText("AI Agent 项目调研")).toBeInTheDocument();
    expect(screen.getByText("mission.md")).toBeInTheDocument();
    expect(screen.getByText("sources/browser-use.md")).toBeInTheDocument();
    expect(screen.queryByText("outputs/项目对比表.md")).not.toBeInTheDocument();
    expect(screen.getByText("当前 Workspace")).toBeInTheDocument();
  });

  it("suggests enabled personal skills for matching mission input", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    listPersonalSkills.mockResolvedValue([
      personalSkillFixture(),
      personalSkillFixture({
        id: "skill-disabled",
        name: "Disabled helper",
        enabled: false,
      }),
      personalSkillFixture({
        id: "skill-docs",
        name: "Stagehand 文档整理",
        source_domain: "docs.stagehand.dev",
        page_type: "technical_doc",
        trigger: "stagehand docs examples",
        capability: "总结 Stagehand 文档。",
        use_count: 0,
      }),
    ]);

    renderPage();

    await user.type(screen.getByLabelText("AI Inbox input"), "https://github.com/browser-use/browser-use 帮我评估这个 GitHub repo 是否适合接入");

    await waitFor(() => expect(screen.getByText("匹配到个人能力")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /browser-use 尽调助手/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Disabled helper")).not.toBeInTheDocument();
    expect(screen.getByText("来源匹配 github.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /browser-use 尽调助手/ }));

    expect(screen.getByRole("button", { name: /browser-use 尽调助手/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("已选")).toBeInTheDocument();
  });

  it("sends selected personal skills as structured Mission capability ids", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    listPersonalSkills.mockResolvedValue([personalSkillFixture()]);
    createAiInboxMission.mockResolvedValue({ issue: { id: "mission-skill", title: "评估 browser-use" }, planningStatus: "queued", planningAgentId: "agent-1" });

    renderPage();

    await user.type(screen.getByLabelText("AI Inbox input"), "https://github.com/browser-use/browser-use 帮我评估这个 GitHub repo 是否适合接入");
    await waitFor(() => expect(screen.getByText("匹配到个人能力")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /browser-use 尽调助手/ }));
    await user.click(screen.getByRole("button", { name: "创建 Mission" }));
    await user.click(within(screen.getByRole("dialog", { name: "收藏输入链接？" })).getByRole("button", { name: "暂不收藏，继续创建" }));

    await waitFor(() => expect(createAiInboxMission).toHaveBeenCalledTimes(1));
    expect(createAiInboxMission.mock.calls[0]?.[0]).toMatchObject({
      selectedPersonalSkillIds: ["skill-1"],
    });
    const description = createAiInboxMission.mock.calls[0]?.[0]?.description as string;
    expect(description).not.toContain("## 使用的个人能力");
    expect(usePersonalSkill).not.toHaveBeenCalled();
  });

  it("creates a mission only from the typed input and keeps existing captures out of mission context", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          title: "Browser-use repository",
          url: "https://github.com/browser-use/browser-use",
          normalized_url: "https://github.com/browser-use/browser-use",
          domain: "github.com",
        }),
      ],
      total: 1,
    });
    createAiInboxMission.mockResolvedValue({ issue: { id: "mission-1", title: "整理学习资料路线" }, planningStatus: "queued", planningAgentId: "agent-1" });

    renderPage();

    await waitFor(() => expect(screen.getByText("Browser-use repository")).toBeInTheDocument());
    await user.type(screen.getByLabelText("AI Inbox input"), "https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。");
    expect(screen.getByText("本次输入链接")).toBeInTheDocument();
    expect(screen.getByText("创建后会询问是否收藏")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "创建 Mission" }));

    expect(createAiInboxMission).not.toHaveBeenCalled();
    expect(navigationPush).not.toHaveBeenCalled();
    const collectDialog = screen.getByRole("dialog", { name: "收藏输入链接？" });
    expect(collectDialog).toBeInTheDocument();
    expect(within(collectDialog).getByText("github.com/browser-use/browser-use")).toBeInTheDocument();
    expect(within(collectDialog).getByText("docs.stagehand.dev")).toBeInTheDocument();
    await user.click(within(collectDialog).getByRole("button", { name: "收藏并创建 Mission" }));

    await waitFor(() => expect(createBrowserCapture).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(createAiInboxMission).toHaveBeenCalledTimes(1));
    expect(createAiInboxMission.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      title: "整理学习资料路线：browser-use/browser-use + docs.stagehand.dev",
      description: expect.stringContaining("## 输入"),
      understanding: expect.objectContaining({ intent: "learning_plan" }),
    }));
    const description = createAiInboxMission.mock.calls[0]?.[0]?.description as string;
    expect(description).toContain("https://github.com/browser-use/browser-use");
    expect(description).toContain("https://docs.stagehand.dev");
    expect(description).toContain("AI Inbox 收到 2 个链接和一段补充说明");
    expect(description).toContain("## 任务交接");
    expect(description).toContain("学习路线");
    expect(description).toContain("## 预期产出");
    expect(description).toContain("## Atlas Workspace");
    expect(description).toContain("AI Agent 项目调研/");
    expect(description).toContain("mission.md");
    expect(description).toContain("sources/browser-use.md");
    expect(description).not.toContain("outputs/项目对比表.md");
    expect(description).toContain("你正在维护一个 Atlas Workspace");
    expect(description).toContain("## 本次输入链接");
    expect(description).not.toContain("Created from AI Inbox.");
    expect(description).not.toContain("意图：learning_plan");
    expect(description).not.toContain("置信度：");
    expect(description).not.toContain("Browser-use repository");
    expect(description).toContain("用户已确认收藏这些链接");
    expect(toastSuccess).toHaveBeenCalledWith("Mission 已创建，Codex 已开始规划");
    expect(navigationPush).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("你的 idea 已创建到 Mission");
    expect(screen.getByRole("link", { name: "打开 整理学习资料路线" })).toHaveAttribute("href", "/acme/issues/mission-1");
  });

  it("refreshes Mission panels after creating a plain text mission", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    createAiInboxMission.mockResolvedValue({ issue: { id: "mission-hello", title: "整理输入线索" }, planningStatus: "queued", planningAgentId: "agent-1" });

    const { queryClient } = renderPage();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await user.type(screen.getByLabelText("AI Inbox input"), "你好");
    await user.click(screen.getByRole("button", { name: "创建 Mission" }));

    await waitFor(() => expect(createAiInboxMission).toHaveBeenCalledTimes(1));
    expect(createAiInboxMission.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      title: "记录输入：你好",
      understanding: expect.objectContaining({ intent: "collect", suggestedMissionTitle: "记录输入" }),
    }));
    const description = createAiInboxMission.mock.calls[0]?.[0]?.description as string;
    expect(description).toContain("AI Inbox 收到一条简短输入：“你好”。");
    expect(description).toContain("当前输入还没有明确来源");
    expect(description).not.toContain("Created from AI Inbox.");
    expect(description).not.toContain("意图：collect");
    expect(description).not.toContain("置信度：");
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: issueKeys.all("ws-test") }));
    expect(screen.getByRole("status")).toHaveTextContent("你的 idea 已创建到 Mission");
    expect(screen.getByRole("link", { name: "打开 整理输入线索" })).toHaveAttribute("href", "/acme/issues/mission-hello");
  });

  it("can skip saving typed URLs before creating the mission", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    createAiInboxMission.mockResolvedValue({ issue: { id: "mission-plain", title: "总结单个资源" }, planningStatus: "queued", planningAgentId: "agent-1" });

    renderPage();

    await user.clear(screen.getByLabelText("AI Inbox input"));
    await user.type(screen.getByLabelText("AI Inbox input"), "https://example.com/article 帮我看看这个页面");
    expect(screen.getByText("创建后会询问是否收藏")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "创建 Mission" }));

    expect(createBrowserCapture).not.toHaveBeenCalled();
    const collectDialog = screen.getByRole("dialog", { name: "收藏输入链接？" });
    expect(collectDialog).toBeInTheDocument();
    expect(within(collectDialog).getByText("example.com/article")).toBeInTheDocument();
    await user.click(within(collectDialog).getByRole("button", { name: "暂不收藏，继续创建" }));

    await waitFor(() => expect(createAiInboxMission).toHaveBeenCalledTimes(1));
    expect(createBrowserCapture).not.toHaveBeenCalled();
    expect(createAiInboxMission.mock.calls[0]?.[0]?.title).toBe("总结单个资源：example.com/article");
    expect(createAiInboxMission.mock.calls[0]?.[0]?.description).toContain("用户选择暂不收藏这些链接");
    expect(navigationPush).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("你的 idea 已创建到 Mission");
  });

  it("archives a capture from the active favorites list", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [captureFixture()], total: 1 });
    archiveBrowserCapture.mockResolvedValue(captureFixture({ memory_state: "archived" }));

    renderPage();

    await waitFor(() => expect(screen.getByText("Research notes")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(archiveBrowserCapture).toHaveBeenCalledWith("capture-1"));
  });

  it("shows an inline failure when mission creation returns no issue id", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    createAiInboxMission.mockResolvedValue({ issue: { id: "", title: "" }, planningStatus: "queued" });

    renderPage();

    await user.clear(screen.getByLabelText("AI Inbox input"));
    await user.type(screen.getByLabelText("AI Inbox input"), "帮我整理这些 AI Agent 学习资料");
    await user.click(await screen.findByRole("button", { name: "创建 Mission" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("创建 Mission 失败：服务端没有返回 Mission ID"));
    expect(screen.getByRole("alert")).toHaveTextContent("创建 Mission 失败：服务端没有返回 Mission ID");
    expect(navigationPush).not.toHaveBeenCalled();
  });

  it("locks the create button while creating and after success to prevent duplicate missions", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    let resolveMission!: (value: unknown) => void;
    createAiInboxMission.mockReturnValue(new Promise((resolve) => { resolveMission = resolve; }));

    renderPage();

    await user.clear(screen.getByLabelText("AI Inbox input"));
    await user.type(screen.getByLabelText("AI Inbox input"), "帮我整理这些 AI Agent 学习资料");

    const createButton = await screen.findByRole("button", { name: "创建 Mission" });
    await user.dblClick(createButton);

    expect(createAiInboxMission).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "创建中" })).toBeDisabled();

    resolveMission({ issue: { id: "mission-2", title: "整理学习资料路线" }, planningStatus: "queued", planningAgentId: "agent-1" });

    await waitFor(() => expect(screen.getByRole("button", { name: "已创建" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "已创建" }));

    expect(createAiInboxMission).toHaveBeenCalledTimes(1);
    expect(navigationPush).not.toHaveBeenCalled();
  });

  it("opens the existing mission when the server reports an active duplicate", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    createAiInboxMission.mockRejectedValue(new ApiError("An active issue with this title already exists", 409, "Conflict", {
      code: "active_duplicate_issue",
      error: "An active issue with this title already exists: ACME-7 - 整理学习资料路线",
      issue: {
        id: "mission-existing",
        identifier: "ACME-7",
        title: "整理学习资料路线",
      },
    }));

    renderPage();

    await user.clear(screen.getByLabelText("AI Inbox input"));
    await user.type(screen.getByLabelText("AI Inbox input"), "帮我整理这些 AI Agent 学习资料");
    await user.click(await screen.findByRole("button", { name: "创建 Mission" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("已有相同的 active Mission，可从下方打开。"));
    expect(navigationPush).not.toHaveBeenCalled();
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("已找到已有 Mission。");
    expect(screen.getByRole("link", { name: "打开 整理学习资料路线", hidden: true })).toHaveAttribute("href", "/acme/issues/mission-existing");
  });
});
