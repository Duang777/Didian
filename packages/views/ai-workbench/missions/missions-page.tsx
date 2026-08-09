import type { ComponentType } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Layers3,
  ListChecks,
  Sparkles,
  SquareActivity,
  TimerReset,
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

const stateDescriptions: Record<string, string> = {
  understanding: "正在拆解输入、线索和上下文。",
  planned: "已经有了明确计划，等待进入执行。",
  running: "本地 agent 正在推进任务和产物。",
  review: "已产出结果，等人确认下一步。",
  completed: "任务已经闭环，适合沉淀到 Atlas。",
  needs_attention: "任务卡住了，需要人工介入或补充信息。",
};

const stageOrder = ["understanding", "planned", "running", "review", "completed", "needs_attention"] as const;

function countByState(state: string) {
  return demoMissions.filter((mission) => mission.state === state).length;
}

function missionProgress(planStates: string[]) {
  const doneCount = planStates.filter((state) => state === "done").length;
  return Math.round((doneCount / planStates.length) * 100);
}

export function MissionsPage() {
  const activeCount = countByState("running") + countByState("review");
  const blockedCount = countByState("needs_attention");
  const completedCount = countByState("completed");

  return (
    <WorkbenchShell
      icon={ListChecks}
      title="Missions"
      description="Mission 以更像控制台的方式展示：先看总览，再看每个任务的进度、证据和待确认点。"
      contentClassName="max-w-none"
      descriptionClassName="max-w-4xl"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <div className="space-y-4">
          <WorkbenchSection
            title="Mission command center"
            description="这里不再是标准看板，而是一条更集中、更像工作台的任务流。"
            className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-background via-background to-amber-50/40 shadow-sm"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile icon={SquareActivity} label="总 Missions" value={`${demoMissions.length}`} hint="全部任务入口" />
              <MetricTile icon={TimerReset} label="运行中" value={`${activeCount}`} hint="正在推进或等待确认" />
              <MetricTile icon={CheckCircle2} label="已完成" value={`${completedCount}`} hint="适合沉淀到 Atlas" />
              <MetricTile icon={CircleAlert} label="需介入" value={`${blockedCount}`} hint="卡住或信息不足" />
            </div>
          </WorkbenchSection>

          <div className="space-y-4">
            {demoMissions.map((mission) => {
              const progress = missionProgress(mission.plan.map((step) => step.state));

              return (
                <article
                  key={mission.id}
                  className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm"
                >
                  <div className="border-b bg-muted/20 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${stateTone[mission.state]} bg-background/80`}>
                            <Sparkles className="size-3.5" />
                            {stateLabels[mission.state]}
                          </span>
                          <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                            {mission.updatedAt}
                          </span>
                        </div>
                        <h2 className="text-lg font-medium tracking-tight">{mission.title}</h2>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{mission.goal}</p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[280px]">
                        <MiniStat label="输入" value={`${mission.inputs.length}`} />
                        <MiniStat label="Review" value={`${mission.reviewItems.length}`} />
                        <MiniStat label="产物" value={`${mission.artifacts.length}`} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium">Plan trace</h3>
                          <p className="text-xs text-muted-foreground">任务步骤按时间顺着看，更像执行轨迹，而不是板块堆叠。</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          进度 {progress}%
                        </div>
                      </div>

                      <div className="space-y-3">
                        {mission.plan.map((step, index) => (
                          <div key={step.id} className="relative rounded-xl border bg-background/90 p-4">
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
                                <span className={`text-xs font-medium ${stateToneForStep(step.state)}`}>{stepStateLabel(step.state)}</span>
                              </div>
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <h4 className="text-sm font-medium">{step.title}</h4>
                                <span className="text-xs text-muted-foreground">{step.state === "done" ? "已完成" : step.state === "blocked" ? "被阻塞" : "进行中"}</span>
                              </div>
                              <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                              {step.evidence && (
                                <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/80">证据：</span>
                                  {step.evidence}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <WorkbenchSection
                        title="Mission context"
                        description="这块区域把输入、Review 和产物放在一起，方便快速扫一眼。"
                        className="h-full border-amber-200/60 bg-amber-50/30"
                      >
                        <div className="space-y-4">
                          <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <Layers3 className="size-3.5" />
                              Inputs
                            </div>
                            <div className="space-y-2">
                              {mission.inputs.length > 0 ? (
                                mission.inputs.slice(0, 3).map((input) => (
                                  <div key={input.id} className="rounded-lg border bg-background/80 px-3 py-2">
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
                              Review items
                            </div>
                            {mission.reviewItems.length > 0 ? (
                              <div className="space-y-2">
                                {mission.reviewItems.map((item) => (
                                  <div key={item.id} className="rounded-lg border bg-muted/20 p-3">
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
                              <p className="text-sm text-muted-foreground">暂无待确认项。</p>
                            )}
                          </div>

                          <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <ArrowUpRight className="size-3.5" />
                              Artifacts
                            </div>
                            <div className="space-y-2">
                              {mission.artifacts.map((artifact) => (
                                <div key={artifact.id} className="rounded-lg border bg-background/80 px-3 py-2">
                                  <div className="text-sm font-medium">{artifact.name}</div>
                                  <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </WorkbenchSection>

                      <WorkbenchSection
                        title="Why this view works"
                        description="它更像一个整理好的任务台，而不是传统看板。"
                        className="border-dashed bg-background/80"
                      >
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>• 顶部先给总览，再进入单个 Mission，减少频繁横向切换。</p>
                          <p>• 任务步骤用纵向轨迹表达，保留进度但不做板块堆叠。</p>
                          <p>• 右侧固定上下文，方便查看输入、Review 和产物。</p>
                        </div>
                      </WorkbenchSection>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <WorkbenchSection
            title="Stage map"
            description="这个区域帮你快速判断每个 Mission 在哪里。"
            className="sticky top-4 border-amber-200/70 bg-card/90 shadow-sm"
          >
            <div className="space-y-2">
              {stageOrder.map((state) => (
                <div key={state} className="flex items-start justify-between gap-3 rounded-xl border bg-background/80 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{stateLabels[state]}</div>
                    <p className="text-xs text-muted-foreground">{stateDescriptions[state]}</p>
                  </div>
                  <span className="rounded-full border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                    {countByState(state)}
                  </span>
                </div>
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection
            title="Design notes"
            description="以后扩展到真实数据时，这几个位置会继续保留。"
            className="sticky top-[19rem] border-dashed bg-background/80"
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>• 这个页面会保持轻编辑、重浏览的节奏，适合任务流转。</p>
              <p>• 后续可以直接把 AI Inbox 创建结果嵌进这里。</p>
              <p>• 当任务闭环后，产物会继续进入 Atlas 做长期记忆。</p>
            </div>
          </WorkbenchSection>
        </aside>
      </div>
    </WorkbenchShell>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
        icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-full border bg-muted/30 p-2">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function stateToneForStep(state: string) {
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

function stepStateLabel(state: string) {
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
