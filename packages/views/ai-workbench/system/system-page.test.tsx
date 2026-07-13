import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SystemPage } from "./system-page";

vi.mock("@didian/core/paths", () => ({
  useWorkspacePaths: () => ({
    runtimes: () => "/acme/runtimes",
    settings: () => "/acme/settings",
    agents: () => "/acme/agents",
    skills: () => "/acme/skills",
    squads: () => "/acme/squads",
    autopilots: () => "/acme/autopilots",
  }),
}));

vi.mock("../../navigation", () => ({
  AppLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("SystemPage", () => {
  it("links advanced AI surfaces through System instead of main navigation", () => {
    render(<SystemPage />);

    expect(screen.getByRole("link", { name: /Agents/i })).toHaveAttribute("href", "/acme/agents");
    expect(screen.getByRole("link", { name: /Skills/i })).toHaveAttribute("href", "/acme/skills");
    expect(screen.getByRole("link", { name: /Squads/i })).toHaveAttribute("href", "/acme/squads");
    expect(screen.getByRole("link", { name: /Autopilots/i })).toHaveAttribute("href", "/acme/autopilots");
  });

  it("links runtime and settings infrastructure", () => {
    render(<SystemPage />);

    expect(screen.getByRole("link", { name: /Nodes/i })).toHaveAttribute("href", "/acme/runtimes");
    expect(screen.getByRole("link", { name: /Settings/i })).toHaveAttribute("href", "/acme/settings");
  });
});
