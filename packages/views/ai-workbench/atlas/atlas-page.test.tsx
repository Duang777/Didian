import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AtlasPage } from "./atlas-page";

describe("AtlasPage", () => {
  it("renders an Atlas shell with built-in capability entry points and a collection preview", () => {
    render(<AtlasPage />);

    expect(screen.getByRole("heading", { name: "Atlas" })).toBeInTheDocument();
    expect(screen.getByText("Ask Atlas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generate" })).toBeInTheDocument();
    expect(screen.getByText("AI Agent 学习资料包")).toBeInTheDocument();
    expect(screen.getByText("browser-use 项目")).toBeInTheDocument();
    expect(screen.getByText(/GitHub:/)).toBeInTheDocument();
  });
});
