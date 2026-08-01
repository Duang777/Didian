import { Power, Zap } from "lucide-react";
import { demoAutopilotStrategies } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const AUTOPILOT_COPY = {
  emptyFixture: "当前没有可展示的 Autopilot fixture。",
  conditions: "条件",
  actions: "动作",
  confirmations: "需要确认",
} as const;

export function AutopilotPage() {
  const strategy = demoAutopilotStrategies[0];

  if (!strategy) {
    return (
        <WorkbenchShell
        icon={Zap}
        title="Autopilot"
        description="用自然语言描述重复目标，AI 生成可检查、可暂停、需要确认的策略卡。第一版是策略预览，不承诺真实后台运行。"
      >
        <WorkbenchSection title="暂无策略" description="从 Mission 或 Atlas 选择重复目标后，可以在这里预览 Autopilot 策略。">
          <p className="text-sm text-muted-foreground">{AUTOPILOT_COPY.emptyFixture}</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell
      icon={Zap}
      title="Autopilot"
      description="用自然语言描述重复目标，AI 生成可检查、可暂停、需要确认的策略卡。第一版是策略预览，不承诺真实后台运行。"
    >
      <WorkbenchSection title="策略预览" description="后续会从 Mission 或 Atlas 带入上下文生成策略。">
        <article className="rounded-md border bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-medium">{strategy.goal}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{strategy.trigger}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
              <Power className="size-3" /> {strategy.enabled ? "已启用" : "预览"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium">{AUTOPILOT_COPY.conditions}</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {strategy.conditions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium">{AUTOPILOT_COPY.actions}</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {strategy.actions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium">{AUTOPILOT_COPY.confirmations}</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {strategy.confirmationsRequired.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </article>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
