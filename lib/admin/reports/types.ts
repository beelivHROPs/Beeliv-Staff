/**
 * Recruitment Reports data shapes (Master Spec v1.5 sections 14 and 28.1). Presentation-facing
 * only: the adapter returns finished figures, chart series and table rows (server-side
 * aggregates in production), so no counting or rate rules live in a component. All people are
 * FICTIONAL. Rows are keyed by internal id; references come only from the adapter. Report
 * definitions (names, which are available, "later" entries) are adapter data.
 */

export type ReportId = "vacancy" | "pipeline" | "interview" | "placement" | "history";

export interface ReportEntry {
  id: string;
  title: string;
  description: string;
  /** "later" entries are read-only links that are not built yet (Workforce, Compliance). */
  availability: "available" | "later";
  group: "recruitment" | "workforce" | "compliance";
  /** Present for available recruitment reports. */
  report?: ReportId;
}

export interface ReportQuery {
  report: ReportId;
  /** Inclusive ISO dates (YYYY-MM-DD). */
  from: string;
  to: string;
  clientId: string;
  vacancyId: string;
}

export type Tone = "ok" | "warn" | "bad" | "info" | "plum" | "mute";

export interface Kpi {
  key: string;
  label: string;
  value: string;
  sub?: string;
}

export interface ChartSeriesPoint {
  id: string;
  label: string;
  sub: string;
  title: string;
}

export type ChartSpec =
  | { kind: "bars"; rows: { key: string; label: string; value: number }[] }
  | { kind: "donut"; centerValue: string; centerLabel: string; segments: { key: string; label: string; value: number; tone: Tone }[] }
  | { kind: "stacked"; points: (ChartSeriesPoint & { segments: { key: string; label: string; value: number; tone: Tone }[] })[] }
  | { kind: "trend"; points: (ChartSeriesPoint & { value: number })[]; unit: string };

export interface ReportChart {
  id: string;
  title: string;
  subtitle?: string;
  spec: ChartSpec;
  /** One sentence for screen readers. */
  summary: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: "right";
}

export interface ReportRow {
  id: string;
  cells: Record<string, string>;
  /** Drill-down to the underlying record (internal id). */
  href?: string;
}

export interface ReportData {
  report: ReportId;
  title: string;
  kpis: Kpi[];
  charts: ReportChart[];
  columns: ReportColumn[];
  rows: ReportRow[];
  total: number;
  generatedAt: string;
  /** No source records at all for this report (not merely none in the filters). */
  workspaceEmpty: boolean;
}

export interface ReportFacets {
  clients: { id: string; name: string }[];
  vacancies: { id: string; name: string; clientId: string }[];
}
