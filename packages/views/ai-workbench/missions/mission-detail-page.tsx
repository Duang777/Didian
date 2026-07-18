"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Folder, ListChecks, PencilLine } from "lucide-react";
import { Button } from "@didian/ui/components/ui/button";
import { Checkbox } from "@didian/ui/components/ui/checkbox";
import { cn } from "@didian/ui/lib/utils";
import { Markdown } from "../../common/markdown";
import { demoAtlasWorkspaces, demoMissions } from "../fixtures";
import type { AtlasContextScope, AtlasWorkspaceFile, MissionArtifact } from "../types";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

export function MissionDetailPage({ missionId }: { missionId: string }) {
  const mission = demoMissions.find((item) => item.id === missionId) ?? demoMissions[0];

  if (!mission) {
    return (
      <WorkbenchShell
        icon={ListChecks}
        title="Mission"
        description="Mission 是 AI 规划和执行工作的核心单元。"
      >
        <WorkbenchSection title="未找到 Mission" description="当前 fixture 中没有可展示的 Mission。">
          <p className="text-sm text-muted-foreground">请从 Missions 队列进入一个已有 Mission。</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  const workspace = demoAtlasWorkspaces.find((item) => item.missionId === mission.id) ?? demoAtlasWorkspaces[0];

  if (!workspace) {
    return (
      <WorkbenchShell icon={ListChecks} title={mission.title} description={mission.goal}>
        <WorkbenchSection title="暂无 Workspace" description="这个 Mission 还没有生成 Atlas Workspace。">
          <p className="text-sm text-muted-foreground">后续 Codex Run 完成后会在这里生成文档工作区。</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  return <MissionWorkspace missionTitle={mission.title} missionGoal={mission.goal} artifacts={mission.artifacts} initialWorkspace={workspace} />;
}

function MissionWorkspace({
  missionTitle,
  missionGoal,
  artifacts,
  initialWorkspace,
}: {
  missionTitle: string;
  missionGoal: string;
  artifacts: MissionArtifact[];
  initialWorkspace: NonNullable<(typeof demoAtlasWorkspaces)[number]>;
}) {
  const [files, setFiles] = useState(initialWorkspace.files);
  const [selectedPath, setSelectedPath] = useState("mission.md");
  const [scopes, setScopes] = useState(initialWorkspace.contextScopes);
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0];
  const groupedFiles = useMemo(() => groupWorkspaceFiles(files), [files]);

  function toggleScope(scopeId: AtlasContextScope["id"]) {
    setScopes((current) => current.map((scope) => scope.id === scopeId ? { ...scope, enabled: !scope.enabled } : scope));
  }

  function writeArtifactToOutput(artifact: MissionArtifact) {
    const targetPath = artifact.name.includes("索引") ? "outputs/资源索引.md" : "outputs/下一步行动.md";
    const nextContent = [
      `# ${artifact.name}`,
      "",
      `> 已从 Mission artifact 写回：${artifact.description}`,
      "",
      "## 写回说明",
      "这一步模拟 Flowix 式 Agent 输出写回文档。后续接入真实持久化后，这里会更新 Local Drive 或 Mock Drive workspace。",
    ].join("\n");
    setFiles((current) => current.map((file) => file.path === targetPath ? { ...file, content: nextContent, updatedAt: "刚刚" } : file));
    setSelectedPath(targetPath);
  }

  return (
    <WorkbenchShell
      icon={ListChecks}
      title={missionTitle}
      description={missionGoal}
    >
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <WorkbenchSection title={initialWorkspace.rootPath} description="Mission 自动生成的 Atlas Workspace。" className="xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-3">
            {groupedFiles.map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Folder className="size-3.5" />
                  {group.label}
                </div>
                <div className="grid gap-1">
                  {group.files.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      aria-pressed={file.path === selectedPath}
                      onClick={() => setSelectedPath(file.path)}
                      className={cn(
                        "flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        file.path === selectedPath ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <FileText className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </WorkbenchSection>

        <section className="min-w-0 rounded-lg border bg-card">
          <div className="flex min-h-14 flex-col gap-1 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{initialWorkspace.rootPath}</h2>
              <p className="truncate text-xs text-muted-foreground">{selectedFile?.path}</p>
            </div>
            {selectedFile?.readonly ? <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">readonly</span> : null}
          </div>
          <div className="min-h-[520px] overflow-auto p-4">
            {selectedFile ? (
              <Markdown mode="full" className="max-w-none">
                {selectedFile.content}
              </Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">没有可打开的文档。</p>
            )}
          </div>
        </section>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <WorkbenchSection title="Agent Context" description="像 Flowix 一样，先圈定 Agent 能看的工作范围。">
            <div className="space-y-2">
              {scopes.map((scope) => (
                <label key={scope.id} className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-3">
                  <Checkbox checked={scope.enabled} onCheckedChange={() => toggleScope(scope.id)} aria-label={scope.label} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{scope.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{scope.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Review Queue">
            <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" />
                等待确认的动作会写入 `decisions.md`。
              </div>
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Outputs">
            <div className="space-y-2" aria-label="Workspace outputs">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-md border bg-background p-3">
                  <div className="text-sm font-medium">{artifact.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{artifact.description}</p>
                  <Button className="mt-3" size="sm" variant="outline" type="button" onClick={() => writeArtifactToOutput(artifact)}>
                    <PencilLine className="size-3.5" />
                    写回 {artifact.name}
                  </Button>
                </div>
              ))}
            </div>
          </WorkbenchSection>
        </div>
      </div>
    </WorkbenchShell>
  );
}

function groupWorkspaceFiles(files: AtlasWorkspaceFile[]) {
  const groups = [
    { label: "root", files: files.filter((file) => !file.path.includes("/")) },
    { label: "sources", files: files.filter((file) => file.path.startsWith("sources/")) },
    { label: "outputs", files: files.filter((file) => file.path.startsWith("outputs/")) },
  ];
  return groups.filter((group) => group.files.length > 0);
}
