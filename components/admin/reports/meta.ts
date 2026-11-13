/** Links and small helpers for Reports. Display only. */
import type { Tone } from "@/lib/admin/reports/types";

import type { ReportId } from "@/lib/admin/reports/types";

export const REPORTS_HREF = "/admin/reports";

/** Valid report ids. Lives here (not in the client ReportView) so the server page can use it. */
const REPORT_IDS: ReportId[] = ["vacancy", "pipeline", "interview", "placement", "history"];
export const isReportId = (v: string): v is ReportId => (REPORT_IDS as string[]).includes(v);
export const reportHref = (id: string) => `${REPORTS_HREF}/${id}`;

export const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--ap-ok)",
  warn: "var(--ap-warn)",
  bad: "var(--ap-rose)",
  info: "var(--ap-info)",
  plum: "var(--ap-violet)",
  mute: "var(--ap-muted)",
};

export const PERIODS = [
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "180", label: "Last 180 days", days: 180 },
  { value: "custom", label: "Custom range", days: 0 },
] as const;

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};
