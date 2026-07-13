"use client";

import { AiInboxPage } from "@didian/views/ai-workbench";
import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <AiInboxPage />
    </ErrorBoundary>
  );
}
