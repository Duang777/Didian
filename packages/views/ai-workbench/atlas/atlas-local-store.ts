import type { AtlasWorkspace, AtlasWorkspaceFile } from "../types";

const STORAGE_KEY = "didian.atlas.local.v1";

export type AtlasStorage = Pick<Storage, "getItem" | "setItem">;

export type AtlasLocalSnapshot = {
  workspaces: AtlasWorkspace[];
};

export interface AtlasLocalStore {
  load(seed: AtlasWorkspace[]): AtlasLocalSnapshot;
  save(snapshot: AtlasLocalSnapshot): void;
}

export function createAtlasLocalStore(storage?: AtlasStorage): AtlasLocalStore {
  return {
    load(seed) {
      if (!storage) return cloneSnapshot({ workspaces: seed });

      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return cloneSnapshot({ workspaces: seed });

      try {
        return mergeWithSeed(JSON.parse(raw), seed);
      } catch {
        return cloneSnapshot({ workspaces: seed });
      }
    },
    save(snapshot) {
      storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    },
  };
}

export const memoryAtlasLocalStore = createAtlasLocalStore();

export function saveWorkspaceFile(
  snapshot: AtlasLocalSnapshot,
  workspaceId: string,
  filePath: string,
  content: string,
): AtlasLocalSnapshot {
  return updateWorkspaceFile(snapshot, workspaceId, filePath, (file) => ({
    ...file,
    content,
    updatedAt: "刚刚",
  }));
}

export function addWorkspaceFile(
  snapshot: AtlasLocalSnapshot,
  workspaceId: string,
  file: AtlasWorkspaceFile,
): AtlasLocalSnapshot {
  return {
    workspaces: snapshot.workspaces.map((workspace) => {
      if (workspace.id !== workspaceId) return workspace;
      const existing = workspace.files.some((item) => item.path === file.path);
      return {
        ...workspace,
        files: existing
          ? workspace.files.map((item) => item.path === file.path ? file : item)
          : [...workspace.files, file],
        updatedAt: "刚刚",
      };
    }),
  };
}

export function deleteWorkspaceFile(
  snapshot: AtlasLocalSnapshot,
  workspaceId: string,
  filePath: string,
): AtlasLocalSnapshot {
  return {
    workspaces: snapshot.workspaces.map((workspace) => {
      if (workspace.id !== workspaceId) return workspace;
      return {
        ...workspace,
        files: workspace.files.filter((file) => file.path !== filePath),
        updatedAt: "刚刚",
      };
    }),
  };
}

export function canDeleteWorkspaceFile(file: AtlasWorkspaceFile | undefined) {
  return Boolean(file && !file.readonly && file.path.startsWith("notes/"));
}

export function nextNotePath(files: AtlasWorkspaceFile[]) {
  let index = files.filter((file) => file.path.startsWith("notes/new-note-")).length + 1;
  let path = `notes/new-note-${index}.md`;
  const paths = new Set(files.map((file) => file.path));
  while (paths.has(path)) {
    index += 1;
    path = `notes/new-note-${index}.md`;
  }
  return { index, path };
}

export function createWorkspaceNote(files: AtlasWorkspaceFile[]): AtlasWorkspaceFile {
  const { index, path } = nextNotePath(files);
  return {
    id: `local-note-${index}`,
    path,
    title: path,
    kind: "output",
    content: "# 新建笔记\n\n在这里整理新的 Markdown 笔记。",
    updatedAt: "刚刚",
  };
}

function updateWorkspaceFile(
  snapshot: AtlasLocalSnapshot,
  workspaceId: string,
  filePath: string,
  update: (file: AtlasWorkspaceFile) => AtlasWorkspaceFile,
): AtlasLocalSnapshot {
  return {
    workspaces: snapshot.workspaces.map((workspace) => {
      if (workspace.id !== workspaceId) return workspace;
      return {
        ...workspace,
        files: workspace.files.map((file) => file.path === filePath ? update(file) : file),
        updatedAt: "刚刚",
      };
    }),
  };
}

function mergeWithSeed(raw: unknown, seed: AtlasWorkspace[]): AtlasLocalSnapshot {
  if (!isSnapshot(raw)) return cloneSnapshot({ workspaces: seed });
  const storedById = new Map(raw.workspaces.map((workspace) => [workspace.id, workspace]));
  return {
    workspaces: seed.map((workspace) => storedById.get(workspace.id) ?? workspace),
  };
}

function isSnapshot(value: unknown): value is AtlasLocalSnapshot {
  return Boolean(
    value
      && typeof value === "object"
      && Array.isArray((value as AtlasLocalSnapshot).workspaces)
      && (value as AtlasLocalSnapshot).workspaces.every(isWorkspace),
  );
}

function isWorkspace(value: unknown): value is AtlasWorkspace {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as AtlasWorkspace).id === "string"
      && Array.isArray((value as AtlasWorkspace).files),
  );
}

function cloneSnapshot(snapshot: AtlasLocalSnapshot): AtlasLocalSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AtlasLocalSnapshot;
}
