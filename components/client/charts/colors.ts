/**
 * Chart colours are TOKENS, never literals, so light and dark mode (and any
 * future outlet theming) just work. Status colours are the shared semantic
 * ones (green / amber / red / blue); plum is the Client identity colour and is
 * used for single-series data (trend line, workforce bars). The categorical
 * ramp for departments stays inside the plum family with one champagne accent
 * (client.css --client-c1..c5) - no rainbow.
 */
import type { AttendanceStatus, DepartmentId } from "@/lib/client/types";

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: "var(--ap-ok)",
  late: "var(--ap-warn)",
  absent: "var(--ap-rose)",
  "on-leave": "var(--ap-info)",
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  "on-leave": "On leave",
};

export const DEPARTMENT_COLOR: Record<DepartmentId, string> = {
  "floor-service": "var(--client-c1)",
  kitchen: "var(--client-c2)",
  bar: "var(--client-c3)",
  admin: "var(--client-c4)",
  support: "var(--client-c5)",
};

/** Primary single-series colour. */
export const PLUM = "var(--ap-violet)";
export const TRACK = "var(--ap-line-2)";
export const GRID = "var(--ap-line)";
