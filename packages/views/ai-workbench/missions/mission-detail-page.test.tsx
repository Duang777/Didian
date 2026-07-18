import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MissionDetailPage } from "./mission-detail-page";

vi.mock("../../common/markdown", () => ({
  Markdown: ({ children }: { children: string }) => <div data-testid="markdown-preview">{children}</div>,
}));

describe("MissionDetailPage workspace", () => {
  it("opens the Mission workspace on mission.md by default", () => {
    render(<MissionDetailPage missionId="mission-ai-agent-pack" />);

    expect(screen.getAllByRole("heading", { name: "AI Agent 项目调研" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "mission.md" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("## Agent 工作目标");
    expect(screen.getByText("当前文档")).toBeInTheDocument();
    expect(screen.getByText("当前 Workspace")).toBeInTheDocument();
  });

  it("switches between source and output workspace files", () => {
    render(<MissionDetailPage missionId="mission-ai-agent-pack" />);

    fireEvent.click(screen.getByRole("button", { name: "sources/stagehand.md" }));
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("Stagehand documentation");
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("docs.stagehand.dev");

    fireEvent.click(screen.getByRole("button", { name: "outputs/项目对比表.md" }));
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("# 项目对比表");
  });

  it("toggles Agent context scopes", () => {
    render(<MissionDetailPage missionId="mission-ai-agent-pack" />);

    const atlasScope = screen.getByRole("checkbox", { name: /整个 Atlas/ });
    expect(atlasScope).not.toBeChecked();

    fireEvent.click(atlasScope);

    expect(screen.getByRole("checkbox", { name: /整个 Atlas/ })).toBeChecked();
  });

  it("simulates writing an artifact back into an output file", () => {
    render(<MissionDetailPage missionId="mission-ai-agent-pack" />);

    const outputs = screen.getByLabelText("Workspace outputs");
    fireEvent.click(within(outputs).getByRole("button", { name: "写回 资源索引" }));

    expect(screen.getByRole("button", { name: "outputs/资源索引.md" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("已从 Mission artifact 写回");
  });
});
