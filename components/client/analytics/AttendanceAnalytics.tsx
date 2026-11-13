"use client";

import { useMemo, useState } from "react";
import { useIsPhone } from "@/components/applicant/motion";
import { dayMonth, formatClock, formatPercent, fullDay, share, weekday } from "@/lib/client/format";
import { useAttendanceRecords } from "@/lib/client/hooks";
import { DEPARTMENT_LABEL, SHIFTS } from "@/lib/client/labels";
import { attendanceHref } from "@/lib/client/links";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/client/types";
import { AnalyticsPanel, ChartLegend, DonutChart, MetricSummary, STATUS_COLOR, STATUS_LABEL, TrendChart, type LegendItem, type TrendPoint } from "../charts";
import { AttendanceChip } from "../StatusChip";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { NoMatch, AnalyticsState, type AnalyticsFilters } from "./shared";

const ORDER: AttendanceStatus[] = ["present", "late", "absent", "on-leave"];

type Day = { date: string; scheduled: number; present: number; late: number; absent: number; onLeave: number };

/**
 * Attendance report: a trend line of the daily attendance rate plus the
 * composition of the whole range, then the records. Department and role narrow
 * everything; the status filter narrows only the records table so the trend
 * and breakdown always show every status. Days with no records are left out,
 * never drawn as zero. Rates are present / scheduled, the same ratio the
 * Overview shows (whether "late" counts as attended is a Beeliv decision, TBD).
 * The backend should eventually return these aggregates already filtered.
 */
export function AttendanceAnalytics({ f, clear }: { f: AnalyticsFilters; clear: () => void }) {
  const phone = useIsPhone();
  const { data, status, retry } = useAttendanceRecords(f.range.from, f.range.to);
  const [hover, setHover] = useState<string | null>(null);

  const base = useMemo(() => (data ?? []).filter((r) => (!f.department || r.departmentId === f.department) && (!f.role || r.role === f.role)), [data, f.department, f.role]);
  const days = useMemo<Day[]>(() => {
    const m = new Map<string, Day>();
    for (const r of base) {
      const d = m.get(r.date) ?? { date: r.date, scheduled: 0, present: 0, late: 0, absent: 0, onLeave: 0 };
      d.scheduled++;
      if (r.status === "present") d.present++;
      else if (r.status === "late") d.late++;
      else if (r.status === "absent") d.absent++;
      else d.onLeave++;
      m.set(r.date, d);
    }
    return [...m.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [base]);
  const rate = (d: Day) => (d.scheduled ? Math.round((d.present / d.scheduled) * 1000) / 10 : 0);

  const totals = ORDER.reduce<Record<AttendanceStatus, number>>((t, s) => ({ ...t, [s]: base.filter((r) => r.status === s).length }), { present: 0, late: 0, absent: 0, "on-leave": 0 });
  const scheduled = base.length;
  const overall = scheduled ? Math.round((totals.present / scheduled) * 1000) / 10 : 0;

  const points = useMemo<TrendPoint[]>(
    () =>
      days.map((d) => ({
        id: d.date,
        label: weekday(d.date),
        sub: dayMonth(d.date),
        title: fullDay(d.date),
        value: rate(d),
        rows: [
          { label: "Present", value: d.present, color: STATUS_COLOR.present },
          { label: "Late", value: d.late, color: STATUS_COLOR.late },
          { label: "Absent", value: d.absent, color: STATUS_COLOR.absent },
          { label: "On leave", value: d.onLeave, color: STATUS_COLOR["on-leave"] },
        ],
        footer: { label: "Attendance rate", value: formatPercent(rate(d)) },
      })),
    [days],
  );

  const legend: LegendItem[] = ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s], value: totals[s], percent: formatPercent(share(totals[s], scheduled)), color: STATUS_COLOR[s], href: attendanceHref({ status: s }) }));

  const rows = useMemo(() => (f.status ? base.filter((r) => r.status === f.status) : base), [base, f.status]);
  const columns: Column<AttendanceRecord>[] = [
    { key: "date", header: "Date", cell: (r) => dayMonth(r.date) },
    { key: "name", header: "Staff", primary: true, cell: (r) => r.staffName },
    { key: "role", header: "Role", cell: (r) => r.role },
    { key: "dept", header: "Department", cell: (r) => DEPARTMENT_LABEL[r.departmentId] },
    { key: "shift", header: "Shift", cell: (r) => SHIFTS[r.shift].label },
    { key: "status", header: "Status", cell: (r) => <AttendanceChip status={r.status} /> },
    { key: "in", header: "Clock-in", cell: (r) => (r.clockIn ? formatClock(r.clockIn) : "-") },
  ];

  const first = days[0];
  const last = days[days.length - 1];
  return (
    <AnalyticsState status={status} retry={retry} what="the attendance report" height={320} empty={<ClientEmpty kind="reports" inline height={260} />}>
      {base.length === 0 || !first ? (
        <NoMatch onClear={clear} />
      ) : (
        <>
          <MetricSummary
            ariaLabel="Attendance summary"
            items={[
              { key: "rate", label: "Attendance rate", value: formatPercent(overall), sub: `${scheduled} scheduled staff-days`, tone: "plum" },
              { key: "late", label: "Late", value: totals.late, sub: "staff-days", tone: "warn", href: attendanceHref({ status: "late" }) },
              { key: "absent", label: "Absent", value: totals.absent, sub: "staff-days", tone: "bad", href: attendanceHref({ status: "absent" }) },
              { key: "leave", label: "On leave", value: totals["on-leave"], sub: "staff-days", tone: "info", href: attendanceHref({ status: "on-leave" }) },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] min-[1101px]:gap-5">
            <AnalyticsPanel title="Attendance rate by day" subtitle="Share of scheduled staff who were present" href={attendanceHref()} hrefLabel="View records">
              <TrendChart
                points={points}
                height={phone ? 190 : 240}
                summary={`Attendance rate by day, ${dayMonth(first.date)} to ${dayMonth(last.date)}. Latest day ${dayMonth(last.date)}: ${formatPercent(rate(last))}.`}
              />
            </AnalyticsPanel>
            <AnalyticsPanel title="Attendance breakdown" subtitle={`${dayMonth(first.date)} to ${dayMonth(last.date)}`}>
              <div className="flex flex-col items-center gap-4">
                <DonutChart
                  size={phone ? 150 : 168}
                  segments={legend.map((i) => ({ key: i.key, label: i.label, value: Number(i.value), color: i.color, href: i.href }))}
                  centerValue={formatPercent(overall)}
                  centerLabel="Present"
                  ariaLabel={`Attendance over the range: ${totals.present} present, ${totals.late} late, ${totals.absent} absent, ${totals["on-leave"]} on leave, of ${scheduled} scheduled staff-days.`}
                  activeKey={hover}
                  onActiveChange={setHover}
                />
                <ChartLegend items={legend} ariaLabel="Attendance breakdown by status" activeKey={hover} onHover={setHover} className="w-full" />
              </div>
            </AnalyticsPanel>
          </div>
          <AnalyticsPanel title="Attendance records" subtitle={f.status ? `Filtered to ${STATUS_LABEL[f.status as AttendanceStatus]}` : "Most recent first"} href={attendanceHref()} hrefLabel="Open in Attendance">
            {rows.length === 0 ? <NoMatch onClear={clear} height={150} /> : <RecordsTable rows={rows} columns={columns} rowKey={(r) => r.id} caption="Attendance" />}
          </AnalyticsPanel>
        </>
      )}
    </AnalyticsState>
  );
}
