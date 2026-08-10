"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  Code2,
  Eye,
  FileText,
  GitPullRequestArrow,
  Info,
  Network,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Search,
  Save,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@didian/ui/components/ui/alert-dialog";
import { Button } from "@didian/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@didian/ui/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@didian/ui/components/ui/resizable";
import { useIsMobile } from "@didian/ui/hooks/use-mobile";
import { cn } from "@didian/ui/lib/utils";
import { ContentEditor, ReadonlyContent } from "../../editor";
import { demoAtlasCollections, demoAtlasWorkspaces } from "../fixtures";
import type { AtlasWorkspaceFile } from "../types";
import { WorkbenchSection, WorkbenchShell } from "../workbench-shell";
import { paths } from "@didian/core/paths";
import { useArchiveBrowserCapture, useRestoreBrowserCapture, type BrowserCapture } from "@didian/core/browser-memory";
import { DidianIcon } from "@didian/ui/components/common/didian-icon";
import {
  addWorkspaceFile,
  canDeleteWorkspaceFile,
  createWorkspaceNote,
  deleteWorkspaceFile,
  memoryAtlasLocalStore,
  saveWorkspaceFile,
  type AtlasLocalStore,
} from "./atlas-local-store";

const ATLAS_COPY = {
  title: "Flowix Memo",
  subtitle: "",
  emptyFixture: "当前没有可展示的 Flowix fixture。",
  notebook: "Notebook",
  collection: "Collection",
  documentMode: "Markdown workspace",
  editMode: "编辑",
  previewMode: "预览",
  importMission: "导入素材",
  newNote: "新建笔记",
  searchNotes: "搜索笔记",
  deleteNote: "删除笔记",
  hideNotebook: "收起 Notebook",
  showNotebook: "展开 Notebook",
  readonlySource: "只读来源",
  editableDraft: "可编辑草稿",
  openedDocs: "打开的文档",
  aiEditPlaceholder: "选中文字后让 AI 改...",
  aiChat: "AI 对话",
  aiChatInstruction: "AI 对话指令",
  applySelectedTextEdit: "写入选中内容",
  aiEditing: "AI 修改中",
  aiEditFailed: "AI 修改失败，请重试。",
  selectedText: "选中内容",
  filter: "筛选",
  importTitle: "Mission 素材",
  importDescription: "选择要写入当前 md 的 Mission 素材，先进入草稿，再由你保存。",
  contextTitle: "来源与证据",
  evidence: "Evidence",
  markdownFirst: "Markdown-first Atlas",
  sources: "Sources",
  captures: "Captures",
  selectedSuffix: "selected",
  saveDocument: "保存文档",
  saved: "已保存",
  unsaved: "未保存",
  chooseMissionMaterial: "选择 Mission 素材",
  insertImport: "插入当前 md",
  openContext: "来源与证据",
  deleteTitle: "删除这篇笔记？",
  deleteDescription: "只会删除当前本地笔记，不会删除 Mission、sources、evidence 或 Atlas 来源材料。",
  confirmDelete: "删除笔记",
  cancel: "取消",
} as const;

const MISSION_IMPORT_OPTIONS = [
  { id: "brief", label: "Mission 目标", description: "目标、约束和验收口径。", selected: true },
  { id: "agent-output", label: "Agent 输出", description: "已完成的总结、表格和草稿。", selected: true },
  { id: "evidence", label: "证据片段", description: "用户标记或系统捕获的引用。", selected: true },
  { id: "attachments", label: "附件和链接", description: "文件、网页、PR 和外部资料。", selected: false },
] as const;

type MissionImportOptionId = (typeof MISSION_IMPORT_OPTIONS)[number]["id"];

const NOTEBOOK_TAG_FILTERS = ["mission", "note", "source", "evidence", "decision", "log"] as const;

export type AtlasAiEditRequest = {
  instruction: string;
  selectedText: string;
  currentMarkdown: string;
  filePath: string;
  workspaceTitle: string;
};

export type AtlasAiEditResult = {
  markdown: string;
  provider?: string;
  model?: string;
};

type AtlasAiEdit = (request: AtlasAiEditRequest) => Promise<AtlasAiEditResult>;

export function AtlasPage({
  localStore = memoryAtlasLocalStore,
  aiEdit = defaultAtlasAiEdit,
  remoteCaptures,
  workspaceSlug,
}: {
  localStore?: AtlasLocalStore;
  aiEdit?: AtlasAiEdit;
  remoteCaptures?: BrowserCapture[];
  workspaceSlug?: string;
} = {}) {
  const isMobile = useIsMobile();
  const [snapshot, setSnapshot] = useState(() => localStore.load(demoAtlasWorkspaces));
  const collection = demoAtlasCollections[0];
  const activeCollection = collection ?? demoAtlasCollections[0]!;
  const workspace = snapshot.workspaces.find((item) => item.id === collection?.workspaceId) ?? snapshot.workspaces[0];
  const [selectedPath, setSelectedPath] = useState("mission.md");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [openPaths, setOpenPaths] = useState<string[]>(["mission.md"]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [documentRevision, setDocumentRevision] = useState<Record<string, number>>({});
  const [aiInstruction, setAiInstruction] = useState("");
  const [customTagsByPath] = useState<Record<string, string[]>>({});
  const [missionImportOpen, setMissionImportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notebookCollapsed, setNotebookCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [selectedText, setSelectedText] = useState("");
  const [selectionAction, setSelectionAction] = useState<{ text: string; top: number; left: number } | null>(null);
  const [selectionPromptOpen, setSelectionPromptOpen] = useState(false);
  const [aiEditPending, setAiEditPending] = useState(false);
  const [aiEditError, setAiEditError] = useState("");
  const selectionInputRef = useRef<HTMLInputElement>(null);
  const [selectedImportIds, setSelectedImportIds] = useState(
    () => new Set<MissionImportOptionId>(MISSION_IMPORT_OPTIONS.filter((item) => item.selected).map((item) => item.id)),
  );

  const clearSelectionTools = useCallback(() => {
    setSelectedText("");
    setAiInstruction("");
    setAiEditError("");
    setSelectionAction(null);
    setSelectionPromptOpen(false);
    window.getSelection()?.removeAllRanges?.();
  }, []);

  useEffect(() => {
    setNotebookCollapsed(isMobile);
  }, [isMobile]);

  useEffect(() => {
    clearSelectionTools();
  }, [clearSelectionTools, selectedPath]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (selectionPromptOpen) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      const node = selection?.anchorNode;
      const element = node instanceof Element ? node : node?.parentElement;
      const documentRegion = document.querySelector("[data-atlas-document-region]");

      if (!text || !element || !documentRegion?.contains(element)) {
        clearSelectionTools();
        return;
      }

      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      const fallbackLeft = window.innerWidth / 2;
      const fallbackTop = 96;
      const nextText = text.slice(0, 160);

      setSelectedText(nextText);
      setSelectionAction({
        text: nextText,
        top: Math.max(8, (rect?.top ?? fallbackTop) - 44),
        left: Math.min(window.innerWidth - 96, Math.max(96, (rect ? rect.left + rect.width / 2 : fallbackLeft))),
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [clearSelectionTools, selectedPath, selectionPromptOpen]);

  useEffect(() => {
    if (selectionPromptOpen) selectionInputRef.current?.focus();
  }, [selectionPromptOpen]);

  useEffect(() => {
    const closeSelectionTools = (event: PointerEvent) => {
      if (!selectionAction) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-atlas-selection-ai]")) return;
      clearSelectionTools();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clearSelectionTools();
    };

    document.addEventListener("pointerdown", closeSelectionTools);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeSelectionTools);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [clearSelectionTools, selectionAction]);

  const files = useMemo(() => workspace?.files ?? [], [workspace]);
  const allTags = useMemo(() => collectNotebookTags(files, customTagsByPath), [customTagsByPath, files]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        if (!matchesNotebookTag(file, activeTagFilter, customTagsByPath)) return false;
        if (!normalizedSearch) return true;
        const haystack = [file.title, file.path, file.content, ...fileTags(file, customTagsByPath)].join("\n").toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [activeTagFilter, customTagsByPath, files, normalizedSearch],
  );
  const docs = filteredFiles.filter((file) => file.kind === "mission" || file.path.startsWith("notes/"));
  const sourceFiles = filteredFiles.filter(
    (file) => file.kind === "source" || file.kind === "evidence" || file.kind === "decision",
  );
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0];
  const selectedContent = selectedFile ? (drafts[selectedFile.path] ?? selectedFile.content) : "";
  const selectedFileReadonly = selectedFile?.readonly ?? false;
  const selectedDocumentRevision = selectedFile ? (documentRevision[selectedFile.path] ?? 0) : 0;
  const selectedImportCount = selectedImportIds.size;
  const selectedFileDirty = Boolean(selectedFile && drafts[selectedFile.path] !== undefined && drafts[selectedFile.path] !== selectedFile.content);
  const selectedFileDeletable = canDeleteWorkspaceFile(selectedFile);
  const workspaceTitle = workspace?.title || workspace?.rootPath || collection?.title || "";
  const openDocuments = openPaths.map((path) => files.find((file) => file.path === path)).filter(Boolean) as AtlasWorkspaceFile[];
  const shouldShowEmptyState = !collection || !workspace;

  const persistSnapshot = (nextSnapshot: typeof snapshot) => {
    setSnapshot(nextSnapshot);
    localStore.save(nextSnapshot);
  };

  const bumpDocumentRevision = (path: string) => {
    setDocumentRevision((current) => ({ ...current, [path]: (current[path] ?? 0) + 1 }));
  };

  const clearDraft = (path: string) => {
    setDrafts((current) => {
      const { [path]: _saved, ...rest } = current;
      return rest;
    });
  };

  const handleSaveDocument = () => {
    if (!workspace || !selectedFile || selectedFileReadonly) return;
    const nextSnapshot = saveWorkspaceFile(snapshot, workspace.id, selectedFile.path, selectedContent);
    persistSnapshot(nextSnapshot);
    clearDraft(selectedFile.path);
    bumpDocumentRevision(selectedFile.path);
  };

  const updateSelectedDraft = (content: string) => {
    if (!selectedFile) return;
    setDrafts((current) => ({ ...current, [selectedFile.path]: content }));
    bumpDocumentRevision(selectedFile.path);
  };

  const openDocument = (path: string) => {
    setOpenPaths((current) => (current.includes(path) ? current : [...current, path]));
    setSelectedPath(path);
  };

  const handleApplyAiEdit = async () => {
    const instruction = aiInstruction.trim();
    const selection = selectionAction?.text || selectedText;
    if (!selectedFile || selectedFileReadonly || !instruction || !selection) return;

    setAiEditPending(true);
    setAiEditError("");
    try {
      const result = await aiEdit({
        instruction,
        selectedText: selection,
        currentMarkdown: selectedContent,
        filePath: selectedFile.path,
        workspaceTitle,
      });
      updateSelectedDraft(replaceSelectedMarkdown(selectedContent, selection, result.markdown));
      clearSelectionTools();
    } catch {
      setAiEditError(ATLAS_COPY.aiEditFailed);
    } finally {
      setAiEditPending(false);
    }
  };

  const handleCreateNote = () => {
    if (!workspace) return;
    const file = createWorkspaceNote(files);
    persistSnapshot(addWorkspaceFile(snapshot, workspace.id, file));
    openDocument(file.path);
  };

  const handleInsertMissionImport = () => {
    if (!selectedFile || selectedFileReadonly || selectedImportIds.size === 0) return;
    updateSelectedDraft(appendMarkdown(selectedContent, renderMissionImport(Array.from(selectedImportIds), activeCollection.sourceMissionId)));
    setMissionImportOpen(false);
  };

  const handleDeleteSelectedFile = () => {
    if (!workspace || !selectedFile || !selectedFileDeletable) return;
    const nextSnapshot = deleteWorkspaceFile(snapshot, workspace.id, selectedFile.path);
    persistSnapshot(nextSnapshot);
    clearDraft(selectedFile.path);
    const nextPath = nextSnapshot.workspaces.find((item) => item.id === workspace.id)?.files[0]?.path ?? "mission.md";
    setOpenPaths((current) => current.filter((path) => path !== selectedFile.path));
    setSelectedPath(nextPath);
    setDeleteConfirmOpen(false);
  };

  const toggleImportOption = (id: MissionImportOptionId) => {
    setSelectedImportIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <WorkbenchShell icon={Network} title={ATLAS_COPY.title} description={ATLAS_COPY.subtitle} fullBleed>
      {shouldShowEmptyState ? (
        <WorkbenchSection title="暂无 Collection" description="从 AI Inbox 创建 Mission 后，完成的资源合集会沉淀到这里。">
          <p className="text-sm text-muted-foreground">{ATLAS_COPY.emptyFixture}</p>
        </WorkbenchSection>
      ) : (
        <>
      <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0 overflow-hidden border-t bg-background">
        {!notebookCollapsed ? (
          <>
            <ResizablePanel id="notebook" defaultSize="16%" minSize="12%" maxSize="22%">
              <NotebookTree
                workspaceTitle={workspaceTitle}
                rootPath={workspace.rootPath}
                docs={docs}
                sourceFiles={sourceFiles}
                selectedPath={selectedPath}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                availableTags={allTags}
                activeTagFilter={activeTagFilter}
                onToggleTagFilter={setActiveTagFilter}
                onSelectPath={openDocument}
                onCreateNote={handleCreateNote}
                onCollapse={() => setNotebookCollapsed(true)}
                captures={remoteCaptures}
                workspaceSlug={workspaceSlug}
              />
            </ResizablePanel>
            <ResizableHandle />
          </>
        ) : null}
        <ResizablePanel id="document" minSize="60%">
          <main className="flex h-full min-w-0 flex-col bg-background">
            <div className="border-b bg-card/70 px-3 py-2 md:px-4">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  {notebookCollapsed ? (
                    <Button size="icon-sm" type="button" variant="ghost" aria-label={ATLAS_COPY.showNotebook} onClick={() => setNotebookCollapsed(false)}>
                      <PanelLeftOpen className="size-4" />
                    </Button>
                  ) : null}
                  <div className="min-w-0">
                    <div className="truncate text-[11px] text-muted-foreground">{workspaceTitle}</div>
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{selectedFile?.title}</h2>
                      <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[11px]", selectedFileDirty ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                        {selectedFileReadonly ? ATLAS_COPY.readonlySource : selectedFileDirty ? ATLAS_COPY.unsaved : ATLAS_COPY.saved}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Button size="sm" type="button" variant={viewMode === "edit" ? "secondary" : "ghost"} onClick={() => setViewMode("edit")} disabled={selectedFileReadonly}>
                    <Code2 className="size-3.5" />
                    {ATLAS_COPY.editMode}
                  </Button>
                  <Button size="sm" type="button" variant={viewMode === "preview" ? "secondary" : "ghost"} onClick={() => setViewMode("preview")}>
                    <Eye className="size-3.5" />
                    {ATLAS_COPY.previewMode}
                  </Button>
                  {!selectedFileReadonly && selectedFile ? (
                    <Button size="sm" type="button" variant="outline" onClick={handleSaveDocument} disabled={!selectedFileDirty}>
                      <Save className="size-3.5" />
                      {ATLAS_COPY.saveDocument}
                    </Button>
                  ) : null}
                  {selectedFileDeletable ? (
                    <Button size="sm" type="button" variant="outline" onClick={() => setDeleteConfirmOpen(true)}>
                      <Trash2 className="size-3.5" />
                      {ATLAS_COPY.deleteNote}
                    </Button>
                  ) : null}
                  <Button size="sm" type="button" variant="outline" onClick={() => setMissionImportOpen(true)} disabled={selectedFileReadonly}>
                    <GitPullRequestArrow className="size-3.5" />
                    {ATLAS_COPY.importMission}
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => setContextOpen(true)}>
                    <Info className="size-3.5" />
                    {ATLAS_COPY.openContext}
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label={ATLAS_COPY.openedDocs}>
                  {openDocuments.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      role="tab"
                      aria-label={`打开的 ${documentTabLabel(file)}`}
                      aria-selected={file.path === selectedPath}
                      onClick={() => setSelectedPath(file.path)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        file.path === selectedPath ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <FileText className="size-3.5" />
                      <span className="truncate">{documentTabLabel(file)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="flex min-h-full w-full flex-col px-4 py-4 md:px-8 xl:px-10">
                {selectedFile && (selectedFileReadonly || viewMode === "preview") ? (
                  <div className="flex min-h-[620px] flex-1 rounded-md border bg-card px-4 py-5 md:px-6">
                    <div data-atlas-document-region className="w-full">
                      <ReadonlyContent content={selectedContent} className="max-w-none" />
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="atlas-document-editor flex min-h-[620px] flex-1 rounded-md border bg-card px-4 py-5 md:px-6">
                    <div data-atlas-document-region className="w-full">
                      <ContentEditor
                        key={`${selectedFile.path}:${selectedDocumentRevision}`}
                        defaultValue={selectedContent}
                        placeholder="在这里继续整理这篇 Atlas 文档..."
                        debounceMs={250}
                        disableMentions
                        onUpdate={(markdown) => setDrafts((current) => ({ ...current, [selectedFile.path]: markdown }))}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>

      {selectionAction && selectedFile && !selectedFileReadonly ? (
        <div
          className="fixed z-50 -translate-x-1/2"
          style={{ top: selectionAction.top, left: selectionAction.left }}
          data-atlas-selection-ai
        >
          {selectionPromptOpen ? (
            <div className="w-80 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
              <div className="mb-1 truncate text-xs text-muted-foreground">
                {ATLAS_COPY.selectedText}: {selectionAction.text}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  ref={selectionInputRef}
                  aria-label={ATLAS_COPY.aiChatInstruction}
                  value={aiInstruction}
                  onChange={(event) => setAiInstruction(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleApplyAiEdit();
                    if (event.key === "Escape") {
                      clearSelectionTools();
                    }
                  }}
                  placeholder={ATLAS_COPY.aiEditPlaceholder}
                  className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <Button size="sm" type="button" onClick={() => void handleApplyAiEdit()} disabled={!aiInstruction.trim() || aiEditPending}>
                  {aiEditPending ? ATLAS_COPY.aiEditing : ATLAS_COPY.applySelectedTextEdit}
                </Button>
              </div>
              {aiEditError ? <div className="mt-1 text-xs text-destructive">{aiEditError}</div> : null}
            </div>
          ) : (
            <Button
              size="sm"
              type="button"
              variant="secondary"
              className="shadow-md"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setSelectionPromptOpen(true)}
            >
              <WandSparkles className="size-3.5" />
              {ATLAS_COPY.aiChat}
            </Button>
          )}
        </div>
      ) : null}

      <Dialog open={missionImportOpen} onOpenChange={setMissionImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{ATLAS_COPY.chooseMissionMaterial}</DialogTitle>
            <DialogDescription>{ATLAS_COPY.importDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MISSION_IMPORT_OPTIONS.map((option) => {
              const selected = selectedImportIds.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleImportOption(option.id)}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                    selected ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    <span className="mt-0.5 line-clamp-2 text-xs opacity-80">{option.description}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-normal">{selected ? "on" : "off"}</span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMissionImportOpen(false)}>
              {ATLAS_COPY.cancel}
            </Button>
            <Button type="button" onClick={handleInsertMissionImport} disabled={selectedImportCount === 0}>
              <GitPullRequestArrow className="size-3.5" />
              {ATLAS_COPY.insertImport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contextOpen} onOpenChange={setContextOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ATLAS_COPY.contextTitle}</DialogTitle>
            <DialogDescription>{activeCollection.summary}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <ContextRow label="Current file" value={selectedFile?.path ?? "-"} />
            <ContextRow label="Notebook files" value={String(files.length)} />
            <ContextRow label="Imported from" value={activeCollection.sourceMissionId} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{ATLAS_COPY.evidence}</div>
            <div className="grid gap-2 md:grid-cols-2">
              {activeCollection.resources.map((resource) => (
                <div key={resource.id} className="rounded-md border bg-background p-2.5">
                  <div className="truncate text-sm font-medium">{resource.title}</div>
                  {resource.evidence.map((evidence) => (
                    <p key={evidence.id} className="mt-1 line-clamp-3 text-xs text-muted-foreground">{evidence.quote}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ATLAS_COPY.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ATLAS_COPY.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ATLAS_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedFile}>{ATLAS_COPY.confirmDelete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </WorkbenchShell>
  );
}

function NotebookTree({
  workspaceTitle,
  rootPath,
  docs,
  sourceFiles,
  selectedPath,
  searchQuery,
  onSearchQueryChange,
  availableTags,
  activeTagFilter,
  onToggleTagFilter,
  onSelectPath,
  onCreateNote,
  onCollapse,
  captures,
  workspaceSlug,
}: {
  workspaceTitle: string;
  rootPath: string;
  docs: AtlasWorkspaceFile[];
  sourceFiles: AtlasWorkspaceFile[];
  selectedPath: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  availableTags: string[];
  activeTagFilter: string | null;
  onToggleTagFilter: (tag: string | null) => void;
  onSelectPath: (path: string) => void;
  onCreateNote: () => void;
  onCollapse: () => void;
  captures?: BrowserCapture[];
  workspaceSlug?: string;
}) {
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-card/80 p-1.5" aria-label="Notebook">
      <div className="flex items-center gap-2 px-1.5 py-1.5">
        <NotebookTabs className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{workspaceTitle}</div>
          <p className="truncate text-xs text-muted-foreground">{rootPath}</p>
        </div>
        <Button size="icon-sm" type="button" variant="ghost" aria-label={ATLAS_COPY.hideNotebook} onClick={onCollapse}>
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <div className="px-1.5 pb-1.5">
        <label className="block">
          <span className="sr-only">{ATLAS_COPY.searchNotes}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label={ATLAS_COPY.searchNotes}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
              placeholder={ATLAS_COPY.searchNotes}
              className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </label>
        <details className="mt-1.5">
          <summary className="cursor-pointer list-none text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            {ATLAS_COPY.filter}
            {activeTagFilter ? `: #${activeTagFilter}` : ""}
          </summary>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {availableTags.map((tag) => {
              const active = activeTagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleTagFilter(active ? null : tag)}
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                    active ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </details>
      </div>
      <div className="px-1.5 pb-1.5">
        <Button size="sm" type="button" variant="outline" className="h-8 w-full justify-start" onClick={onCreateNote}>
          <FileText className="size-4" />
          {ATLAS_COPY.newNote}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-0.5" role="tablist" aria-label="Workspace documents">
          {docs.map((file) => (
            <NotebookFileButton
              key={file.path}
              file={file}
              selectedPath={selectedPath}
              role="tab"
              onSelectPath={onSelectPath}
            />
          ))}
        </div>
        <div className="mt-2 border-t px-1.5 pt-2">
          <div className="text-xs font-medium text-muted-foreground">{ATLAS_COPY.sources}</div>
          <div className="mt-1.5 space-y-0.5">
            {sourceFiles.map((file) => (
              <NotebookFileButton
                key={file.path}
                file={file}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
                compact
              />
            ))}
          </div>
        </div>
        {captures && captures.length > 0 && workspaceSlug ? (
          <div className="mt-2 border-t px-1.5 pt-2">
            <div className="text-xs font-medium text-muted-foreground">{ATLAS_COPY.captures}</div>
            <div className="mt-1.5 space-y-0.5">
              {captures.map((capture) => (
                <NotebookCaptureButton key={capture.id} capture={capture} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function NotebookFileButton({
  file,
  selectedPath,
  onSelectPath,
  role,
  compact = false,
}: {
  file: AtlasWorkspaceFile;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  role?: "tab";
  compact?: boolean;
}) {
  const selected = file.path === selectedPath;
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === "tab" ? selected : undefined}
      onClick={() => onSelectPath(file.path)}
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 rounded-md text-left transition-colors",
        compact ? "px-2 py-1.5 text-xs" : "px-2 py-2 text-sm",
        selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {file.kind === "mission" ? (
        <BookOpenText className={cn("shrink-0", compact ? "size-3.5" : "size-4")} />
      ) : (
        <FileText className={cn("shrink-0", compact ? "size-3.5" : "size-4")} />
      )}
      <span className="min-w-0 flex-1 truncate">{compact ? file.path : documentTabLabel(file)}</span>
      {selected && !compact ? <PencilLine className="size-3.5 shrink-0" /> : null}
    </button>
  );
}

function NotebookCaptureButton({
  capture,
  workspaceSlug,
}: {
  capture: BrowserCapture;
  workspaceSlug: string;
}) {
  const archiveMutation = useArchiveBrowserCapture();
  const restoreMutation = useRestoreBrowserCapture();
  const isArchived = capture.memory_state === "archived";
  const pending = archiveMutation.isPending || restoreMutation.isPending;
  const href = paths.workspace(workspaceSlug).captureDetail(capture.id);
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
      <CaptureFavicon src={capture.favicon_url} />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-muted-foreground hover:text-foreground hover:underline"
      >
        {capture.title}
      </a>
      <button
        type="button"
        aria-label={isArchived ? "恢复" : "归档"}
        disabled={pending}
        onClick={() => (isArchived ? restoreMutation.mutate(capture.id) : archiveMutation.mutate(capture.id))}
        className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {isArchived ? "恢复" : "归档"}
      </button>
    </div>
  );
}

function CaptureFavicon({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-background text-foreground">
      {showFallback ? (
        <DidianIcon className="size-3" noSpin />
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-3.5 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function documentTabLabel(file: AtlasWorkspaceFile) {
  if (file.path === "mission.md") return "mission.md";
  if (file.path.startsWith("notes/")) return file.path;
  return file.title.replace(/\.md$/, "");
}

function fileTags(file: AtlasWorkspaceFile, customTagsByPath: Record<string, string[]>) {
  const defaultTags = (() => {
    if (file.path === "mission.md") return ["mission", "workspace"];
    if (file.path.startsWith("notes/")) return ["note"];
    if (file.kind === "source") return ["source"];
    if (file.kind === "evidence") return ["evidence"];
    if (file.kind === "decision") return ["decision"];
    if (file.kind === "output") return ["output"];
    return ["log"];
  })();
  return Array.from(new Set([...defaultTags, ...(customTagsByPath[file.path] ?? [])]));
}

function collectNotebookTags(files: AtlasWorkspaceFile[], customTagsByPath: Record<string, string[]>) {
  const order = [...NOTEBOOK_TAG_FILTERS, "workspace"];
  const tags = new Set<string>();
  for (const file of files) {
    for (const tag of fileTags(file, customTagsByPath)) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort((left, right) => {
    const leftIndex = order.indexOf(left as (typeof order)[number]);
    const rightIndex = order.indexOf(right as (typeof order)[number]);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "zh-Hans-CN");
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function matchesNotebookTag(file: AtlasWorkspaceFile, activeTagFilter: string | null, customTagsByPath: Record<string, string[]>) {
  if (!activeTagFilter) return true;
  return fileTags(file, customTagsByPath).includes(activeTagFilter);
}

async function defaultAtlasAiEdit(request: AtlasAiEditRequest): Promise<AtlasAiEditResult> {
  const response = await fetch("/api/atlas-preview/ai-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Atlas AI edit failed: ${response.status}`);
  const result = (await response.json()) as Partial<AtlasAiEditResult>;
  if (typeof result.markdown !== "string" || result.markdown.trim() === "") {
    throw new Error("Atlas AI edit returned empty markdown");
  }
  return { markdown: result.markdown, provider: result.provider, model: result.model };
}

function replaceSelectedMarkdown(currentMarkdown: string, selectedText: string, replacement: string) {
  const selected = selectedText.trim();
  const next = replacement.trim();
  if (!selected || !next) return currentMarkdown;
  const index = currentMarkdown.indexOf(selected);
  if (index === -1) return currentMarkdown;
  return `${currentMarkdown.slice(0, index)}${next}${currentMarkdown.slice(index + selected.length)}`;
}

function renderMissionImport(ids: MissionImportOptionId[], sourceMissionId: string) {
  const sections = ids.map((id) => {
    if (id === "brief") return ["### Mission 目标", "- 来源 Mission: `" + sourceMissionId + "`", "- 保留目标、约束和验收口径，作为后续整理入口。"].join("\n");
    if (id === "agent-output") return ["### Agent 输出", "- 导入已完成的总结、表格和 Markdown 草稿。", "- 后续由 AI 继续整理，而不是直接当最终结论。"].join("\n");
    if (id === "evidence") return ["### 证据片段", "- 导入用户标记和系统捕获的引用。", "- 引用需要和 sources/ 下原文互相校验。"].join("\n");
    return ["### 附件和链接", "- 导入附件、网页、PR 和外部资料链接。", "- 大文件只保留索引，不自动展开全文。"].join("\n");
  });
  return ["", "## 从 Mission 导入", "", ...sections].join("\n\n");
}

function appendMarkdown(currentContent: string, addition: string) {
  const base = currentContent.trimEnd();
  const next = addition.trimStart();
  if (!base) return next;
  return `${base}\n\n${next}`;
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background px-2.5 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
    </div>
  );
}
