import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ResourceTask } from "../mock-data";
import { ResourceTaskBoard } from "./resource-task-board";

vi.mock("@didian/ui/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const tasks: ResourceTask[] = [
  {
    id: "rp-1",
    title: "长标题资源任务会被稳定渲染而不挤坏看板",
    objective: "整理一批浏览器标签、下载文件和笔记，输出结构化资源索引。",
    status: "needs_confirmation",
    sourceCount: 12,
    resourceCount: 18,
    duplicateCount: 3,
    riskCount: 1,
    runtime: "MacBook Pro / Codex",
    progress: 72,
    currentStep: "等待确认写入方案",
  },
  {
    id: "rp-2",
    title: "浏览器自动化资料包",
    objective: "聚类 Stagehand 和 browser-use 相关材料。",
    status: "scanning",
    sourceCount: 8,
    resourceCount: 11,
    duplicateCount: 1,
    riskCount: 0,
    runtime: "ThinkPad / Claude Code",
    progress: 46,
    currentStep: "提取文档和仓库链接",
  },
  {
    id: "rp-3",
    title: "竞品功能截图归档",
    objective: "把截图和说明文档归档到 Demo 目录。",
    status: "indexed",
    sourceCount: 15,
    resourceCount: 22,
    duplicateCount: 5,
    riskCount: 0,
    runtime: "Mac mini / Cursor Agent",
    progress: 100,
    currentStep: "已入库",
  },
];

describe("ResourceTaskBoard", () => {
  it("renders board metrics and task statuses", () => {
    render(<ResourceTaskBoard tasks={tasks} selectedId="rp-1" />);

    const board = screen.getByLabelText("资源任务看板");
    expect(board).toBeInTheDocument();
    expect(screen.getByLabelText("任务: 3")).toBeInTheDocument();
    expect(screen.getByLabelText("待确认: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("已入库: 1")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "待确认 1 个任务" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "扫描中 1 个任务" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "已入库 1 个任务" })).toBeInTheDocument();
    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);
    expect(screen.getAllByText("扫描中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已入库").length).toBeGreaterThan(0);
    expect(screen.getByText("长标题资源任务会被稳定渲染而不挤坏看板")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro / Codex")).toBeInTheDocument();
    expect(screen.getByText("等待确认写入方案")).toBeInTheDocument();
  });

  it("marks the selected task and reports clicked tasks", async () => {
    const onSelectTask = vi.fn();
    const user = userEvent.setup();

    render(<ResourceTaskBoard tasks={tasks} selectedId="rp-2" onSelectTask={onSelectTask} />);

    expect(screen.getByRole("button", { name: /浏览器自动化资料包/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /竞品功能截图归档/i }));

    expect(onSelectTask).toHaveBeenCalledWith(tasks[2]);
  });
});
