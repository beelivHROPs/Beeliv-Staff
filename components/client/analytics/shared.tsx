"use client";

import type { ReactNode } from "react";
import { Search } from "@/components/applicant/icons";
import type { LoadStatus } from "@/lib/client/types";
import type { RangeValue } from "../charts";
import { ChartEmptyState, ChartErrorState, ChartRestrictedState, ChartSkeleton } from "../charts";

/** The filter values every report family receives. "" means "all". */
export type AnalyticsFilters = { department: string; role: string; status: string; range: RangeValue };

/** Combine several hook statuses into one: any failure wins, then loading, then empty (all empty). */
export function mergeStatus(...s: LoadStatus[]): LoadStatus {
  if (s.includes("restricted")) return "restricted";
  if (s.includes("error")) return "error";
  if (s.includes("loading")) return "loading";
  if (s.every((x) => x === "empty")) return "empty";
  return "ready";
}

/**
 * Renders the right inline state for a report panel; `children` only when the
 * data is ready. `empty` is the family's own empty state (never invented data).
 */
export function AnalyticsState({ status, retry, what, empty, height = 260, children }: { status: LoadStatus; retry: () => void; what: string; empty: ReactNode; height?: number; children: ReactNode }) {
  if (status === "loading") return <ChartSkeleton height={height} label={`Loading ${what}`} />;
  if (status === "error") return <ChartErrorState retry={retry} height={height} title={`We couldn't load ${what}`} />;
  if (status === "restricted") return <ChartRestrictedState what={what.charAt(0).toUpperCase() + what.slice(1)} height={height} />;
  if (status === "empty") return <>{empty}</>;
  return <>{children}</>;
}

/** Data exists, but the current filters exclude all of it. */
export function NoMatch({ onClear, height = 200 }: { onClear: () => void; height?: number }) {
  return (
    <ChartEmptyState
      icon={Search}
      title="Nothing matches these filters"
      description="Try a different department, role or status, or clear the filters to see everything."
      height={height}
      action={
        <button type="button" onClick={onClear} className="ap-btn ap-btn-s ap-btn-sm mt-1">
          Clear filters
        </button>
      }
    />
  );
}
