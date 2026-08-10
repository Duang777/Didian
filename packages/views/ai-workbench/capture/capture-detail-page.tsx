"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowUpRight,
  ExternalLink,
  FileText,
  RotateCcw,
} from "lucide-react";
import { api } from "@didian/core/api";
import {
  useArchiveBrowserCapture,
  useRestoreBrowserCapture,
  type BrowserCapture,
} from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { toast } from "sonner";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const COPY = {
  loading: "正在读取收藏详情…",
  loadFailed: "收藏详情读取失败，请稍后重试。",
  retry: "重试",
  openSource: "打开原页面",
  backToInbox: "返回 AI Inbox",
  description: "页面描述",
  selectedText: "选中文本",
  readableText: "正文内容",
  links: "页面链接",
  memorySummary: "AI 记忆摘要",
  takeaway: "一句话要点",
  keyPoints: "关键要点",
  topics: "主题",
  entities: "实体",
  keywords: "关键词",
  archive: "归档",
  restore: "恢复",
  preview: "页面截图",
  failure: "处理失败",
  notFound: "找不到这条收藏，它可能已被删除。",
} as const;

export function CaptureDetailPage({ captureId }: { captureId: string }) {
  const wsId = useWorkspaceId();
  const workspaceSlug = useRequiredWorkspaceSlug();
  const queryClient = useQueryClient();
  const captureQuery = useQuery({
    queryKey: ["browser-memory", wsId, "capture", captureId],
    queryFn: () => api.getBrowserCapture(captureId),
    enabled: Boolean(wsId && captureId),
  });
  const archiveMutation = useArchiveBrowserCapture();
  const restoreMutation = useRestoreBrowserCapture();

  const capture = captureQuery.data;
  const isArchived = capture?.memory_state === "archived";
  const pendingMutation = archiveMutation.isPending || restoreMutation.isPending;

  async function handleToggleMemoryState() {
    if (!capture) return;
    try {
      if (isArchived) {
        await restoreMutation.mutateAsync(capture.id);
        toast.success("已恢复到 Active");
      } else {
        await archiveMutation.mutateAsync(capture.id);
        toast.success("已归档");
      }
      queryClient.invalidateQueries({ queryKey: ["browser-memory", wsId, "capture", captureId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <WorkbenchShell icon={FileText} title={capture?.title ?? "收藏详情"} description={capture?.domain ?? ""}>
      <div className="grid gap-4">
        <a
          href={paths.workspace(workspaceSlug).aiInbox()}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowUpRight className="size-3.5" />
          {COPY.backToInbox}
        </a>

        {captureQuery.isLoading ? (
          <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground" role="status">
            {COPY.loading}
          </div>
        ) : captureQuery.isError || !capture ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background p-4 text-sm text-muted-foreground" role="alert">
            <span>{captureQuery.isError ? COPY.loadFailed : COPY.notFound}</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void captureQuery.refetch()}>
              {COPY.retry}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <CaptureStatusBadges capture={capture} />
              {capture.url && (
                <a
                  href={capture.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  {COPY.openSource}
                </a>
              )}
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={pendingMutation}
                onClick={() => void handleToggleMemoryState()}
              >
                {isArchived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
                {isArchived ? COPY.restore : COPY.archive}
              </Button>
            </div>

            {capture.preview_image_url && (
              <WorkbenchSection title={COPY.preview}>
                <div className="flex justify-center overflow-hidden rounded-md border bg-white">
                  <img
                    src={capture.preview_image_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              </WorkbenchSection>
            )}

            {capture.description && (
              <WorkbenchSection title={COPY.description}>
                <p className="text-sm leading-6 text-foreground/90">{capture.description}</p>
              </WorkbenchSection>
            )}

            {capture.capture_scope === "selection" && capture.selected_text && (
              <WorkbenchSection title={COPY.selectedText}>
                <blockquote className="border-l-2 border-primary/40 pl-3 text-sm leading-6 text-muted-foreground">
                  {capture.selected_text}
                </blockquote>
              </WorkbenchSection>
            )}

            {capture.readable_text && (
              <WorkbenchSection title={COPY.readableText}>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-xs leading-5 text-foreground/80">
                  {capture.readable_text}
                </pre>
              </WorkbenchSection>
            )}

            {capture.links.length > 0 && (
              <WorkbenchSection title={COPY.links}>
                <ul className="grid gap-1.5">
                  {capture.links.map((link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm text-primary hover:underline"
                      >
                        {link.title ?? link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </WorkbenchSection>
            )}

            {capture.memory &&
            (capture.memory.summary || capture.memory.one_line_takeaway || capture.memory.key_points.length > 0) ? (
              <WorkbenchSection title={COPY.memorySummary}>
                {capture.memory.one_line_takeaway && (
                  <p className="text-sm font-medium leading-6">{capture.memory.one_line_takeaway}</p>
                )}
                {capture.memory.summary && (
                  <p className="mt-1 text-sm leading-6 text-foreground/90">{capture.memory.summary}</p>
                )}
                {capture.memory.key_points.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {capture.memory.key_points.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                )}
                <CaptureTags label={COPY.topics} values={capture.memory.topics} />
                <CaptureTags label={COPY.entities} values={capture.memory.entities} />
                <CaptureTags label={COPY.keywords} values={capture.memory.keywords} />
              </WorkbenchSection>
            ) : null}

            {capture.failure_reason && (
              <WorkbenchSection title={COPY.failure}>
                <p className="text-sm text-destructive">{capture.failure_reason}</p>
              </WorkbenchSection>
            )}
          </>
        )}
      </div>
    </WorkbenchShell>
  );
}

function CaptureStatusBadges({ capture }: { capture: BrowserCapture }) {
  const statusViews = [
    statusView(String(capture.memory_state)),
    statusView(String(capture.summary_status)),
    statusView(String(capture.archive_status)),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {statusViews.map((view, index) => (
        <Badge key={index} variant={view.variant} className={view.className}>
          {view.label}
        </Badge>
      ))}
    </div>
  );
}

function CaptureTags({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <span key={`${value}-${index}`} className="rounded-md border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function statusView(value: string): {
  label: string;
  variant: "secondary" | "outline" | "destructive";
  className: string;
} {
  switch (value) {
    case "ready":
    case "active":
      return { label: "Ready", variant: "secondary", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    case "archived":
      return { label: "Archived", variant: "outline", className: "text-amber-700 dark:text-amber-300" };
    case "pinned":
      return { label: "Pinned", variant: "outline", className: "text-primary" };
    case "muted":
      return { label: "Muted", variant: "outline", className: "text-muted-foreground" };
    case "processing":
      return { label: "Processing", variant: "outline", className: "text-primary", };
    case "pending":
      return { label: "Pending", variant: "outline", className: "text-muted-foreground" };
    case "failed":
      return { label: "Failed", variant: "destructive", className: "" };
    default:
      return { label: value || "Unknown", variant: "outline", className: "text-muted-foreground" };
  }
}
