import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Layers3,
  Link2,
  ListChecks,
  Sparkles,
} from "lucide-react";
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

const stateTone: Record<string, string> = {
  understanding: "text-amber-700 dark:text-amber-300",
  planned: "text-sky-700 dark:text-sky-300",
  running: "text-emerald-700 dark:text-emerald-300",
  review: "text-violet-700 dark:text-violet-300",
  completed: "text-emerald-700 dark:text-emerald-300",
  needs_attention: "text-rose-700 dark:text-rose-300",
};

const stageNotes: Record<string, string> = {
  understanding: "正在把输入拆成可执行信息。",
  planned: "计划已经成型，等待推进。",
  running: "本地 Codex 正在执行和收敛产物。",
  review: "产物已经出来，等待你确认。",
  completed: "任务闭环，可继续沉淀为 Atlas 记忆。",
  needs_attention: "当前需要人工介入或补充上下文。",
};

function missionProgress(planStates: string[]) {
  const doneCount = planStates.filter((state) => state === "done").length;
  return Math.round((doneCount / planStates.length) * 100);
}

function stepTone(state: string) {
  switch (state) {
    case "done":
      return "text-emerald-700 dark:text-emerald-300";
    case "blocked":
      return "text-rose-700 dark:text-rose-300";
    case "active":
      return "text-amber-700 dark:text-amber-300";
    case "waiting":
      return "text-sky-700 dark:text-sky-300";
    default:
      return "text-muted-foreground";
  }
}

function stepLabel(state: string) {
  switch (state) {
    case "done":
      return "已完成";
    case "blocked":
      return "被阻塞";
    case "active":
      return "进行中";
    case "waiting":
      return "等待中";
    default:
      return "待开始";
  }
}

function riskLabel(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "low") return "低风险";
  if (riskLevel === "medium") return "中风险";
  return "高风险";
}

function riskTone(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (riskLevel === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function MissionDetailPage({ missionId }: { missionId: string }) {
  const mission = demoMissions.find((item) => item.id === missionId) ?? demoMissions[0];

  if (!mission) {
    return (
      <WorkbenchShell icon={ListChecks} title="Mission" description="Mission 是 AI 规划和执行工作的核心单元。">
        <WorkbenchSection title="未找到 Mission" description="当前 fixture 中没有可展示的 Mission。">
          <p className="text-sm text-muted-foreground">请从 Missions 队列进入一个已有 Mission。</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  const progress = missionProgress(mission.plan.map((step) => step.state));

  return (
    <WorkbenchShell
      icon={ListChecks}
      title={mission.title}
      description={mission.goal}
      contentClassName="max-w-none"
      descriptionClassName="max-w-4xl"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="space-y-4">
          <WorkbenchSection
            title="Mission command strip"
            description="这条顶部信息带把状态、进度和上下文先讲清楚。"
            className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-background via-background to-amber-50/40 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${stateTone[mission.state]} bg-background/80`}>
                    <Sparkles className="size-3.5" />
                    {stateLabels[mission.state]}
                  </span>
                  <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">{mission.updatedAt}</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-medium tracking-tight">{mission.title}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{mission.goal}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[300px]">
                <StatBlock label="输入" value={`${mission.inputs.length}`} />
                <StatBlock label="Review" value={`${mission.reviewItems.length}`} />
                <StatBlock label="产物" value={`${mission.artifacts.length}`} />
              </div>
            </div>
          </WorkbenchSection>

          <WorkbenchSection
            title="Plan trace"
            description="计划按执行轨迹展开，更像时间线，而不是传统卡片墙。"
            className="border-amber-200/60 bg-background/90 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                当前进度 <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                执行轨迹
              </div>
            </div>

            <div className="space-y-3">
              {mission.plan.map((step, index) => (
                <div key={step.id} className="relative rounded-2xl border bg-background/95 p-4 shadow-sm">
                  <div className="pointer-events-none absolute left-5 top-0 h-full w-px bg-border" aria-hidden="true" />
                  <div className="relative flex flex-col gap-3 pl-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="absolute left-3.5 top-1.5 flex size-4 items-center justify-center rounded-full border bg-background">
                        {step.state === "blocked" ? (
                          <CircleAlert className="size-3 text-rose-500" />
                        ) : step.state === "done" ? (
                          <CheckCircle2 className="size-3 text-emerald-600" />
                        ) : (
                          <span className="size-2 rounded-full bg-amber-500" />
                        )}
                      </span>
                      <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <span className={`text-xs font-medium ${stepTone(step.state)}`}>{stepLabel(step.state)}</span>
                    </div>

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-sm font-medium">{step.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {step.state === "done" ? "已完成" : step.state === "blocked" ? "当前阻塞" : "继续推进"}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                    {step.evidence && (
                      <div className="rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">证据：</span>
                        {step.evidence}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </WorkbenchSection>
        </div>

        <aside className="space-y-4">
          <WorkbenchSection
            title="Mission context"
            description="把输入、Review 和产物收在一起，方便在右侧快速扫一眼。"
            className="sticky top-4 border-amber-200/70 bg-card/90 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Layers3 className="size-3.5" />
                  Inputs
                </div>
                <div className="space-y-2">
                  {mission.inputs.length > 0 ? (
                    mission.inputs.map((input) => (
                      <div key={input.id} className="rounded-xl border bg-background/80 px-3 py-2">
                        <div className="truncate text-sm font-medium">{input.title}</div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{input.preview}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无输入。</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-background/80 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  Review queue
                </div>
                {mission.reviewItems.length > 0 ? (
                  <div className="space-y-2">
                    {mission.reviewItems.map((item) => (
                      <div key={item.id} className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{item.title}</div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${riskTone(item.riskLevel)}`}>
                            {riskLabel(item.riskLevel)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无待确认决策。</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <FileText className="size-3.5" />
                  Artifacts
                </div>
                <div className="space-y-2">
                  {mission.artifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-xl border bg-background/80 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <ArrowUpRight className="mt-0.5 size-3.5 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{artifact.name}</div>
                          <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </WorkbenchSection>

          <WorkbenchSection
            title="Atlas bridge"
            description="Mission 完成后，相关内容会在这里继续被追问和沉淀。"
            className="border-dashed bg-background/80"
          >
            <div className="space-y-2 text-sm text-muted-foreground">
              {mission.relatedAtlasIds.length > 0 ? (
                mission.relatedAtlasIds.map((atlasId) => (
                  <div key={atlasId} className="flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
                    <Link2 className="size-3.5" />
                    <span className="truncate">{atlasId}</span>
                  </div>
                ))
              ) : (
                <p>当前还没有关联的 Atlas 记忆。</p>
              )}
            </div>
          </WorkbenchSection>

          <WorkbenchSection
            title="Stage note"
            description="给这个任务一个整体的当前状态判断。"
            className="border-dashed bg-background/80"
          >
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className={`font-medium ${stateTone[mission.state]}`}>{stateLabels[mission.state]}</span>
                {" "}
                · {stageNotes[mission.state]}
              </p>
              <p>• 这页保留了所有原有信息，只把它们重新组织成更利于扫读的结构。</p>
            </div>
          </WorkbenchSection>
        </aside>
      </div>
    </WorkbenchShell>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}
