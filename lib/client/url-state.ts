"use client";

/**
 * Filters that live in the URL (?department=kitchen&status=late) so every
 * chart segment, tile and Overview link lands on the filtered records, and a
 * filtered view can be shared or reloaded. Read with useSearchParams; write
 * with history.replaceState (Next.js syncs it back into useSearchParams), so a
 * filter change never refetches the page or fills the back button.
 */
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
