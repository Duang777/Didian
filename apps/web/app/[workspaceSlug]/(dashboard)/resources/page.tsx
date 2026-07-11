"use client";

import { ErrorBoundary } from "@multica/ui/components/common/error-boundary";
import { ResourcesWorkbenchPage } from "@multica/views/resources";

export default function Page() {
  return (
    <ErrorBoundary>
      <ResourcesWorkbenchPage />
    </ErrorBoundary>
  );
}
