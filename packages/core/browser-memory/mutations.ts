import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useWorkspaceId } from "../hooks";
import type { CreateBrowserCaptureRequest, ListBrowserCapturesResponse } from "./types";
import { browserMemoryKeys } from "./queries";

export function useCreateBrowserCapture() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: (data: CreateBrowserCaptureRequest) => api.createBrowserCapture(data),
    onSuccess: (result) => {
      qc.setQueriesData<ListBrowserCapturesResponse>({ queryKey: browserMemoryKeys.all(wsId) }, (old) => {
        if (!old) return old;
        const withoutExisting = old.captures.filter((capture) => capture.id !== result.capture.id);
        return {
          ...old,
          captures: [result.capture, ...withoutExisting],
          total: result.dedupe.isDuplicate ? old.total : old.total + 1,
        };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: browserMemoryKeys.all(wsId) });
    },
  });
}

export function useArchiveBrowserCapture() {
  return useSetBrowserCaptureMemoryState("archived");
}

export function useRestoreBrowserCapture() {
  return useSetBrowserCaptureMemoryState("active");
}

function useSetBrowserCaptureMemoryState(state: "active" | "archived") {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: (id: string) => state === "archived" ? api.archiveBrowserCapture(id) : api.restoreBrowserCapture(id),
    onSuccess: (updated) => {
      qc.setQueriesData<ListBrowserCapturesResponse>({ queryKey: browserMemoryKeys.all(wsId) }, (old) => {
        if (!old) return old;
        const states = new Set(old.captures.map((capture) => capture.memory_state));
        const singleState = states.size === 1 ? old.captures[0]?.memory_state : null;
        const nextCaptures = old.captures.flatMap((capture) => {
          if (capture.id !== updated.id) return [capture];
          if (singleState && singleState !== updated.memory_state) return [];
          return [updated];
        });
        return { ...old, captures: nextCaptures };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: browserMemoryKeys.all(wsId) });
    },
  });
}
