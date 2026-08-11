import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillCenterPage } from "./skill-center-page";

const sampleProposal = {
  id: "prop-1",
  workspace_id: "ws-1",
  captured_source_id: "cap-1",
  proposed_title: "GitHub 仓库尽调助手",
  proposed_capability: "检查 README、license、安装方式和维护活跃度",
  page_type: "github_repo",
  confidence: 0.91,
  why_useful: "这类仓库经常需要重复判断是否值得采用",
  trigger_examples: ["打开一个 GitHub 仓库页面"],
  expected_inputs: ["仓库 URL"],
  expected_outputs: ["采用建议"],
  reusable_workflow_score: 0.8,
  instruction_density_score: 0.9,
  future_use_score: 0.8,
  evidence_snippets: ["README 提供安装步骤"],
  risk_notes: ["没有 license 需要谨慎"],
  draft_description: "检查仓库是否值得采用",
  draft_trigger: "打开 GitHub 仓库时",
  draft_instructions: "先看 README，再看 license",
  status: "draft" as const,
  created_at: "2026-08-11T00:00:00Z",
  updated_at: "2026-08-11T00:00:00Z",
};

const sampleSkill = {
  id: "skill-1",
  workspace_id: "ws-1",
  proposal_id: "prop-1",
  name: "GitHub 仓库尽调助手",
  description: "检查 README、license、安装方式和维护活跃度",
  capability: "把仓库变成可复用的采用判断流程",
  page_type: "github_repo",
  trigger: "打开仓库页面",
  expected_input: "仓库 URL",
  expected_output: "采用建议",
  instructions: "先看 README，再看 license",
  source_url: "https://github.com/acme/demo",
  source_domain: "github.com",
  evidence_snippets: ["README 提供安装步骤"],
  risk_notes: ["没有 license 需要谨慎"],
  enabled: true,
  use_count: 3,
  created_at: "2026-08-11T00:00:00Z",
  updated_at: "2026-08-11T00:00:00Z",
};

const proposalDelete = { mutateAsync: vi.fn(), isPending: false };
const skillDelete = { mutateAsync: vi.fn(), isPending: false };
const skillUse = { mutateAsync: vi.fn(), isPending: false };
const routerPush = vi.fn();

vi.mock("@didian/core/browser-memory", () => ({
  useSkillProposals: () => ({ data: [sampleProposal], isLoading: false }),
  usePersonalSkills: () => ({ data: [sampleSkill], isLoading: false }),
  useDeleteSkillProposal: () => proposalDelete,
  useDeletePersonalSkill: () => skillDelete,
  useUsePersonalSkill: () => skillUse,
}));

vi.mock("@didian/core/paths", () => ({
  useRequiredWorkspaceSlug: () => "ws-slug",
  paths: {
    workspace: (slug: string) => ({
      skills: () => `/${slug}/skills`,
      aiInbox: () => `/${slug}/ai-inbox`,
      skillProposal: (id: string) => `/${slug}/skill-proposals/${id}`,
    }),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SkillCenterPage />
    </QueryClientProvider>,
  );
}

describe("SkillCenterPage", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("renders drafts and personal skills", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "个人 Skill 库" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Skill 草稿" })).toBeTruthy();
    expect(screen.getAllByText("GitHub 仓库尽调助手")).toHaveLength(2);
  });

  it("opens the review page from a draft card", async () => {
    renderPage();
    fireEvent.click(screen.getAllByText("打开审阅").at(0)!);
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith("/ws-slug/skill-proposals/prop-1"),
    );
  });

  it("records a use event for a personal skill", async () => {
    renderPage();
    fireEvent.click(screen.getAllByText("使用一次").at(0)!);
    await waitFor(() => expect(skillUse.mutateAsync).toHaveBeenCalledWith("skill-1"));
  });
});
