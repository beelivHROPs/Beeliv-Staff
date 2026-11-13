/**
 * Operations company-wide reports (docs/contracts/metrics-and-reports.md section 4 and 3.2, scope "all").
 * COUNTS ONLY: no money, fees or billing. The adapter returns finished figures,
 * one chart series and table rows (server-side aggregates in production), so no
 * counting rule lives in a component. FICTIONAL data. Rows are keyed by internal id.
 *
 * Mapping to the contract names: placements -> `placement`; funnel -> `pipeline`;
 * time-to-place -> the `placement` average-days KPI over time; hr-workload ->
 * `GlanceHrRow` (byHr); client-activity -> `GlanceClientRow` (byClient).
 */

export type OpsReportId = "placements" | "funnel" | "time-to-place" | "hr-workload" | "client-activity";

/** How the Placements report is cut: over time, by client or by HR officer. */
export type PlacementsGroup = "time" | "client" | "hr";

export interface OpsReportQuery {
  report: OpsReportId;
  /** Inclusive ISO dates (YYYY-MM-DD). Ignored by "as of now" reports. */
  from: string;
  to: string;
  /** "" = all clients. */
  clientId: string;
  /** "" = all HR officers. */
  hrId: string;
  /** Placements only. */
  group: PlacementsGroup;
}

export interface OpsKpi {
  key: string;
  label: string;
  value: string;
  sub?: string;
}

/** One series. `value` null = nothing to average in that period (a gap, not zero). */
export type OpsChart =
  | { kind: "line"; unit: string; points: { key: string; label: string; value: number | null }[] }
  | { kind: "bars"; unit: string; rows: { key: string; label: string; value: number }[] };

export interface OpsColumn {
  key: string;
  label: string;
  align?: "right";
}

export interface OpsRow {
  id: string;
  cells: Record<string, string>;
  /** Drill-down inside the app (internal id). */
  href?: string;
}

export interface OpsReportData {
  report: OpsReportId;
  title: string;
  chartTitle: string;
  chart: OpsChart;
  /** One sentence for screen readers. */
  summary: string;
  kpis: OpsKpi[];
  columns: OpsColumn[];
  rows: OpsRow[];
  total: number;
  generatedAt: string;
  /** "now" = a live snapshot, the date range does not apply. */
  asOf: "range" | "now";
  /** No source records at all (not merely none in the filters). */
  workspaceEmpty: boolean;
}

export interface OpsReportHubEntry {
  id: OpsReportId;
  title: string;
  description: string;
  /** Short figure for the hub row; null while it cannot be computed. */
  headline: { value: string; label: string; tone?: "bad" } | null;
}

export interface OpsReportFacets {
  clients: { id: string; name: string }[];
  hr: { id: string; name: string }[];
}
