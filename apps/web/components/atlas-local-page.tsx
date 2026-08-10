"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtlasPage, createAtlasLocalStore } from "@didian/views/ai-workbench";
import { browserCapturesOptions } from "@didian/core/browser-memory";
import { useWorkspaceId } from "@didian/core/hooks";
import { useRequiredWorkspaceSlug } from "@didian/core/paths";

export function AtlasLocalPage() {
  const localStore = useMemo(
    () => createAtlasLocalStore({
      getItem: (key) => typeof window === "undefined" ? null : window.localStorage.getItem(key),
      setItem: (key, value) => {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      },
    }),
    [],
  );
  const wsId = useWorkspaceId();
  const workspaceSlug = useRequiredWorkspaceSlug();
  const capturesQuery = useQuery(browserCapturesOptions(wsId, { limit: 24, offset: 0 }));

  return (
    <AtlasPage
      localStore={localStore}
      remoteCaptures={capturesQuery.data?.captures}
      workspaceSlug={workspaceSlug}
    />
  );
}
