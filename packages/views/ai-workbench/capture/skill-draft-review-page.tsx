"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Save, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceId } from "@didian/core/hooks";
import { paths, useRequiredWorkspaceSlug } from "@didian/core/paths";
import {
  useConfirmSkillProposal,
  useSkillProposal,
  useUpdateSkillProposal,
} from "@didian/core/browser-memory";
import { Badge } from "@didian/ui/components/ui/badge";
import { Button } from "@didian/ui/components/ui/button";
import { Skeleton } from "@didian/ui/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@didian/ui/components/ui/card";
import { Input } from "@didian/ui/components/ui/input";
import { Label } from "@didian/ui/components/ui/label";
import { Textarea } from "@didian/ui/components/ui/textarea";
import { toast } from "sonner";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";
import {
  SKILL_OPPORTUNITY_PAGE_TYPE_LABEL,
  confidenceLabel,
} from "./skill-opportunity-card";

interface DraftFormState {
  draft_description: string;
  draft_trigger: string;
  draft_instructions: string;
}

function pageTypeLabel(pageType: string): string {
  return (
    SKILL_OPPORTUNITY_PAGE_TYPE_LABEL[pageType as keyof typeof SKILL_OPPORTUNITY_PAGE_TYPE_LABEL] ??
    SKILL_OPPORTUNITY_PAGE_TYPE_LABEL.unknown
  );
}

export function SkillDraftReviewPage({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const slug = useRequiredWorkspaceSlug();
  const wsId = useWorkspaceId();
  const qc = useQueryClient();

  const { data: proposal, isLoading } = useSkillProposal(proposalId);
  const updateMutation = useUpdateSkillProposal();
  const confirmMutation = useConfirmSkillProposal();

  const [form, setForm] = useState<DraftFormState>({
    draft_description: "",
    draft_trigger: "",
    draft_instructions: "",
  });
  const [loadedId, setLoadedId] = useState("");

  useEffect(() => {
    if (proposal && proposal.id !== loadedId) {
      setForm({
        draft_description: proposal.draft_description,
        draft_trigger: proposal.draft_trigger,
        draft_instructions: proposal.draft_instructions,
      });
      setLoadedId(proposal.id);
    }
  }, [proposal, loadedId]);

  const isConfirmed = proposal?.status === "confirmed";
  const isSaving = updateMutation.isPending;
  const isConfirming = confirmMutation.isPending;
  const dirty =
    proposal &&
    (form.draft_description !== proposal.draft_description ||
      form.draft_trigger !== proposal.draft_trigger ||
      form.draft_instructions !== proposal.draft_instructions);

  function backToCapture() {
    if (proposal?.captured_source_id) {
      router.push(paths.workspace(slug).captureDetail(proposal.captured_source_id));
    } else {
      router.push(paths.workspace(slug).aiInbox());
    }
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id: proposalId,
        data: {
          draft_description: form.draft_description,
          draft_trigger: form.draft_trigger,
          draft_instructions: form.draft_instructions,
        },
      });
      toast.success("草稿已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleConfirm() {
    if (!proposal) return;
    try {
      // Persist latest edits before enabling.
      if (dirty) {
        await updateMutation.mutateAsync({
          id: proposalId,
          data: {
            draft_description: form.draft_description,
            draft_trigger: form.draft_trigger,
            draft_instructions: form.draft_instructions,
          },
        });
      }
      const personalSkill = await confirmMutation.mutateAsync(proposalId);
      toast.success("已启用为个人 Skill");
      qc.invalidateQueries({ queryKey: ["browser-memory", wsId, "capture", proposal.captured_source_id] });
      router.push(paths.workspace(slug).skillProposals());
      void personalSkill;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启用失败");
    }
  }

  return (
    <WorkbenchShell
      icon={Sparkles}
      title="Skill 草稿审阅"
      description="确认并微调后，把这个网页沉淀成你的个人 Skill"
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !proposal ? (
        <Card>
          <CardContent className="py-10 text-center text-sm opacity-70">
            未找到该 Skill 草稿，可能已被删除。
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={backToCapture}>
                <ArrowLeft /> 返回
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={backToCapture}>
              <ArrowLeft /> 返回来源网页
            </Button>
            {isConfirmed ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                已启用
              </Badge>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push(paths.workspace(slug).skillProposals())}>
                  <Sparkles /> Skill Center
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={!dirty || isSaving}>
                  <Save /> {isSaving ? "保存中" : "保存草稿"}
                </Button>
                <Button size="sm" onClick={handleConfirm} disabled={isConfirming}>
                  <Check /> {isConfirming ? "启用中" : "启用为个人 Skill"}
                </Button>
              </div>
            )}
          </div>

          {/* 概览（只读） */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{proposal.proposed_title}</CardTitle>
              <CardDescription>{proposal.proposed_capability}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{pageTypeLabel(proposal.page_type)}</Badge>
                <Badge variant="secondary">置信度 {confidenceLabel(proposal.confidence)}</Badge>
                {proposal.captured_source_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {proposal.captured_source_id.slice(0, 8)}
                  </Badge>
                )}
              </div>
              {proposal.why_useful && (
                <p className="opacity-80">{proposal.why_useful}</p>
              )}
            </CardContent>
          </Card>

          {/* 可编辑草稿字段 */}
          <WorkbenchSection title="草稿内容（可微调）">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="draft_description">Skill 描述</Label>
                  <Textarea
                    id="draft_description"
                    value={form.draft_description}
                    onChange={(e) => setForm((f) => ({ ...f, draft_description: e.target.value }))}
                    rows={3}
                    placeholder="这个 Skill 帮你做什么"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft_trigger">触发方式</Label>
                  <Input
                    id="draft_trigger"
                    value={form.draft_trigger}
                    onChange={(e) => setForm((f) => ({ ...f, draft_trigger: e.target.value }))}
                    placeholder="什么时候用这个 Skill"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="draft_instructions">使用说明</Label>
                  <Textarea
                    id="draft_instructions"
                    value={form.draft_instructions}
                    onChange={(e) => setForm((f) => ({ ...f, draft_instructions: e.target.value }))}
                    rows={5}
                    placeholder="具体步骤、注意事项、格式要求"
                  />
                </div>
              </CardContent>
            </Card>
          </WorkbenchSection>

          {/* 参考上下文（只读） */}
          <WorkbenchSection title="参考上下文">
            <div className="grid gap-4 md:grid-cols-2">
              <ContextList title="触发示例" items={proposal.trigger_examples} />
              <ContextList
                title="预期输入 / 输出"
                items={[
                  ...proposal.expected_inputs.map((v) => `输入：${v}`),
                  ...proposal.expected_outputs.map((v) => `输出：${v}`),
                ]}
              />
              <ContextList title="证据片段" items={proposal.evidence_snippets} />
              <ContextList title="风险提示" items={proposal.risk_notes} tone="warning" />
            </div>
          </WorkbenchSection>
        </div>
      )}
    </WorkbenchShell>
  );
}

function ContextList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs opacity-50">无</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li
                key={i}
                className={
                  "rounded-lg border px-3 py-2 text-xs leading-relaxed " +
                  (tone === "warning"
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-200/90"
                    : "border-border/60 bg-muted/30")
                }
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
