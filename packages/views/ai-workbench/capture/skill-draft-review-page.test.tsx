import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkillDraftReviewPage } from "./skill-draft-review-page";

const sampleProposal = {
  id: "prop-1",
  workspace_id: "ws-1",
  captured_source_id: "cap-1",
  proposed_title: "解读 GitHub 仓库",
  proposed_capability: "从 GitHub 仓库提取关键信息",
  page_type: "technical_doc",
  confidence: 0.88,
  why_useful: "快速理解开源项目结构",
  trigger_examples: ["打开一个 GitHub 仓库页面"],
  expected_inputs: ["GitHub 仓库 URL"],
  expected_outputs: ["项目摘要"],
  reusable_workflow_score: 0.8,
  instruction_density_score: 0.7,
  future_use_score: 0.9,
  evidence_snippets: ["README 中描述了安装步骤"],
  risk_notes: ["私有仓库需鉴权"],
  draft_description: "帮你读懂 GitHub 仓库",
  draft_trigger: "打开 GitHub 仓库时",
  draft_instructions: "先读 README",
  status: "pending" as const,
  created_at: "2026-08-11T00:00:00Z",
  updated_at: "2026-08-11T00:00:00Z",
};

const updateMutation = { mutateAsync: vi.fn().mockResolvedValue(sampleProposal), isPending: false };
const confirmMutation = { mutateAsync: vi.fn().mockResolvedValue({ ...sampleProposal, id: "ps-1" }), isPending: false };
const routerPush = vi.fn();

vi.mock("@didian/core/browser-memory", () => ({
  useSkillProposal: () => ({ data: sampleProposal, isLoading: false }),
  useUpdateSkillProposal: () => updateMutation,
  useConfirmSkillProposal: () => confirmMutation,
}));

vi.mock("@didian/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@didian/core/paths", () => ({
  useRequiredWorkspaceSlug: () => "ws-slug",
  paths: {
    workspace: (slug: string) => ({
      captureDetail: (id: string) => `/${slug}/captures/${id}`,
      aiInbox: () => `/${slug}/ai-inbox`,
      skillProposals: () => `/${slug}/skill-proposals`,
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
      <SkillDraftReviewPage proposalId="prop-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SkillDraftReviewPage", () => {
  it("renders the proposed title and editable draft fields", () => {
    renderPage();
    expect(screen.getByText("解读 GitHub 仓库")).toBeTruthy();
    const desc = screen.getByLabelText("Skill 描述") as HTMLTextAreaElement;
    expect(desc.value).toBe("帮你读懂 GitHub 仓库");
    expect(screen.getByLabelText("触发方式")).toHaveValue("打开 GitHub 仓库时");
  });

  it("enables the personal skill and navigates back to the capture", async () => {
    renderPage();
    fireEvent.click(screen.getByText("启用为个人 Skill"));
    await waitFor(() => expect(confirmMutation.mutateAsync).toHaveBeenCalledWith("prop-1"));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/ws-slug/skill-proposals"));
  });

  it("saves the draft when description is edited", async () => {
    renderPage();
    const desc = screen.getByLabelText("Skill 描述") as HTMLTextAreaElement;
    fireEvent.change(desc, { target: { value: "重写后的描述" } });
    fireEvent.click(screen.getByText("保存草稿"));
    await waitFor(() =>
      expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
        id: "prop-1",
        data: expect.objectContaining({ draft_description: "重写后的描述" }),
      }),
    );
  });
});
