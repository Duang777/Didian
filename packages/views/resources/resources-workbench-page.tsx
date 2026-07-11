"use client";

import { useState } from "react";
import { Archive, Bot, FileText, FolderOpen, HardDrive, Link2, ListChecks, Monitor, Play, Search } from "lucide-react";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@didian/ui/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@didian/ui/components/ui/resizable";
import { ScrollArea } from "@didian/ui/components/ui/scroll-area";
import { cn } from "@didian/ui/lib/utils";
import { PageHeader } from "../layout/page-header";
import { resourceTaskDetails, resourceTasks, type ResourceTask } from "./mock-data";
import { ResourceTaskBoard } from "./task-board/resource-task-board";
import { CompactArtifactList, ConfirmationPanel, ResourceTaskDetail } from "./task-detail/resource-task-detail";

const COPY = {
  title: "Didian 资源任务",
  subtitle: "浏览器采集、本地 Agent 执行、确认后入库",
  importTabs: "导入标签组",
  createTask: "新建整理任务",
  railTitle: "执行与入库",
  railSubtitle: "本地 Runtime、日志、Mock Drive 和追问入口。",
  runtimeTitle: "本地 Runtime",
  confirmationTitle: "写入前确认",
  driveTitle: "Mock Drive",
  driveRoot: "参赛项目",
  askTitle: "资源库追问",
  prompts: ["哪些项目适合复用前端？", "哪个浏览器 Agent 最适合接入？", "哪些许可证适合商业化？"],
};

export function ResourcesWorkbenchPage() {
  const [selectedId, setSelectedId] = useState(resourceTasks[0]!.id);
  const selected = resourceTasks.find((task) => task.id === selectedId) ?? resourceTasks[0]!;
  const selectedDetail = resourceTaskDetails[selected.id]!;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PageHeader className="h-12 gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-md border bg-muted text-foreground">
            <Archive className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">{COPY.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{COPY.subtitle}</p>
          </div>
        </div>
        <Button size="sm" variant="outline">
          <Search className="size-4" />
          {COPY.importTabs}
        </Button>
        <Button size="sm">
          <Play className="size-4" />
          {COPY.createTask}
        </Button>
      </PageHeader>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={27} minSize={22} className="min-w-[280px]">
          <ResourceTaskBoard tasks={resourceTasks} selectedId={selected.id} onSelectTask={(task) => setSelectedId(task.id)} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45} minSize={34}>
          <ResourceTaskDetail task={selected} detail={selectedDetail} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={28} minSize={22} className="min-w-[300px]">
          <RightRail selected={selected} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function RightRail({ selected }: { selected: ResourceTask }) {
  const detail = resourceTaskDetails[selected.id]!;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-muted/20">
      <div className="border-b p-4">
        <div className="text-sm font-medium">{COPY.railTitle}</div>
        <p className="mt-1 text-xs text-muted-foreground">{COPY.railSubtitle}</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Monitor className="size-4" />
                {COPY.runtimeTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <RuntimeRow name="Codex" version="v0.68" state="Ready" active />
              <RuntimeRow name="Claude Code" version="v1.2" state="Ready" />
              <RuntimeRow name="Cursor Agent" version="未检测到" state="Offline" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListChecks className="size-4" />
                {COPY.confirmationTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfirmationPanel task={selected} detail={detail} compact />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <HardDrive className="size-4" />
                {COPY.driveTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <FileTreeRow icon={FolderOpen} label={COPY.driveRoot} depth={0} />
              <FileTreeRow icon={FolderOpen} label={selected.title} depth={1} active />
              <CompactArtifactList artifacts={detail.artifacts} />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="size-4" />
                {COPY.askTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {COPY.prompts.map((prompt) => (
                <PromptChip key={prompt} text={prompt} />
              ))}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
}

function RuntimeRow({ name, version, state, active }: { name: string; version: string; state: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{version}</div>
      </div>
      <Badge variant="outline" className={active ? "border-success/25 bg-success/10 text-success" : ""}>
        {state}
      </Badge>
    </div>
  );
}

function FileTreeRow({ icon: Icon, label, depth, active }: { icon: typeof FileText; label: string; depth: number; active?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground",
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function PromptChip({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Link2 className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </button>
  );
}
