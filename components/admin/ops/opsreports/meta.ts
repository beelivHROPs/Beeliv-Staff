/** Links and small helpers for the Operations reports. Display only. */
import type { OpsReportId, PlacementsGroup } from "@/lib/admin/ops/opsreports-types";

export const OPS_REPORTS_HREF = "/admin/ops/reports";
export const opsReportHref = (id: OpsReportId) => `${OPS_REPORTS_HREF}/${id}`;

const IDS: OpsReportId[] = ["placements", "funnel", "time-to-place", "hr-workload", "client-activity"];
export const isOpsReportId = (v: string): v is OpsReportId => (IDS as string[]).includes(v);

/** The live snapshot report: the date range does not apply. */
export const AS_OF_NOW: OpsReportId[] = ["hr-workload"];

export const GROUP_OPTIONS: { value: PlacementsGroup; label: string }[] = [
  { value: "time", label: "Over time" },
  { value: "client", label: "By client" },
  { value: "hr", label: "By HR officer" },
];
export const isGroup = (v: string): v is PlacementsGroup => v === "time" || v === "client" || v === "hr";

/**
 * The shared range control only knows today / 7d / 30d. Company reports need
 * longer windows, so the three keys are relabelled and mapped to days here.
 */
export const RANGE_PRESETS = [
  { key: "today" as const, label: "30 days", days: 30 },
  { key: "7d" as const, label: "90 days", days: 90 },
  { key: "30d" as const, label: "12 months", days: 365 },
];
export const DEFAULT_RANGE_KEY = "7d" as const;
