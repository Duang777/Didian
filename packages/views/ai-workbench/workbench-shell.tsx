import type React from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../layout/page-header";
import { cn } from "@didian/ui/lib/utils";

type WorkbenchShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function WorkbenchShell({ icon: Icon, title, description, children }: WorkbenchShellProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <PageHeader className="gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{title}</h1>
        </div>
      </PageHeader>
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function WorkbenchSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
