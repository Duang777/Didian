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

const { addIssueSkill, archiveBrowserCapture, createAiInboxMission, createBrowserCapture, createBrowserCaptureSkillDirectionMission, createBrowserCaptureSkillGenerationMission, deleteSkill, listBrowserCaptures, listComments, listSkills, restoreBrowserCapture } = vi.hoisted(() => ({
  addIssueSkill: vi.fn(),
  archiveBrowserCapture: vi.fn(),
  createAiInboxMission: vi.fn(),
  createBrowserCapture: vi.fn(),
  createBrowserCaptureSkillDirectionMission: vi.fn(),
  createBrowserCaptureSkillGenerationMission: vi.fn(),
  deleteSkill: vi.fn(),
  listBrowserCaptures: vi.fn(),
  listComments: vi.fn(),
  listSkills: vi.fn(),
  restoreBrowserCapture: vi.fn(),
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
    api: { addIssueSkill, archiveBrowserCapture, createAiInboxMission, createBrowserCapture, createBrowserCaptureSkillDirectionMission, createBrowserCaptureSkillGenerationMission, deleteSkill, listBrowserCaptures, listComments, listSkills, restoreBrowserCapture },
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

describe("AiInboxPage browser captures", () => {
  beforeEach(() => {
    addIssueSkill.mockReset();
    listBrowserCaptures.mockReset();
    archiveBrowserCapture.mockReset();
    createAiInboxMission.mockReset();
    createBrowserCapture.mockReset();
    createBrowserCaptureSkillDirectionMission.mockReset();
    createBrowserCaptureSkillGenerationMission.mockReset();
    deleteSkill.mockReset();
    listSkills.mockReset();
    listComments.mockReset();
    restoreBrowserCapture.mockReset();
    navigationPush.mockReset();
    toastFn.mockReset();
    toastError.mockReset();
    toastSuccess.mockReset();
    createBrowserCapture.mockResolvedValue({ capture: captureFixture(), captureId: "capture-new", status: "captured", memoryStatus: "pending", dedupe: { isDuplicate: false, existingCaptureId: null } });
    addIssueSkill.mockResolvedValue({
      id: "usage-1",
      skill_id: "skill-1",
      issue_id: "mission-using-skill",
      status: "planned",
    });
    deleteSkill.mockResolvedValue(undefined);
    listComments.mockResolvedValue([]);
    listSkills.mockResolvedValue([]);
    createBrowserCaptureSkillDirectionMission.mockResolvedValue({
      issue: { id: "skill-direction-mission-1", title: "分析能力方向：Stripe Checkout documentation" },
      planningStatus: "queued",
      planningAgentId: "agent-1",
    });
    createBrowserCaptureSkillGenerationMission.mockResolvedValue({
      issue: { id: "skill-mission-1", title: "完善能力：Stripe Checkout 接入助手" },
      skill: { id: "skill-1", name: "Stripe Checkout 接入助手", config: { generation: { status: "draft" } } },
      planningStatus: "queued",
      planningAgentId: "agent-1",
    });
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
    expect(screen.queryByText("AI 理解")).not.toBeInTheDocument();
    expect(screen.getByText("已有收藏")).toBeInTheDocument();
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
    expect(Array.from(container.querySelectorAll("div")).some((element) => element.className.includes("lg:grid-cols-2") && !element.className.includes("2xl:grid-cols-3"))).toBe(true);
    expect(container.querySelector('img[src="https://example.com/preview.png"].max-h-44.object-contain')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://example.com/preview.png"]')?.parentElement).toHaveClass("max-h-44");
    expect(container.querySelector("article.break-inside-avoid")).not.toBeInTheDocument();
    expect(screen.getByLabelText("打开收藏页面：Research notes")).toHaveAttribute("href", "https://example.com/research");
    expect(screen.getAllByRole("button", { name: "Archive" }).length).toBeGreaterThan(0);
    expect(listBrowserCaptures).toHaveBeenCalledWith({ limit: 12, offset: 0, state: "active", q: undefined });
  });

  it("shows personal capability proposals on high-signal bookmark cards", async () => {
    const user = userEvent.setup();
    listComments.mockResolvedValue([
      {
        id: "comment-direction-1",
        issue_id: "skill-direction-mission-1",
        author_type: "agent",
        author_id: "agent-1",
        content: "### 推荐方向 1：接入落地\n- 能力名称：Stripe Checkout 接入助手\n- 适用场景：项目接入和 webhook 排障。",
        type: "comment",
        parent_id: null,
        reactions: [],
        attachments: [],
        created_at: "2026-07-14T02:42:00.000Z",
        updated_at: "2026-07-14T02:42:00.000Z",
        resolved_at: null,
        resolved_by_type: null,
        resolved_by_id: null,
      },
    ]);
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          url: "https://docs.stripe.com/payments/checkout",
          normalized_url: "https://docs.stripe.com/payments/checkout",
          title: "Stripe Checkout documentation",
          domain: "docs.stripe.com",
          description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
          readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
          memory: memoryFixture({
            summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
            one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
            key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
            topics: ["api", "payments", "checkout"],
            entities: ["Stripe"],
            keywords: ["api", "sdk", "webhook", "error"],
            status: "ready",
            generated_at: "2026-07-14T02:41:00.000Z",
          }),
        }),
        captureFixture({
          id: "capture-blog",
          url: "https://example.com/blog/my-opinion-about-ai",
          normalized_url: "https://example.com/blog/my-opinion-about-ai",
          title: "My opinion about AI tools",
          domain: "example.com",
          description: "A personal essay about AI tools and taste.",
          readable_text: "This post shares opinions and reflections without a repeatable workflow.",
          memory: memoryFixture({
            summary: "A personal opinion article about AI tools.",
            one_line_takeaway: "A reflective blog post.",
            key_points: ["AI tools are changing creative work."],
            topics: ["blog"],
            keywords: ["opinion", "essay"],
            status: "ready",
          }),
        }),
      ],
      total: 2,
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Stripe Checkout documentation")).toBeInTheDocument());
    expect(screen.getByText("可沉淀为能力")).toBeInTheDocument();
    expect(screen.getByText("Stripe Checkout 接入助手")).toBeInTheDocument();
    expect(screen.getByText(/接入步骤、请求示例/)).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByText("平台发现")).toBeInTheDocument();
    expect(screen.queryByText("86%")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "做成能力" })).toHaveLength(2);
    expect(screen.getByText("My opinion about AI tools")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "做成能力" })[0]!);
    const draftDialog = screen.getByRole("dialog", { name: "做成能力" });
    const stageBar = within(draftDialog).getByLabelText("能力生成阶段");
    expect(within(stageBar).getByText("补充意图")).toBeInTheDocument();
    expect(within(stageBar).getByText("Codex 推荐")).toBeInTheDocument();
    expect(within(stageBar).getByText("确认生成")).toBeInTheDocument();
    expect(within(draftDialog).getByText("让 Codex 推荐能力方向")).toBeInTheDocument();
    expect(within(draftDialog).queryByText("能力方向分析")).not.toBeInTheDocument();
    await user.click(within(draftDialog).getByRole("button", { name: "让 Codex 推荐能力方向" }));

    await waitFor(() => expect(createBrowserCaptureSkillDirectionMission).toHaveBeenCalledWith("capture-1", {}));
    expect(toastSuccess).toHaveBeenCalledWith("已交给本地 Codex 分析能力方向，结果会在弹窗中更新。");
    expect(screen.getByRole("dialog", { name: "做成能力" })).toBeInTheDocument();
    await waitFor(() => expect(listComments).toHaveBeenCalledWith("skill-direction-mission-1"));
    expect(screen.getAllByText("Codex 推荐").length).toBeGreaterThan(0);
    expect(screen.getByText(/推荐方向 1：接入落地/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /打开方向分析 Mission/ })).not.toBeInTheDocument();

    expect(screen.getByLabelText("能力名称")).toHaveValue("Stripe Checkout 接入助手");
    expect(screen.getByText("选择能力方向")).toBeInTheDocument();
    expect(screen.getByText("复用流程")).toBeInTheDocument();
    expect(screen.getByText("指令线索")).toBeInTheDocument();
    expect(screen.getAllByText("强").length).toBeGreaterThan(0);
    expect(screen.queryByText("84%")).not.toBeInTheDocument();
    expect(screen.queryByText("90%")).not.toBeInTheDocument();
    expect(screen.getByLabelText("主要用途")).toHaveValue("当我需要把 Stripe Checkout 接入真实项目时，用它根据项目栈生成落地步骤、代码示例、环境变量清单和验收检查。");
    expect(screen.getByLabelText("能力描述")).toHaveValue("把 Stripe Checkout 的技术文档沉淀成项目接入流程，覆盖配置、示例、验证、错误处理和上线前检查。");
    expect(screen.getByText("先确认你想沉淀的能力方向，再交给本地 Codex 生成可复用能力并写入能力库。")).toBeInTheDocument();
    expect(createBrowserCaptureSkillGenerationMission).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /排障修复/ }));
    expect(screen.getByLabelText("能力名称")).toHaveValue("Stripe Checkout 排障助手");
    expect(screen.getByLabelText("期望输出")).toHaveValue("可能原因排序\n验证命令\n修复步骤\n回归检查清单");
    await user.clear(screen.getByLabelText("主要用途"));
    await user.type(screen.getByLabelText("主要用途"), "帮我把 Stripe Checkout 文档沉淀成项目接入和 webhook 排障流程。");
    await user.click(screen.getByRole("button", { name: "交给 Codex 生成能力" }));

    await waitFor(() => expect(createBrowserCaptureSkillGenerationMission.mock.calls[0]?.[0]).toBe("capture-1"));
    expect(createBrowserCaptureSkillGenerationMission.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      direction: expect.objectContaining({
        title: "Stripe Checkout 排障助手",
        primaryUseCase: "帮我把 Stripe Checkout 文档沉淀成项目接入和 webhook 排障流程。",
        expectedInputs: ["错误信息或日志", "当前配置", "运行环境", "已尝试步骤"],
        expectedOutputs: ["可能原因排序", "验证命令", "修复步骤", "回归检查清单"],
        notes: expect.stringContaining("方向：排障修复"),
      }),
    }));
    expect(toastSuccess).toHaveBeenCalledWith("能力生成任务已创建，本地 Codex 会按你确认的方向生成并写入能力库。");
    expect(screen.getByRole("status")).toHaveTextContent("能力已写入库");
    expect(screen.getByRole("link", { name: "打开能力" })).toHaveAttribute("href", "/acme/skills/skill-1");
    expect(screen.getByRole("link", { name: "查看生成 Mission" })).toHaveAttribute("href", "/acme/issues/skill-mission-1");
    expect(screen.queryByRole("button", { name: "已创建" })).not.toBeInTheDocument();
  }, 10_000);

  it("shows generated capability state from the persisted capability library after refresh", async () => {
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          url: "https://docs.stripe.com/payments/checkout",
          normalized_url: "https://docs.stripe.com/payments/checkout",
          title: "Stripe Checkout documentation",
          domain: "docs.stripe.com",
          description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
          readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
          memory: memoryFixture({
            summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
            one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
            key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
            topics: ["api", "payments", "checkout"],
            entities: ["Stripe"],
            keywords: ["api", "sdk", "webhook", "error"],
            status: "ready",
            generated_at: "2026-07-14T02:41:00.000Z",
          }),
        }),
      ],
      total: 1,
    });
    listSkills.mockResolvedValue([
      {
        id: "skill-persisted",
        workspace_id: "ws-test",
        name: "Stripe Checkout 接入助手",
        description: "根据项目栈生成接入步骤、请求示例、环境变量清单和常见错误排查。",
        config: {
          origin: { type: "browser_capture", capture_id: "capture-1" },
          generation: { type: "browser_capture_skill_generation", status: "agent_refined" },
        },
        created_by: "user-1",
        created_at: "2026-07-14T02:42:00.000Z",
        updated_at: "2026-07-14T02:43:00.000Z",
      },
    ]);

    renderPage();

    await waitFor(() => expect(screen.getByText("Stripe Checkout documentation")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "能力库" })).toHaveAttribute("href", "/acme/skills");
    expect(screen.getByRole("status")).toHaveTextContent("能力已生成并保存在能力库。");
    expect(screen.getByRole("link", { name: "打开能力" })).toHaveAttribute("href", "/acme/skills/skill-persisted");
    expect(screen.queryByRole("link", { name: "查看生成 Mission" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成能力" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已生成" })).not.toBeInTheDocument();
    expect(createBrowserCaptureSkillGenerationMission).not.toHaveBeenCalled();
  });

  it("lets users request an ability from a bookmark without an automatic recommendation", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          id: "capture-manual",
          url: "https://example.com/blog/ai-workflow-notes",
          normalized_url: "https://example.com/blog/ai-workflow-notes",
          title: "AI workflow notes",
          domain: "example.com",
          description: "A personal article about a workflow the user wants to reuse.",
          readable_text: "This page is useful to me, but the platform did not classify it as a reusable technical workflow.",
          memory: memoryFixture({
            summary: "Personal workflow notes for reviewing AI generated work.",
            one_line_takeaway: "A reusable review habit, but not an automatic capability recommendation.",
            key_points: ["Review output quality", "Track assumptions"],
            topics: ["workflow"],
            status: "ready",
          }),
        }),
      ],
      total: 1,
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("AI workflow notes")).toBeInTheDocument());
    expect(screen.queryByText("可沉淀为能力")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "做成能力" }));

    const draftDialog = screen.getByRole("dialog", { name: "做成能力" });
    await user.type(within(draftDialog).getByLabelText("你的需求（选填）"), "我想把它做成一个 AI 输出质量复盘助手。");
    await user.click(within(draftDialog).getByRole("button", { name: "让 Codex 推荐能力方向" }));

    await waitFor(() => expect(createBrowserCaptureSkillDirectionMission).toHaveBeenCalledWith("capture-manual", {
      userNeed: "我想把它做成一个 AI 输出质量复盘助手。",
    }));
    expect(screen.getByRole("dialog", { name: "做成能力" })).toBeInTheDocument();
    expect(screen.getByLabelText("你的需求（选填）")).toHaveValue("我想把它做成一个 AI 输出质量复盘助手。");
    expect(screen.getByText("选择能力方向")).toBeInTheDocument();
    expect(screen.getByLabelText("补充说明")).toHaveValue("用户主动需求：我想把它做成一个 AI 输出质量复盘助手。");
  });

  it("keeps an editable capability draft available when Codex Local is unavailable", async () => {
    const user = userEvent.setup();
    createBrowserCaptureSkillDirectionMission.mockResolvedValue({
      issue: { id: "skill-direction-mission-no-agent", title: "分析能力方向：Stripe Checkout documentation" },
      planningStatus: "no_codex_agent",
      planningAgentId: null,
    });
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          url: "https://docs.stripe.com/payments/checkout",
          normalized_url: "https://docs.stripe.com/payments/checkout",
          title: "Stripe Checkout documentation",
          domain: "docs.stripe.com",
          description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
          readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
          memory: memoryFixture({
            summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
            one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
            key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
            topics: ["api", "payments", "checkout"],
            entities: ["Stripe"],
            keywords: ["api", "sdk", "webhook", "error"],
            status: "ready",
          }),
        }),
      ],
      total: 1,
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Stripe Checkout documentation")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "做成能力" }));
    await user.click(screen.getByRole("button", { name: "让 Codex 推荐能力方向" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("当前没有可用 Codex agent，可先用平台默认方向确认。"));
    const dialog = screen.getByRole("dialog", { name: "做成能力" });
    expect(within(dialog).getByText("当前没有可用 Codex agent。你可以先用平台默认草稿继续，之后再让本地 Codex 完善。")).toBeInTheDocument();
    expect(within(dialog).getByText("选择能力方向")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("能力名称")).toHaveValue("Stripe Checkout 接入助手");
    expect(within(dialog).getByRole("button", { name: "交给 Codex 生成能力" })).toBeEnabled();
  });

  it("deletes a generated capability from its bookmark card and allows regeneration", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          url: "https://docs.stripe.com/payments/checkout",
          normalized_url: "https://docs.stripe.com/payments/checkout",
          title: "Stripe Checkout documentation",
          domain: "docs.stripe.com",
          description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
          readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
          memory: memoryFixture({
            summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
            one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
            key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
            topics: ["api", "payments", "checkout"],
            entities: ["Stripe"],
            keywords: ["api", "sdk", "webhook", "error"],
            status: "ready",
            generated_at: "2026-07-14T02:41:00.000Z",
          }),
        }),
      ],
      total: 1,
    });
    listSkills.mockResolvedValue([
      {
        id: "skill-persisted",
        workspace_id: "ws-test",
        name: "Stripe Checkout 接入助手",
        description: "根据项目栈生成接入步骤、请求示例、环境变量清单和常见错误排查。",
        config: {
          origin: { type: "browser_capture", capture_id: "capture-1" },
          generation: { type: "browser_capture_skill_generation", status: "agent_refined" },
        },
        created_by: "user-1",
        created_at: "2026-07-14T02:42:00.000Z",
        updated_at: "2026-07-14T02:43:00.000Z",
      },
    ]);

    renderPage();

    await waitFor(() => expect(screen.getByText("Stripe Checkout documentation")).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("能力已生成并保存在能力库。");

    await user.click(screen.getByRole("button", { name: "删除能力" }));

    const dialog = screen.getByRole("dialog", { name: "删除能力？" });
    expect(within(dialog).getByText(/Stripe Checkout 接入助手/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(deleteSkill).toHaveBeenCalledWith("skill-persisted"));
    expect(toastSuccess).toHaveBeenCalledWith("能力已删除，可以重新生成。");
    expect(screen.queryByText("能力已生成并保存在能力库。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已生成" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "做成能力" })).toBeEnabled();
  });

  it("creates a Mission and attaches a generated capture capability", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({
      captures: [
        captureFixture({
          url: "https://docs.stripe.com/payments/checkout",
          normalized_url: "https://docs.stripe.com/payments/checkout",
          title: "Stripe Checkout documentation",
          domain: "docs.stripe.com",
          description: "Use Checkout to accept payments with API parameters, webhooks, and error handling.",
          readable_text: "Install the SDK, configure API keys, create a checkout session, handle webhooks, and test common errors.",
          memory: memoryFixture({
            summary: "Technical documentation for integrating Stripe Checkout with API parameters, SDK setup, and webhook troubleshooting.",
            one_line_takeaway: "Stripe Checkout integration guide with API setup and error handling.",
            key_points: ["Create a checkout session with API parameters.", "Handle webhooks and common errors."],
            topics: ["api", "payments", "checkout"],
            entities: ["Stripe"],
            keywords: ["api", "sdk", "webhook", "error"],
            status: "ready",
            generated_at: "2026-07-14T02:41:00.000Z",
          }),
        }),
      ],
      total: 1,
    });
    listSkills.mockResolvedValue([
      {
        id: "skill-persisted",
        workspace_id: "ws-test",
        name: "Stripe Checkout 接入助手",
        description: "根据项目栈生成接入步骤、请求示例、环境变量清单和常见错误排查。",
        config: {
          origin: { type: "browser_capture", capture_id: "capture-1" },
          generation: { type: "browser_capture_skill_generation", status: "agent_refined" },
        },
        created_by: "user-1",
        created_at: "2026-07-14T02:42:00.000Z",
        updated_at: "2026-07-14T02:43:00.000Z",
      },
    ]);
    createAiInboxMission.mockResolvedValue({
      issue: { id: "mission-using-skill", title: "用 Stripe Checkout 接入助手处理 Stripe Checkout documentation" },
      planningStatus: "queued",
      planningAgentId: "agent-1",
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Stripe Checkout documentation")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "用能力创建 Mission" }));

    await waitFor(() => expect(createAiInboxMission).toHaveBeenCalledTimes(1));
    expect(createAiInboxMission.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      title: "用 Stripe Checkout 接入助手处理 Stripe Checkout documentation",
    }));
    expect(createAiInboxMission.mock.calls[0]?.[0]?.description).toContain("Stripe Checkout 接入助手");
    await waitFor(() => expect(addIssueSkill).toHaveBeenCalledWith("mission-using-skill", {
      skill_id: "skill-persisted",
      source: "capture_origin",
      reason: "Created from browser capture: Stripe Checkout documentation",
    }));
    expect(toastSuccess).toHaveBeenCalledWith("Mission 已创建，并已绑定这个能力");
    expect(screen.getByRole("status")).toHaveTextContent("已创建使用记录");
    expect(screen.getByRole("link", { name: "用 Stripe Checkout 接入助手处理 Stripe Checkout documentation" })).toHaveAttribute("href", "/acme/issues/mission-using-skill");
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

  it("explains backend offline network failures instead of showing the raw fetch error", async () => {
    const user = userEvent.setup();
    listBrowserCaptures.mockResolvedValue({ captures: [], total: 0 });
    createAiInboxMission.mockRejectedValue(new TypeError("Failed to fetch"));

    renderPage();

    await user.type(screen.getByLabelText("AI Inbox input"), "帮我整理这些 AI Agent 学习资料");
    await user.click(await screen.findByRole("button", { name: "创建 Mission" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining("后端暂时不可用")));
    expect(screen.getByRole("alert")).toHaveTextContent("make start-worktree");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Failed to fetch");
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
  }, 10_000);

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
  }, 10_000);
});
