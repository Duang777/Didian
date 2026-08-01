// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoreProvider } from "./core-provider";

vi.mock("./auth-initializer", () => ({
  AuthInitializer: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-initializer">{children}</div>
  ),
}));

vi.mock("../realtime", () => ({
  WSProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="ws-provider">{children}</div>
  ),
}));

const resources = { common: {} };

describe("CoreProvider", () => {
  it("mounts auth and realtime bootstrap by default", () => {
    render(
      <CoreProvider locale="en" resources={resources}>
        <div>App content</div>
      </CoreProvider>,
    );

    expect(screen.getByTestId("auth-initializer")).toBeTruthy();
    expect(screen.getByTestId("ws-provider")).toBeTruthy();
    expect(screen.getByText("App content")).toBeTruthy();
  });

  it("skips auth and realtime bootstrap for static previews", () => {
    render(
      <CoreProvider locale="en" resources={resources} skipAuthInit>
        <div>Preview content</div>
      </CoreProvider>,
    );

    expect(screen.queryByTestId("auth-initializer")).toBeNull();
    expect(screen.queryByTestId("ws-provider")).toBeNull();
    expect(screen.getByText("Preview content")).toBeTruthy();
  });
});
