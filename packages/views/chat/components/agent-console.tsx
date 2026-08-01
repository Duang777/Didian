"use client";

import type { ComponentType } from "react";
import { Bot, Code2, Library, ListChecks, MessageSquarePlus, Sparkles } from "lucide-react";
import { Button } from "@didian/ui/components/ui/button";
import { cn } from "@didian/ui/lib/utils";
import type { Agent } from "@didian/core/types";
import { useT } from "../../i18n";

type ConsoleActionKey = "inspect_mission" | "create_mission" | "work_on_code" | "use_ability";

interface ConsoleAction {
  key: ConsoleActionKey;
  icon: ComponentType<{ className?: string }>;
}

const ACTIONS: ConsoleAction[] = [
  { key: "inspect_mission", icon: ListChecks },
  { key: "create_mission", icon: MessageSquarePlus },
  { key: "work_on_code", icon: Code2 },
  { key: "use_ability", icon: Sparkles },
];

export function ChatAgentConsole({
  agent,
  availability,
  capabilityCount,
  capabilityHref,
  disabled = false,
  onPrompt,
}: {
  agent: Agent | null;
  availability: string | undefined;
  capabilityCount: number;
  capabilityHref: string;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
}) {
  const { t } = useT("chat");
  const agentName = agent?.name ?? t(($) => $.offline_banner.fallback_name);
  const isOffline = availability === "offline";
  const isArchived = availability === "archived";
  const isUnstable = availability === "unstable";
  const statusText = isArchived
    ? t(($) => $.console.status_archived, { name: agentName })
    : isOffline
    ? t(($) => $.console.status_offline, { name: agentName })
    : isUnstable
      ? t(($) => $.console.status_unstable, { name: agentName })
      : availability === "online"
        ? t(($) => $.console.status_online, { name: agentName })
        : t(($) => $.console.status_unknown, { name: agentName });

  return (
    <div className="border-b bg-muted/20 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-semibold leading-none">{t(($) => $.console.title)}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs text-muted-foreground",
                  (isOffline || isArchived) && "text-destructive",
                  isUnstable && "text-amber-600",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-emerald-500",
                    (isOffline || isArchived) && "bg-destructive",
                    isUnstable && "bg-amber-500",
                  )}
                />
                {statusText}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {t(($) => $.console.context_ready)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-md px-2 text-xs"
                disabled={disabled}
                onClick={() => onPrompt(t(($) => $.console.prompts[action.key]))}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(($) => $.console.actions[action.key])}
              </Button>
            );
          })}
          <a
            href={capabilityHref}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-medium text-foreground hover:bg-accent",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Library className="h-3.5 w-3.5" />
            {t(($) => $.console.ability_library, { count: capabilityCount })}
          </a>
        </div>
      </div>
    </div>
  );
}
