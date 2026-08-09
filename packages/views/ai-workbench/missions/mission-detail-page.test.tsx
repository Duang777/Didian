import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionDetailPage } from "./mission-detail-page";

describe("MissionDetailPage", () => {
  it("renders a focused mission console with plan trace and context sections", () => {
    render(<MissionDetailPage missionId="mission-ai-agent-pack" />);

    expect(screen.getAllByText("整理 AI Agent 学习资料包").length).toBeGreaterThan(0);
    expect(screen.getByText("Mission command strip")).toBeInTheDocument();
    expect(screen.getByText("Plan trace")).toBeInTheDocument();
    expect(screen.getByText("Mission context")).toBeInTheDocument();
    expect(screen.getByText("Review queue")).toBeInTheDocument();
    expect(screen.getByText("Atlas bridge")).toBeInTheDocument();
    expect(screen.getByText("Stage note")).toBeInTheDocument();
  });
});
