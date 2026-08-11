"use client";

import { use } from "react";
import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";
import { SkillDraftReviewPage } from "@didian/views/ai-workbench";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ErrorBoundary resetKeys={[id]}>
      <SkillDraftReviewPage proposalId={id} />
    </ErrorBoundary>
  );
}
