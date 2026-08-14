"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Folder,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SendHorizontal,
  Sparkles,
  Download,
} from "lucide-react";
import { ApiError, api, DuplicateIssueErrorBodySchema, parseWithFallback, type DuplicateIssueErrorBody } from "@didian/core/api";
import {
  browserCapturesOptions,
  useArchiveBrowserCapture,
  useCreateBrowserCapture,
  usePersonalSkills,
  useRestoreBrowserCapture,
  type BrowserCaptureMemoryState,
  type PersonalSkill,
} from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { issueKeys } from "@didian/core/issues/queries";
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
  demoAtlasWorkspaces,
  inferAiUnderstanding,
  missionToAtlasWorkspace,
} from "../fixtures";
import type { AiInboxInput, AiUnderstanding, MissionView } from "../types";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";
import { memoryAtlasLocalStore, type AtlasLocalSnapshot } from "../atlas/atlas-local-store";

const createMissionLabel = "创建 Mission";
const saveToAtlasLabel = "保存到 Atlas";
const captureCurrentPageLabel = "使用扩展收藏当前页";
const AI_INBOX_COPY = {
  createPending: "创建中",
  created: "已创建",
  duplicateMissionFound: "已找到已有 Mission。",
  missionCreated: "你的 idea 已创建到 Mission。",
  openMission: "打开",
  inputLinks: "本次输入链接",
  askAfterCreate: "创建后会询问是否收藏",
  active: "Active",
  archived: "Archived",
  loadingCaptures: "正在读取浏览器收藏…",
  captureLoadFailed: "浏览器收藏暂时读取失败，请稍后重试。",
  refresh: "刷新",
  collectInputLinksTitle: "收藏输入链接？",
  collectInputLinksDescription: "创建 Mission 前，先确认是否把这些链接加入收藏，方便后续搜索和复用。",
  skipCollectAndCreate: "暂不收藏，继续创建",
  collectAndCreate: "收藏并创建 Mission",
  workspacePreview: "Atlas Workspace Preview",
  workspacePreviewDescription: "创建 Mission 时会作为 Agent 工作区交接",
  skillSuggestions: "匹配到个人能力",
  skillSuggestionsDescription: "可选。选中后会写入 Mission 交接，并让本地 Codex 优先按这个能力执行。",
  skillSuggestionsLoading: "正在检查个人能力…",
} as const;
type InputUrlCollectionDecision = "saved" | "skipped";

type WorkspacePreview = {
  rootPath: string;
  files: string[];
  contextScopes: string[];
};

type PersonalSkillRecommendation = {
  skill: PersonalSkill;
  score: number;
  reasons: string[];
};

export function AiInboxPage() {
  const wsId = useWorkspaceId();
  const workspaceSlug = useRequiredWorkspaceSlug();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [captureState, setCaptureState] = useState<Extract<BrowserCaptureMemoryState, "active" | "archived">>("active");
  const [captureQuery, setCaptureQuery] = useState("");
  const [createdMission, setCreatedMission] = useState<{ id: string; href: string; title: string; state: "created" | "duplicate" } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [collectPromptUrls, setCollectPromptUrls] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const trimmedCaptureQuery = captureQuery.trim();
  const trimmedInput = input.trim();
  const fallbackUnderstanding = useMemo(() => inferAiUnderstanding(input), [input]);
  const inputUrls = useMemo(() => extractInputUrls(input), [input]);
  const understanding: AiUnderstanding = fallbackUnderstanding;
  const workspacePreview = useMemo(() => workspacePreviewForInput(trimmedInput, inputUrls, understanding), [trimmedInput, inputUrls, understanding]);
  const createMission = useMutation({ mutationFn: api.createAiInboxMission });
  const createBrowserCapture = useCreateBrowserCapture();
  const personalSkillsQuery = usePersonalSkills(true);
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
  const personalSkillRecommendations = useMemo(
    () => recommendPersonalSkills(personalSkillsQuery.data ?? [], { input: trimmedInput, inputUrls, understanding }),
    [personalSkillsQuery.data, trimmedInput, inputUrls, understanding],
  );
  const canCreateMission = trimmedInput.length > 0;

  async function handleCreateMission() {
    if (!canCreateMission || createMission.isPending || createdMission) return;
    if (inputUrls.length > 0) {
      setCreateError(null);
      setCollectPromptUrls(inputUrls);
      return;
    }
    await createMissionFromInput();
  }

  async function createMissionFromInput(collectionDecision?: InputUrlCollectionDecision) {
    setCreatedMission(null);
    setCreateError(null);
    try {
      const mission = await createMission.mutateAsync({
        title: missionTitleForInput(understanding.suggestedMissionTitle, inputUrls, trimmedInput),
        description: buildMissionDescription({ input: trimmedInput, inputUrls, understanding, collectionDecision, workspacePreview }),
        understanding,
        selectedPersonalSkillIds: selectedSkillIds,
      });
      if (!mission.issue.id) {
        throw new Error("创建 Mission 失败：服务端没有返回 Mission ID");
      }
      refreshMissionQueries();
      const missionHref = paths.workspace(workspaceSlug).issueDetail(mission.issue.id);
      setCreatedMission({ id: mission.issue.id, href: missionHref, title: mission.issue.title, state: "created" });
      // Auto-link the created Mission into Atlas Workspace so the demo loop
      // (Mission -> Atlas) is visible without a backend Atlas API.
      saveInputToAtlas({
        input: trimmedInput,
        inputUrls,
        understanding,
        workspacePreview,
      });
      if (mission.planningStatus === "queued") {
        toast.success("Mission 已创建，Codex 已开始规划");
      } else {
        toast.success("Mission 已创建，当前没有可用 Codex agent");
      }
    } catch (err) {
      const duplicate = parseDuplicateIssueError(err);
      if (duplicate) {
        refreshMissionQueries();
        const missionHref = paths.workspace(workspaceSlug).issueDetail(duplicate.issue.id);
        setCreatedMission({ id: duplicate.issue.id, href: missionHref, title: duplicate.issue.title, state: "duplicate" });
        toast.error("已有相同的 active Mission，可从下方打开。");
        return;
      }
      const message = err instanceof Error && err.message ? err.message : "创建 Mission 失败";
      setCreateError(message);
      toast.error(message);
    }
  }

  function refreshMissionQueries() {
    queryClient.invalidateQueries({ queryKey: issueKeys.all(wsId) });
  }

  async function handleCollectPromptConfirm() {
    if (collectPromptUrls.length === 0 || createBrowserCapture.isPending || createMission.isPending) return;
    const urls = collectPromptUrls;
    try {
      await saveInputUrlsToBrowserCaptures(createBrowserCapture.mutateAsync, urls);
      setCollectPromptUrls([]);
      toast.success("输入链接已加入收藏");
      await createMissionFromInput("saved");
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "收藏链接失败";
      toast.error(message);
    }
  }

  async function handleCollectPromptSkip() {
    if (collectPromptUrls.length === 0 || createMission.isPending || createBrowserCapture.isPending) return;
    setCollectPromptUrls([]);
    await createMissionFromInput("skipped");
  }

  function handleSaveToAtlas() {
    if ((!trimmedInput && inputUrls.length === 0) || createdMission) return;
    const snapshot = saveInputToAtlas({
      input: trimmedInput,
      inputUrls,
      understanding,
      workspacePreview,
    });
    const count = snapshot.workspaces.length;
    toast.success(`已保存到 Atlas（${count} 个 Workspace）。可在 Atlas 页查看。`);
  }

  function toggleSelectedSkill(id: string) {
    setSelectedSkillIds((current) => current.includes(id) ? current.filter((skillId) => skillId !== id) : [...current, id]);
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
            <Button size="sm" type="button" disabled={!canCreateMission || createMission.isPending || createBrowserCapture.isPending || collectPromptUrls.length > 0 || Boolean(createdMission)} onClick={() => void handleCreateMission()}>
              {createMission.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
              {createMission.isPending ? AI_INBOX_COPY.createPending : createdMission ? AI_INBOX_COPY.created : createMissionLabel}
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => void handleSaveToAtlas()} disabled={!trimmedInput && inputUrls.length === 0}>
              {saveToAtlasLabel}
            </Button>
            <a
              href="https://github.com/didian-ai/didian/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="size-3.5" />
              {captureCurrentPageLabel}
            </a>
          </div>
          {createdMission && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
              {createdMission.state === "duplicate" ? AI_INBOX_COPY.duplicateMissionFound : AI_INBOX_COPY.missionCreated}
              <a href={createdMission.href} className="ml-1 font-medium underline underline-offset-2">
                {AI_INBOX_COPY.openMission} {createdMission.title}
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
                <span className="font-medium">{AI_INBOX_COPY.inputLinks}</span>
                <span className="text-xs text-muted-foreground">{AI_INBOX_COPY.askAfterCreate}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {inputUrls.map((url) => (
                  <span key={url} className="rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">{formatInputUrlLabel(url)}</span>
                ))}
              </div>
            </div>
          )}
          <PersonalSkillSuggestions
            inputReady={trimmedInput.length > 0}
            isLoading={personalSkillsQuery.isLoading}
            recommendations={personalSkillRecommendations}
            selectedSkillIds={selectedSkillIds}
            onToggle={toggleSelectedSkill}
          />
          {trimmedInput.length > 0 && <WorkspacePreviewPanel preview={workspacePreview} />}
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
              {AI_INBOX_COPY.active}
            </button>
            <button
              type="button"
              onClick={() => setCaptureState("archived")}
              className={captureState === "archived" ? "rounded-md bg-muted px-3 text-xs font-medium text-foreground" : "rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}
            >
              {AI_INBOX_COPY.archived}
            </button>
          </div>
        </div>
        {capturesQuery.isLoading ? (
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground" role="status">{AI_INBOX_COPY.loadingCaptures}</div>
        ) : capturesQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background p-3 text-sm text-muted-foreground" role="alert">
            <span>{AI_INBOX_COPY.captureLoadFailed}</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              {AI_INBOX_COPY.refresh}
            </Button>
          </div>
        ) : inboxInputs.length === 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <span>{trimmedCaptureQuery ? "没有匹配的浏览器收藏。" : captureState === "archived" ? "Archived 里暂时没有收藏。" : "暂无浏览器收藏。安装 Didian 扩展后，收藏的真实页面会出现在这里。"}</span>
            <Button size="sm" variant="outline" type="button" onClick={() => void capturesQuery.refetch()}>
              <RefreshCw className="size-3.5" />
              {AI_INBOX_COPY.refresh}
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
            <DialogTitle>{AI_INBOX_COPY.collectInputLinksTitle}</DialogTitle>
            <DialogDescription>{AI_INBOX_COPY.collectInputLinksDescription}</DialogDescription>
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
            <Button type="button" variant="outline" onClick={() => void handleCollectPromptSkip()} disabled={createBrowserCapture.isPending || createMission.isPending}>{AI_INBOX_COPY.skipCollectAndCreate}</Button>
            <Button type="button" onClick={() => void handleCollectPromptConfirm()} disabled={createBrowserCapture.isPending || createMission.isPending}>
              {createBrowserCapture.isPending || createMission.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {AI_INBOX_COPY.collectAndCreate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkbenchShell>
  );
}

function PersonalSkillSuggestions({
  inputReady,
  isLoading,
  recommendations,
  selectedSkillIds,
  onToggle,
}: {
  inputReady: boolean;
  isLoading: boolean;
  recommendations: PersonalSkillRecommendation[];
  selectedSkillIds: string[];
  onToggle: (id: string) => void;
}) {
  if (!inputReady) return null;
  if (isLoading) {
    return (
      <div className="mt-3 rounded-md border bg-background p-3 text-sm text-muted-foreground" role="status">
        <div className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" />
          {AI_INBOX_COPY.skillSuggestionsLoading}
        </div>
      </div>
    );
  }
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-muted-foreground" />
          {AI_INBOX_COPY.skillSuggestions}
        </div>
        <span className="text-xs text-muted-foreground">{AI_INBOX_COPY.skillSuggestionsDescription}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {recommendations.map(({ skill, reasons }) => {
          const selected = selectedSkillIds.includes(skill.id);
          return (
            <button
              key={skill.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(skill.id)}
              className={selected
                ? "rounded-md border border-primary/50 bg-primary/10 p-3 text-left transition-colors"
                : "rounded-md border bg-muted/20 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30"}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{skill.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{skill.capability || skill.description}</p>
                </div>
                <Badge variant={selected ? "default" : "outline"} className="shrink-0">
                  {selected ? "已选" : "可选"}
                </Badge>
              </div>
              {reasons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {reasons.slice(0, 3).map((reason) => (
                    <span key={reason} className="rounded-sm bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
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

function recommendPersonalSkills(
  skills: PersonalSkill[],
  {
    input,
    inputUrls,
    understanding,
  }: {
    input: string;
    inputUrls: string[];
    understanding: AiUnderstanding;
  },
): PersonalSkillRecommendation[] {
  const haystack = [
    input,
    understanding.intent,
    understanding.suggestedMissionTitle,
    ...inputUrls,
    ...inputUrls.map(formatInputUrlLabel),
  ].join(" ").toLowerCase();
  if (!haystack.trim()) return [];

  return skills
    .filter((skill) => skill.enabled)
    .map((skill) => scorePersonalSkill(skill, haystack, inputUrls, understanding))
    .filter((recommendation) => recommendation.score >= 20)
    .sort((a, b) => b.score - a.score || b.skill.use_count - a.skill.use_count || a.skill.name.localeCompare(b.skill.name))
    .slice(0, 3);
}

function scorePersonalSkill(
  skill: PersonalSkill,
  haystack: string,
  inputUrls: string[],
  understanding: AiUnderstanding,
): PersonalSkillRecommendation {
  let score = 0;
  const reasons: string[] = [];
  const sourceDomain = skill.source_domain.toLowerCase();
  const sourceHostMatched = inputUrls.some((url) => urlHost(url).endsWith(sourceDomain));
  if (sourceDomain && (sourceHostMatched || haystack.includes(sourceDomain))) {
    score += 50;
    reasons.push(`来源匹配 ${skill.source_domain}`);
  }

  const pageType = skill.page_type.toLowerCase();
  if (pageType !== "" && inferredInputPageTypes(inputUrls).includes(pageType)) {
    score += 18;
    reasons.push(`类型匹配 ${skill.page_type}`);
  }

  const triggerTokens = tokenizeSkillText(skill.trigger);
  const triggerHits = countTokenHits(triggerTokens, haystack);
  if (triggerHits > 0) {
    score += Math.min(30, triggerHits * 10);
    reasons.push("触发词匹配");
  }

  const capabilityTokens = tokenizeSkillText(`${skill.name} ${skill.description} ${skill.capability}`);
  const capabilityHits = countTokenHits(capabilityTokens, haystack);
  if (capabilityHits > 0) {
    score += Math.min(24, capabilityHits * 6);
    reasons.push("能力描述匹配");
  }

  if (skill.expected_output && tokenizeSkillText(skill.expected_output).some((token) => haystack.includes(token))) {
    score += 8;
    reasons.push("产出目标匹配");
  }

  if (skill.use_count > 0) score += Math.min(8, skill.use_count);
  if (understanding.intent === "compare" && /compare|对比|评估|选型/.test(skill.capability + skill.description + skill.trigger)) {
    score += 10;
    reasons.push("任务意图匹配");
  }

  return { skill, score, reasons: Array.from(new Set(reasons)) };
}

function tokenizeSkillText(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
}

function countTokenHits(tokens: string[], haystack: string): number {
  return tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
}

function inferredInputPageTypes(inputUrls: string[]): string[] {
  const types = inputUrls.map((url) => {
    const host = urlHost(url);
    if (host === "github.com") return "github_repo";
    if (/docs?|developer|api/.test(host)) return "technical_doc";
    return "";
  });
  return Array.from(new Set(types.filter(Boolean)));
}

function urlHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
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

function WorkspacePreviewPanel({ preview }: { preview: WorkspacePreview }) {
  return (
    <div className="mt-3 rounded-md border bg-background p-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Folder className="size-4 text-muted-foreground" />
          {AI_INBOX_COPY.workspacePreview}
        </div>
        <span className="text-xs text-muted-foreground">{AI_INBOX_COPY.workspacePreviewDescription}</span>
      </div>
      <div className="mt-3 rounded-md border bg-muted/20 p-3">
        <div className="text-sm font-medium">{preview.rootPath}</div>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {preview.files.map((file) => (
            <div key={file} className="flex min-w-0 items-center gap-2 rounded-md bg-background px-2 py-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {preview.contextScopes.map((scope) => (
          <span key={scope} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{scope}</span>
        ))}
      </div>
    </div>
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

function missionTitleForInput(baseTitle: string, urls: string[], input: string): string {
  const title = baseTitle.trim() || "整理输入线索";
  const sourceLabels = urls.map(formatMissionTitleSource).filter(Boolean);
  const uniqueSources = Array.from(new Set(sourceLabels));
  if (uniqueSources.length > 0) {
    const suffix = uniqueSources.slice(0, 2).join(" + ");
    const extra = uniqueSources.length > 2 ? ` 等 ${uniqueSources.length} 个来源` : "";
    return truncateTitle(`${title}：${suffix}${extra}`);
  }

  const firstLine = input.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!firstLine) return title;
  return truncateTitle(`${title}：${firstLine}`);
}

function formatMissionTitleSource(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname === "github.com" && pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }
    const path = pathParts.slice(0, 2).join("/");
    return path ? `${parsed.hostname}/${path}` : parsed.hostname;
  } catch {
    return url.trim();
  }
}

function truncateTitle(title: string): string {
  const normalized = title.replace(/\s+/g, " ").trim();
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 119).trimEnd()}…`;
}

async function saveInputUrlsToBrowserCaptures(
  save: (data: Parameters<typeof api.createBrowserCapture>[0]) => Promise<unknown>,
  urls: string[],
) {
  await Promise.all(urls.map((url) => save(inputUrlToCaptureRequest(url))));
}

/** Persist the current AI Inbox input as a new Atlas Collection workspace. */
function saveInputToAtlas({
  input,
  inputUrls,
  understanding,
  workspacePreview,
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
  workspacePreview: WorkspacePreview;
}): AtlasLocalSnapshot {
  const current = memoryAtlasLocalStore.load(demoAtlasWorkspaces);
  const mission = buildMissionViewFromInput({ input, inputUrls, understanding, workspacePreview });
  const workspace = missionToAtlasWorkspace(mission);
  const existing = current.workspaces.some((item) => item.id === workspace.id);
  const next: AtlasLocalSnapshot = existing
    ? current
    : { workspaces: [...current.workspaces, workspace] };
  memoryAtlasLocalStore.save(next);
  return next;
}

function buildMissionViewFromInput({
  input,
  inputUrls,
  understanding,
  workspacePreview,
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
  workspacePreview: WorkspacePreview;
}): MissionView {
  const inputs: AiInboxInput[] = inputUrls.length > 0
    ? inputUrls.map((url, index) => ({
        id: `source-url-${index}`,
        kind: "url",
        title: url,
        preview: url,
        source: formatInputUrlLabel(url),
        sourceUrl: url,
        confidence: 0.8,
      }))
    : input
      ? [{
          id: `source-text-${Date.now()}`,
          kind: "text",
          title: "用户输入",
          preview: input,
          source: "AI Inbox",
          confidence: 0.7,
        }]
      : [];

  return {
    id: `mission-${Date.now()}`,
    title: understanding.suggestedMissionTitle || "整理输入线索",
    goal: understanding.summary,
    state: "understanding",
    inputs,
    understanding,
    plan: [],
    reviewItems: [],
    artifacts: [],
    workspaceId: `workspace-${workspacePreview.rootPath}-${Date.now()}`,
    relatedAtlasIds: [],
    updatedAt: "刚刚",
  };
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
  collectionDecision,
  workspacePreview,
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
  collectionDecision?: InputUrlCollectionDecision;
  workspacePreview: WorkspacePreview;
}) {
  const sections = [
    aiInboxLeadCopy({ input, inputUrls, understanding }),
    "",
    "## 任务交接",
    missionHandoffCopy({ inputUrls, understanding }),
    "",
    "## 建议目标",
    understanding.suggestedMissionTitle,
    "",
    "## 预期产出",
    ...understanding.suggestedOutputs.map((output) => `- ${output}`),
    "",
    "## Atlas Workspace",
    workspaceHandoffCopy(workspacePreview),
  ];

  if (input) {
    sections.push("", "## 输入", input);
  }

  if (inputUrls.length > 0) {
    sections.push("", "## 本次输入链接");
    for (const url of inputUrls) {
      sections.push(`- ${url}`);
    }
    const collectionLine = collectionDecision === "saved"
      ? "用户已确认收藏这些链接。"
      : collectionDecision === "skipped"
        ? "用户选择暂不收藏这些链接。"
        : "创建 Mission 前会提示用户确认是否收藏这些链接。";
    sections.push("", "## 收藏动作", collectionLine);
  }

  return sections.join("\n");
}

function workspacePreviewForInput(input: string, inputUrls: string[], understanding: AiUnderstanding): WorkspacePreview {
  const files = [
    "mission.md",
    ...inputUrls.map((url) => `sources/${workspaceSourceFileName(url)}.md`),
    ...(inputUrls.length === 0 && input ? ["sources/用户输入.md"] : []),
    "evidence.md",
    "decisions.md",
    "agent-log.md",
  ];
  return {
    rootPath: workspaceRootPathForInput(inputUrls, understanding),
    files: Array.from(new Set(files)),
    contextScopes: ["当前文档", "当前 Workspace", "已捕获来源"],
  };
}

function workspaceRootPathForInput(inputUrls: string[], understanding: AiUnderstanding) {
  if (understanding.intent === "learning_plan" || inputUrls.some((url) => /agent|browser-use|stagehand/i.test(url))) {
    return "AI Agent 项目调研";
  }
  return understanding.suggestedMissionTitle.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() || "Mission Workspace";
}

function workspaceSourceFileName(url: string) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname === "github.com" && pathParts.length >= 2) return pathParts[1] ?? pathParts[0] ?? "source";
    if (parsed.hostname.includes("stagehand")) return "stagehand";
    return pathParts.at(-1)?.replace(/\.md$/i, "") || parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function workspaceHandoffCopy(preview: WorkspacePreview) {
  return [
    "你正在维护一个 Atlas Workspace。不要只给一次性聊天回答；请把上下文、证据、决策和产物写回文档空间。",
    "",
    "```text",
    `${preview.rootPath}/`,
    ...preview.files.map((file) => `  ${file}`),
    "```",
    "",
    "Agent context 默认使用：",
    ...preview.contextScopes.map((scope) => `- ${scope}`),
    "",
    "写作约束：所有结论保留来源引用；需要用户确认的动作写入 decisions.md；可交付内容由用户或 AI 明确生成后再写入新的 Markdown 文档。",
  ].join("\n");
}

function aiInboxLeadCopy({
  input,
  inputUrls,
  understanding,
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
}) {
  if (inputUrls.length > 1) {
    return `AI Inbox 收到 ${inputUrls.length} 个链接和一段补充说明，已整理成一条 ${intentDisplayName(understanding.intent)} Mission。`;
  }
  if (inputUrls.length === 1) {
    return `AI Inbox 收到 1 个链接，已整理成一条 ${intentDisplayName(understanding.intent)} Mission。`;
  }
  const preview = input.replace(/\s+/g, " ").trim();
  if (preview.length <= 20) {
    return `AI Inbox 收到一条简短输入：“${preview}”。`;
  }
  return `AI Inbox 收到一段文字输入，已整理成一条 ${intentDisplayName(understanding.intent)} Mission。`;
}

function missionHandoffCopy({
  inputUrls,
  understanding,
}: {
  inputUrls: string[];
  understanding: AiUnderstanding;
}) {
  const sourcePart = inputUrls.length > 1
    ? `先检查这 ${inputUrls.length} 个来源，确认它们的主题、质量和互相关系。`
    : inputUrls.length === 1
      ? "先打开这个来源，提取重点、上下文和可复用信息。"
      : "当前输入还没有明确来源，先根据原始文字判断用户真正想推进的下一步。";

  switch (understanding.intent) {
    case "learning_plan":
      return `${sourcePart} 重点产出一条可以执行的学习路线，按入门、工具和实践顺序组织。`;
    case "compare":
      return `${sourcePart} 重点比较差异、适用场景和取舍，最后给出可行动建议。`;
    case "diagnose":
      return `${sourcePart} 重点找出失败原因、影响范围和修复路径。`;
    case "monitor":
      return `${sourcePart} 重点定义需要持续关注的变化、触发条件和后续检查节奏。`;
    case "summarize":
      return `${sourcePart} 重点生成摘要、关键结论和后续可追问的问题。`;
    case "research_pack":
      return `${sourcePart} 重点整理成可沉淀到 Atlas 的资源包，包括索引、摘要和相关关系。`;
    case "collect":
      return `${sourcePart} 如果目标仍不够明确，先提出需要澄清的问题，再给出一个最小可执行计划。`;
    case "deduplicate":
      return `${sourcePart} 重点识别重复、相似和版本差异，给出保留或合并建议。`;
    case "archive_only":
      return `${sourcePart} 重点确认归档位置、标签和未来检索线索。`;
    default:
      return `${sourcePart} 先整理上下文，再给出下一步建议。`;
  }
}

function intentDisplayName(intent: AiUnderstanding["intent"]) {
  switch (intent) {
    case "learning_plan":
      return "学习规划";
    case "compare":
      return "对比分析";
    case "diagnose":
      return "问题诊断";
    case "monitor":
      return "持续监控";
    case "summarize":
      return "单资源总结";
    case "research_pack":
      return "资源整理";
    case "collect":
      return "输入澄清";
    case "deduplicate":
      return "去重整理";
    case "archive_only":
      return "归档";
    default:
      return "处理";
  }
}
