"use client";

/**
 * Schedule on desktop (1000px and up): a Monday-to-Sunday week grid with one column per day, week
 * navigation, and a detail panel for the selected day. Same data and hook as the phone Schedule;
 * no scheduling rule is decided here (status and notes come from the backend).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock3 } from "@/components/applicant/icons";
import { addDays, dayMonth, dayNumber, formatClock, formatClockRange, longDate, parseDate, todayISO, weekday } from "@/lib/staff/format";
import { useSchedule } from "@/lib/staff/hooks";
import type { Shift, ShiftStatus } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Dot, Facts, PANEL, Panel, Sk } from "../kit";

function weekStart(d: string): string {
  return addDays(d, -((parseDate(d).getDay() + 6) % 7));
}
function hours(s: Shift): number {
  const [h1, m1] = s.startTime.split(":").map(Number);
  const [h2, m2] = s.endTime.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}
const fmtH = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
const DOT: Record<ShiftStatus, { tone: "ok" | "warn" | "rose" | "info"; word: string }> = {
  scheduled: { tone: "info", word: "Scheduled" },
  updated: { tone: "warn", word: "Updated" },
  cancelled: { tone: "rose", word: "Cancelled" },
  completed: { tone: "ok", word: "Done" },
};

export function ScheduleDesktop() {
  const today = todayISO();
  const range = useMemo(() => ({ from: addDays(today, -60), to: addDays(today, 90) }), [today]);
  const { data, status, retry } = useSchedule(range);
  const shifts = useMemo(() => [...(data ?? [])].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)), [data]);
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState(today);
  const start = addDays(weekStart(today), offset * 7);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  const selected = days.includes(picked) ? picked : (days.includes(today) ? today : days[0]);
  const arrow = "inline-flex size-11 items-center justify-center rounded-full bg-(--ap-surface,#fff) text-(--ap-violet) shadow-[inset_0_0_0_1px_var(--ap-line)] transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-[1120px] pt-2" aria-busy="true" aria-label="Loading your schedule">
        <h1 className="sr-only">Schedule</h1>
        <Sk className="mb-5 h-11" />
        <Sk className="h-[300px]" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">Schedule</h1>
        <ErrorPanel title="We couldn't load your schedule" retry={retry} />
      </div>
    );
  }

  const weekShifts = shifts.filter((s) => days.includes(s.date) && s.status !== "cancelled");
  const totalHrs = weekShifts.reduce((n, s) => n + hours(s), 0);
  const dayShifts = shifts.filter((s) => s.date === selected);
  const label = offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : "Another week";

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink)">Schedule</h1>
        <div className="flex items-center gap-3">
          {offset !== 0 ? (
            <ActionPill variant="outline" compact arrow={false} onClick={() => { setOffset(0); setPicked(today); }}>
              Today
            </ActionPill>
          ) : null}
          <button type="button" className={arrow} aria-label="Previous week" onClick={() => setOffset(offset - 1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="min-w-[132px] text-center leading-tight">
            <b className="block text-[16px] text-(--ap-ink)">{label}</b>
            <span className="text-[14px] text-(--ap-muted) tabular-nums">
              {dayMonth(days[0])} to {dayMonth(days[6])}
            </span>
          </p>
          <button type="button" className={arrow} aria-label="Next week" onClick={() => setOffset(offset + 1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`${PANEL} grid grid-cols-7 divide-x divide-(--ap-line-2) overflow-hidden`} role="group" aria-label="Days of the week">
        {days.map((d) => {
          const list = shifts.filter((s) => s.date === d);
          const on = d === selected;
          const isToday = d === today;
          return (
            <div key={d} className={`flex min-h-[220px] min-w-0 flex-col ${on ? "bg-(--ap-tint-soft)" : ""}`}>
              <button
                type="button"
                onClick={() => setPicked(d)}
                aria-pressed={on}
                aria-current={isToday ? "date" : undefined}
                aria-label={longDate(d)}
                className="flex flex-col items-center gap-1 border-b border-(--ap-line-2) py-3 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset"
              >
                <span className="text-[13px] font-semibold text-(--ap-muted)">{weekday(d).slice(0, 3)}</span>
                <b className={`flex size-9 items-center justify-center rounded-full text-[17px] tabular-nums ${isToday ? "bg-(--staff-deep,#1b1340) text-white" : on ? "bg-(--ap-tint-2) text-(--ap-violet)" : "text-(--ap-ink)"}`}>{dayNumber(d)}</b>
              </button>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {list.length === 0 ? <li className="pt-4 text-center text-[14px] text-(--ap-faint)">Off</li> : null}
                {list.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(d)}
                      className={`w-full rounded-2xl bg-(--ap-surface,#fff) p-2.5 text-left leading-snug shadow-[inset_0_0_0_1px_var(--ap-line)] transition-colors hover:shadow-[inset_0_0_0_1.5px_var(--ap-violet)] focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${s.status === "cancelled" ? "opacity-70" : ""}`}
                    >
                      <b className={`block text-[14px] text-(--ap-ink) tabular-nums ${s.status === "cancelled" ? "line-through" : ""}`}>{formatClock(s.startTime).replace(":00", "")}</b>
                      <span className="block truncate text-[13px] text-(--ap-muted)">{s.section}</span>
                      {s.status !== "scheduled" ? <Dot tone={DOT[s.status].tone}>{DOT[s.status].word}</Dot> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
        <Panel title={selected === today ? "Today" : longDate(selected)} aside={<span className="text-[14px] text-(--ap-muted)">{dayShifts.length === 0 ? "No shift" : `${dayShifts.length} ${dayShifts.length === 1 ? "shift" : "shifts"}`}</span>}>
          {dayShifts.length === 0 ? (
            <p className="flex items-center gap-3 text-[16px] text-(--ap-muted)">
              <Calendar className="size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
              Nothing is scheduled for {selected === today ? "today" : "this day"}.
            </p>
          ) : (
            <ul className="divide-y divide-(--ap-line-2)">
              {dayShifts.map((s) => {
                const brk = s.agenda.find((e) => e.kind === "break");
                return (
                  <li key={s.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <b className="text-[20px] text-(--ap-ink) tabular-nums">{formatClockRange(s.startTime, s.endTime)}</b>
                      <Dot tone={DOT[s.status].tone}>{DOT[s.status].word}</Dot>
                    </div>
                    <Facts
                      rows={[
                        ["Role", `${s.role} · ${s.section}`],
                        ["Place", `${s.client}, ${s.location}`],
                        ...(brk ? ([["Break", formatClock(brk.time)]] as [string, string][]) : []),
                        ...(s.notes ? ([["Note", s.notes]] as [string, string][]) : []),
                      ]}
                    />
                    <div>
                      <ActionPill icon={Clock3} href={`/staff/schedule/${s.id}`} variant="outline" compact arrow={false}>
                        View shift
                      </ActionPill>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title={label}>
          <Facts
            rows={[
              ["Shifts", String(weekShifts.length)],
              ["Hours planned", `${fmtH(totalHrs)} hrs`],
              ["Days off", String(days.filter((d) => !weekShifts.some((s) => s.date === d)).length)],
            ]}
          />
          <Link href="/staff/attendance" className="mt-4 inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-(--ap-violet)">
            Open attendance <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}
