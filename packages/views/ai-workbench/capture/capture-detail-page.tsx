"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  useCreateSkillProposal,
  useRestoreBrowserCapture,
  type BrowserCapture,
  type SkillOpportunityPageType,
} from "@didian/core/browser-memory";
import {
  SkillOpportunityCard,
} from "./skill-opportunity-card";
import {
  addSkillOpportunityMute,
  isSkillOpportunityMuted,
  loadSkillOpportunityMutes,
  saveSkillOpportunityMutes,
  type SkillOpportunityMutes,
} from "./skill-opportunity-preferences";
import { useWorkspaceId } from "@didian/core/hooks";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import { useRouter } from "next/navigation";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { Skeleton } from "@didian/ui/components/ui/skeleton";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
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
  related: "相关收藏",
  relatedEmpty: "还没有其他收藏。",
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
  const createProposal = useCreateSkillProposal();
  const router = useRouter();
  const relatedQuery = useQuery({
    queryKey: ["browser-memory", wsId, "related-captures", captureId],
    queryFn: () => api.listBrowserCaptures({ limit: 12 }),
    enabled: Boolean(wsId),
  });

  const capture = captureQuery.data;
  const isArchived = capture?.memory_state === "archived";
  const [mutes, setMutes] = useState<SkillOpportunityMutes>(() => loadSkillOpportunityMutes());
  const pendingMutation = archiveMutation.isPending || restoreMutation.isPending;
  const relatedCaptures = useMemo(() => {
    const all = relatedQuery.data?.captures ?? [];
    return all
      .filter((item) => item.id !== captureId)
      .sort((a, b) => {
        const aSame = a.domain === capture?.domain ? 0 : 1;
        const bSame = b.domain === capture?.domain ? 0 : 1;
        return aSame - bSame;
      })
      .slice(0, 5);
  }, [relatedQuery.data, captureId, capture?.domain]);

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

  function handleMutePageType(pageType: SkillOpportunityPageType) {
    const next = addSkillOpportunityMute(mutes, "page_type", pageType);
    setMutes(next);
    saveSkillOpportunityMutes(next);
    toast.success("已减少这类网页的 Skill 推荐");
  }

  function handleGenerate() {
    if (!capture) return;
    createProposal.mutate(
      { capture_id: capture.id },
      {
        onSuccess: (proposal) => {
          router.push(paths.workspace(workspaceSlug).skillProposal(proposal.id));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "生成 Skill 草稿失败");
        },
      },
    );
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
          <CaptureDetailSkeleton />
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

            {capture.skillOpportunity && capture.skillOpportunity.shouldSuggest &&
            !isSkillOpportunityMuted(mutes, capture.skillOpportunity.pageType, capture.domain) ? (
              <SkillOpportunityCard
                opportunity={capture.skillOpportunity}
                domain={capture.domain}
                onGenerate={handleGenerate}
                isGenerating={createProposal.isPending}
                onMutePageType={handleMutePageType}
              />
            ) : null}

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

            <WorkbenchSection title={COPY.related}>
              {relatedQuery.isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : relatedCaptures.length > 0 ? (
                <ul className="grid gap-1.5">
                  {relatedCaptures.map((rel) => (
                    <li key={rel.id}>
                      <Link
                        href={paths.workspace(workspaceSlug).captureDetail(rel.id)}
                        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <RelatedFavicon src={rel.favicon_url} />
                        <span className="min-w-0 flex-1 truncate text-foreground/90">{rel.title}</span>
                        {rel.domain === capture?.domain ? (
                          <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">同域</span>
                        ) : null}
                        <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{rel.domain}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{COPY.relatedEmpty}</p>
              )}
            </WorkbenchSection>
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

function CaptureDetailSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-44 w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function RelatedFavicon({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  return (
    <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-background text-foreground">
      {showFallback ? (
        <DidianIcon className="size-3" noSpin />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-3.5 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
