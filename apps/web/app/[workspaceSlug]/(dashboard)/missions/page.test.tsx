import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "./page";

describe("missions route page", () => {
  it("renders the redesigned missions surface", () => {
    render(<Page />);

    expect(screen.getAllByText("Mission command center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stage map").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mission context").length).toBeGreaterThan(0);
  });
});
