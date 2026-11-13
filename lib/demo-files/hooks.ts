"use client";

/** DEMO ONLY (see store.ts). React hooks over the demo file store. */
import { useEffect, useState, useSyncExternalStore } from "react";
import { demoFilesEnabled, getDemoFileMeta, subscribeDemoFiles, type DemoFileMeta } from "./store";

/** True when the server-decided demo mode is on. Always false on the server render. */
export function useDemoFilesEnabled(): boolean {
  return useSyncExternalStore(
    () => () => {},
    demoFilesEnabled,
    () => false,
  );
}

/** Metadata of the stored demo file for `key` (null when none or demo mode is off). Updates on change. */
export function useDemoFileMeta(key: string | null): DemoFileMeta | null {
  const [state, setState] = useState<{ key: string | null; meta: DemoFileMeta | null }>({ key: null, meta: null });
  useEffect(() => {
    if (!key) return;
    let live = true;
    const load = () => {
      void getDemoFileMeta(key).then((m) => {
        if (live) setState({ key, meta: m });
      });
    };
    load();
    const off = subscribeDemoFiles(load);
    return () => {
      live = false;
      off();
    };
  }, [key]);
  return state.key === key ? state.meta : null;
}
