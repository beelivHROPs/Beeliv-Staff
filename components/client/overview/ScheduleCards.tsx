"use client";

import Link from "next/link";
import { Calendar, Moon, Sun, Wine } from "@/components/applicant/icons";
import { useScheduleCoverage, useWeekSchedule } from "@/lib/client/hooks";
import { dayMonth, formatClockRange, parseDate, todayISO, weekday } from "@/lib/client/format";
import { SCHEDULES_HREF } from "@/lib/client/links";
import type { ShiftKey } from "@/lib/client/types";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartSkeleton, CoverageBar } from "../charts";

const SHIFT_ICON: Record<ShiftKey, typeof Sun> = { morning: Sun, evening: Wine, night: Moon };

/** Today's schedule: assigned / required per configured shift. Facts only - no "understaffed" judgement. */
export function CoverageCard({ className = "" }: { className?: string }) {
  const { data, status, retry } = useScheduleCoverage(todayISO());
  return (
    <AnalyticsPanel title="Today's schedule" href={SCHEDULES_HREF} hrefLabel="View schedule" className={className}>
      {status === "loading" ? <ChartSkeleton height={230} label="Loading today's schedule" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={230} /> : null}
      {status === "empty" ? <ChartEmptyState icon={Calendar} title="No schedule for today" description="Shifts and assignments for today will appear here once they're set up." height={210} /> : null}
      {status === "ready" ? (
        <div className="flex flex-col gap-2.5">
          {(data ?? []).map((s) => {
            const Icon = SHIFT_ICON[s.shift];
            return <CoverageBar key={s.shift} label={`${s.label} shift`} detail={formatClockRange(s.start, s.end).replace(/ - /g, " – ")} assigned={s.assigned} required={s.required} icon={<Icon className="size-5" aria-hidden="true" />} href={SCHEDULES_HREF} />;
          })}
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}

/**
 * Upcoming schedule: this week, Monday to Sunday, today highlighted. Each day
 * shows how many staff are scheduled and the morning / evening / night split.
 * On phones the strip scrolls sideways instead of squeezing seven columns.
 */
export function WeekStripCard({ className = "" }: { className?: string }) {
  const today = todayISO();
  const { data, status, retry } = useWeekSchedule(today);
  return (
    <AnalyticsPanel title="Upcoming schedule" subtitle="This week, Monday to Sunday" href={SCHEDULES_HREF} hrefLabel="View schedule" className={className}>
      {status === "loading" ? <ChartSkeleton height={120} label="Loading upcoming schedule" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={120} /> : null}
      {status === "empty" ? <ChartEmptyState icon={Calendar} title="No schedule this week" description="Scheduled shifts for the week will show here." height={120} /> : null}
      {status === "ready" ? (
        <>
          <ul className="ap-scrollbar-none -mx-3.5 m-0 flex list-none gap-2 overflow-x-auto px-3.5 pb-1 min-[768px]:mx-0 min-[768px]:px-0 p-0">
            {(data ?? []).map((d) => {
              const isToday = d.date === today;
              return (
                <li key={d.date} className="min-w-[68px] flex-1">
                  <Link
                    href={`${SCHEDULES_HREF}?date=${d.date}`}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${weekday(d.date, "long")} ${dayMonth(d.date)}: ${d.total} scheduled. Morning ${d.shifts.morning}, evening ${d.shifts.evening}, night ${d.shifts.night}.`}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center ${isToday ? "border-(--ap-violet) bg-(--ap-tint)" : "border-(--ap-line-2) bg-(--ap-tint-soft) hover:border-(--ap-tint-2)"}`}
                  >
                    <span className={`text-[12px] font-bold uppercase ${isToday ? "text-(--ap-violet)" : "text-(--ap-muted)"}`}>{weekday(d.date)}</span>
                    <b className="text-[20px] leading-none text-(--ap-ink) tabular-nums">{parseDate(d.date).getDate()}</b>
                    <span className="mt-1 text-[13px] font-semibold text-(--ap-ink-2) tabular-nums">{d.total}</span>
                    <span className="text-[11px] text-(--ap-muted) tabular-nums" aria-hidden="true">
                      {d.shifts.morning} &middot; {d.shifts.evening} &middot; {d.shifts.night}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-[12px] text-(--ap-muted)">Each day: total scheduled, then morning &middot; evening &middot; night.</p>
        </>
      ) : null}
    </AnalyticsPanel>
  );
}
