"use client";

import { MissionsPage } from "@didian/views/ai-workbench";
import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <MissionsPage />
    </ErrorBoundary>
  );
}
