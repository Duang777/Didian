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
