import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@didian/views/issues/components", () => ({
  IssuesPage: ({ title }: { title?: string }) => (
    <div data-testid="issues-page">{title}</div>
  ),
}));

describe("missions route page", () => {
  it("renders the shared issues page as Missions", () => {
    render(<Page />);

    expect(screen.getByTestId("issues-page")).toHaveTextContent("Missions");
  });
});
