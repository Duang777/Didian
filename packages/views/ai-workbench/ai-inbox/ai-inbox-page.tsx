"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, CheckCircle2, Clock3, ExternalLink, Inbox, Loader2, RefreshCw, RotateCcw, Search, Sparkles, SendHorizontal } from "lucide-react";
import { browserCapturesOptions, useArchiveBrowserCapture, useRestoreBrowserCapture, type BrowserCaptureMemoryState } from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { Input } from "@didian/ui/components/ui/input";
import { Textarea } from "@didian/ui/components/ui/textarea";
import {
  browserCaptureRecordToInboxInput,
  inferAiUnderstanding,
} from "../fixtures";
import type { AiInboxInput } from "../types";
import { WorkbenchSection, WorkbenchShell, MetricPill } from "../workbench-shell";

const createMissionLabel = "创建 Mission";
const saveToAtlasLabel = "保存到 Atlas";
const captureCurrentPageLabel = "使用扩展收藏当前页";

export function AiInboxPage() {
  const wsId = useWorkspaceId();
  const [input, setInput] = useState("https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。");
  const [captureState, setCaptureState] = useState<Extract<BrowserCaptureMemoryState, "active" | "archived">>("active");
  const [captureQuery, setCaptureQuery] = useState("");
  const trimmedCaptureQuery = captureQuery.trim();
  const understanding = useMemo(() => inferAiUnderstanding(input), [input]);
  const capturesQuery = useQuery({
    ...browserCapturesOptions(wsId, { limit: 12, offset: 0, state: captureState, q: trimmedCaptureQuery || undefined }),
    refetchInterval: 5_000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
  const inboxInputs = useMemo(
    () => (capturesQuery.data?.captures ?? []).map(browserCaptureRecordToInboxInput),
    [capturesQuery.data?.captures],
  );

  return (
    <WorkbenchShell
      icon={Inbox}
      title="AI Inbox"
      description="把链接、文本、浏览器标签或一个想法丢进来。AI 会先解释它理解到的意图，再建议创建 Mission。"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <WorkbenchSection title="输入" description="第一版支持 URL、文本和浏览器 capture；文件后续会走同一输入模型。">
          <Textarea
            aria-label="AI Inbox input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-40 resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm">
              <SendHorizontal className="size-3.5" />
              {createMissionLabel}
            </Button>
            <Button size="sm" variant="outline">{saveToAtlasLabel}</Button>
            <Button size="sm" variant="ghost" type="button">{captureCurrentPageLabel}</Button>
          </div>
        </WorkbenchSection>

        <WorkbenchSection title="AI 理解" description="当前是启发式理解，后续可替换为真实 AI provider。">
          <div className="grid grid-cols-2 gap-2">
            <MetricPill label="意图" value={understanding.intent} />
            <MetricPill label="置信度" value={`${Math.round(understanding.confidence * 100)}%`} />
          </div>
          <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-muted-foreground" />
              {understanding.suggestedMissionTitle}
            </div>
            <p className="mt-2 text-muted-foreground">{understanding.summary}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {understanding.suggestedOutputs.map((output) => (
              <span key={output} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">{output}</span>
            ))}
          </div>
        </WorkbenchSection>
      </div>

      <WorkbenchSection title="输入卡片" description="输入会被拆成可追踪来源，后续 Mission 和 Atlas 都会保留这些证据。">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative min-w-0 flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={captureQuery}
              onChange={(event) => setCaptureQuery(event.target.value)}
              placeholder="搜索收藏"
              aria-label="搜索浏览器收藏"
              className="pl-8"
            />
          </div>
          <div className="inline-flex h-8 shrink-0 overflow-hidden rounded-lg border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setCaptureState("active")}
              className={captureState === "active" ? "rounded-md bg-muted px-3 text-xs font-medium text-foreground" : "rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setCaptureState("archived")}
              className={captureState === "archived" ? "rounded-md bg-muted px-3 text-xs font-medium text-foreground" : "rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}
            >
              Archived
            </button>
          </div>
        </div>
        {capturesQuery.isLoading ? (
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground" role="status">正在读取浏览器收藏…</div>
        ) : capturesQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background p-3 text-sm text-muted-foreground" role="alert">
            <span>浏览器收藏暂时读取失败，请稍后重试。</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>
        ) : inboxInputs.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <span>{trimmedCaptureQuery ? "没有匹配的浏览器收藏。" : captureState === "archived" ? "Archived 里暂时没有收藏。" : "暂无浏览器收藏。安装 Didian 扩展后，收藏的真实页面会出现在这里。"}</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            {inboxInputs.map((item) => (
              <BrowserCaptureCard key={item.id} item={item} archivedView={captureState === "archived"} />
            ))}
          </div>
        )}
      </WorkbenchSection>
    </WorkbenchShell>
  );
}

function BrowserCaptureCard({ item, archivedView }: { item: AiInboxInput; archivedView: boolean }) {
  const status = browserCaptureStatusView(item);
  const StatusIcon = status.icon;
  const archiveMutation = useArchiveBrowserCapture();
  const restoreMutation = useRestoreBrowserCapture();
  const captureId = item.captureId;
  return (
    <article className="overflow-hidden rounded-md border bg-background transition-colors hover:border-foreground/20 hover:bg-muted/20">
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="relative block min-h-44 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`打开收藏页面：${item.title}`}
      >
        {(item.previewImageUrl || item.faviconUrl) && (
          <div className="pointer-events-none absolute right-3 top-3 flex size-16 items-center justify-center overflow-hidden rounded-md border bg-background/60 opacity-20 blur-[0.2px]">
            <img
              src={item.previewImageUrl ?? item.faviconUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full object-contain p-2"
            />
          </div>
        )}
        <div className="relative flex items-start justify-between gap-3 pr-12">
          <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">{item.title}</h3>
          <span className="shrink-0 rounded-sm border bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground">{item.sourceLabel ?? "收藏"}</span>
        </div>
        <div className="relative mt-2 flex items-center gap-2">
          <Badge variant={status.variant} className={status.className}>
            <StatusIcon className={status.iconClassName} />
            {status.label}
          </Badge>
          <span className="min-w-0 truncate text-xs text-muted-foreground">{status.description}</span>
        </div>
        <p className="relative mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.preview}</p>
        {item.failureReason && (
          <p className="relative mt-2 line-clamp-2 text-xs leading-5 text-destructive">{item.failureReason}</p>
        )}
        {item.source && (
          <p className="relative mt-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="truncate font-mono">{item.source}</span>
          </p>
        )}
      </a>
      {captureId && (
        <div className="border-t px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={archiveMutation.isPending || restoreMutation.isPending}
            onClick={() => archivedView ? restoreMutation.mutate(captureId) : archiveMutation.mutate(captureId)}
          >
            {archivedView ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
            {archivedView ? "Restore" : "Archive"}
          </Button>
        </div>
      )}
    </article>
  );
}

function browserCaptureStatusView(item: AiInboxInput) {
  switch (item.enrichmentStatus) {
    case "ready":
      return {
        label: "AI ready",
        description: item.enrichmentDescription ?? "已整理",
        icon: CheckCircle2,
        variant: "secondary" as const,
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        iconClassName: "",
      };
    case "processing":
      return {
        label: "AI processing",
        description: item.enrichmentDescription ?? "AI 正在整理",
        icon: Loader2,
        variant: "outline" as const,
        className: "text-primary",
        iconClassName: "animate-spin",
      };
    case "failed":
      return {
        label: "AI failed",
        description: item.enrichmentDescription ?? "整理失败",
        icon: AlertCircle,
        variant: "destructive" as const,
        className: "",
        iconClassName: "",
      };
    case "pending":
    default:
      return {
        label: "AI pending",
        description: item.enrichmentDescription ?? "等待整理",
        icon: Clock3,
        variant: "outline" as const,
        className: "text-muted-foreground",
        iconClassName: "",
      };
  }
}
