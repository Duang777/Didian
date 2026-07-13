import { FileText, ListChecks } from "lucide-react";
import { demoMissions } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

export function MissionDetailPage({ missionId }: { missionId: string }) {
  const mission = demoMissions.find((item) => item.id === missionId) ?? demoMissions[0];

  if (!mission) {
    return (
      <WorkbenchShell
        icon={ListChecks}
        title="Mission"
        description="Mission 是 AI 规划和执行工作的核心单元。"
      >
        <WorkbenchSection title="未找到 Mission" description="当前 fixture 中没有可展示的 Mission。">
          <p className="text-sm text-muted-foreground">请从 Missions 队列进入一个已有 Mission。</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell
      icon={ListChecks}
      title={mission.title}
      description={mission.goal}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <WorkbenchSection title="AI Plan" description="Mission 详情会优先展示计划、证据和阻塞点。">
          <div className="space-y-2">
            {mission.plan.map((step, index) => (
              <div key={step.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">{index + 1}. {step.title}</h2>
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{step.state}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                {step.evidence && <p className="mt-2 rounded-sm bg-muted/60 px-2 py-1 text-xs text-muted-foreground">证据：{step.evidence}</p>}
              </div>
            ))}
          </div>
        </WorkbenchSection>

        <div className="space-y-4">
          <WorkbenchSection title="Review Queue">
            {mission.reviewItems.length > 0 ? (
              <div className="space-y-2">
                {mission.reviewItems.map((item) => (
                  <div key={item.id} className="rounded-md border bg-background p-3">
                    <div className="text-sm font-medium">{item.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无待确认决策。</p>
            )}
          </WorkbenchSection>

          <WorkbenchSection title="Artifacts">
            <div className="space-y-2">
              {mission.artifacts.map((artifact) => (
                <div key={artifact.id} className="flex items-start gap-2 rounded-md border bg-background p-3">
                  <FileText className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{artifact.name}</div>
                    <p className="text-xs text-muted-foreground">{artifact.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </WorkbenchSection>
        </div>
      </div>
    </WorkbenchShell>
  );
}
