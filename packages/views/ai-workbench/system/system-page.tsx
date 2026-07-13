"use client";

import { Bot, Cpu, Plug, Settings, Shield, Sparkles, Users, Zap } from "lucide-react";
import { useWorkspacePaths } from "@didian/core/paths";
import { AppLink } from "../../navigation";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

type SystemItem = {
  icon: typeof Cpu;
  title: string;
  description: string;
  href: string;
};

function SystemCard({ item }: { item: SystemItem }) {
  return (
    <AppLink
      href={item.href}
      className="group flex min-h-28 items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
      </span>
    </AppLink>
  );
}

export function SystemPage() {
  const paths = useWorkspacePaths();
  const infrastructureItems: SystemItem[] = [
    { icon: Cpu, title: "Nodes", description: "本地 Runtime、执行节点、健康状态和最近心跳。", href: paths.runtimes() },
    { icon: Plug, title: "Integrations", description: "浏览器扩展、Slack、Lark、GitHub、Composio 等连接。", href: paths.settings() },
    { icon: Settings, title: "Settings", description: "AI provider、模型、存储 adapter 和 workspace 配置。", href: paths.settings() },
    { icon: Shield, title: "Permissions", description: "权限、确认门、通知和安全策略。", href: paths.settings() },
  ];
  const advancedItems: SystemItem[] = [
    { icon: Bot, title: "Agents", description: "兼容入口：查看 Codex Run 可调用的角色和所有权。", href: paths.agents() },
    { icon: Sparkles, title: "Skills", description: "兼容入口：管理 Runtime 上下文和能力包。", href: paths.skills() },
    { icon: Users, title: "Squads", description: "兼容入口：后续多角色处理配方的基础。", href: paths.squads() },
    { icon: Zap, title: "Autopilots", description: "兼容入口：后续基于真实重复行为生成后台策略。", href: paths.autopilots() },
  ];

  return (
    <WorkbenchShell
      icon={Settings}
      title="System"
      description="System 收纳基础设施和高级配置，避免 Nodes、Provider、Integrations 抢占产品主线。"
    >
      <WorkbenchSection title="Infrastructure" description="运行节点、集成、provider 和权限仍可配置，但不作为主业务入口。">
        <div className="grid gap-3 md:grid-cols-2">
          {infrastructureItems.map((item) => <SystemCard key={item.title} item={item} />)}
        </div>
      </WorkbenchSection>

      <WorkbenchSection title="Advanced" description="Agents、Skills、Squads 和 Autopilots 作为高级兼容入口保留，不进入第一版主导航。">
        <div className="grid gap-3 md:grid-cols-2">
          {advancedItems.map((item) => <SystemCard key={item.title} item={item} />)}
        </div>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
