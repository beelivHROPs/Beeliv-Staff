/**
 * Display labels for backend-defined ids (department, shift). Presentation
 * constants only: which departments and shifts exist is decided by the backend
 * (the adapter returns ids), the UI just names them. Shift times here are the
 * shift LABEL defaults used by the fixture - the real times come from the
 * scheduling model (TBD).
 */
import type { DepartmentId, ShiftKey } from "./types";

export const DEPARTMENT_LABEL: Record<DepartmentId, string> = {
  "floor-service": "Floor / Service",
  kitchen: "Kitchen",
  bar: "Bar",
  admin: "Admin",
  support: "Support",
};
export const DEPARTMENT_ORDER: DepartmentId[] = ["floor-service", "kitchen", "bar", "admin", "support"];

export const SHIFTS: Record<ShiftKey, { label: string; start: string; end: string }> = {
  morning: { label: "Morning", start: "08:00", end: "16:00" },
  evening: { label: "Evening", start: "16:00", end: "00:00" },
  night: { label: "Night", start: "00:00", end: "08:00" },
};
export const SHIFT_ORDER: ShiftKey[] = ["morning", "evening", "night"];
