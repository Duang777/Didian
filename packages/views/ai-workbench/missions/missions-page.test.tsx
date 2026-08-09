import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissionsPage } from "./missions-page";

describe("MissionsPage", () => {
  it("renders a command-center style missions surface with stage and context rails", () => {
    render(<MissionsPage />);

    expect(screen.getByRole("heading", { name: "Missions" })).toBeInTheDocument();
    expect(screen.getByText("Mission command center")).toBeInTheDocument();
    expect(screen.getByText("Stage map")).toBeInTheDocument();
    expect(screen.getByText("Design notes")).toBeInTheDocument();
    expect(screen.getByText("整理 AI Agent 学习资料包")).toBeInTheDocument();
    expect(screen.getByText("诊断失败资源")).toBeInTheDocument();
    expect(screen.getAllByText("Plan trace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mission context").length).toBeGreaterThan(0);
  });
});
