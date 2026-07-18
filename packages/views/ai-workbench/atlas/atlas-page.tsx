"use client";

import { useState } from "react";
import { FileText, Folder, Network, Search } from "lucide-react";
import { cn } from "@didian/ui/lib/utils";
import { Markdown } from "../../common/markdown";
import { demoAtlasCollections, demoAtlasWorkspaces } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

export function AtlasPage() {
  const collection = demoAtlasCollections[0];
  const workspace = demoAtlasWorkspaces.find((item) => item.id === collection?.workspaceId) ?? demoAtlasWorkspaces[0];
  const [selectedPath, setSelectedPath] = useState("mission.md");

  if (!collection || !workspace) {
    return (
      <WorkbenchShell
        icon={Network}
        title="Atlas"
        description="Atlas 是 Mission 完成后的长期记忆：资源、合集、证据和关系会在这里继续被追问和复用。"
      >
        <WorkbenchSection title="暂无 Collection" description="从 AI Inbox 创建 Mission 后，完成的资源合集会沉淀到这里。">
          <p className="text-sm text-muted-foreground">当前没有可展示的 Atlas fixture。</p>
        </WorkbenchSection>
      </WorkbenchShell>
    );
  }

  const selectedFile = workspace.files.find((file) => file.path === selectedPath) ?? workspace.files[0];

  return (
    <WorkbenchShell
      icon={Network}
      title="Atlas"
      description="Atlas 是 Mission 完成后的长期记忆：资源、合集、证据和关系会在这里继续被追问和复用。"
    >
      <WorkbenchSection title={collection.title} description={collection.summary}>
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">{collection.topic}</span>
          <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">来源 Mission: {collection.sourceMissionId}</span>
          <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">Workspace: {workspace.rootPath}</span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-md border bg-background p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Folder className="size-4 text-muted-foreground" />
              {workspace.rootPath}
            </div>
            <div className="grid gap-1">
              {workspace.files.map((file) => (
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

          <div className="min-w-0 rounded-md border bg-background">
            <div className="border-b px-4 py-3">
              <h2 className="truncate text-sm font-medium">{selectedFile?.title}</h2>
              <p className="truncate text-xs text-muted-foreground">{selectedFile?.path}</p>
            </div>
            <div className="min-h-[420px] overflow-auto p-4">
              {selectedFile ? <Markdown mode="full" className="max-w-none">{selectedFile.content}</Markdown> : null}
            </div>
          </div>
        </div>
      </WorkbenchSection>

      <WorkbenchSection title="Resource Evidence" description="Workspace 是工作现场；这些资源卡保留 Atlas 的证据和关系。">
        <div className="grid gap-3 md:grid-cols-2">
          {collection.resources.map((resource) => (
            <article key={resource.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 truncate text-sm font-medium">{resource.title}</h2>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{resource.kind}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{resource.summary}</p>
              <div className="mt-3 space-y-1">
                {resource.evidence.map((evidence) => (
                  <p key={evidence.id} className="rounded-sm bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                    {evidence.label}: {evidence.quote}
                  </p>
                ))}
              </div>
              {resource.relationships.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {resource.relationships.map((relationship) => (
                    <span key={relationship.id} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                      {relationship.label}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </WorkbenchSection>

      <WorkbenchSection title="Ask Atlas" description="第一版会用 fixture 返回带来源引用的答案，后续再接真实 RAG。">
        <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
          <Search className="size-4" />
          哪些资源适合入门？当前答案会引用 Collection 中的 Evidence，并可继续写回 Workspace。
        </div>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
