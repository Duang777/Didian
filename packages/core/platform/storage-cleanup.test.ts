import { describe, it, expect, vi } from "vitest";
import { clearWorkspaceStorage } from "./storage-cleanup";

describe("clearWorkspaceStorage", () => {
  it("removes all workspace-scoped keys for given wsId", () => {
    const adapter = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearWorkspaceStorage(adapter, "ws_123");

    expect(adapter.removeItem).toHaveBeenCalledWith("didian_issue_draft:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian_issue_surface_views:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian_issues_view:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian_issues_scope:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian_my_issues_view:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian:chat:selectedAgentId:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian:chat:activeSessionId:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian:chat:drafts:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian:chat:expanded:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledWith("didian_navigation:ws_123");
    expect(adapter.removeItem).toHaveBeenCalledTimes(10);
  });
});
