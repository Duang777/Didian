import { Network, Search, Sparkles } from "lucide-react";
import { demoAtlasCollections } from "../fixtures";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";

const builtInCapabilities = [
  { name: "Analyze", description: "判断收藏适不适合做成能力，并给出方向。" },
  { name: "Plan", description: "把多个收藏整理成可执行的任务路线。" },
  { name: "Compare", description: "比较多个资源、项目或文档的差异。" },
  { name: "Connect", description: "发现重复、相似、版本和来源关系。" },
  { name: "Summarize", description: "把长收藏压缩成可追问的摘要。" },
  { name: "Generate", description: "基于证据生成草稿、清单或能力方向。" },
  { name: "Inspect", description: "深入查看来源、证据和上下文。" },
] as const;

const askAtlasSummary = "Atlas 会先基于收藏与证据给出方向，再交给本地 Codex 继续生成。";
const askAtlasQuestion = "哪些收藏适合变成能力？";
const askAtlasPlaceholder = "输入一个主题、一个收藏，或者一个你想继续追问的问题。";
const capabilitySectionDescription = "这些是 Atlas 里预置的能力入口，不只是收藏分类。";
const quickCapabilityActions = builtInCapabilities.slice(0, 4);
const collectionEmptyDescription = "当前没有可展示的 Atlas fixture。";
const collectionFallbackDescription = "从 AI Inbox 创建 Mission 后，完成的资源合集会沉淀到这里。";
const relationshipHintsDescription = "Atlas 会把资源之间的相似、版本和来源关系先展示出来，默认只建议不自动合并。";
const relationshipHintLabels = ["相似", "重复", "版本", "来源", "摘要自"] as const;
const collectionSourcePrefix = "来源 Mission:";
const capabilityNativeLabel = "native";

export function AtlasPage() {
  const collection = demoAtlasCollections[0];

  return (
    <WorkbenchShell
      icon={Network}
      title="Atlas"
      description="Atlas 是 Mission 完成后的长期记忆：资源、合集、证据和关系会在这里继续被追问和复用。"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <WorkbenchSection title="Ask Atlas" description="先问问题，再从 Collection 和 Evidence 中找答案。">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md border bg-muted/40 p-2">
                <Search className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{askAtlasQuestion}</p>
                <p className="mt-1 text-xs text-muted-foreground">{askAtlasSummary}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{askAtlasPlaceholder}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickCapabilityActions.map((capability) => (
                <button
                  key={capability.name}
                  type="button"
                  className="inline-flex items-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Sparkles className="mr-1.5 size-3.5 text-muted-foreground" />
                  {capability.name}
                </button>
              ))}
            </div>
          </div>
        </WorkbenchSection>

        <WorkbenchSection title="Built-in capabilities" description={capabilitySectionDescription}>
          <div className="grid gap-3 sm:grid-cols-2">
            {builtInCapabilities.map((capability) => (
              <article key={capability.name} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium">{capability.name}</h2>
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{capabilityNativeLabel}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{capability.description}</p>
              </article>
            ))}
          </div>
        </WorkbenchSection>
      </div>

      <WorkbenchSection
        title={collection?.title ?? "暂无 Collection"}
        description={collection?.summary ?? collectionFallbackDescription}
      >
        {collection ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">{collection.topic}</span>
              <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                {collectionSourcePrefix} {collection.sourceMissionId}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {collection.resources.map((resource) => (
                <article key={resource.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-medium">{resource.title}</h3>
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
          </>
        ) : (
          <div className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">{collectionEmptyDescription}</div>
        )}
      </WorkbenchSection>

      <WorkbenchSection title="Relationship hints" description={relationshipHintsDescription}>
        <div className="flex flex-wrap gap-2">
          {relationshipHintLabels.map((label) => (
            <span key={label} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
      </WorkbenchSection>
    </WorkbenchShell>
  );
}
