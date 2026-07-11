import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ResourcesWorkbenchPage } from "./resources-workbench-page";

vi.mock("@multica/ui/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

vi.mock("@multica/ui/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("../common/markdown", () => ({
  Markdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("ResourcesWorkbenchPage", () => {
  it("opens the clicked resource task in the detail panel", async () => {
    const user = userEvent.setup();

    render(<ResourcesWorkbenchPage />);

    expect(screen.getByRole("main", { name: /AI Agent 项目调研详情/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /竞品功能截图归档/ }));

    expect(screen.getByRole("main", { name: /竞品功能截图归档详情/ })).toBeInTheDocument();
    expect(screen.getByText("已完成入库，可直接追问资源库")).toBeInTheDocument();
  });
});
