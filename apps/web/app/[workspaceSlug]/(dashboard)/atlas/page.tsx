"use client";

import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";
import { AtlasLocalPage } from "@/components/atlas-local-page";

export default function Page() {
  return (
    <ErrorBoundary>
      <AtlasLocalPage />
    </ErrorBoundary>
  );
}
