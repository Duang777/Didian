import { Cpu, Plug, Settings, Shield } from "lucide-react";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const systemItems = [
  { icon: Cpu, title: "Nodes", description: "本地 Runtime、执行节点、健康状态和最近心跳。" },
  { icon: Plug, title: "Integrations", description: "浏览器扩展、Slack、Lark、GitHub、Composio 等连接。" },
  { icon: Settings, title: "Providers", description: "AI provider、模型、存储 adapter 和 workspace 配置。" },
  { icon: Shield, title: "Permissions", description: "权限、确认门、通知和安全策略。" },
];

export function SystemPage() {
  return (
    <WorkbenchShell
      icon={Settings}
      title="System"
      description="System 收纳基础设施和高级配置，避免 Nodes、Provider、Integrations 抢占产品主线。"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {systemItems.map((item) => (
          <WorkbenchSection key={item.title} title={item.title}>
            <div className="flex items-start gap-3">
              <item.icon className="mt-0.5 size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </WorkbenchSection>
        ))}
      </div>
    </WorkbenchShell>
  );
}
