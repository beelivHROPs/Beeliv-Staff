/**
 * "Business at a glance" data shapes. COUNTS ONLY: no money, fees or billing
 * (those wait for Beeliv's rules). The adapter returns finished figures; no
 * counting or threshold rule lives in a component. Charts reuse the Reports
 * ChartSpec. All people and clients in the mock are FICTIONAL.
 */
import type { ReportChart } from "../reports/types";

/** "hr" = only the current HR user's assigned clients. "all" = Operations: every client and HR officer. */
export type GlanceScope = "hr" | "all";

export type Tone = "ok" | "warn" | "bad" | "info" | "plum" | "mute";

export interface GlanceDelta {
  dir: "up" | "down" | "same";
  /** Plain words, e.g. "2 more than last month". */
  text: string;
  /** true = good news, false = bad news, null = neutral. */
  good: boolean | null;
}

export type GlanceIcon = "placements" | "days" | "jobs" | "requests" | "waiting" | "staff";

export interface GlanceTile {
  key: string;
  icon: GlanceIcon;
  label: string;
  value: string;
  /** Small line under the label (e.g. "3 waiting too long"). */
  sub?: string;
  subTone?: "bad";
  delta: GlanceDelta | null;
  href: string;
}

export interface GlanceClientRow {
  id: string;
  name: string;
  openJobs: number;
  requestsWaiting: number;
  placementsMonth: number;
  /** Primary HR name; null = nobody assigned (flagged red). */
  hr: string | null;
  statusLabel: string;
  statusTone: Tone;
  href: string;
}

export type Workload = "Light" | "Balanced" | "Heavy";

export interface GlanceHrRow {
  id: string;
  name: string;
  clients: number;
  openJobs: number;
  requestsWaiting: number;
  placementsMonth: number;
  workload: Workload;
}

export interface GlanceData {
  scope: GlanceScope;
  generatedAt: string;
  tiles: GlanceTile[];
  charts: ReportChart[];
  byClient: GlanceClientRow[];
  /** Present only when scope is "all". */
  byHr: GlanceHrRow[] | null;
  /** Tiles left out because the data does not exist yet (said on screen, not hidden). */
  notShown: string[];
  workspaceEmpty: boolean;
}
