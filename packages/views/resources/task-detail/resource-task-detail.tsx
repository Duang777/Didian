import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  FolderOpen,
  GitBranch,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@didian/ui/components/ui/card";
import { ScrollArea } from "@didian/ui/components/ui/scroll-area";
import { Separator } from "@didian/ui/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@didian/ui/components/ui/tabs";
import { cn } from "@didian/ui/lib/utils";
import { ArtifactPreview } from "../artifacts/artifact-preview";
import type { ResourceTask, ResourceTaskDetail, ResourceTaskStatus, ResourceTaskStepState } from "../mock-data";

const COPY = {
  kpis: {
    sources: { label: "捕获来源", description: "浏览器和下载线索" },
    clusters: { label: "资源聚类", duplicateSuffix: "组重复已处理" },
    actions: { label: "安全动作", riskSuffix: "项风险" },
  },
  planTitle: "动态任务图",
  stepPrefix: "Step",
  tabs: {
    clusters: "资源聚类",
    actions: "确认操作",
    timeline: "执行时间线",
    artifacts: "生成文件",
  },
  clusterEvidence: "证据：",
  clusterAction: "建议：",
  emptyActions: "等待 Agent 生成建议操作。",
  executeAction: "执行安全操作",
  editPlan: "编辑方案",
};

const statusMeta = {
  needs_confirmation: {
    label: "需要确认",
    className: "border-warning/25 bg-warning/10 text-warning",
    confirmationTitle: "等待用户确认后写入云盘",
    confirmationDescription: "所有操作先走 adapter，MVP 禁用 destructive actions。",
  },
  scanning: {
    label: "扫描中",
    className: "border-info/25 bg-info/10 text-info",
    confirmationTitle: "正在生成写入方案",
    confirmationDescription: "资源提取完成后才会开启确认门。",
  },
  indexed: {
    label: "已入库",
    className: "border-success/25 bg-success/10 text-success",
    confirmationTitle: "已完成入库，可直接追问资源库",
    confirmationDescription: "安全操作已经写入 Mock Drive，artifact 可继续预览。",
  },
} satisfies Record<ResourceTaskStatus, { label: string; className: string; confirmationTitle: string; confirmationDescription: string }>;

export type ResourceTaskDetailProps = {
  task: ResourceTask;
  detail: ResourceTaskDetail;
};

export function ResourceTaskDetail({ task, detail }: ResourceTaskDetailProps) {
  const meta = statusMeta[task.status];

  return (
    <main className="flex h-full min-h-0 flex-col" aria-label={`${task.title}详情`}>
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
          <Badge variant="outline" className={cn("shrink-0", meta.className)}>
            {meta.label}
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <section className="grid gap-3 lg:grid-cols-3">
            <Kpi icon={Globe2} label={COPY.kpis.sources.label} value={String(task.sourceCount)} description={COPY.kpis.sources.description} />
            <Kpi
              icon={GitBranch}
              label={COPY.kpis.clusters.label}
              value={String(detail.clusters.length)}
              description={`${task.duplicateCount} ${COPY.kpis.clusters.duplicateSuffix}`}
            />
            <Kpi
              icon={ShieldCheck}
              label={COPY.kpis.actions.label}
              value={String(detail.proposedActions.length)}
              description={`${task.riskCount} ${COPY.kpis.actions.riskSuffix}`}
            />
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-primary" />
                {COPY.planTitle}
              </CardTitle>
              <CardDescription>{detail.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {detail.steps.map((step, index) => (
                  <div key={step.label} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <StepIcon state={step.state} />
                      <span className="text-xs text-muted-foreground">{COPY.stepPrefix} {index + 1}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{step.label}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{step.description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="clusters">
            <TabsList variant="line">
              <TabsTrigger value="clusters">{COPY.tabs.clusters}</TabsTrigger>
              <TabsTrigger value="actions">{COPY.tabs.actions}</TabsTrigger>
              <TabsTrigger value="timeline">{COPY.tabs.timeline}</TabsTrigger>
              <TabsTrigger value="artifacts">{COPY.tabs.artifacts}</TabsTrigger>
            </TabsList>
            <TabsContent value="clusters" className="mt-3">
              <ResourceClusterList detail={detail} />
            </TabsContent>
            <TabsContent value="actions" className="mt-3">
              <ConfirmationPanel task={task} detail={detail} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-3">
              <Timeline detail={detail} />
            </TabsContent>
            <TabsContent value="artifacts" className="mt-3">
              <ArtifactPreview artifacts={detail.artifacts} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </main>
  );
}

function ResourceClusterList({ detail }: { detail: ResourceTaskDetail }) {
  return (
    <div className="space-y-2">
      {detail.clusters.map((cluster) => (
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
              <p>{COPY.clusterEvidence}{cluster.evidence}</p>
              <p className="text-foreground">{COPY.clusterAction}{cluster.action}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ConfirmationPanel({ task, detail, compact = false }: { task: ResourceTask; detail: ResourceTaskDetail; compact?: boolean }) {
  const meta = statusMeta[task.status];
  const isActionable = task.status === "needs_confirmation";
  const icon = task.status === "indexed" ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <CircleAlert className="mt-0.5 size-4 text-warning" />;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{meta.confirmationTitle}</div>
          <p className="mt-1 text-xs text-muted-foreground">{meta.confirmationDescription}</p>
        </div>
      </div>
      <Separator className="my-3" />
      <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
        {detail.proposedActions.slice(0, compact ? 3 : detail.proposedActions.length).map((action) => (
          <li key={action} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
            <span>{action}</span>
          </li>
        ))}
        {detail.proposedActions.length === 0 ? <li>{COPY.emptyActions}</li> : null}
      </ul>
      {isActionable ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1">
            {COPY.executeAction}
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            {COPY.editPlan}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ detail }: { detail: ResourceTaskDetail }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        {detail.timeline.map((event) => (
          <div key={`${event.time}-${event.title}`} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
            <div className="tabular-nums text-xs text-muted-foreground">{event.time}</div>
            <div className="min-w-0 border-l pl-3">
              <div className="font-medium">{event.title}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{event.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, description }: { icon: typeof Globe2; label: string; value: string; description: string }) {
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

function StepIcon({ state }: { state: ResourceTaskStepState }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-success" />;
  if (state === "active") return <Clock3 className="size-4 text-warning" />;
  if (state === "waiting") return <CircleAlert className="size-4 text-warning" />;
  return <div className="size-4 rounded-full border bg-muted" />;
}

export function CompactArtifactList({ artifacts }: { artifacts: ResourceTaskDetail["artifacts"] }) {
  return (
    <div className="space-y-2 text-sm">
      {artifacts.map((artifact) => (
        <div key={artifact.name} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{artifact.name}</span>
        </div>
      ))}
    </div>
  );
}
