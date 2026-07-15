"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, CheckCircle2, Clock3, ExternalLink, Inbox, Loader2, RefreshCw, RotateCcw, Search, SendHorizontal } from "lucide-react";
import { ApiError, api, DuplicateIssueErrorBodySchema, parseWithFallback, type DuplicateIssueErrorBody } from "@didian/core/api";
import { browserCapturesOptions, useArchiveBrowserCapture, useCreateBrowserCapture, useRestoreBrowserCapture, type BrowserCaptureMemoryState } from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@didian/ui/components/ui/dialog";
import { Input } from "@didian/ui/components/ui/input";
import { Textarea } from "@didian/ui/components/ui/textarea";
import { toast } from "sonner";
import {
  browserCaptureRecordToInboxInput,
  inferAiUnderstanding,
} from "../fixtures";
import type { AiInboxInput, AiUnderstanding } from "../types";
import { useNavigation } from "../../navigation";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const createMissionLabel = "创建 Mission";
const saveToAtlasLabel = "保存到 Atlas";
const captureCurrentPageLabel = "使用扩展收藏当前页";

export function AiInboxPage() {
  const wsId = useWorkspaceId();
  const workspaceSlug = useRequiredWorkspaceSlug();
  const navigation = useNavigation();
  const [input, setInput] = useState("https://github.com/browser-use/browser-use\nhttps://docs.stagehand.dev\n帮我整理这些 AI Agent 学习资料，按入门、工具、实战分类。");
  const [captureState, setCaptureState] = useState<Extract<BrowserCaptureMemoryState, "active" | "archived">>("active");
  const [captureQuery, setCaptureQuery] = useState("");
  const [createdMission, setCreatedMission] = useState<{ id: string; href: string; title: string; state: "created" | "duplicate" } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [collectPromptUrls, setCollectPromptUrls] = useState<string[]>([]);
  const trimmedCaptureQuery = captureQuery.trim();
  const trimmedInput = input.trim();
  const fallbackUnderstanding = useMemo(() => inferAiUnderstanding(input), [input]);
  const inputUrls = useMemo(() => extractInputUrls(input), [input]);
  const createMission = useMutation({ mutationFn: api.createAiInboxMission });
  const createBrowserCapture = useCreateBrowserCapture();
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
  const captureColumns = useMemo(() => splitIntoColumns(inboxInputs, 2), [inboxInputs]);
  const canCreateMission = trimmedInput.length > 0;
  const understanding: AiUnderstanding = fallbackUnderstanding;

  async function handleCreateMission() {
    if (!canCreateMission || createMission.isPending || createdMission) return;
    setCreatedMission(null);
    setCreateError(null);
    try {
      const mission = await createMission.mutateAsync({
        title: understanding.suggestedMissionTitle,
        description: buildMissionDescription({ input: trimmedInput, inputUrls, understanding }),
        understanding,
      });
      if (!mission.issue.id) {
        throw new Error("创建 Mission 失败：服务端没有返回 Mission ID");
      }
      const missionHref = paths.workspace(workspaceSlug).issueDetail(mission.issue.id);
      setCreatedMission({ id: mission.issue.id, href: missionHref, title: mission.issue.title, state: "created" });
      if (mission.planningStatus === "queued") {
        toast.success("Mission 已创建，Codex 已开始规划");
      } else {
        toast.success("Mission 已创建，当前没有可用 Codex agent");
      }
      if (inputUrls.length > 0) {
        setCollectPromptUrls(inputUrls);
      }
      navigation.push(missionHref);
    } catch (err) {
      const duplicate = parseDuplicateIssueError(err);
      if (duplicate) {
        const missionHref = paths.workspace(workspaceSlug).issueDetail(duplicate.issue.id);
        setCreatedMission({ id: duplicate.issue.id, href: missionHref, title: duplicate.issue.title, state: "duplicate" });
        toast.error("已有相同的 active Mission，已为你打开。");
        if (inputUrls.length > 0) {
          setCollectPromptUrls(inputUrls);
        }
        navigation.push(missionHref);
        return;
      }
      const message = err instanceof Error && err.message ? err.message : "创建 Mission 失败";
      setCreateError(message);
      toast.error(message);
    }
  }

  async function handleCollectPromptConfirm() {
    if (collectPromptUrls.length === 0 || createBrowserCapture.isPending) return;
    const urls = collectPromptUrls;
    try {
      await saveInputUrlsToBrowserCaptures(createBrowserCapture.mutateAsync, urls);
      setCollectPromptUrls([]);
      toast.success("输入链接已加入收藏");
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "收藏链接失败";
      toast.error(message);
    }
  }

  return (
    <WorkbenchShell
      icon={Inbox}
      title="AI Inbox"
      description="把链接、文本或一个想法丢进来创建 Mission。已有收藏会在下方展示，但不会默认进入这次任务。"
    >
      <div className="grid gap-4">
        <WorkbenchSection title="输入" description="把这次想交给 Agent 的需求写在这里。只有这里的文本和链接会进入新 Mission。">
          <Textarea
            aria-label="AI Inbox input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-40 resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" type="button" disabled={!canCreateMission || createMission.isPending || Boolean(createdMission)} onClick={() => void handleCreateMission()}>
              {createMission.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
              {createMission.isPending ? "创建中" : createdMission ? "已创建" : createMissionLabel}
            </Button>
            <Button size="sm" variant="outline">{saveToAtlasLabel}</Button>
            <Button size="sm" variant="ghost" type="button">{captureCurrentPageLabel}</Button>
          </div>
          {createdMission && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
              {createdMission.state === "duplicate" ? "已找到已有 Mission，正在打开详情页。" : "Mission 已创建，正在打开详情页。"}
              <a href={createdMission.href} className="ml-1 font-medium underline underline-offset-2">
                打开 {createdMission.title}
              </a>
            </div>
          )}
          {createError && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {createError}
            </div>
          )}
          {inputUrls.length > 0 && (
            <div className="mt-3 rounded-md border bg-background p-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">本次输入链接</span>
                <span className="text-xs text-muted-foreground">
                  创建后会询问是否收藏
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inputUrls.map((url) => (
                  <span key={url} className="rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">{formatInputUrlLabel(url)}</span>
                ))}
              </div>
            </div>
          )}
        </WorkbenchSection>
      </div>

      <WorkbenchSection title="已有收藏" description="这里展示你之前收藏过的页面。它们不会默认进入这次新 Mission，除非你在输入框里明确引用它们。">
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
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {captureColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="grid gap-3">
                {column.map((item) => (
                  <BrowserCaptureCard key={item.id} item={item} archivedView={captureState === "archived"} />
                ))}
              </div>
            ))}
          </div>
        )}
      </WorkbenchSection>
      <Dialog open={collectPromptUrls.length > 0} onOpenChange={(open) => { if (!open) setCollectPromptUrls([]); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>收藏输入链接？</DialogTitle>
            <DialogDescription>
              这些链接已进入 Mission。你也可以把它们加入已有收藏，方便后续搜索和复用。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-auto rounded-md border bg-muted/20 p-2">
            <div className="flex flex-wrap gap-1.5">
              {collectPromptUrls.map((url) => (
                <span key={url} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                  {formatInputUrlLabel(url)}
                </span>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCollectPromptUrls([])} disabled={createBrowserCapture.isPending}>暂不收藏</Button>
            <Button type="button" onClick={() => void handleCollectPromptConfirm()} disabled={createBrowserCapture.isPending}>
              {createBrowserCapture.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              收藏
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        className="relative block p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`打开收藏页面：${item.title}`}
      >
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <CaptureFavicon src={item.faviconUrl} />
            <h3 className="min-w-0 line-clamp-2 text-sm font-medium leading-5">{item.title}</h3>
          </div>
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
        {item.previewImageUrl && (
          <div className="mt-3 flex max-h-44 justify-center overflow-hidden rounded-md border bg-white">
            <img
              src={item.previewImageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-44 w-full object-contain"
            />
          </div>
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

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  return Array.from({ length: columnCount }, (_, columnIndex) => items.filter((_, itemIndex) => itemIndex % columnCount === columnIndex));
}

function CaptureFavicon({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-background text-foreground">
      {showFallback ? (
        <DidianIcon className="size-3.5" noSpin />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-4 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
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

function parseDuplicateIssueError(err: unknown): DuplicateIssueErrorBody | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  return parseWithFallback<DuplicateIssueErrorBody | null>(
    err.body,
    DuplicateIssueErrorBodySchema,
    null,
    { endpoint: "POST /api/ai-inbox/missions (active_duplicate_issue)" },
  );
}

function extractInputUrls(input: string): string[] {
  const matches = input.match(/https?:\/\/[^\s，,；;。)）]+/g) ?? [];
  return Array.from(new Set(matches.map((url) => url.replace(/[\].。；;,，]+$/, ""))));
}

function formatInputUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

async function saveInputUrlsToBrowserCaptures(
  save: (data: Parameters<typeof api.createBrowserCapture>[0]) => Promise<unknown>,
  urls: string[],
) {
  await Promise.all(urls.map((url) => save(inputUrlToCaptureRequest(url))));
}

function inputUrlToCaptureRequest(url: string): Parameters<typeof api.createBrowserCapture>[0] {
  let title = url;
  let domain = "";
  try {
    const parsed = new URL(url);
    title = `${parsed.host}${parsed.pathname.replace(/\/$/, "")}`;
    domain = parsed.host;
  } catch {
    // Keep the raw URL as the title; the API will validate the URL.
  }
  return {
    source: "web",
    sourceType: "link",
    captureScope: "page",
    url,
    title,
    domain,
    faviconUrl: faviconUrlForInputUrl(url),
    previewImageUrl: previewImageUrlForInputUrl(url),
    capturedAt: new Date().toISOString(),
  };
}

function faviconUrlForInputUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function previewImageUrlForInputUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return `https://opengraph.githubassets.com/didian/${parts[0]}/${parts[1]}`;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function buildMissionDescription({
  input,
  inputUrls,
  understanding,
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
}) {
  const sections = [
    "Created from AI Inbox.",
    "",
    "## AI 理解",
    `- 意图：${understanding.intent}`,
    `- 置信度：${Math.round(understanding.confidence * 100)}%`,
    `- 建议：${understanding.suggestedMissionTitle}`,
    `- 摘要：${understanding.summary}`,
    `- 输出：${understanding.suggestedOutputs.join("、")}`,
  ];

  if (input) {
    sections.push("", "## 输入", input);
  }

  if (inputUrls.length > 0) {
    sections.push("", "## 本次输入链接");
    for (const url of inputUrls) {
      sections.push(`- ${url}`);
    }
    sections.push("", "## 收藏动作", "已提示用户可选择是否收藏这些链接；不会自动加入收藏。");
  }

  return sections.join("\n");
}
