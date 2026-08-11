"use client";
/* eslint-disable i18next/no-literal-string -- AI Workbench experimental pages keep product copy colocated until locale extraction. */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  ExternalLink,
  FileText,
  Play,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDeletePersonalSkill,
  useDeleteSkillProposal,
  usePersonalSkills,
  useSkillProposals,
  useUsePersonalSkill,
  type PersonalSkill,
  type SkillProposal,
} from "@didian/core/browser-memory";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import { useNavigation } from "../../navigation";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@didian/ui/components/ui/alert-dialog";
import { Input } from "@didian/ui/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@didian/ui/components/ui/card";
import { Skeleton } from "@didian/ui/components/ui/skeleton";
import { MetricPill, WorkbenchSection, WorkbenchShell } from "../workbench-shell";
import {
  confidenceLabel,
  SKILL_OPPORTUNITY_PAGE_TYPE_LABEL,
} from "./skill-opportunity-card";

type DeleteTarget =
  | {
      kind: "proposal";
      id: string;
      title: string;
    }
  | {
      kind: "skill";
      id: string;
      title: string;
    };

const PROPOSAL_STATUS_LABEL: Record<SkillProposal["status"], { label: string; className: string }> = {
  pending: { label: "待审阅", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
  draft: { label: "草稿", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" },
  confirmed: { label: "已启用", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  rejected: { label: "已拒绝", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

function pageTypeLabel(pageType: string): string {
  return (
    SKILL_OPPORTUNITY_PAGE_TYPE_LABEL[pageType as keyof typeof SKILL_OPPORTUNITY_PAGE_TYPE_LABEL] ??
    SKILL_OPPORTUNITY_PAGE_TYPE_LABEL.unknown
  );
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query);
}

function proposalMatches(proposal: SkillProposal, query: string): boolean {
  if (!query) return true;
  return (
    matchesQuery(proposal.proposed_title, query) ||
    matchesQuery(proposal.proposed_capability, query) ||
    matchesQuery(proposal.why_useful, query) ||
    matchesQuery(proposal.page_type, query) ||
    proposal.trigger_examples.some((item) => matchesQuery(item, query)) ||
    proposal.evidence_snippets.some((item) => matchesQuery(item, query))
  );
}

function personalSkillMatches(skill: PersonalSkill, query: string): boolean {
  if (!query) return true;
  return (
    matchesQuery(skill.name, query) ||
    matchesQuery(skill.description, query) ||
    matchesQuery(skill.capability, query) ||
    matchesQuery(skill.page_type, query) ||
    matchesQuery(skill.trigger, query) ||
    matchesQuery(skill.source_domain, query) ||
    matchesQuery(skill.source_url, query)
  );
}

function sortProposals(a: SkillProposal, b: SkillProposal): number {
  const rank = (status: SkillProposal["status"]) => {
    switch (status) {
      case "pending":
        return 0;
      case "draft":
        return 1;
      case "confirmed":
        return 2;
      case "rejected":
        return 3;
      default:
        return 4;
    }
  };
  return rank(a.status) - rank(b.status) || Date.parse(b.updated_at) - Date.parse(a.updated_at);
}

function sortPersonalSkills(a: PersonalSkill, b: PersonalSkill): number {
  return (
    Number(b.enabled) - Number(a.enabled) ||
    b.use_count - a.use_count ||
    Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

function ProposalCard({
  proposal,
  onOpen,
  onDelete,
}: {
  proposal: SkillProposal;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const status = PROPOSAL_STATUS_LABEL[proposal.status];
  return (
    <Card className="h-full border-primary/15 bg-primary/[0.02] shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base leading-6">{proposal.proposed_title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {proposal.proposed_capability}
            </CardDescription>
          </div>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{pageTypeLabel(proposal.page_type)}</Badge>
          <Badge variant="outline">置信度 {confidenceLabel(proposal.confidence)}</Badge>
          {proposal.captured_source_id ? (
            <Badge variant="outline" className="font-mono text-xs">
              {proposal.captured_source_id.slice(0, 8)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposal.why_useful ? (
          <p className="text-sm leading-6 text-muted-foreground">{proposal.why_useful}</p>
        ) : null}

        {proposal.trigger_examples.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">触发示例</div>
            <div className="flex flex-wrap gap-1.5">
              {proposal.trigger_examples.map((item) => (
                <span
                  key={item}
                  className="rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {proposal.evidence_snippets.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">证据</div>
            <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
              {proposal.evidence_snippets.slice(0, 3).map((item) => (
                <li key={item} className="border-l-2 border-primary/25 pl-2.5">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" onClick={onOpen}>
            <ArrowRight className="size-3.5" />
            打开审阅
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="size-3.5" />
            删除草稿
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalSkillCard({
  skill,
  onOpenProposal,
  onUse,
  onDelete,
}: {
  skill: PersonalSkill;
  onOpenProposal?: () => void;
  onUse: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base leading-6">{skill.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {skill.description || skill.capability}
            </CardDescription>
          </div>
          <Badge variant={skill.enabled ? "default" : "secondary"}>
            {skill.enabled ? "已启用" : "已停用"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{pageTypeLabel(skill.page_type)}</Badge>
          <Badge variant="outline">使用 {skill.use_count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {skill.capability ? (
            <p className="leading-6 text-muted-foreground">{skill.capability}</p>
          ) : null}
          <div className="space-y-1 text-xs text-muted-foreground">
            {skill.trigger ? <div>触发：{skill.trigger}</div> : null}
            {skill.expected_input ? <div>输入：{skill.expected_input}</div> : null}
            {skill.expected_output ? <div>输出：{skill.expected_output}</div> : null}
            {skill.source_domain ? <div>来源：{skill.source_domain}</div> : null}
          </div>
        </div>

        {skill.source_url ? (
          <a
            href={skill.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" />
            打开来源网页
          </a>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" onClick={onUse}>
            <Play className="size-3.5" />
            使用一次
          </Button>
          {skill.proposal_id ? (
            <Button size="sm" variant="outline" onClick={onOpenProposal}>
              <FileText className="size-3.5" />
              打开草稿
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background shadow-sm">
        <Sparkles className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function SkillCenterPage() {
  const router = useNavigation();
  const slug = useRequiredWorkspaceSlug();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const proposalsQuery = useSkillProposals();
  const skillsQuery = usePersonalSkills();
  const deleteProposalMutation = useDeleteSkillProposal();
  const deletePersonalSkillMutation = useDeletePersonalSkill();
  const usePersonalSkillMutation = useUsePersonalSkill();

  const proposals = useMemo(() => proposalsQuery.data ?? [], [proposalsQuery.data]);
  const personalSkills = useMemo(() => skillsQuery.data ?? [], [skillsQuery.data]);

  const normalizedQuery = search.trim().toLowerCase();
  const visibleProposals = useMemo(
    () =>
      proposals
        .filter((proposal) => proposalMatches(proposal, normalizedQuery))
        .sort(sortProposals),
    [proposals, normalizedQuery],
  );
  const visiblePersonalSkills = useMemo(
    () =>
      personalSkills
        .filter((skill) => personalSkillMatches(skill, normalizedQuery))
        .sort(sortPersonalSkills),
    [personalSkills, normalizedQuery],
  );

  const enabledCount = personalSkills.filter((skill) => skill.enabled).length;
  const totalUseCount = personalSkills.reduce((sum, skill) => sum + skill.use_count, 0);
  const confirmedProposals = proposals.filter((proposal) => proposal.status === "confirmed").length;

  const isBusy =
    proposalsQuery.isLoading ||
    skillsQuery.isLoading ||
    deleteProposalMutation.isPending ||
    deletePersonalSkillMutation.isPending ||
    usePersonalSkillMutation.isPending;

  async function confirmDeletion() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === "proposal") {
        await deleteProposalMutation.mutateAsync(deleteTarget.id);
        toast.success("Skill 草稿已删除");
      } else {
        await deletePersonalSkillMutation.mutateAsync(deleteTarget.id);
        toast.success("个人 Skill 已删除");
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function recordSkillUse(skill: PersonalSkill) {
    try {
      await usePersonalSkillMutation.mutateAsync(skill.id);
      toast.success("已记录一次使用");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "使用失败");
    }
  }

  return (
    <WorkbenchShell
      icon={Sparkles}
      title="Skill Center"
      description="把收藏炼成草稿，再把草稿沉淀成个人能力。草稿、个人 Skill 和来源都在这里管理。"
    >
      <div className="space-y-4">
        <WorkbenchSection title="概览" description="先看整体，再进草稿或个人库。">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Skill 草稿" value={String(proposals.length)} />
            <MetricPill label="已启用" value={String(enabledCount)} />
            <MetricPill label="确认通过" value={String(confirmedProposals)} />
            <MetricPill label="累计使用" value={String(totalUseCount)} />
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索草稿、个人 Skill、来源网页"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(paths.workspace(slug).skills())}
              >
                <BookOpenText className="size-3.5" />
                Workspace Skills
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(paths.workspace(slug).aiInbox())}
              >
                <ArrowRight className="size-3.5" />
                回到 AI Inbox
              </Button>
            </div>
          </div>
        </WorkbenchSection>

        <WorkbenchSection
          title="Skill 草稿"
          description="从收藏页面点生成后，先在这里审阅，再决定是否启用。"
        >
          {proposalsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : visibleProposals.length === 0 ? (
            <EmptyPanel
              title="暂时没有 Skill 草稿"
              description="去收藏页面找一篇适合做成 Skill 的网页，生成后会出现在这里。"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onOpen={() => router.push(paths.workspace(slug).skillProposal(proposal.id))}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "proposal",
                      id: proposal.id,
                      title: proposal.proposed_title,
                    })
                  }
                />
              ))}
            </div>
          )}
        </WorkbenchSection>

        <WorkbenchSection
          title="个人 Skill 库"
          description="启用后的个人能力、使用记录和来源信息都在这里。"
        >
          {skillsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : visiblePersonalSkills.length === 0 ? (
            <EmptyPanel
              title="暂时还没有个人 Skill"
              description="等你从草稿审阅页确认启用后，这里就会出现可复用的个人能力。"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visiblePersonalSkills.map((skill) => (
                <PersonalSkillCard
                  key={skill.id}
                  skill={skill}
                  onUse={() => void recordSkillUse(skill)}
                  onOpenProposal={
                    skill.proposal_id
                      ? () => router.push(paths.workspace(slug).skillProposal(skill.proposal_id))
                      : undefined
                  }
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "skill",
                      id: skill.id,
                      title: skill.name,
                    })
                  }
                />
              ))}
            </div>
          )}
        </WorkbenchSection>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "proposal" ? "删除 Skill 草稿？" : "删除个人 Skill？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "proposal"
                ? `草稿「${deleteTarget?.title ?? ""}」会从 Skill Center 中移除，但不会影响原始收藏。`
                : `个人 Skill「${deleteTarget?.title ?? ""}」会被删除，已记录的使用次数也会清除。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeletion()} disabled={isBusy}>
              {isBusy ? "处理中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkbenchShell>
  );
}
