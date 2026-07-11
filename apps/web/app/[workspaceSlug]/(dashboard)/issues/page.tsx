"use client";

import { IssuesPage } from "@didian/views/issues/components";
import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <IssuesPage />
    </ErrorBoundary>
  );
}
