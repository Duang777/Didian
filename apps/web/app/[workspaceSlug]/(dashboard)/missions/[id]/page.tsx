"use client";

import { use } from "react";
import { MissionDetailPage } from "@didian/views/ai-workbench";
import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ErrorBoundary resetKeys={[id]}>
      <MissionDetailPage missionId={id} />
    </ErrorBoundary>
  );
}
