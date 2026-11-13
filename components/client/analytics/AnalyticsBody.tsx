"use client";

import { useMemo } from "react";
import { PageHeading } from "@/components/applicant/primitives";
import { useWorkforce } from "@/lib/client/hooks";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER } from "@/lib/client/labels";
import type { AnalyticsFamily } from "@/lib/client/links";
import { useUrlParams } from "@/lib/client/url-state";
import { ALL_SCOPE, setOutletScope, useOutletState } from "@/lib/client/outlet";
import { useWorkspacePrefs } from "@/lib/client/preferences";
import { AnalyticsFilterBar, resolveRange, type FilterField, type RangeValue } from "../charts";
import { AtAGlance } from "./AtAGlance";
import { AttendanceAnalytics } from "./AttendanceAnalytics";
import { ComplianceAnalytics } from "./ComplianceAnalytics";
import { ExportButtons } from "./ExportButtons";
import { PayrollAnalytics } from "./PayrollAnalytics";
import { RecruitmentAnalytics } from "./RecruitmentAnalytics";
import { SchedulingAnalytics } from "./SchedulingAnalytics";
import { WorkforceAnalytics } from "./WorkforceAnalytics";

type Family = AnalyticsFamily;

type Spec = { label: string; department?: boolean; role?: boolean; status?: { value: string; label: string }[]; range?: boolean; note: string };

const ALL = (label: string) => ({ value: "", label });

/**
 * Which global filters apply to which report family (brief section 23: "where
 * applicable"). The outlet filter is the app-wide outlet selection, shown in
 * the bar for convenience, so the topbar switcher and this bar never disagree.
 */
const FAMILIES: Record<Family, Spec> = {
  workforce: { label: "Workforce", department: true, role: true, note: "A current snapshot of assigned staff, so there is no date range." },
  attendance: {
    label: "Attendance",
    department: true,
    role: true,
    range: true,
    status: [ALL("All statuses"), { value: "present", label: "Present" }, { value: "late", label: "Late" }, { value: "absent", label: "Absent" }, { value: "on-leave", label: "On leave" }],
    note: "Status narrows the records table only. The trend and breakdown always show every status.",
  },
  scheduling: { label: "Scheduling", note: "Required headcount is set per outlet, so scheduling follows the outlet only. Department, role and date filters don't apply." },
  recruitment: {
    label: "Recruitment",
    department: true,
    role: true,
    status: [ALL("All statuses"), { value: "candidates-ready", label: "Candidates ready" }, { value: "screening", label: "In screening" }, { value: "in-progress", label: "In progress" }],
    note: "Department and role come from the workforce request behind each position.",
  },
  compliance: {
    label: "Compliance",
    department: true,
    role: true,
    status: [ALL("All statuses"), { value: "complete", label: "Complete" }, { value: "outstanding", label: "Outstanding" }, { value: "expiring", label: "Expiring soon" }, { value: "update-required", label: "Update required" }],
    note: "Status narrows the records table only. Operational documents only; identity and banking documents stay with Beeliv.",
  },
  payroll: { label: "Payroll visibility", status: [ALL("All statuses"), { value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }], note: "Schedule visibility only. Department, role and date filters don't apply, and no amounts are shown." },
};
const ORDER: Family[] = ["workforce", "attendance", "scheduling", "recruitment", "compliance", "payroll"];

/**
 * Analytics hub (project lead, 2026-09-30: analytics has its own page). An
 * "At a glance" row of each family's key figure switches the family; below it,
 * the global filter bar, ONE or TWO visuals and the records. Export is UI only.
 * Family and filters live in the URL so operational pages can deep-link here:
 * /client/analytics?family=attendance&status=absent&department=kitchen&range=30d
 */
export function AnalyticsBody() {
  const url = useUrlParams();
  const rawFamily = url.get("family");
  const family: Family = (ORDER as string[]).includes(rawFamily) ? (rawFamily as Family) : "workforce";
  const spec = FAMILIES[family];

  // Values from the URL are only honoured where they are valid for this family.
  const rawDepartment = url.get("department");
  const department = spec.department && (DEPARTMENT_ORDER as string[]).includes(rawDepartment) ? rawDepartment : "";
  const role = spec.role ? url.get("role") : "";
  const rawStatus = url.get("status");
  const status = spec.status?.some((o) => o.value !== "" && o.value === rawStatus) ? rawStatus : "";
  // Initial range comes from Settings > Workspace (default 7 days) unless the URL says otherwise.
  const defaultRange = useWorkspacePrefs().defaultRange;
  const rawRange = url.get("range");
  const range: RangeValue = resolveRange(rawRange === "30d" || rawRange === "7d" ? rawRange : defaultRange);
  const setDepartment = (v: string) => url.set({ department: v || undefined, role: undefined });
  const setRole = (v: string) => url.set({ role: v || undefined });
  const setStatus = (v: string) => url.set({ status: v || undefined });
  const setRange = (v: RangeValue) => url.set({ range: v.preset === defaultRange || (v.preset !== "30d" && v.preset !== "7d") ? undefined : v.preset });
  const outlet = useOutletState();
  const workforce = useWorkforce();

  const roles = useMemo(() => {
    const set = new Set((workforce.data ?? []).filter((m) => !department || m.departmentId === department).map((m) => m.role));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [workforce.data, department]);

  const fields: FilterField[] = [];
  if (outlet.outlets.length > 1) {
    fields.push({
      key: "outlet",
      label: "Outlet",
      value: outlet.scope ?? ALL_SCOPE,
      options: [{ value: ALL_SCOPE, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))],
      onChange: setOutletScope,
    });
  }
  if (spec.department) {
    fields.push({
      key: "department",
      label: "Department",
      value: department,
      options: [ALL("All departments"), ...DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))],
      onChange: (v) => {
        setDepartment(v);
        setRole("");
      },
    });
  }
  if (spec.role) fields.push({ key: "role", label: "Role", value: role, options: [ALL("All roles"), ...roles.map((r) => ({ value: r, label: r }))], onChange: setRole });
  if (spec.status) fields.push({ key: "status", label: "Status", value: status, options: spec.status, onChange: setStatus });

  const active = (spec.department && department !== "") || (spec.role && role !== "") || (!!spec.status && status !== "") || (!!spec.range && range.preset !== defaultRange);
  const clear = () => url.set({ department: undefined, role: undefined, status: undefined, range: undefined });
  // Status values differ per family; the others carry over where they apply.
  const switchFamily = (next: Family) => url.set({ family: next, status: undefined });

  // Filters a family does not use are neutralised so it never filters by a hidden value.
  const f = { department: spec.department ? department : "", role: spec.role ? role : "", status: spec.status ? status : "", range };

  return (
    <div className="flex flex-col gap-4 min-[768px]:gap-5">
      <header className="min-[768px]:hidden">
        <p className="text-[12px] font-bold tracking-[.14em] text-(--ap-violet) uppercase">Insights</p>
        <h1 className="mt-1 text-[32px] leading-none font-bold text-(--ap-ink)">Analytics</h1>
        <p className="mt-2 text-[14.5px] text-(--ap-muted)">Charts and trends for your outlets.</p>
      </header>
      <div className="max-[767px]:hidden">
        <PageHeading title="Analytics" subtitle="Charts and trends for your outlets." right={<ExportButtons report={spec.label} />} />
      </div>

      <AtAGlance family={family} onPick={switchFamily} />

      {fields.length > 0 || spec.range ? (
        <AnalyticsFilterBar fields={fields} range={spec.range ? { value: range, onChange: setRange } : undefined} onClear={clear} active={active} note={spec.note} />
      ) : (
        <p className="text-[13px] text-(--ap-muted) max-[767px]:hidden">{spec.note}</p>
      )}

      {family === "workforce" ? <WorkforceAnalytics f={f} clear={clear} /> : null}
      {family === "attendance" ? <AttendanceAnalytics f={f} clear={clear} /> : null}
      {family === "scheduling" ? <SchedulingAnalytics /> : null}
      {family === "recruitment" ? <RecruitmentAnalytics f={f} clear={clear} /> : null}
      {family === "compliance" ? <ComplianceAnalytics f={f} clear={clear} /> : null}
      {family === "payroll" ? <PayrollAnalytics f={f} clear={clear} /> : null}
    </div>
  );
}
