"use client";

import { useEffect, useState } from "react";
import { formatRelativeFuture, formatRelativePast } from "@/lib/applicant/time";

const TICK_MS = 30_000;

/**
 * Live-updating relative timestamp ("Just now" -> "2 minutes ago" -> "1 hour
 * ago" ...) — recomputes on a 30s interval rather than formatting once and
 * going stale while the page stays open.
 */
export function RelativeTime({ iso, mode = "past", className }: { iso: string; mode?: "past" | "future"; className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const label = mode === "future" ? formatRelativeFuture(iso) : formatRelativePast(iso);
  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  );
}

/** Same live-updating value without the wrapping <time> element, for contexts that already provide one. */
export function useRelativeTime(iso: string, mode: "past" | "future" = "past"): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return mode === "future" ? formatRelativeFuture(iso) : formatRelativePast(iso);
}
