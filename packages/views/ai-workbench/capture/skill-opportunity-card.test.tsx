import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SkillOpportunityCard, confidenceLabel } from "./skill-opportunity-card";
import type { SkillOpportunity } from "@didian/core/browser-memory";

const sample: SkillOpportunity = {
  shouldSuggest: true,
  confidence: 0.88,
  pageType: "github_repo",
  proposedTitle: "解读 GitHub 仓库",
  proposedCapability: "把一个 GitHub 仓库的 README 和结构总结成上手指南。",
  whyUseful: "你经常收藏开源项目，但很少回头看。",
  directionQuestions: ["主要用于选型还是上手？"],
  triggerExamples: ["帮我看下这个仓库在做什么"],
  expectedInputs: ["仓库 URL"],
  expectedOutputs: ["上手指南"],
  reusableWorkflowScore: 0.9,
  instructionDensityScore: 0.8,
  futureUseScore: 0.85,
  evidenceSnippets: ["README 中描述了安装步骤"],
  riskNotes: ["部分仓库需鉴权"],
};

describe("SkillOpportunityCard", () => {
  it("renders the proposed title, capability and page type", () => {
    render(<SkillOpportunityCard opportunity={sample} domain="github.com" />);
    expect(screen.getByText("这个网页可以变成一个个人 Skill")).toBeTruthy();
    expect(screen.getByText("「解读 GitHub 仓库」")).toBeTruthy();
    expect(screen.getByText("开源仓库")).toBeTruthy();
    expect(screen.getByText("github.com")).toBeTruthy();
    expect(screen.getByText("高")).toBeTruthy();
    expect(screen.getByText("主要用于选型还是上手？")).toBeTruthy();
  });

  it("disables generate button and shows pending copy when onGenerate is omitted", () => {
    render(<SkillOpportunityCard opportunity={sample} domain="github.com" />);
    const generate = screen.getByRole("button", { name: "生成 Skill" }) as HTMLButtonElement;
    expect(generate.disabled).toBe(true);
    expect(screen.getByText("Skill 草稿生成即将上线")).toBeTruthy();
  });

  it("enables generate button when onGenerate is provided", () => {
    const onGenerate = vi.fn();
    render(<SkillOpportunityCard opportunity={sample} domain="github.com" onGenerate={onGenerate} />);
    const generate = screen.getByRole("button", { name: "生成 Skill" }) as HTMLButtonElement;
    expect(generate.disabled).toBe(false);
    fireEvent.click(generate);
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("calls onMutePageType with the opportunity page type", () => {
    const onMutePageType = vi.fn();
    render(<SkillOpportunityCard opportunity={sample} domain="github.com" onMutePageType={onMutePageType} />);
    fireEvent.click(screen.getByRole("button", { name: "以后少推荐这类" }));
    expect(onMutePageType).toHaveBeenCalledWith("github_repo");
  });

  it("calls onKeepAsKnowledge when the keep button is clicked", () => {
    const onKeepAsKnowledge = vi.fn();
    render(<SkillOpportunityCard opportunity={sample} domain="github.com" onKeepAsKnowledge={onKeepAsKnowledge} />);
    fireEvent.click(screen.getByRole("button", { name: "收藏为知识" }));
    expect(onKeepAsKnowledge).toHaveBeenCalledOnce();
  });
});

describe("confidenceLabel", () => {
  it("maps confidence to high / higher / medium", () => {
    expect(confidenceLabel(0.9)).toBe("高");
    expect(confidenceLabel(0.8)).toBe("较高");
    expect(confidenceLabel(0.5)).toBe("中");
  });
});
