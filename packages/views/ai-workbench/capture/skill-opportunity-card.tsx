"use client";

import { Sparkles } from "lucide-react";
import type { SkillOpportunity, SkillOpportunityPageType } from "@didian/core/browser-memory";
import { Button } from "@didian/ui/components/ui/button";

const COPY = {
  heading: "这个网页可以变成一个个人 Skill",
  capabilityLabel: "它能帮你做什么",
  whyLabel: "为什么值得生成",
  triggerLabel: "什么时候会用到",
  inputLabel: "需要你提供",
  outputLabel: "它会产出",
  evidenceLabel: "来源证据",
  riskLabel: "注意",
  sourceLabel: "来源",
  confidenceLabel: "置信度",
  generate: "生成 Skill",
  keepAsKnowledge: "收藏为知识",
  muteType: "以后少推荐这类",
  generatePending: "Skill 草稿生成即将上线",
  keptAsKnowledge: "已按普通收藏保留，不再提示生成 Skill。",
} as const;

const PAGE_TYPE_LABEL: Record<SkillOpportunityPageType, string> = {
  technical_doc: "技术文档",
  github_repo: "开源仓库",
  tutorial: "教程",
  blog: "博客",
  paper: "论文",
  product_page: "产品页",
  unknown: "未识别",
};

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "高";
  if (confidence >= 0.75) return "较高";
  return "中";
}

export interface SkillOpportunityCardProps {
  opportunity: SkillOpportunity;
  /** 来源域名，用于展示与「不再对此网站推荐」 */
  domain?: string | null;
  /** V2 接入 Skill 草稿生成后传入；未传时按钮展示为待上线状态，不做假成功 */
  onGenerate?: () => void;
  /** 生成请求进行中，按钮置灰并显示加载态 */
  isGenerating?: boolean;
  onKeepAsKnowledge?: () => void;
  onMutePageType?: (pageType: SkillOpportunityPageType) => void;
}

export function SkillOpportunityCard({
  opportunity,
  domain,
  onGenerate,
  isGenerating,
  onKeepAsKnowledge,
  onMutePageType,
}: SkillOpportunityCardProps) {
  const pageTypeLabel = PAGE_TYPE_LABEL[opportunity.pageType] ?? PAGE_TYPE_LABEL.unknown;
  const canGenerate = typeof onGenerate === "function";

  return (
    <section
      aria-label={COPY.heading}
      className="rounded-lg border border-primary/30 bg-primary/[0.03] p-4 transition-colors hover:border-primary/50"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium">{COPY.heading}</h2>
      </div>

      <p className="text-base font-semibold leading-6 text-foreground">「{opportunity.proposedTitle}」</p>
      <p className="mt-1 text-sm leading-6 text-foreground/90">{opportunity.proposedCapability}</p>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {domain ? (
          <div className="flex items-center gap-1">
            <dt>{COPY.sourceLabel}：</dt>
            <dd className="text-foreground/80">{domain}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <dt>类型：</dt>
          <dd className="text-foreground/80">{pageTypeLabel}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt>{COPY.confidenceLabel}：</dt>
          <dd className="text-foreground/80">{confidenceLabel(opportunity.confidence)}</dd>
        </div>
      </dl>

      {opportunity.whyUseful ? (
        <OpportunityBlock label={COPY.whyLabel}>
          <p className="text-sm leading-6 text-muted-foreground">{opportunity.whyUseful}</p>
        </OpportunityBlock>
      ) : null}

      <OpportunityList label={COPY.triggerLabel} values={opportunity.triggerExamples} quoted />
      <OpportunityChips label={COPY.inputLabel} values={opportunity.expectedInputs} />
      <OpportunityChips label={COPY.outputLabel} values={opportunity.expectedOutputs} />

      {opportunity.evidenceSnippets.length > 0 ? (
        <OpportunityBlock label={COPY.evidenceLabel}>
          <ul className="grid gap-1.5">
            {opportunity.evidenceSnippets.map((snippet, index) => (
              <li
                key={index}
                className="border-l-2 border-primary/30 pl-2.5 text-xs leading-5 text-muted-foreground"
              >
                {snippet}
              </li>
            ))}
          </ul>
        </OpportunityBlock>
      ) : null}

      {opportunity.riskNotes.length > 0 ? (
        <OpportunityBlock label={COPY.riskLabel}>
          <ul className="grid gap-1 text-xs leading-5 text-muted-foreground">
            {opportunity.riskNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </OpportunityBlock>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          type="button"
          disabled={!canGenerate || isGenerating}
          title={canGenerate ? undefined : COPY.generatePending}
          onClick={() => onGenerate?.()}
        >
          {isGenerating ? "生成中…" : COPY.generate}
        </Button>
        <Button size="sm" variant="outline" type="button" onClick={() => onKeepAsKnowledge?.()}>
          {COPY.keepAsKnowledge}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="text-muted-foreground"
          onClick={() => onMutePageType?.(opportunity.pageType)}
        >
          {COPY.muteType}
        </Button>
        {!canGenerate ? (
          <span className="text-xs text-muted-foreground">{COPY.generatePending}</span>
        ) : null}
      </div>
    </section>
  );
}

function OpportunityBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function OpportunityList({ label, values, quoted }: { label: string; values: string[]; quoted?: boolean }) {
  if (values.length === 0) return null;
  return (
    <OpportunityBlock label={label}>
      <ul className="grid gap-1 text-sm leading-6 text-muted-foreground">
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>{quoted ? `“${value}”` : value}</li>
        ))}
      </ul>
    </OpportunityBlock>
  );
}

function OpportunityChips({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <OpportunityBlock label={label}>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground"
          >
            {value}
          </span>
        ))}
      </div>
    </OpportunityBlock>
  );
}

export { COPY as SKILL_OPPORTUNITY_COPY, PAGE_TYPE_LABEL as SKILL_OPPORTUNITY_PAGE_TYPE_LABEL };
