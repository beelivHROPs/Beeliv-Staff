"use client";

import { useMemo } from "react";
import { useWorkforce } from "@/lib/client/hooks";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER, SHIFTS } from "@/lib/client/labels";
import { dayMonth } from "@/lib/client/format";
import { workforceHref } from "@/lib/client/links";
import { useOutletState } from "@/lib/client/outlet";
import type { WorkforceMember } from "@/lib/client/types";
import { AnalyticsPanel, HorizontalBarChart, MetricSummary, type BarRow } from "../charts";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { NoMatch, AnalyticsState, type AnalyticsFilters } from "./shared";

/**
 * Workforce report (brief section 23): a current snapshot of assigned staff.
 * Visual = horizontal bars by department (each row drills into My Workforce)
 * and by role; the records below are the same people. The filters
 * (department, role, and the outlet chosen at the top) only narrow what the
 * backend already scoped to this client.
 */
export function WorkforceAnalytics({ f, clear }: { f: AnalyticsFilters; clear: () => void }) {
  const { data, status, retry } = useWorkforce();
  const { outlets } = useOutletState();
  const outletName = (id: string) => outlets.find((o) => o.id === id)?.name ?? "";

  const rows = useMemo(() => (data ?? []).filter((m) => (!f.department || m.departmentId === f.department) && (!f.role || m.role === f.role)), [data, f.department, f.role]);
  const byDept = useMemo<BarRow[]>(
    () =>
      DEPARTMENT_ORDER.map((d) => ({ key: d, label: DEPARTMENT_LABEL[d], value: rows.filter((m) => m.departmentId === d).length, href: workforceHref({ department: d }) })).filter((r) => r.value > 0),
    [rows],
  );
  const byRole = useMemo<BarRow[]>(() => {
    const counts = new Map<string, number>();
    for (const m of rows) counts.set(m.role, (counts.get(m.role) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([role, value]) => ({ key: role, label: role, value }));
  }, [rows]);
  const roleCount = new Set(rows.map((m) => m.role)).size;

  const columns: Column<WorkforceMember>[] = [
    { key: "name", header: "Name", primary: true, cell: (m) => m.name },
    { key: "staffId", header: "Staff ID", cell: (m) => m.staffId },
    { key: "role", header: "Role", cell: (m) => m.role },
    { key: "dept", header: "Department", cell: (m) => DEPARTMENT_LABEL[m.departmentId] },
    { key: "outlet", header: "Outlet", cell: (m) => outletName(m.outletId) },
    { key: "shift", header: "Shift", cell: (m) => SHIFTS[m.shift].label },
    { key: "start", header: "Started", cell: (m) => dayMonth(m.startDate) },
  ];

  return (
    <AnalyticsState status={status} retry={retry} what="the workforce report" height={320} empty={<ClientEmpty kind="workforce" inline height={260} />}>
      {rows.length === 0 ? (
        <NoMatch onClear={clear} />
      ) : (
        <>
          <MetricSummary
            ariaLabel="Workforce summary"
            items={[
              { key: "active", label: "Active staff", value: rows.length, href: workforceHref() },
              { key: "depts", label: "Departments", value: byDept.length },
              { key: "roles", label: "Roles", value: roleCount },
              { key: "outlets", label: "Outlets", value: new Set(rows.map((m) => m.outletId)).size },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-2 min-[1101px]:gap-5">
            <AnalyticsPanel title="Staff by department" subtitle="Tap a row to open those staff" href={workforceHref()} hrefLabel="My Workforce">
              <HorizontalBarChart rows={byDept} ariaLabel="Staff by department" showShare />
            </AnalyticsPanel>
            <AnalyticsPanel title="Staff by role" subtitle={byRole.length === 8 ? "Eight most common roles" : "All roles"}>
              <HorizontalBarChart rows={byRole} ariaLabel="Staff by role" />
            </AnalyticsPanel>
          </div>
          <AnalyticsPanel title="Workforce records" subtitle="The staff behind these figures" href={workforceHref()} hrefLabel="Open in My Workforce">
            <RecordsTable rows={rows} columns={columns} rowKey={(m) => m.id} caption="Workforce" />
          </AnalyticsPanel>
        </>
      )}
    </AnalyticsState>
  );
}
