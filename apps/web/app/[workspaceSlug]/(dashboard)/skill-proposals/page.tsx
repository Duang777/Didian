import { ErrorBoundary } from "@didian/ui/components/common/error-boundary";
import { SkillCenterPage } from "@didian/views/ai-workbench";

export default function Page() {
  return (
    <ErrorBoundary>
      <SkillCenterPage />
    </ErrorBoundary>
  );
}

