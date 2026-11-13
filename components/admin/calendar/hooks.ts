"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Subscribes to a media query. Server / first paint answers `fallback`. */
export function useMedia(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export type Layout = "phone" | "tablet" | "desktop";

/** phone < 768, tablet 768-1279, desktop >= 1280 (matches the Admin breakpoints). */
export function useLayout(): Layout {
  const wide = useMedia("(min-width: 1280px)");
  const mid = useMedia("(min-width: 768px)");
  return wide ? "desktop" : mid ? "tablet" : "phone";
}

/** Current time in ms, refreshed every minute (drives the "now" line). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
