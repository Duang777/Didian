import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { ListBrowserCapturesParams } from "./types";

export const browserMemoryKeys = {
  all: (wsId: string) => ["browser-memory", wsId] as const,
  captures: (wsId: string, params?: ListBrowserCapturesParams) =>
    [...browserMemoryKeys.all(wsId), "captures", params ?? {}] as const,
};

export function browserCapturesOptions(wsId: string, params?: ListBrowserCapturesParams) {
  return queryOptions({
    queryKey: browserMemoryKeys.captures(wsId, params),
    queryFn: () => api.listBrowserCaptures(params),
  });
}
