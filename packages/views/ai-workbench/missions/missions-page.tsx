import { CheckCircle2, CircleAlert, ListChecks } from "lucide-react";
import { demoMissions } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const stateLabels: Record<string, string> = {
  understanding: "理解中",
  planned: "已规划",
  running: "执行中",
  review: "待确认",
  completed: "已完成",
  needs_attention: "需要介入",
};

const MISSIONS_COPY = {
  nextStep: "当前页面是 Mission 队列骨架，已准备好承接 AI Inbox 创建结果。",
} as const;

export function MissionsPage() {
  return (
    <WorkbenchShell
      icon={ListChecks}
      title="Missions"
      description="Mission 是 AI 规划和执行工作的核心单元。第一版复用 issue 能力，先用产品化视图展示目标、计划、Review 和产物。"
    >
      <div className="grid gap-3">
        {demoMissions.map((mission) => (
          <article key={mission.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-medium">{mission.title}</h2>
                  <span className="rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {stateLabels[mission.state]}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{mission.goal}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{mission.updatedAt}</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              {mission.plan.slice(0, 4).map((step) => (
                <div key={step.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-2">
                    {step.state === "blocked" ? <CircleAlert className="size-3.5 text-destructive" /> : <CheckCircle2 className="size-3.5 text-muted-foreground" />}
                    <span className="truncate text-xs font-medium">{step.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <WorkbenchSection title="下一步" description="后续会把这里接到真实 issue 列表和详情页，同时保留旧 issue route 作为兼容入口。">
        <p className="text-sm text-muted-foreground">{MISSIONS_COPY.nextStep}</p>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
