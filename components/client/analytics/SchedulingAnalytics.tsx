"use client";

import { Moon, Sun, Wine } from "@/components/applicant/icons";
import { formatClockRange, fullDay, startOfWeek, todayISO } from "@/lib/client/format";
import { useScheduleCoverage, useWeekSchedule } from "@/lib/client/hooks";
import { SHIFTS } from "@/lib/client/labels";
import { SCHEDULES_HREF } from "@/lib/client/links";
import type { ScheduleDay, ShiftKey } from "@/lib/client/types";
import { AnalyticsPanel, CoverageBar, MetricSummary } from "../charts";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { AnalyticsState, mergeStatus } from "./shared";

const ICON: Record<ShiftKey, typeof Sun> = { morning: Sun, evening: Wine, night: Moon };

/**
 * Scheduling report: today's assigned / required per shift as coverage bars,
 * then the week's daily counts. It states facts ("2 positions open") and never
 * labels anything understaffed. Required headcount is configured per outlet,
 * so this report follows the outlet filter only.
 */
export function SchedulingAnalytics() {
  const today = todayISO();
  const cov = useScheduleCoverage(today);
  const week = useWeekSchedule(startOfWeek(today));
  const status = mergeStatus(cov.status, week.status);
  const retry = () => {
    cov.retry();
    week.retry();
  };

  const shifts = cov.data ?? [];
  const assigned = shifts.reduce((n, s) => n + s.assigned, 0);
  const required = shifts.reduce((n, s) => n + s.required, 0);
  const open = shifts.reduce((n, s) => n + Math.max(0, s.required - s.assigned), 0);
  const covered = shifts.filter((s) => s.required > 0 && s.assigned >= s.required).length;

  const columns: Column<ScheduleDay>[] = [
    { key: "day", header: "Day", primary: true, cell: (d) => fullDay(d.date) },
    ...(["morning", "evening", "night"] as ShiftKey[]).map<Column<ScheduleDay>>((s) => ({ key: s, header: SHIFTS[s].label, align: "right", cell: (d) => d.shifts[s] })),
    { key: "total", header: "Scheduled", align: "right", cell: (d) => d.total },
  ];

  return (
    <AnalyticsState status={status} retry={retry} what="the scheduling report" height={320} empty={<ClientEmpty kind="schedule" inline height={260} />}>
      <MetricSummary
        ariaLabel="Scheduling summary"
        items={[
          { key: "assigned", label: "Assigned today", value: assigned, href: SCHEDULES_HREF },
          { key: "required", label: "Required today", value: required },
          { key: "open", label: "Open positions", value: open, tone: open > 0 ? "warn" : "ok" },
          { key: "covered", label: "Shifts fully covered", value: `${covered} of ${shifts.length}` },
        ]}
      />
      <AnalyticsPanel title="Coverage today" subtitle="Staff assigned against the required headcount, by shift" href={SCHEDULES_HREF} hrefLabel="View schedule">
        <div className="flex flex-col gap-2.5">
          {shifts.map((s) => {
            const Icon = ICON[s.shift];
            return <CoverageBar key={s.shift} label={`${s.label} shift`} detail={formatClockRange(s.start, s.end).replace(/ - /g, " – ")} assigned={s.assigned} required={s.required} icon={<Icon className="size-5" aria-hidden="true" />} href={SCHEDULES_HREF} />;
          })}
        </div>
      </AnalyticsPanel>
      <AnalyticsPanel title="This week" subtitle="Staff scheduled per day, Monday to Sunday" href={SCHEDULES_HREF} hrefLabel="Open in Schedules">
        <RecordsTable rows={week.data ?? []} columns={columns} rowKey={(d) => d.date} rowHref={(d) => `${SCHEDULES_HREF}?date=${d.date}`} caption="Weekly schedule" pageSize={7} />
      </AnalyticsPanel>
    </AnalyticsState>
  );
}
