"use client";

import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  FolderOpen,
  GitBranch,
  Globe2,
  HardDrive,
  Link2,
  ListChecks,
  Monitor,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@multica/ui/components/ui/badge";
import { Button } from "@multica/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@multica/ui/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@multica/ui/components/ui/resizable";
import { ScrollArea } from "@multica/ui/components/ui/scroll-area";
import { Separator } from "@multica/ui/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@multica/ui/components/ui/tabs";
import { cn } from "@multica/ui/lib/utils";
import { PageHeader } from "../layout/page-header";
import {
  artifacts,
  proposedActions,
  resourceClusters,
  resourceTasks,
  taskSteps,
  type ResourceTask,
} from "./mock-data";
import { ResourceTaskBoard } from "./task-board/resource-task-board";

export function ResourcesWorkbenchPage() {
  const selected = resourceTasks[0]!;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PageHeader className="h-12 gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-md border bg-muted text-foreground">
            <Archive className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">Didian 资源任务</h1>
            <p className="truncate text-xs text-muted-foreground">浏览器采集、本地 Agent 执行、确认后入库</p>
          </div>
        </div>
        <Button size="sm" variant="outline">
          <Search className="size-4" />
          导入标签组
        </Button>
        <Button size="sm">
          <Play className="size-4" />
          新建整理任务
        </Button>
      </PageHeader>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={27} minSize={22} className="min-w-[280px]">
          <ResourceTaskBoard tasks={resourceTasks} selectedId={selected.id} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={45} minSize={34}>
          <TaskDetail task={selected} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={28} minSize={22} className="min-w-[300px]">
          <RightRail />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function TaskDetail({ task }: { task: ResourceTask }) {
  return (
    <main className="flex h-full min-h-0 flex-col">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{task.id}</span>
              <ChevronRight className="size-3" />
              <span>{task.runtime}</span>
            </div>
            <h2 className="mt-2 truncate text-base font-medium">{task.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{task.objective}</p>
          </div>
          <Badge variant="outline" className="border-warning/25 bg-warning/10 text-warning">
            需要确认
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <section className="grid gap-3 lg:grid-cols-3">
            <Kpi icon={Globe2} label="捕获来源" value="12" description="当前窗口标签组" />
            <Kpi icon={GitBranch} label="资源聚类" value="6" description="3 组重复已合并" />
            <Kpi icon={ShieldCheck} label="安全动作" value="11" description="1 项需要人工确认" />
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-primary" />
                动态任务图
              </CardTitle>
            <CardDescription>按 Cult UI 的 AI workflow pattern 组织执行步骤、证据和确认门。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {taskSteps.map((step, index) => (
                  <div key={step.label} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <StepIcon state={step.state} />
                      <span className="text-xs text-muted-foreground">Step {index + 1}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{step.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="clusters">
            <TabsList variant="line">
              <TabsTrigger value="clusters">资源聚类</TabsTrigger>
              <TabsTrigger value="actions">确认操作</TabsTrigger>
              <TabsTrigger value="artifacts">生成文件</TabsTrigger>
            </TabsList>
            <TabsContent value="clusters" className="mt-3">
              <div className="space-y-2">
                {resourceClusters.map((cluster) => (
                  <Card key={cluster.name} size="sm">
                    <CardContent className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
                      <div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="size-4 text-muted-foreground" />
                          <span className="font-medium">{cluster.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{cluster.type}</p>
                      </div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        <p>证据：{cluster.evidence}</p>
                        <p className="text-foreground">建议：{cluster.action}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="actions" className="mt-3">
              <ConfirmationPanel />
            </TabsContent>
            <TabsContent value="artifacts" className="mt-3">
              <ArtifactGrid />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </main>
  );
}

function RightRail() {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-muted/20">
      <div className="border-b p-4">
        <div className="text-sm font-medium">执行与入库</div>
        <p className="mt-1 text-xs text-muted-foreground">本地 Runtime、日志、Mock Drive 和追问入口。</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Monitor className="size-4" />
                本地 Runtime
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
                写入前确认
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConfirmationPanel compact />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <HardDrive className="size-4" />
                Mock Drive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <FileTreeRow icon={FolderOpen} label="参赛项目" depth={0} />
              <FileTreeRow icon={FolderOpen} label="AI Agent 调研" depth={1} active />
              {artifacts.map((artifact) => (
                <FileTreeRow key={artifact} icon={FileText} label={artifact} depth={2} />
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="size-4" />
                资源库追问
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <PromptChip text="哪些项目适合复用前端？" />
              <PromptChip text="哪个浏览器 Agent 最适合接入？" />
              <PromptChip text="哪些许可证适合商业化？" />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
}

function ConfirmationPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 text-warning" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">等待用户确认后写入云盘</div>
          <p className="mt-1 text-xs text-muted-foreground">所有操作先走 adapter，MVP 禁用 destructive actions。</p>
        </div>
      </div>
      <Separator className="my-3" />
      <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
        {proposedActions.slice(0, compact ? 3 : proposedActions.length).map((action) => (
          <li key={action} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1">
          执行安全操作
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          编辑方案
        </Button>
      </div>
    </div>
  );
}

function ArtifactGrid() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {artifacts.map((artifact) => (
        <Card key={artifact} size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{artifact}</div>
              <div className="text-xs text-muted-foreground">包含来源引用和整理结论</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md border bg-muted">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-lg font-medium tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label} · {description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepIcon({ state }: { state: (typeof taskSteps)[number]["state"] }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-success" />;
  if (state === "active") return <Clock3 className="size-4 text-warning" />;
  if (state === "waiting") return <CircleAlert className="size-4 text-warning" />;
  return <div className="size-4 rounded-full border bg-muted" />;
}

function RuntimeRow({
  name,
  version,
  state,
  active,
}: {
  name: string;
  version: string;
  state: string;
  active?: boolean;
}) {
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

function FileTreeRow({
  icon: Icon,
  label,
  depth,
  active,
}: {
  icon: typeof FileText;
  label: string;
  depth: number;
  active?: boolean;
}) {
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
