"use client";

import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";
import { ResourcesWorkbenchPage } from "@didian/views/resources";

export default function Page() {
  return (
    <ErrorBoundary>
      <ResourcesWorkbenchPage />
    </ErrorBoundary>
  );
}
