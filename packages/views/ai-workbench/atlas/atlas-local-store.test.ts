import { describe, expect, it } from "vitest";
import { demoAtlasWorkspaces } from "../fixtures";
import {
  addWorkspaceFile,
  canDeleteWorkspaceFile,
  createAtlasLocalStore,
  createWorkspaceNote,
  deleteWorkspaceFile,
  saveWorkspaceFile,
} from "./atlas-local-store";

describe("Atlas local store", () => {
  it("loads seed data when there is no persisted snapshot", () => {
    const storage = new StorageShim();
    const store = createAtlasLocalStore(storage);

    expect(store.load(demoAtlasWorkspaces).workspaces[0]?.files[0]?.path).toBe("mission.md");
  });

  it("persists saved document content across store reloads", () => {
    const storage = new StorageShim();
    const store = createAtlasLocalStore(storage);
    const initial = store.load(demoAtlasWorkspaces);
    const workspaceId = initial.workspaces[0]!.id;

    store.save(saveWorkspaceFile(initial, workspaceId, "mission.md", "# Saved Atlas draft"));

    const reloaded = store.load(demoAtlasWorkspaces);
    expect(reloaded.workspaces[0]?.files.find((file) => file.path === "mission.md")?.content).toBe("# Saved Atlas draft");
  });

  it("adds notes and generates a non-conflicting note path", () => {
    const initial = { workspaces: demoAtlasWorkspaces };
    const workspaceId = initial.workspaces[0]!.id;
    const firstNote = createWorkspaceNote(initial.workspaces[0]!.files);
    const withFirstNote = addWorkspaceFile(initial, workspaceId, firstNote);
    const secondNote = createWorkspaceNote(withFirstNote.workspaces[0]!.files);

    expect(firstNote.path).toBe("notes/new-note-1.md");
    expect(secondNote.path).toBe("notes/new-note-2.md");
    expect(withFirstNote.workspaces[0]?.files.some((file) => file.path === "notes/new-note-1.md")).toBe(true);
  });

  it("saves editable document content without changing readonly source files", () => {
    const initial = { workspaces: demoAtlasWorkspaces };
    const workspaceId = initial.workspaces[0]!.id;
    const updated = saveWorkspaceFile(initial, workspaceId, "mission.md", "# Confirmed draft");

    expect(updated.workspaces[0]?.files.find((file) => file.path === "mission.md")?.content).toBe("# Confirmed draft");
    expect(updated.workspaces[0]?.files.find((file) => file.path === "evidence.md")?.readonly).toBe(true);
  });

  it("deletes user-created notes without touching source material", () => {
    const initial = { workspaces: demoAtlasWorkspaces };
    const workspaceId = initial.workspaces[0]!.id;
    const note = createWorkspaceNote(initial.workspaces[0]!.files);
    const withNote = addWorkspaceFile(initial, workspaceId, note);

    expect(canDeleteWorkspaceFile(note)).toBe(true);
    expect(canDeleteWorkspaceFile(withNote.workspaces[0]?.files.find((file) => file.path === "mission.md"))).toBe(false);
    expect(canDeleteWorkspaceFile(withNote.workspaces[0]?.files.find((file) => file.path === "evidence.md"))).toBe(false);

    const deleted = deleteWorkspaceFile(withNote, workspaceId, note.path);

    expect(deleted.workspaces[0]?.files.some((file) => file.path === note.path)).toBe(false);
    expect(deleted.workspaces[0]?.files.some((file) => file.path === "mission.md")).toBe(true);
    expect(deleted.workspaces[0]?.files.some((file) => file.path === "evidence.md")).toBe(true);
  });
});

class StorageShim {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
