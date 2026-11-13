/** Presentation-only wording / tone lookups for the Overview. No rules. */
import type { VacancyStatus } from "@/lib/admin/types";

/** Short chip wording per locked APPLICATION_STAGES index (the full name stays in the title). */
export const STAGE_SHORT = ["Application", "Shortlisting", "Interview", "Documentation", "Verification", "Approval", "Onboarding", "Assignment"] as const;
export const STAGE_TONE = ["info", "info", "violet", "warn", "warn", "warn", "ok", "ok"] as const;

/** Spec 15 job statuses. Pending states are yellow (warn). */
export const VACANCY_STATUS: Record<VacancyStatus, { label: string; tone: "ok" | "warn" | "mute" | "violet" | "info" | "rose" }> = {
  draft: { label: "Draft", tone: "mute" },
  "pending-approval": { label: "Pending Approval", tone: "warn" },
  published: { label: "Published", tone: "ok" },
  paused: { label: "Paused", tone: "mute" },
  "closing-soon": { label: "Closing Soon", tone: "warn" },
  closed: { label: "Closed", tone: "mute" },
  filled: { label: "Filled", tone: "violet" },
  cancelled: { label: "Cancelled", tone: "rose" },
};

/** Categorical colours for the department donut: tokens and neutral hues, no semantic green/amber/red. */
export const CATEGORY_COLORS = ["var(--ap-violet)", "#2563EB", "#0D9488", "#C98A00", "#7C3AED", "var(--ap-faint)"] as const;

export function initialsOf(name: string): string {
  const words = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Fixed chart palette (pipeline stages, attendance series, department donut).
 * Same hues in both themes; dark mode uses slightly lighter tints. Defined once
 * as CSS variables by <ChartPalette /> so charts only reference var(--adc-*).
 */
export const CHART_CSS = `
html{--adc-1:#6D28D9;--adc-2:#A78BFA;--adc-3:#F97316;--adc-4:#16A34A;--adc-5:#2563EB;--adc-6:#EC4899;--adc-7:#F59E0B;--adc-8:#0D9488;--adc-lilac:#C4B5FD;--adc-present:#5B21B6;--adc-late:#EC4899;--adc-absent:#F97316;--adc-leave:#C4B5FD}
html[data-admin-theme="dark"]{--adc-1:#8B5CF6;--adc-2:#C4B5FD;--adc-3:#FB923C;--adc-4:#4ADE80;--adc-5:#60A5FA;--adc-6:#F472B6;--adc-7:#FBBF24;--adc-8:#2DD4BF;--adc-lilac:#DDD6FE;--adc-present:#8B5CF6;--adc-late:#F472B6;--adc-absent:#FB923C;--adc-leave:#DDD6FE}
`;

/** Eight stage colours: purple, light violet, orange, green, blue, pink, amber, teal. */
export const STAGE_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `var(--adc-${n})`);
/** Department donut: violet, light violet, orange, pink, blue, lilac. */
export const DEPT_COLORS = ["var(--adc-1)", "var(--adc-2)", "var(--adc-3)", "var(--adc-6)", "var(--adc-5)", "var(--adc-lilac)"];
export const ATTENDANCE_COLORS = { present: "var(--adc-present)", late: "var(--adc-late)", absent: "var(--adc-absent)", onLeave: "var(--adc-leave)" } as const;
