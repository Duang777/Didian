"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Archive, CheckCircle2, Clock3, ExternalLink, Inbox, Loader2, RefreshCw, RotateCcw, Search, SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { ApiError, api, DuplicateIssueErrorBodySchema, parseWithFallback, type DuplicateIssueErrorBody } from "@didian/core/api";
import { browserCapturesOptions, useArchiveBrowserCapture, useCreateBrowserCapture, useRestoreBrowserCapture, type BrowserCaptureMemoryState, type BrowserCaptureSkillDirection } from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { issueKeys } from "@didian/core/issues/queries";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import type { Comment, SkillSummary } from "@didian/core/types";
import { skillListOptions, workspaceKeys } from "@didian/core/workspace/queries";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button, buttonVariants } from "@didian/ui/components/ui/button";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@didian/ui/components/ui/dialog";
import { Input } from "@didian/ui/components/ui/input";
import { Label } from "@didian/ui/components/ui/label";
import { Textarea } from "@didian/ui/components/ui/textarea";
import { toast } from "sonner";
import {
  browserCaptureRecordToInboxInput,
  inferAiUnderstanding,
} from "../fixtures";
import type { AiInboxInput, AiUnderstanding, SkillOpportunity } from "../types";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";
import { Markdown } from "../../common/markdown";

const createMissionLabel = "创建 Mission";
const saveToAtlasLabel = "保存到 Atlas";
const captureCurrentPageLabel = "使用扩展收藏当前页";
const personalSkillSuggestionLabel = "可沉淀为能力";
const generateSkillLabel = "生成能力";
const recommendSkillDirectionLabel = "让 Codex 推荐能力方向";
const reduceSkillSuggestionsLabel = "少推荐";
const makeBookmarkSkillLabel = "做成能力";
const skillDirectionQueuedToast = "已交给本地 Codex 分析能力方向，结果会在弹窗中更新。";
const skillDirectionNoAgentToast = "当前没有可用 Codex agent，可先用平台默认方向确认。";
const skillGenerationQueuedToast = "能力生成任务已创建，本地 Codex 会按你确认的方向生成并写入能力库。";
const skillGenerationNoAgentToast = "能力生成任务已创建，当前没有可用 Codex agent。";
const deleteGeneratedSkillToast = "能力已删除，可以重新生成。";
const reduceSkillSuggestionsToast = "后续会减少这类能力推荐";
const backendOfflineMessage = "后端暂时不可用。请先在本地终端启动后端：make start-worktree，然后刷新页面。";
const codexOfflineMessage = "当前没有可用 Codex agent。你可以先直接填写草稿，或启动本地 Codex 后再让它推荐方向。";
const noSkillOpportunityMessage = "这个收藏暂时没有足够的可复用线索。你可以在弹窗里补充想要的能力方向，再让 Codex 重新判断。";
const sourceFetchFailedMessage = "来源页面暂时读取失败。你可以刷新收藏，或先手动填写能力方向。";
type InputUrlCollectionDecision = "saved" | "skipped";
type SkillGenerationState = "created" | "duplicate" | "draft" | "generated";
type SkillGenerationMission = { id?: string; href?: string; title?: string; skillId?: string; skillHref: string; skillName: string; state: SkillGenerationState };
type SkillDirectionAnalysis = { id: string; title: string; state: "created" | "duplicate"; planningStatus: string; userNeed?: string };
type SkillUsageMission = { id: string; href: string; title: string };
type SkillDeleteTarget = { captureId: string; mission: SkillGenerationMission };
type SkillDirectionMode = "adoption_review" | "integration_setup" | "troubleshooting" | "learning_runbook";
type SkillDirectionDraft = {
  item: AiInboxInput;
  mode: SkillDirectionMode;
  title: string;
  capability: string;
  primaryUseCase: string;
  triggerExamples: string;
  expectedInputs: string;
  expectedOutputs: string;
  boundaries: string;
  targetContext: string;
  successCriteria: string;
  notes: string;
};
type SkillDraftFlow = {
  item: AiInboxInput;
  userNeed: string;
  analysis?: SkillDirectionAnalysis;
  draft?: SkillDirectionDraft;
};

export function AiInboxPage() {
  const wsId = useWorkspaceId();
  const workspaceSlug = useRequiredWorkspaceSlug();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [captureState, setCaptureState] = useState<Extract<BrowserCaptureMemoryState, "active" | "archived">>("active");
  const [captureQuery, setCaptureQuery] = useState("");
  const [createdMission, setCreatedMission] = useState<{ id: string; href: string; title: string; state: "created" | "duplicate" } | null>(null);
  const [skillDirectionAnalyses, setSkillDirectionAnalyses] = useState<Record<string, SkillDirectionAnalysis>>({});
  const [skillGenerationMissions, setSkillGenerationMissions] = useState<Record<string, SkillGenerationMission>>({});
  const [skillUsageMissions, setSkillUsageMissions] = useState<Record<string, SkillUsageMission>>({});
  const [deletedSkillCaptureIds, setDeletedSkillCaptureIds] = useState<ReadonlySet<string>>(() => new Set());
  const [skillDeleteTarget, setSkillDeleteTarget] = useState<SkillDeleteTarget | null>(null);
  const [skillDraftFlow, setSkillDraftFlow] = useState<SkillDraftFlow | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [collectPromptUrls, setCollectPromptUrls] = useState<string[]>([]);
  const trimmedCaptureQuery = captureQuery.trim();
  const trimmedInput = input.trim();
  const fallbackUnderstanding = useMemo(() => inferAiUnderstanding(input), [input]);
  const inputUrls = useMemo(() => extractInputUrls(input), [input]);
  const createMission = useMutation({ mutationFn: api.createAiInboxMission });
  const createSkillUsageMission = useMutation({
    mutationFn: async ({ item, mission }: { item: AiInboxInput; mission: SkillGenerationMission }) => {
      if (!item.captureId || !mission.skillId) {
        throw new Error("缺少收藏或能力信息");
      }
      const created = await api.createAiInboxMission({
        title: skillUsageMissionTitle(item, mission),
        description: skillUsageMissionDescription(item, mission),
        understanding: inferAiUnderstanding(`${item.title}\n${item.preview}\n${item.sourceUrl}`),
      });
      if (!created.issue.id) {
        throw new Error("创建 Mission 失败：服务端没有返回 Mission ID");
      }
      await api.addIssueSkill(created.issue.id, {
        skill_id: mission.skillId,
        source: "capture_origin",
        reason: `Created from browser capture: ${item.title}`,
      });
      return created.issue;
    },
  });
  const createSkillGenerationMission = useMutation({
    mutationFn: ({ captureId, direction }: { captureId: string; direction: BrowserCaptureSkillDirection }) => api.createBrowserCaptureSkillGenerationMission(captureId, { direction }),
  });
  const createSkillDirectionMission = useMutation({
    mutationFn: ({ captureId, userNeed }: { captureId: string; userNeed?: string }) => api.createBrowserCaptureSkillDirectionMission(captureId, userNeed?.trim() ? { userNeed: userNeed.trim() } : {}),
  });
  const skillDirectionCommentsQuery = useQuery({
    queryKey: ["skill-direction-analysis-comments", wsId, skillDraftFlow?.analysis?.id],
    queryFn: () => skillDraftFlow?.analysis ? api.listComments(skillDraftFlow.analysis.id) : Promise.resolve([]),
    enabled: Boolean(skillDraftFlow?.analysis?.id),
    refetchInterval: skillDraftFlow?.analysis ? 3_000 : false,
    refetchOnWindowFocus: "always",
  });
  const deleteGeneratedSkill = useMutation({
    mutationFn: ({ skillId }: { captureId: string; skillId: string }) => api.deleteSkill(skillId),
  });
  const createBrowserCapture = useCreateBrowserCapture();
  const skillsQuery = useQuery(skillListOptions(wsId));
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
  const skillsByCaptureId = useMemo(() => buildBrowserCaptureSkillMap(skillsQuery.data, workspaceSlug), [skillsQuery.data, workspaceSlug]);
  const visibleSkillsByCaptureId = useMemo(() => {
    if (deletedSkillCaptureIds.size === 0) return skillsByCaptureId;
    const visibleSkills = new Map(skillsByCaptureId);
    for (const captureId of deletedSkillCaptureIds) {
      visibleSkills.delete(captureId);
    }
    return visibleSkills;
  }, [deletedSkillCaptureIds, skillsByCaptureId]);
  const captureColumns = useMemo(() => splitIntoColumns(inboxInputs, 2), [inboxInputs]);
  const canCreateMission = trimmedInput.length > 0;
  const understanding: AiUnderstanding = fallbackUnderstanding;

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
        description: buildMissionDescription({ input: trimmedInput, inputUrls, understanding, collectionDecision }),
        understanding,
      });
      if (!mission.issue.id) {
        throw new Error("创建 Mission 失败：服务端没有返回 Mission ID");
      }
      refreshMissionQueries();
      const missionHref = paths.workspace(workspaceSlug).issueDetail(mission.issue.id);
      setCreatedMission({ id: mission.issue.id, href: missionHref, title: mission.issue.title, state: "created" });
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
      const message = userFacingErrorMessage(err, "创建 Mission 失败");
      setCreateError(message);
      toast.error(message);
    }
  }

  function refreshMissionQueries() {
    queryClient.invalidateQueries({ queryKey: issueKeys.all(wsId) });
  }

  function openSkillDraftFlow(item: AiInboxInput, analysis?: SkillDirectionAnalysis) {
    const userNeed = analysis?.userNeed ?? "";
    setSkillDraftFlow({
      item,
      userNeed,
      analysis,
      draft: analysis ? buildSkillDirectionDraft(item, userNeed) : undefined,
    });
  }

  function startSkillDraftWithoutCodex() {
    setSkillDraftFlow((current) => {
      if (!current) return current;
      return {
        ...current,
        draft: current.draft ?? buildSkillDirectionDraft(current.item, current.userNeed),
      };
    });
  }

  async function handleAnalyzeSkillDirection(item: AiInboxInput, userNeed = "") {
    if (!item.captureId || createSkillDirectionMission.isPending) return;
    const trimmedUserNeed = userNeed.trim();
    try {
      const mission = await createSkillDirectionMission.mutateAsync({
        captureId: item.captureId,
        userNeed: trimmedUserNeed,
      });
      if (!mission.issue.id) {
        throw new Error("创建方向分析任务失败：服务端没有返回 Mission ID");
      }
      const analysis: SkillDirectionAnalysis = {
        id: mission.issue.id,
        title: mission.issue.title,
        state: mission.planningStatus === "existing" ? "duplicate" : "created",
        planningStatus: mission.planningStatus,
        userNeed: trimmedUserNeed || undefined,
      };
      setSkillDirectionAnalyses((prev) => ({
        ...prev,
        [item.captureId!]: analysis,
      }));
      setSkillDraftFlow((current) => {
        const existingDraft = current && current.item.captureId === item.captureId ? current.draft : undefined;
        return {
          item,
          userNeed: trimmedUserNeed,
          analysis,
          draft: existingDraft ?? buildSkillDirectionDraft(item, trimmedUserNeed),
        };
      });
      toast.success(mission.planningStatus === "queued" ? skillDirectionQueuedToast : mission.planningStatus === "existing" ? "方向分析已存在，已在弹窗中打开。" : skillDirectionNoAgentToast);
    } catch (err) {
      const duplicate = parseDuplicateIssueError(err);
      if (duplicate && item.captureId) {
        const analysis: SkillDirectionAnalysis = {
          id: duplicate.issue.id,
          title: duplicate.issue.title,
          state: "duplicate",
          planningStatus: "existing",
          userNeed: trimmedUserNeed || undefined,
        };
        setSkillDirectionAnalyses((prev) => ({
          ...prev,
          [item.captureId!]: analysis,
        }));
        setSkillDraftFlow((current) => {
          const existingDraft = current && current.item.captureId === item.captureId ? current.draft : undefined;
          return {
            item,
            userNeed: trimmedUserNeed,
            analysis,
            draft: existingDraft ?? buildSkillDirectionDraft(item, trimmedUserNeed),
          };
        });
        toast.success("方向分析已存在，已在弹窗中打开。");
        return;
      }
      const message = userFacingErrorMessage(err, "创建方向分析任务失败");
      toast.error(message);
    }
  }

  async function handleConfirmSkillDirection() {
    const draft = skillDraftFlow?.draft;
    const captureId = draft?.item.captureId;
    if (!draft || !captureId || createSkillGenerationMission.isPending) return;
    const item = draft.item;
    try {
      const mission = await createSkillGenerationMission.mutateAsync({
        captureId,
        direction: skillDirectionFromDraft(draft),
      });
      if (!mission.issue.id) {
        throw new Error("创建能力生成任务失败：服务端没有返回 Mission ID");
      }
      refreshMissionQueries();
      queryClient.invalidateQueries({ queryKey: workspaceKeys.skills(wsId) });
      setDeletedSkillCaptureIds((prev) => {
        if (!prev.has(captureId)) return prev;
        const next = new Set(prev);
        next.delete(captureId);
        return next;
      });
      setSkillGenerationMissions((prev) => ({
        ...prev,
        [captureId]: {
          id: mission.issue.id,
          href: paths.workspace(workspaceSlug).issueDetail(mission.issue.id),
          title: mission.issue.title,
          skillId: mission.skill.id,
          skillHref: paths.workspace(workspaceSlug).skillDetail(mission.skill.id),
          skillName: mission.skill.name,
          state: mission.planningStatus === "existing" ? skillGenerationStateForSkill(mission.skill) : "created",
        },
      }));
      setSkillDraftFlow(null);
      toast.success(mission.planningStatus === "queued" ? skillGenerationQueuedToast : mission.planningStatus === "existing" ? "能力已在能力库中，已打开现有生成任务入口。" : skillGenerationNoAgentToast);
    } catch (err) {
      const duplicate = parseDuplicateIssueError(err);
      if (duplicate) {
        refreshMissionQueries();
        setSkillGenerationMissions((prev) => ({
          ...prev,
          [captureId]: {
            id: duplicate.issue.id,
            href: paths.workspace(workspaceSlug).issueDetail(duplicate.issue.id),
            title: duplicate.issue.title,
            skillId: undefined,
            skillHref: paths.workspace(workspaceSlug).skills(),
            skillName: item.skillOpportunity?.proposedTitle ?? "能力",
            state: "duplicate",
          },
        }));
        setSkillDraftFlow(null);
        toast.error("已有相同的 active 能力生成任务，可从卡片打开。");
        return;
      }
      const message = userFacingErrorMessage(err, "创建能力生成任务失败");
      toast.error(message);
    }
  }

  async function handleUseGeneratedSkill(item: AiInboxInput, mission: SkillGenerationMission) {
    if (!item.captureId || !mission.skillId || createSkillUsageMission.isPending) return;
    try {
      const issue = await createSkillUsageMission.mutateAsync({ item, mission });
      refreshMissionQueries();
      queryClient.invalidateQueries({ queryKey: issueKeys.skills(issue.id) });
      setSkillUsageMissions((prev) => ({
        ...prev,
        [item.captureId!]: {
          id: issue.id,
          href: paths.workspace(workspaceSlug).issueDetail(issue.id),
          title: issue.title,
        },
      }));
      toast.success("Mission 已创建，并已绑定这个能力");
    } catch (err) {
      const duplicate = parseDuplicateIssueError(err);
      if (duplicate && item.captureId) {
        refreshMissionQueries();
        setSkillUsageMissions((prev) => ({
          ...prev,
          [item.captureId!]: {
            id: duplicate.issue.id,
            href: paths.workspace(workspaceSlug).issueDetail(duplicate.issue.id),
            title: duplicate.issue.title,
          },
        }));
        toast.error("已有相同的 active Mission，可从卡片打开。");
        return;
      }
      const message = userFacingErrorMessage(err, "创建 Mission 失败");
      toast.error(message);
    }
  }

  function handleRequestDeleteGeneratedSkill(item: AiInboxInput, mission: SkillGenerationMission) {
    if (!item.captureId || !mission.skillId) return;
    setSkillDeleteTarget({ captureId: item.captureId, mission });
  }

  async function handleConfirmDeleteGeneratedSkill() {
    const target = skillDeleteTarget;
    const skillId = target?.mission.skillId;
    if (!target || !skillId || deleteGeneratedSkill.isPending) return;
    try {
      await deleteGeneratedSkill.mutateAsync({ captureId: target.captureId, skillId });
      setSkillGenerationMissions((prev) => {
        const next = { ...prev };
        delete next[target.captureId];
        return next;
      });
      setSkillUsageMissions((prev) => {
        const next = { ...prev };
        delete next[target.captureId];
        return next;
      });
      setDeletedSkillCaptureIds((prev) => {
        const next = new Set(prev);
        next.add(target.captureId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.skills(wsId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.agents(wsId) });
      refreshMissionQueries();
      setSkillDeleteTarget(null);
      toast.success(deleteGeneratedSkillToast);
    } catch (err) {
      const message = userFacingErrorMessage(err, "删除能力失败");
      toast.error(message);
    }
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
      const message = userFacingErrorMessage(err, "收藏链接失败");
      toast.error(message);
    }
  }

  async function handleCollectPromptSkip() {
    if (collectPromptUrls.length === 0 || createMission.isPending || createBrowserCapture.isPending) return;
    setCollectPromptUrls([]);
    await createMissionFromInput("skipped");
  }

  return (
    <WorkbenchShell
      icon={Inbox}
      title="AI Inbox"
      description="把链接、文本或一个想法丢进来创建 Mission。已有收藏会在下方展示，但不会默认进入这次任务。"
      headerClassName="bg-background/80"
      iconClassName="text-primary"
      descriptionClassName="text-foreground/70"
    >
      <div className="grid gap-4">
        <WorkbenchSection
          title="输入"
          description="把这次想交给 Agent 的需求写在这里。只有这里的文本和链接会进入新 Mission。"
          className="bg-card/95 shadow-sm"
        >
          <Textarea
            aria-label="AI Inbox input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-40 resize-none text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              disabled={!canCreateMission || createMission.isPending || createBrowserCapture.isPending || collectPromptUrls.length > 0 || Boolean(createdMission)}
              onClick={() => void handleCreateMission()}
            >
              {createMission.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
              {createMission.isPending ? "创建中" : createdMission ? "已创建" : createMissionLabel}
            </Button>
            <Button size="sm" variant="outline">{saveToAtlasLabel}</Button>
            <Button size="sm" variant="ghost" type="button">{captureCurrentPageLabel}</Button>
          </div>
          {createdMission && (
            <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200" role="status">
              {createdMission.state === "duplicate" ? "已找到已有 Mission。" : "你的 idea 已创建到 Mission。"}
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

      <WorkbenchSection
        title="已有收藏"
        description="这里展示你之前收藏过的页面。它们不会默认进入这次新 Mission，除非你在输入框里明确引用它们。"
        className="bg-card/95 shadow-sm"
      >
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
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={paths.workspace(workspaceSlug).skills()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Sparkles className="size-3.5" />
              能力库
            </a>
            <div className="inline-flex h-8 overflow-hidden rounded-lg border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setCaptureState("active")}
                className={captureState === "active" ? "rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground" : "rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setCaptureState("archived")}
                className={captureState === "archived" ? "rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground" : "rounded-md px-3 text-xs font-medium text-muted-foreground hover:text-foreground"}
              >
                Archived
              </button>
            </div>
          </div>
        </div>
        {capturesQuery.isLoading ? (
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground" role="status">正在读取浏览器收藏…</div>
        ) : capturesQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background p-3 text-sm text-muted-foreground" role="alert">
            <span>{userFacingErrorMessage(capturesQuery.error, "浏览器收藏暂时读取失败，请稍后重试。")}</span>
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
	                  <BrowserCaptureCard
	                    key={item.id}
	                    item={item}
	                    archivedView={captureState === "archived"}
	                    skillGenerationMission={item.captureId ? skillGenerationMissions[item.captureId] ?? visibleSkillsByCaptureId.get(item.captureId) : undefined}
	                    skillDirectionAnalysis={item.captureId ? skillDirectionAnalyses[item.captureId] : undefined}
	                    skillUsageMission={item.captureId ? skillUsageMissions[item.captureId] : undefined}
	                    isAnalyzingSkillDirection={createSkillDirectionMission.isPending && createSkillDirectionMission.variables?.captureId === item.captureId}
	                    isGeneratingSkill={createSkillGenerationMission.isPending && createSkillGenerationMission.variables?.captureId === item.captureId}
	                    isCreatingSkillMission={createSkillUsageMission.isPending && createSkillUsageMission.variables?.item.captureId === item.captureId}
	                    isDeletingSkill={deleteGeneratedSkill.isPending && deleteGeneratedSkill.variables?.captureId === item.captureId}
	                    onOpenSkillDraft={openSkillDraftFlow}
	                    onViewSkillDirectionAnalysis={(analysis) => openSkillDraftFlow(item, analysis)}
	                    onRequestSkillFromBookmark={openSkillDraftFlow}
	                    onUseGeneratedSkill={handleUseGeneratedSkill}
	                    onDeleteGeneratedSkill={handleRequestDeleteGeneratedSkill}
	                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </WorkbenchSection>
      <SkillDraftFlowDialog
        flow={skillDraftFlow}
        comments={skillDirectionCommentsQuery.data}
        isLoading={skillDirectionCommentsQuery.isLoading || skillDirectionCommentsQuery.isFetching}
        isError={skillDirectionCommentsQuery.isError}
        isAnalyzing={createSkillDirectionMission.isPending}
        isSubmitting={createSkillGenerationMission.isPending}
        onRetry={() => void skillDirectionCommentsQuery.refetch()}
        onClose={() => setSkillDraftFlow(null)}
        onChange={setSkillDraftFlow}
        onAnalyze={(item, userNeed) => void handleAnalyzeSkillDirection(item, userNeed)}
        onSkipAnalysis={startSkillDraftWithoutCodex}
        onConfirm={() => void handleConfirmSkillDirection()}
      />
      <DeleteGeneratedSkillDialog
        target={skillDeleteTarget}
        isDeleting={deleteGeneratedSkill.isPending}
        onClose={() => setSkillDeleteTarget(null)}
        onConfirm={() => void handleConfirmDeleteGeneratedSkill()}
      />
      <Dialog open={collectPromptUrls.length > 0} onOpenChange={(open) => { if (!open) setCollectPromptUrls([]); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>收藏输入链接？</DialogTitle>
            <DialogDescription>
              创建 Mission 前，先确认是否把这些链接加入收藏，方便后续搜索和复用。
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
            <Button type="button" variant="outline" onClick={() => void handleCollectPromptSkip()} disabled={createBrowserCapture.isPending || createMission.isPending}>暂不收藏，继续创建</Button>
            <Button type="button" onClick={() => void handleCollectPromptConfirm()} disabled={createBrowserCapture.isPending || createMission.isPending}>
              {createBrowserCapture.isPending || createMission.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              收藏并创建 Mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkbenchShell>
  );
}

function SkillDraftFlowDialog({
  flow,
  comments,
  isLoading,
  isError,
  isAnalyzing,
  isSubmitting,
  onRetry,
  onClose,
  onChange,
  onAnalyze,
  onSkipAnalysis,
  onConfirm,
}: {
  flow: SkillDraftFlow | null;
  comments: Comment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isAnalyzing: boolean;
  isSubmitting: boolean;
  onRetry: () => void;
  onClose: () => void;
  onChange: (flow: SkillDraftFlow | null) => void;
  onAnalyze: (item: AiInboxInput, userNeed: string) => void;
  onSkipAnalysis: () => void;
  onConfirm: () => void;
}) {
  const draft = flow?.draft;
  const latestComment = latestSkillDirectionAnalysisComment(comments);
  const hasCodexResult = Boolean(latestComment?.content.trim());
  const noAgent = flow?.analysis?.planningStatus === "no_codex_agent";
  const canGenerate = Boolean(draft?.title.trim() && draft.primaryUseCase.trim() && linesToList(draft.expectedInputs).length > 0 && linesToList(draft.expectedOutputs).length > 0);
  const updateFlow = (patch: Partial<SkillDraftFlow>) => {
    if (!flow) return;
    onChange({ ...flow, ...patch });
  };
  const updateDraft = (patch: Partial<SkillDirectionDraft>) => {
    if (!flow?.draft) return;
    onChange({ ...flow, draft: { ...flow.draft, ...patch } });
  };

  return (
    <Dialog open={Boolean(flow)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>做成能力</DialogTitle>
          <DialogDescription>
            先确认你想沉淀的能力方向，再交给本地 Codex 生成可复用能力并写入能力库。
          </DialogDescription>
        </DialogHeader>
        {flow && (
          <div className="grid max-h-[68vh] gap-4 overflow-y-auto pr-1">
            <div className="rounded-md border bg-accent/40 p-3 text-xs leading-5 text-muted-foreground">
              <div className="font-medium text-foreground">{flow.item.title}</div>
              <a href={flow.item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate font-mono underline underline-offset-2">
                {flow.item.sourceUrl}
              </a>
              <div className="mt-2">{skillOpportunityAssessmentText(flow.item.skillOpportunity)}</div>
              <SkillOpportunityEvidence opportunity={flow.item.skillOpportunity} />
            </div>

            <SkillDraftStageBar
              hasAnalysis={Boolean(flow.analysis)}
              hasDraft={Boolean(draft)}
              hasCodexResult={hasCodexResult}
              noAgent={noAgent}
            />

            <div className="grid gap-2">
              <Label htmlFor="skill-draft-user-need">你的需求（选填）</Label>
              <Textarea
                id="skill-draft-user-need"
                value={flow.userNeed}
                onChange={(event) => updateFlow({ userNeed: event.target.value })}
                placeholder="例如：我想把它做成一个 API 接入助手 / 论文阅读助手 / 排障助手。"
                className="min-h-20 resize-none text-sm"
                disabled={Boolean(flow.analysis) || isAnalyzing || isSubmitting}
              />
            </div>

            {flow.analysis && (
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
                  {noAgent ? <AlertCircle className="size-3.5 text-amber-600" /> : hasCodexResult ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  Codex 推荐
                </div>
                {noAgent ? (
                  <p className="text-xs leading-5 text-amber-900 dark:text-amber-200">
                    当前没有可用 Codex agent。你可以先用平台默认草稿继续，之后再让本地 Codex 完善。
                  </p>
                ) : hasCodexResult ? (
                  <Markdown className="text-sm leading-6">{latestComment?.content ?? ""}</Markdown>
                ) : isError ? (
                  <div className="flex items-center justify-between gap-3 text-xs text-destructive">
                    <span>暂时读取不到 Codex 推荐结果。</span>
                    <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                      <RefreshCw className="size-3.5" />
                      重试
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-muted-foreground" role="status">
                    {isLoading ? "正在读取 Codex 推荐…" : "Codex 正在阅读链接并推荐能力方向…"}
                  </p>
                )}
              </div>
            )}

            {draft && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>选择能力方向</Label>
                  <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="能力方向">
                    {skillDirectionModeOptions(draft.item).map((option) => (
                      <Button
                        key={option.mode}
                        type="button"
                        variant={draft.mode === option.mode ? "default" : "outline"}
                        className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
                        onClick={() => onChange({ ...flow, draft: applySkillDirectionMode(draft, option.mode) })}
                      >
                        <span className="grid gap-0.5">
                          <span className="text-xs font-medium">{option.label}</span>
                          <span className={draft.mode === option.mode ? "text-[11px] font-normal text-primary-foreground/80" : "text-[11px] font-normal text-muted-foreground"}>
                            {option.description}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-title">能力名称</Label>
                  <Input id="skill-direction-title" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-use-case">主要用途</Label>
                  <Textarea id="skill-direction-use-case" value={draft.primaryUseCase} onChange={(event) => updateDraft({ primaryUseCase: event.target.value })} className="min-h-20 resize-none text-sm" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="skill-direction-context">使用场景</Label>
                    <Textarea id="skill-direction-context" value={draft.targetContext} onChange={(event) => updateDraft({ targetContext: event.target.value })} className="min-h-20 resize-none text-sm" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="skill-direction-success">成功标准</Label>
                    <Textarea id="skill-direction-success" value={draft.successCriteria} onChange={(event) => updateDraft({ successCriteria: event.target.value })} className="min-h-20 resize-none text-sm" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-capability">能力描述</Label>
                  <Textarea id="skill-direction-capability" value={draft.capability} onChange={(event) => updateDraft({ capability: event.target.value })} className="min-h-20 resize-none text-sm" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="skill-direction-inputs">必要输入</Label>
                    <Textarea id="skill-direction-inputs" value={draft.expectedInputs} onChange={(event) => updateDraft({ expectedInputs: event.target.value })} className="min-h-24 resize-none text-sm" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="skill-direction-outputs">期望输出</Label>
                    <Textarea id="skill-direction-outputs" value={draft.expectedOutputs} onChange={(event) => updateDraft({ expectedOutputs: event.target.value })} className="min-h-24 resize-none text-sm" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-triggers">触发说法</Label>
                  <Textarea id="skill-direction-triggers" value={draft.triggerExamples} onChange={(event) => updateDraft({ triggerExamples: event.target.value })} className="min-h-20 resize-none text-sm" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-boundaries">边界和不要做</Label>
                  <Textarea id="skill-direction-boundaries" value={draft.boundaries} onChange={(event) => updateDraft({ boundaries: event.target.value })} className="min-h-20 resize-none text-sm" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skill-direction-notes">补充说明</Label>
                  <Textarea id="skill-direction-notes" value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} className="min-h-16 resize-none text-sm" />
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isAnalyzing || isSubmitting}>取消</Button>
          {flow && !draft && (
            <Button type="button" variant="outline" onClick={onSkipAnalysis} disabled={isAnalyzing || isSubmitting}>
              直接填草稿
            </Button>
          )}
          {flow && !flow.analysis && (
            <Button type="button" onClick={() => onAnalyze(flow.item, flow.userNeed)} disabled={isAnalyzing || isSubmitting}>
              {isAnalyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {isAnalyzing ? "推荐中" : recommendSkillDirectionLabel}
            </Button>
          )}
          {draft && (
            <Button type="button" onClick={onConfirm} disabled={!canGenerate || isAnalyzing || isSubmitting}>
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {isSubmitting ? "提交中" : "交给 Codex 生成能力"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkillDraftStageBar({
  hasAnalysis,
  hasDraft,
  hasCodexResult,
  noAgent,
}: {
  hasAnalysis: boolean;
  hasDraft: boolean;
  hasCodexResult: boolean;
  noAgent: boolean;
}) {
  const stages = [
    {
      label: "补充意图",
      state: hasAnalysis || hasDraft ? "done" : "active",
    },
    {
      label: "Codex 推荐",
      state: !hasAnalysis ? "pending" : hasCodexResult || noAgent ? "done" : "active",
    },
    {
      label: "确认生成",
      state: hasDraft ? "active" : "pending",
    },
  ];
  return (
    <div aria-label="能力生成阶段" className="grid gap-2 rounded-md border bg-background px-3 py-2 sm:grid-cols-3">
      {stages.map((stage, index) => (
        <div key={stage.label} className={skillDraftStageClass(stage.state)}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]">
            {stage.state === "done" ? <CheckCircle2 className="size-3" /> : index + 1}
          </span>
          <span className="min-w-0 truncate">{stage.label}</span>
        </div>
      ))}
    </div>
  );
}

function skillDraftStageClass(state: string): string {
  if (state === "done") {
    return "flex min-w-0 items-center gap-2 rounded-md bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300";
  }
  if (state === "active") {
    return "flex min-w-0 items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary";
  }
  return "flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs font-medium text-muted-foreground";
}

function DeleteGeneratedSkillDialog({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: {
  target: SkillDeleteTarget | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !isDeleting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除能力？</DialogTitle>
          <DialogDescription>
            这会从能力库删除「{target?.mission.skillName ?? "这个能力"}」。收藏卡片会恢复为可重新生成，已创建过的 Mission 记录会作为历史保留。
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
          删除后不可恢复；如果方向不对，建议删除后重新从收藏卡片生成。
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>取消</Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {isDeleting ? "删除中" : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrowserCaptureCard({
  item,
  archivedView,
  skillGenerationMission,
  skillDirectionAnalysis,
  skillUsageMission,
  isAnalyzingSkillDirection,
  isGeneratingSkill,
  isCreatingSkillMission,
  isDeletingSkill,
  onOpenSkillDraft,
  onViewSkillDirectionAnalysis,
  onRequestSkillFromBookmark,
  onUseGeneratedSkill,
  onDeleteGeneratedSkill,
}: {
  item: AiInboxInput;
  archivedView: boolean;
  skillGenerationMission?: SkillGenerationMission;
  skillDirectionAnalysis?: SkillDirectionAnalysis;
  skillUsageMission?: SkillUsageMission;
  isAnalyzingSkillDirection: boolean;
  isGeneratingSkill: boolean;
  isCreatingSkillMission: boolean;
  isDeletingSkill: boolean;
  onOpenSkillDraft: (item: AiInboxInput) => void;
  onViewSkillDirectionAnalysis: (analysis: SkillDirectionAnalysis) => void;
  onRequestSkillFromBookmark: (item: AiInboxInput) => void;
  onUseGeneratedSkill: (item: AiInboxInput, mission: SkillGenerationMission) => void;
  onDeleteGeneratedSkill: (item: AiInboxInput, mission: SkillGenerationMission) => void;
}) {
  const status = browserCaptureStatusView(item);
  const StatusIcon = status.icon;
  const archiveMutation = useArchiveBrowserCapture();
  const restoreMutation = useRestoreBrowserCapture();
  const captureId = item.captureId;
  const opportunity = item.skillOpportunity ?? (skillDirectionAnalysis || skillGenerationMission ? manualSkillOpportunityForItem(item) : undefined);
  const canRequestManualSkill = Boolean(captureId && !archivedView && !opportunity && !skillDirectionAnalysis && !skillGenerationMission);
  return (
    <article className="overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/30 hover:bg-accent/30">
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
      {opportunity && (
        <SkillOpportunityPanel
          opportunity={opportunity}
          mission={skillGenerationMission}
          directionAnalysis={skillDirectionAnalysis}
          skillUsageMission={skillUsageMission}
          isAnalyzingDirection={isAnalyzingSkillDirection}
          isGenerating={isGeneratingSkill}
          isCreatingSkillMission={isCreatingSkillMission}
          isDeletingSkill={isDeletingSkill}
          onOpenSkillDraft={() => onOpenSkillDraft(item)}
          onViewDirectionAnalysis={skillDirectionAnalysis ? () => onViewSkillDirectionAnalysis(skillDirectionAnalysis) : undefined}
          onUseGeneratedSkill={skillGenerationMission ? () => onUseGeneratedSkill(item, skillGenerationMission) : undefined}
          onDeleteGeneratedSkill={skillGenerationMission ? () => onDeleteGeneratedSkill(item, skillGenerationMission) : undefined}
        />
      )}
      {captureId && (
        <div className="flex items-center gap-1.5 border-t px-3 py-2">
          {canRequestManualSkill && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={isAnalyzingSkillDirection}
              onClick={() => onRequestSkillFromBookmark(item)}
            >
              {isAnalyzingSkillDirection ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {makeBookmarkSkillLabel}
            </Button>
          )}
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

function SkillOpportunityPanel({
  opportunity,
  mission,
  directionAnalysis,
  skillUsageMission,
  isAnalyzingDirection,
  isGenerating,
  isCreatingSkillMission,
  isDeletingSkill,
  onOpenSkillDraft,
  onViewDirectionAnalysis,
  onUseGeneratedSkill,
  onDeleteGeneratedSkill,
}: {
  opportunity: SkillOpportunity;
  mission?: SkillGenerationMission;
  directionAnalysis?: SkillDirectionAnalysis;
  skillUsageMission?: SkillUsageMission;
  isAnalyzingDirection: boolean;
  isGenerating: boolean;
  isCreatingSkillMission: boolean;
  isDeletingSkill: boolean;
  onOpenSkillDraft: () => void;
  onViewDirectionAnalysis?: () => void;
  onUseGeneratedSkill?: () => void;
  onDeleteGeneratedSkill?: () => void;
}) {
  const canUseGeneratedSkill = Boolean(mission?.skillId && onUseGeneratedSkill);
  const canDeleteGeneratedSkill = Boolean(mission?.skillId && onDeleteGeneratedSkill);
  const hasGeneratedSkill = Boolean(mission);
  return (
    <div className="border-t bg-accent/30 px-3 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-medium text-foreground">{personalSkillSuggestionLabel}</p>
            <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[10px] uppercase text-muted-foreground">
              {formatSkillOpportunityPageType(opportunity.pageType)}
            </Badge>
            <Badge variant="secondary" className="h-5 rounded-sm bg-primary/10 px-1.5 text-[10px] text-primary">
              平台发现
            </Badge>
            {mission && (
              <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] text-muted-foreground">
                <CheckCircle2 className="mr-1 size-3" />
                {skillActionLabel({ isGenerating, mission })}
              </Badge>
            )}
          </div>
          <h4 className="mt-1 line-clamp-1 text-sm font-medium">{opportunity.proposedTitle}</h4>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{opportunity.proposedCapability}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{opportunity.whyUseful}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!directionAnalysis && !mission && (
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={isAnalyzingDirection}
                onClick={onOpenSkillDraft}
              >
                {isAnalyzingDirection ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {isAnalyzingDirection ? "推荐中" : makeBookmarkSkillLabel}
              </Button>
            )}
            {directionAnalysis && !mission && onViewDirectionAnalysis && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={onViewDirectionAnalysis}
              >
                <Sparkles className="size-3.5" />
                继续做能力
              </Button>
            )}
            {canUseGeneratedSkill && (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-7 px-2 text-xs"
                disabled={isCreatingSkillMission}
                onClick={onUseGeneratedSkill}
              >
                {isCreatingSkillMission ? <Loader2 className="size-3.5 animate-spin" /> : <SendHorizontal className="size-3.5" />}
                {isCreatingSkillMission ? "创建中" : "用能力创建 Mission"}
              </Button>
            )}
            {mission && (
              <a href={mission.skillHref} className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 px-2 text-xs" })}>
                <ExternalLink className="size-3.5" />
                打开能力
              </a>
            )}
            {!hasGeneratedSkill && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => toast.success(reduceSkillSuggestionsToast)}
              >
                {reduceSkillSuggestionsLabel}
              </Button>
            )}
            {canDeleteGeneratedSkill && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto size-7 px-0 text-muted-foreground hover:text-destructive"
                disabled={isDeletingSkill}
                onClick={onDeleteGeneratedSkill}
                aria-label="删除能力"
              >
                {isDeletingSkill ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            )}
          </div>
          {directionAnalysis && !mission && (
            <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground" role="status">
              <Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                {directionAnalysis.planningStatus === "queued" ? "Codex 正在分析能力方向" : "方向分析已准备好"}
                <span className="text-muted-foreground">，在弹窗里确认后再生成。</span>
              </span>
            </div>
          )}
          {mission && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground" role="status">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                {skillStatusText(mission)}
              </span>
              {mission.href && (
                <a href={mission.href} className="font-medium text-foreground underline underline-offset-2">
                  查看生成 Mission
                </a>
              )}
              {skillUsageMission && (
                <span>
                  已创建使用记录：
                  <a href={skillUsageMission.href} className="ml-1 font-medium text-foreground underline underline-offset-2">
                    {skillUsageMission.title}
                  </a>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildBrowserCaptureSkillMap(skills: SkillSummary[] | undefined, workspaceSlug: string): Map<string, SkillGenerationMission> {
  const map = new Map<string, SkillGenerationMission>();
  for (const skill of skills ?? []) {
    const captureID = skillOriginCaptureId(skill);
    if (!captureID) continue;
    map.set(captureID, {
      skillId: skill.id,
      skillHref: paths.workspace(workspaceSlug).skillDetail(skill.id),
      skillName: skill.name,
      state: skillGenerationStateForSkill(skill),
    });
  }
  return map;
}

function latestSkillDirectionAnalysisComment(comments: Comment[] | undefined): Comment | undefined {
  return [...(comments ?? [])]
    .filter((comment) => comment.author_type === "agent" && comment.type !== "status_change" && comment.content.trim())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function SkillOpportunityEvidence({ opportunity }: { opportunity: SkillOpportunity | null | undefined }) {
  if (!opportunity) return null;
  const scores = [
    { label: "复用流程", value: qualitativeSkillSignal(opportunity.reusableWorkflowScore) },
    { label: "指令线索", value: qualitativeSkillSignal(opportunity.instructionDensityScore) },
    { label: "后续复用", value: qualitativeSkillSignal(opportunity.futureUseScore) },
  ];
  return (
    <div className="mt-3 grid gap-3">
      <div className="grid gap-1.5 sm:grid-cols-3">
        {scores.map((score) => (
          <div key={score.label} className="rounded-md border bg-background px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">{score.label}</div>
            <div className="mt-0.5 font-medium text-foreground">{score.value}</div>
          </div>
        ))}
      </div>
      {opportunity.evidenceSnippets.length > 0 && (
        <div className="grid gap-1">
          <div className="text-[11px] font-medium text-foreground">证据片段</div>
          <ul className="grid gap-1">
            {opportunity.evidenceSnippets.slice(0, 3).map((snippet, index) => (
              <li key={`${index}-${snippet}`} className="line-clamp-2 text-[11px] leading-5">
                {snippet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function skillOpportunityAssessmentText(opportunity: SkillOpportunity | null | undefined): string {
  if (!opportunity) {
    return "平台没有自动强推荐这个收藏沉淀为能力。你可以主动发起，让本地 Codex 先判断是否适合，并给出具体方向。";
  }
  if (!opportunity.shouldSuggest) {
    return `${opportunity.whyUseful} 请确认它真正要服务的重复任务，避免生成成泛泛摘要。`;
  }
  return `平台发现这个 ${formatSkillOpportunityPageType(opportunity.pageType)} 里有可复用线索。具体能力方向会由本地 Codex 阅读链接后推荐。${opportunity.whyUseful}`;
}

function qualitativeSkillSignal(value: number): string {
  if (value >= 0.85) return "强";
  if (value >= 0.7) return "中";
  return "弱";
}

function skillDirectionModeOptions(item: AiInboxInput): Array<{ mode: SkillDirectionMode; label: string; description: string }> {
  const subject = skillDirectionSubject(item);
  return [
    {
      mode: "adoption_review",
      label: "选型尽调",
      description: `判断 ${subject} 是否值得采用，输出取舍和风险。`,
    },
    {
      mode: "integration_setup",
      label: "接入落地",
      description: `把 ${subject} 变成项目接入、配置和验证流程。`,
    },
    {
      mode: "troubleshooting",
      label: "排障修复",
      description: `围绕 ${subject} 的错误、配置失败和集成问题排查。`,
    },
    {
      mode: "learning_runbook",
      label: "学习上手",
      description: `把 ${subject} 整理成上手路线和练习检查单。`,
    },
  ];
}

function buildSkillDirectionDraft(item: AiInboxInput, userNeed = ""): SkillDirectionDraft {
  const mode = defaultSkillDirectionMode(item.skillOpportunity?.pageType);
  const direction = skillDirectionPreset(item, mode);
  const trimmedUserNeed = userNeed.trim();
  return {
    item,
    mode,
    ...direction,
    boundaries: defaultSkillDirectionBoundaries(item.skillOpportunity, mode),
    targetContext: defaultSkillTargetContext(mode),
    successCriteria: defaultSkillSuccessCriteria(mode),
    notes: trimmedUserNeed ? `用户主动需求：${trimmedUserNeed}` : "",
  };
}

function applySkillDirectionMode(draft: SkillDirectionDraft, mode: SkillDirectionMode): SkillDirectionDraft {
  return {
    ...draft,
    mode,
    ...skillDirectionPreset(draft.item, mode),
    boundaries: defaultSkillDirectionBoundaries(draft.item.skillOpportunity, mode),
    targetContext: defaultSkillTargetContext(mode),
    successCriteria: defaultSkillSuccessCriteria(mode),
  };
}

function skillDirectionFromDraft(draft: SkillDirectionDraft): BrowserCaptureSkillDirection {
  const notes = [
    `方向：${skillDirectionModeLabel(draft.mode)}`,
    draft.targetContext.trim() ? `使用场景：${draft.targetContext.trim()}` : null,
    draft.successCriteria.trim() ? `成功标准：${draft.successCriteria.trim()}` : null,
    draft.notes.trim() ? `补充说明：${draft.notes.trim()}` : null,
  ].filter((line): line is string => line !== null).join("\n");
  return {
    title: draft.title.trim(),
    capability: draft.capability.trim(),
    primaryUseCase: draft.primaryUseCase.trim(),
    triggerExamples: linesToList(draft.triggerExamples),
    expectedInputs: linesToList(draft.expectedInputs),
    expectedOutputs: linesToList(draft.expectedOutputs),
    boundaries: draft.boundaries.trim(),
    notes: notes || undefined,
  };
}

function defaultSkillDirectionMode(pageType: SkillOpportunity["pageType"] | undefined): SkillDirectionMode {
  if (pageType === "github_repo") return "adoption_review";
  if (pageType === "tutorial") return "learning_runbook";
  return "integration_setup";
}

function skillDirectionPreset(item: AiInboxInput, mode: SkillDirectionMode): Pick<SkillDirectionDraft, "title" | "capability" | "primaryUseCase" | "triggerExamples" | "expectedInputs" | "expectedOutputs"> {
  const subject = skillDirectionSubject(item);
  switch (mode) {
    case "adoption_review":
      return {
        title: `${subject} 尽调助手`,
        capability: `围绕 ${subject} 建立可重复的选型尽调流程，检查来源文档、安装方式、license、维护信号、集成成本和风险。`,
        primaryUseCase: `当我收藏一个仓库或技术页面后，用它判断 ${subject} 是否适合当前项目采用，并给出 Adopt / Pilot / Defer / Reject 建议。`,
        triggerExamples: listToText([`评估 ${subject} 是否适合我的项目`, `帮我做 ${subject} 采用前尽调`]),
        expectedInputs: listToText(["项目背景", "技术栈", "采用目标", "评估关注点"]),
        expectedOutputs: listToText(["采用建议", "证据摘要", "上手步骤", "风险清单", "替代方案"]),
      };
    case "troubleshooting":
      return {
        title: `${subject} 排障助手`,
        capability: `把 ${subject} 的文档、常见错误和配置要求沉淀成排障流程，定位失败原因并给出修复步骤。`,
        primaryUseCase: `当我在使用 ${subject} 遇到安装、配置、运行或集成错误时，用它快速收集上下文、定位问题并给出修复路径。`,
        triggerExamples: listToText([`帮我排查 ${subject} 集成错误`, `根据日志定位 ${subject} 配置问题`]),
        expectedInputs: listToText(["错误信息或日志", "当前配置", "运行环境", "已尝试步骤"]),
        expectedOutputs: listToText(["可能原因排序", "验证命令", "修复步骤", "回归检查清单"]),
      };
    case "learning_runbook":
      return {
        title: `${subject} 上手助手`,
        capability: `把 ${subject} 的教程和文档沉淀成循序渐进的学习、配置、练习和检查流程。`,
        primaryUseCase: `当我想学习或快速上手 ${subject} 时，用它生成适合当前水平和项目目标的路线、练习和检查点。`,
        triggerExamples: listToText([`带我上手 ${subject}`, `把 ${subject} 文档变成学习计划`]),
        expectedInputs: listToText(["当前水平", "学习目标", "可投入时间", "项目背景"]),
        expectedOutputs: listToText(["学习路线", "关键概念", "练习任务", "完成检查点"]),
      };
    case "integration_setup":
    default:
      return {
        title: `${subject} 接入助手`,
        capability: `把 ${subject} 的技术文档沉淀成项目接入流程，覆盖配置、示例、验证、错误处理和上线前检查。`,
        primaryUseCase: `当我需要把 ${subject} 接入真实项目时，用它根据项目栈生成落地步骤、代码示例、环境变量清单和验收检查。`,
        triggerExamples: listToText([`帮我接入 ${subject}`, `根据这份文档实现 ${subject}`]),
        expectedInputs: listToText(["项目栈", "集成目标", "现有代码或配置", "错误信息"]),
        expectedOutputs: listToText(["接入步骤", "示例代码", "配置清单", "测试步骤", "错误排查清单"]),
      };
  }
}

function skillDirectionSubject(item: AiInboxInput): string {
  const title = item.skillOpportunity?.proposedTitle || item.title || "网页";
  return title
    .replace(/\s+(尽调|接入|配置|排障|上手|学习)助手(?:\s+\S+)?$/u, "")
    .replace(/\s+/g, " ")
    .trim() || item.title || "网页";
}

function manualSkillOpportunityForItem(item: AiInboxInput): SkillOpportunity {
  return {
    shouldSuggest: false,
    confidence: 0.5,
    pageType: "unknown",
    proposedTitle: `${item.title || "收藏网页"} 助手`,
    proposedCapability: "根据用户指定的目标，把这个收藏网页沉淀成可复用的个人能力。",
    whyUseful: "用户主动选择把这个收藏做成能力，需要本地 Codex 先阅读来源并判断最合适的能力方向。",
    triggerExamples: ["基于这个收藏帮我完成相关任务", "按这个收藏沉淀的流程处理我的问题"],
    expectedInputs: ["用户目标", "使用场景", "当前上下文"],
    expectedOutputs: ["可执行步骤", "检查清单", "注意事项"],
    reusableWorkflowScore: 0.5,
    instructionDensityScore: 0.5,
    futureUseScore: 0.5,
    evidenceSnippets: [item.preview].filter(Boolean),
    riskNotes: ["这是用户主动发起的能力方向分析，生成前需要 Codex 判断网页是否适合沉淀为可复用能力。"],
  };
}

function skillDirectionModeLabel(mode: SkillDirectionMode): string {
  if (mode === "adoption_review") return "选型尽调";
  if (mode === "troubleshooting") return "排障修复";
  if (mode === "learning_runbook") return "学习上手";
  return "接入落地";
}

function defaultSkillTargetContext(mode: SkillDirectionMode): string {
  if (mode === "adoption_review") return "个人或团队在引入新依赖、工具或服务前，需要快速判断是否值得采用。";
  if (mode === "troubleshooting") return "本地开发、CI 或生产集成遇到错误，需要基于日志和配置快速定位问题。";
  if (mode === "learning_runbook") return "用户希望把收藏页面变成可执行的学习路线，并能按检查点推进。";
  return "真实项目准备接入这个技术、API、工具或服务，需要可执行步骤和验收标准。";
}

function defaultSkillSuccessCriteria(mode: SkillDirectionMode): string {
  if (mode === "adoption_review") return "输出有证据链的采用建议，并明确风险、替代方案和下一步试点动作。";
  if (mode === "troubleshooting") return "能给出可验证的原因排序、修复步骤和回归检查，避免只列泛泛建议。";
  if (mode === "learning_runbook") return "能按阶段给出学习路径、练习任务和完成标准，避免只总结文章。";
  return "能让 agent 按步骤完成接入、生成必要代码或配置，并给出测试和上线前检查。";
}

function defaultSkillDirectionBoundaries(opportunity: SkillOpportunity | null | undefined, mode: SkillDirectionMode): string {
  const riskNotes = opportunity?.riskNotes ?? [];
  return [
    `不要只总结网页内容；要沉淀成 ${skillDirectionModeLabel(mode)} 方向的 agent 可执行、可复用能力。`,
    "必须保留来源 URL 和需要刷新来源信息的步骤。",
    ...riskNotes,
  ].join("\n");
}

function listToText(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join("\n");
}

function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function skillOriginCaptureId(skill: SkillSummary): string | null {
  const origin = recordValue(skill.config, "origin");
  const captureID = origin ? recordValue(origin, "capture_id") : null;
  return typeof captureID === "string" && captureID ? captureID : null;
}

function skillGenerationStateForSkill(skill: Pick<SkillSummary, "config">): SkillGenerationState {
  const generation = recordValue(skill.config, "generation");
  const status = generation ? recordValue(generation, "status") : null;
  return status === "agent_refined" ? "generated" : "draft";
}

function recordValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return (value as Record<string, unknown>)[key];
}

function skillActionLabel({ isGenerating, mission }: { isGenerating: boolean; mission?: SkillGenerationMission }) {
  if (isGenerating) return "创建中";
  if (!mission) return generateSkillLabel;
  if (mission.state === "generated") return "已生成";
  if (mission.state === "draft") return "生成中";
  return "已创建";
}

function skillStatusText(mission: SkillGenerationMission) {
  if (mission.state === "generated") return "能力已生成并保存在能力库。";
  if (mission.state === "draft") return "能力已创建，等待本地 agent 完善。";
  if (mission.state === "duplicate") return "能力已在库中，并找到已有生成任务。";
  return "能力已写入库，本地 agent 的完善任务已创建。";
}

function skillUsageMissionTitle(item: AiInboxInput, mission: Pick<SkillGenerationMission, "skillName">) {
  return truncateTitle(`用 ${mission.skillName}处理 ${item.title}`);
}

function skillUsageMissionDescription(item: AiInboxInput, mission: SkillGenerationMission) {
  return [
    `从收藏网页创建 Mission，并绑定能力：${mission.skillName}。`,
    "",
    "## 收藏网页",
    `- 标题：${item.title}`,
    `- URL：${item.sourceUrl}`,
    item.preview ? `- 摘要：${item.preview}` : null,
    "",
    "## 已绑定能力",
    `- ${mission.skillName}`,
    mission.skillId ? `- 能力 ID：${mission.skillId}` : null,
    "",
    "## 任务目标",
    "使用这个能力处理收藏网页里的信息，生成可执行的下一步建议或交付物。",
  ].filter((line): line is string => line !== null).join("\n");
}

function formatSkillOpportunityPageType(pageType: SkillOpportunity["pageType"]): string {
  if (pageType === "technical_doc") return "Docs";
  if (pageType === "github_repo") return "Repo";
  if (pageType === "tutorial") return "How-to";
  return "Page";
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

function userFacingErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkFetchError(err)) return backendOfflineMessage;

  const message = err instanceof Error ? err.message.trim() : "";
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("browser capture has no skill opportunity")) {
    return noSkillOpportunityMessage;
  }
  if (normalized.includes("no available codex agent") || normalized.includes("no codex agent")) {
    return codexOfflineMessage;
  }
  if (normalized.includes("source") && (normalized.includes("fetch") || normalized.includes("read") || normalized.includes("scrape"))) {
    return sourceFetchFailedMessage;
  }

  return message;
}

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.trim().toLowerCase();
  return message === "failed to fetch" || message === "load failed" || message.includes("networkerror");
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
}: {
  input: string;
  inputUrls: string[];
  understanding: AiUnderstanding;
  collectionDecision?: InputUrlCollectionDecision;
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
