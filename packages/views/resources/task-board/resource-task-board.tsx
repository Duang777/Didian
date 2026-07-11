import { Badge } from "@didian/ui/components/ui/badge";
import { Progress } from "@didian/ui/components/ui/progress";
import { ScrollArea } from "@didian/ui/components/ui/scroll-area";
import { cn } from "@didian/ui/lib/utils";
import type { ResourceTask, ResourceTaskStatus } from "../mock-data";

const statusOrder = ["needs_confirmation", "scanning", "indexed"] as const satisfies ResourceTaskStatus[];

const statusMeta = {
  needs_confirmation: {
    label: "待确认",
    className: "border-warning/25 bg-warning/10 text-warning",
  },
  scanning: { label: "扫描中", className: "border-info/25 bg-info/10 text-info" },
  indexed: { label: "已入库", className: "border-success/25 bg-success/10 text-success" },
} satisfies Record<ResourceTaskStatus, { label: string; className: string }>;

export type ResourceTaskBoardProps = {
  tasks: ResourceTask[];
  selectedId: string;
  onSelectTask?: (task: ResourceTask) => void;
};

export function ResourceTaskBoard({ tasks, selectedId, onSelectTask }: ResourceTaskBoardProps) {
  const tasksByStatus = statusOrder.map((status) => {
    const statusTasks = tasks.filter((task) => task.status === status);
    return { status, tasks: statusTasks };
  });

  const totals = tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      if (task.status === "needs_confirmation") acc.needsConfirmation += 1;
      if (task.status === "indexed") acc.indexed += 1;
      return acc;
    },
    { total: 0, needsConfirmation: 0, indexed: 0 },
  );

  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-muted/20" aria-label="资源任务看板">
      <div className="border-b p-3">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="任务" value={String(totals.total)} />
          <Metric label="待确认" value={String(totals.needsConfirmation)} />
          <Metric label="已入库" value={String(totals.indexed)} />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {tasksByStatus.map(({ status, tasks: statusTasks }) => {
            const meta = statusMeta[status];

            return (
              <section key={status} aria-label={`${meta.label} ${statusTasks.length} 个任务`} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="text-xs font-medium text-muted-foreground">{meta.label}</div>
                  <Badge variant="outline" className={cn("h-5 px-1.5 tabular-nums", meta.className)}>
                    {statusTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      selected={task.id === selectedId}
                      onSelect={() => onSelectTask?.(task)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}

function TaskCard({
  task,
  selected,
  onSelect,
}: {
  task: ResourceTask;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = statusMeta[task.status];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{task.title}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{task.objective}</div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", meta.className)}>
          {meta.label}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <CompactStat label="来源" value={task.sourceCount} />
        <CompactStat label="资源" value={task.resourceCount} />
        <CompactStat label="重复" value={task.duplicateCount} />
        <CompactStat label="风险" value={task.riskCount} />
      </div>
      <div className="mt-3 truncate rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
        {task.runtime}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{task.currentStep}</span>
        <span className="tabular-nums">{task.progress}%</span>
      </div>
      <Progress value={task.progress} className="mt-2" />
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2" aria-label={`${label}: ${value}`}>
      <div className="text-base font-medium tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
      <div className="font-medium tabular-nums">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
