/**
 * Drill-through links. Every chart segment, tile and attention item leads to
 * the underlying filtered records (brief sections 11, 18, 34). The pages that
 * read these filters arrive with the later build steps; the URLs are the
 * contract so charts never have to change.
 */
import type { AttendanceStatus, ComplianceState, DepartmentId } from "./types";

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
  const out = s.toString();
  return out ? `?${out}` : "";
};

/** A filtered link lands on the records list (#records), not the top of the page. */
const jump = (query: string) => (query ? `${query}#records` : "");

export const attendanceHref = (p: { status?: AttendanceStatus | "checked-in"; date?: string; department?: DepartmentId } = {}) => `/client/attendance${jump(q(p))}`;
export const workforceHref = (p: { department?: DepartmentId } = {}) => `/client/workforce${jump(q(p))}`;
/** One staff member's detail page (My Workforce). */
export const staffHref = (id: string) => `/client/workforce/${id}`;
export const recruitmentHref = (p: { status?: "awaiting-feedback" } = {}) => `/client/recruitment${jump(q(p))}`;
export const complianceHref = (p: { status?: ComplianceState | "attention" } = {}) => `/client/compliance${jump(q(p))}`;
export const requestHref = (id?: string) => (id ? `/client/requests/${id}` : "/client/requests");
export const SCHEDULES_HREF = "/client/schedules";
/** "Request staff" opens the Workforce Request flow - it never publishes a vacancy. */
export const NEW_REQUEST_HREF = "/client/requests?new=1";

export type AnalyticsFamily = "workforce" | "attendance" | "scheduling" | "recruitment" | "compliance" | "payroll";
/** Analytics hub, deep-linked to one family with optional filters (?family=attendance&status=absent&department=kitchen). */
export const analyticsFamilyHref = (family: AnalyticsFamily, p: Record<string, string | undefined> = {}) => `/client/analytics${q({ family, ...p })}`;
export const ANALYTICS_HREF = "/client/analytics";
