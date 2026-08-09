"use client";

import { useMemo } from "react";
import { CircleDot, ListTodo, TimerReset, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Issue } from "@didian/core/types";
import { useIssuesScopeStore } from "@didian/core/issues/stores/issues-scope-store";
import { useViewStore } from "@didian/core/issues/stores/view-store-context";
import { PageHeader } from "../../layout/page-header";
import { useT } from "../../i18n";
import { IssueSurface } from "../surface/issue-surface";
import { IssuesHeader } from "./issues-header";

function IssuesSurfaceHeader({
  issues,
  isRefreshing,
}: {
  issues: Issue[];
  isRefreshing: boolean;
}) {
  const dateFilter = useViewStore((s) => s.dateFilter);
  const setDateFilter = useViewStore((s) => s.setDateFilter);
  const counts = useMemo(() => {
    const statusCounts = issues.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.status] = (acc[issue.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: issues.length,
      backlog: statusCounts.backlog ?? 0,
      todo: statusCounts.todo ?? 0,
      active: (statusCounts.in_progress ?? 0) + (statusCounts.in_review ?? 0),
      blocked: statusCounts.blocked ?? 0,
    };
  }, [issues]);

  return (
    <div className="border-b border-border/60 bg-background/65">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mission workspace</p>
          <h2 className="text-sm font-medium tracking-tight">任务流总览</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricChip icon={CircleDot} label="Total" value={`${counts.total}`} />
          <MetricChip icon={TimerReset} label="Open" value={`${counts.backlog + counts.todo}`} />
          <MetricChip icon={ListTodo} label="Active" value={`${counts.active}`} />
          <MetricChip icon={TriangleAlert} label="Blocked" value={`${counts.blocked}`} />
        </div>
      </div>
      <IssuesHeader
        scopedIssues={issues}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}

export function IssuesPage({ title }: { title?: string } = {}) {
  const { t } = useT("issues");
  const scope = useIssuesScopeStore((s) => s.scope);
  const pageTitle = title ?? t(($) => $.page.breadcrumb_title);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-slate-50 via-background to-cyan-50/35">
      <PageHeader className="gap-2 border-b bg-background/80 backdrop-blur">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{pageTitle}</h1>
        </div>
      </PageHeader>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-[1800px] gap-4 p-4 xl:grid-cols-[250px_minmax(0,1fr)_250px]">
          <aside className="hidden min-h-0 xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-900/5">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Workspace overview</p>
                <h2 className="text-sm font-medium tracking-tight">任务工作台</h2>
              </div>
              <div className="mt-4 grid gap-2">
                <span className="rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-xs text-sky-700">横向面板流</span>
                <span className="rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs text-slate-600">Board / List / Swimlane</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Current scope</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {scope === "all" ? "All members and agents" : scope === "members" ? "Members only" : "Agents only"}
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col gap-3">
            <div className="rounded-3xl border border-slate-200/80 bg-white/88 px-4 py-3 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Mission board</p>
                  <h2 className="truncate text-sm font-medium tracking-tight">当前任务流</h2>
                </div>
                <div className="rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1 text-xs text-slate-600">
                  Workspace
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-900/5">
              <IssueSurface
                scope={{ type: "workspace", actorKind: scope }}
                modes={["board", "list", "swimlane"]}
                batchToolbar="list"
                contentClassName="px-2 pb-2"
                renderHeader={({ controller }) => (
                  <IssuesSurfaceHeader
                    issues={controller.surfaceIssues}
                    isRefreshing={controller.isRefreshing}
                  />
                )}
                renderEmpty={() => (
                  <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ListTodo className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm">{t(($) => $.page.empty_title)}</p>
                    <p className="text-xs">{t(($) => $.page.empty_hint)}</p>
                  </div>
                )}
              />
            </div>
          </section>

          <aside className="hidden min-h-0 xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-900/5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Flow rail</p>
              <div className="mt-3 space-y-2">
                <span className="block rounded-2xl border border-sky-200/80 bg-sky-50/80 px-3 py-2 text-sm text-sky-800">Board</span>
                <span className="block rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">List</span>
                <span className="block rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">Swimlane</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-sm shadow-slate-900/5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Panel note</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                左侧看上下文，中间做操作，右侧切面板。功能不变，只换成横向浏览的工作台。
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MetricChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-[112px] rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}
