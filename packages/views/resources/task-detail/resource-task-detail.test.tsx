import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { resourceTaskDetails, resourceTasks } from "../mock-data";
import { ResourceTaskDetail } from "./resource-task-detail";

vi.mock("@multica/ui/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("../../common/markdown", () => ({
  Markdown: ({ children }: { children: ReactNode }) => <div data-testid="markdown-preview">{children}</div>,
}));

describe("ResourceTaskDetail", () => {
  it("renders a needs-confirmation task with plan checkpoints, clusters, actions, and markdown artifacts", async () => {
    const task = resourceTasks.find((item) => item.status === "needs_confirmation")!;
    const user = userEvent.setup();

    render(<ResourceTaskDetail task={task} detail={resourceTaskDetails[task.id]!} />);

    expect(screen.getByRole("main", { name: /AI Agent 项目调研详情/ })).toBeInTheDocument();
    expect(screen.getByText("需要确认")).toBeInTheDocument();
    expect(screen.getByText("动态任务图")).toBeInTheDocument();
    expect(screen.getByText("确认写入")).toBeInTheDocument();
    expect(screen.getByText("browser-use")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "确认操作" }));

    expect(screen.getByText("等待用户确认后写入云盘")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行安全操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑方案" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "生成文件" }));

    expect(screen.getByRole("tab", { name: "资源索引.md" })).toBeInTheDocument();
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("browser-use");
  });

  it("renders an indexed task as completed without confirmation buttons", async () => {
    const task = resourceTasks.find((item) => item.status === "indexed")!;
    const user = userEvent.setup();

    render(<ResourceTaskDetail task={task} detail={resourceTaskDetails[task.id]!} />);

    expect(screen.getByText("已入库")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "确认操作" }));

    expect(screen.getByText("已完成入库，可直接追问资源库")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "执行安全操作" })).not.toBeInTheDocument();
    expect(screen.getByText("入库完成")).toBeInTheDocument();
  });

  it("does not inject artifact markdown as raw html", async () => {
    const task = resourceTasks[0]!;
    const user = userEvent.setup();
    const detail = {
      ...resourceTaskDetails[task.id]!,
      artifacts: [
        {
          name: "恶意样例.md",
          description: "验证 Markdown 渲染不会执行脚本",
          markdown: "# 安全预览\n\n<script>alert('xss')</script>",
        },
      ],
    };

    const { container } = render(<ResourceTaskDetail task={task} detail={detail} />);

    await user.click(screen.getByRole("tab", { name: "生成文件" }));

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByTestId("markdown-preview")).toHaveTextContent("<script>alert('xss')</script>");
  });
});
