"use client";

/** Filters live in the URL so Overview drill-through links, reloads and shared links land on the same list. Writes use replaceState (no refetch of the page, no back-button spam). */
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

export function useUrlParams() {
  const sp = useSearchParams();
  const get = useCallback((key: string) => sp.get(key) ?? "", [sp]);
  const set = useCallback((patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);
  return { get, set };
}
