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
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-background via-background to-amber-50/30">
      <PageHeader className="gap-2 border-b bg-background/70 backdrop-blur">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{pageTitle}</h1>
        </div>
      </PageHeader>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-[1720px] gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 xl:flex xl:flex-col xl:gap-4">
            <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace overview</p>
                <h2 className="text-sm font-medium tracking-tight">任务工作台</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">Board</span>
                <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">List</span>
                <span className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">Swimlane</span>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/75 p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Current scope</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {scope === "all" ? "All members and agents" : scope === "members" ? "Members only" : "Agents only"}
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col gap-3">
            <div className="rounded-3xl border border-border/70 bg-card/90 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mission board</p>
                  <h2 className="truncate text-sm font-medium tracking-tight">当前任务流</h2>
                </div>
                <div className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                  Workspace
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/70 bg-card/85 shadow-sm">
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

        </div>
      </main>
    </div>
  );
}

function MetricChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-[112px] rounded-xl border bg-background/85 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
    </div>
  );
}
