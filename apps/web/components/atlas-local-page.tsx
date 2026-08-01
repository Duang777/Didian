"use client";

import { useMemo } from "react";
import { AtlasPage, createAtlasLocalStore } from "@didian/views/ai-workbench";

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
  return <AtlasPage localStore={localStore} />;
}
