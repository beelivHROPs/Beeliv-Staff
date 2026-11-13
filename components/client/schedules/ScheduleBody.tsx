"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, LockKeyhole } from "@/components/applicant/icons";
import { FilterTabs } from "@/components/applicant/FilterTabs";
import { analyticsFamilyHref } from "@/lib/client/links";
import { AnalyticsLink } from "../AnalyticsLink";
import { PageHeading } from "@/components/applicant/primitives";
import { Reveal } from "@/components/applicant/motion";
import { useSchedule } from "@/lib/client/hooks";
import { addDays, dayMonth, fullDay, monthYear, parseDate, plural, startOfWeek, toISODate, todayISO } from "@/lib/client/format";
import { useOutletState } from "@/lib/client/outlet";
import { useUrlParams } from "@/lib/client/url-state";
import type { ISODate } from "@/lib/client/types";
import { Chip, ChipRow, MoreActions } from "../phone";
import { FilterSelect } from "../records-filters";
import { ChartEmptyState } from "../charts";
import { ScheduleAreaSkeleton, ScheduleError } from "./ScheduleStates";
import { DayView, MonthView, WeekView, monthGrid } from "./ScheduleViews";

type View = "day" | "week" | "month";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ALL = "all";

/** First day of the month `n` months from `d`. */
function shiftMonth(d: ISODate, n: number): ISODate {
  const x = parseDate(d);
  return toISODate(new Date(x.getFullYear(), x.getMonth() + n, 1));
}

/**
 * Schedules (brief section 20): the outlet's shifts with time, coverage and
 * the assigned staff, by Day (the "Today" tab), Week or Month. READ-ONLY by
 * default: `canEdit` comes from the data layer (false until Beeliv confirms
 * the operational rule) and gates the `actions` slot on each shift - no
 * editing UI exists yet. View, date and outlet live in the URL, so the
 * Overview's "Upcoming schedule" days (?date=) land on that day.
 */
export function ScheduleBody() {
  const url = useUrlParams();
  const outlet = useOutletState();
  const allOutlets = outlet.scope === "all";
  const today = todayISO();

  const rawDate = url.get("date");
  const anchor: ISODate = ISO.test(rawDate) ? rawDate : today;
  const rawView = url.get("view");
  // A bare ?date= (from the Overview week strip) means "that day".
  const view: View = rawView === "week" || rawView === "month" || rawView === "day" ? rawView : "day";
  const outletId = url.get("outlet") || ALL;

  const week = startOfWeek(anchor);
  const grid = monthGrid(anchor);
  const from = view === "day" ? anchor : view === "week" ? week : grid.gridStart;
  const to = view === "day" ? anchor : view === "week" ? addDays(week, 6) : grid.gridEnd;
  const { data, status, retry } = useSchedule(from, to);

  const go = (patch: Record<string, string | undefined>) => url.set(patch);
  const setAnchor = (d: ISODate) => go({ date: d === today ? undefined : d });
  const openDay = (d: ISODate) => go({ view: "day", date: d === today ? undefined : d });
  const step = (dir: 1 | -1) => setAnchor(view === "day" ? addDays(anchor, dir) : view === "week" ? addDays(anchor, dir * 7) : shiftMonth(anchor, dir));

  const shifts = useMemo(() => (data?.shifts ?? []).filter((s) => !allOutlets || outletId === ALL || s.outletId === outletId), [data, allOutlets, outletId]);
  const canEdit = data?.canEdit ?? false;

  const period = view === "day" ? fullDay(anchor) : view === "week" ? `${dayMonth(week)} - ${dayMonth(addDays(week, 6))}` : monthYear(anchor);
  const inCurrent = view === "day" ? anchor === today : view === "week" ? week === startOfWeek(today) : grid.month === parseDate(today).getMonth() && parseDate(anchor).getFullYear() === parseDate(today).getFullYear();
  const dayShifts = shifts.filter((s) => s.date === anchor);
  const open = dayShifts.reduce((n, s) => n + Math.max(0, s.required - s.assigned), 0);
  const scheduled = dayShifts.reduce((n, s) => n + s.assigned, 0);

  const scopeName = allOutlets ? "all outlets" : (outlet.outlets.find((o) => o.id === outlet.scope)?.name ?? "this outlet");
  const tabs = [
    { key: "day" as const, label: anchor === today ? "Today" : dayMonth(anchor) },
    { key: "week" as const, label: "Week" },
    { key: "month" as const, label: "Month" },
  ];

  return (
    <>
      <PageHeading title="Schedules" subtitle={`Shifts, times and the staff assigned to them at ${scopeName}.`} right={
          <>
            <span className="max-[767px]:hidden">
              <AnalyticsLink href={analyticsFamilyHref("scheduling")} label="View analytics" />
            </span>
            <MoreActions actions={[{ label: "View schedule analytics", href: analyticsFamilyHref("scheduling") }, { label: "Contact your Beeliv team", href: "/client/support" }]} />
          </>
        }
      />

      <Reveal as="section" aria-label="View and period" className="ap-card mb-4 flex flex-col gap-3 rounded-[18px] p-4 min-[768px]:mb-5 min-[768px]:p-5 max-[767px]:rounded-[20px]! max-[767px]:border! max-[767px]:bg-(--ap-surface)! max-[767px]:p-3.5!">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <ChipRow label="Schedule view" className="min-[768px]:hidden">
            {tabs.map((t) => (
              <Chip key={t.key} on={view === t.key} onClick={() => go({ view: t.key === "day" ? undefined : t.key })}>
                {t.label}
              </Chip>
            ))}
          </ChipRow>
          <FilterTabs label="Schedule view" options={tabs} value={view} onChange={(k) => go({ view: k === "day" ? undefined : k })} className="max-[767px]:hidden" />
          <span
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-(--ap-line-2) max-[767px]:hidden px-3 text-[12px] font-bold text-(--ap-muted)"
            title={canEdit ? "You can edit this schedule" : "Read-only: your Beeliv team manages the schedule"}
          >
            <LockKeyhole className="size-3.5" aria-hidden="true" /> {canEdit ? "Editable" : "View only"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => step(-1)} aria-label={`Previous ${view}`} className="ap-btn ap-btn-s ap-btn-sm size-11 p-0">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next ${view}`} className="ap-btn ap-btn-s ap-btn-sm size-11 p-0">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="min-w-0 flex-1 text-[16px] font-bold text-(--ap-ink)" aria-live="polite">
            {period}
          </p>
          {!inCurrent ? (
            <button type="button" onClick={() => go({ date: undefined })} className="ap-btn ap-btn-s ap-btn-sm">
              <Calendar className="size-4" aria-hidden="true" /> Back to today
            </button>
          ) : null}
          {allOutlets ? (
            <div className="w-full min-[768px]:w-[200px]">
              <FilterSelect label="Outlet" value={outletId} onChange={(v) => go({ outlet: v === ALL ? undefined : v })} options={[{ value: ALL, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))]} />
            </div>
          ) : null}
        </div>

        {status === "ready" && view === "day" ? (
          <p className="text-[13px] text-(--ap-muted)">
            {plural(scheduled, "person", "people")} scheduled across {plural(dayShifts.length, "shift")}
            {open > 0 ? ` · ${plural(open, "position")} open` : " · every position filled"}.
          </p>
        ) : null}
      </Reveal>

      {status === "loading" ? <ScheduleAreaSkeleton /> : null}
      {status === "error" || status === "restricted" ? <ScheduleError retry={retry} /> : null}
      {status === "empty" || (status === "ready" && shifts.length === 0) ? (
        <div className="ap-card rounded-[20px] p-4 min-[768px]:p-6">
          <ChartEmptyState icon={Calendar} title="No schedule for this period" description="Shifts and assignments appear here once they are set up for your outlet. Try another day, week or month." height={220} />
        </div>
      ) : null}

      {status === "ready" && shifts.length > 0 ? (
        view === "day" ? (
          <DayView shifts={shifts} date={anchor} showOutlet={allOutlets && outletId === ALL} />
        ) : view === "week" ? (
          <WeekView shifts={shifts} weekStart={week} onOpenDay={openDay} />
        ) : (
          <MonthView shifts={shifts} gridStart={grid.gridStart} weeks={grid.weeks} month={grid.month} onOpenDay={openDay} />
        )
      ) : null}

      {status === "ready" ? (
        <p className="mt-4 px-1 text-[13px] text-(--ap-muted) max-[767px]:hidden">
          {canEdit ? "" : "Schedules are prepared by your Beeliv team. "}
          {canEdit ? null : <>Need a change? </>}<Link href="/client/support" className="font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">Contact your Beeliv team</Link>.
        </p>
      ) : null}
    </>
  );
}
