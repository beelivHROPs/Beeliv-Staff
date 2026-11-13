"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAttendanceRecords } from "@/lib/client/hooks";
import { Moon, Sun, Wine } from "@/components/applicant/icons";
import { Reveal } from "@/components/applicant/motion";
import { addDays, dayMonth, daysBetween, formatClockRange, parseDate, startOfWeek, toISODate, todayISO, weekday } from "@/lib/client/format";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER, SHIFT_ORDER } from "@/lib/client/labels";
import type { AttendanceRecord, ISODate, ScheduleShiftEntry, ShiftKey } from "@/lib/client/types";
import { useIsPhone } from "@/components/applicant/motion";
import { PersonPhoto } from "../PersonPhoto";
import { AnalyticsPanel, CoverageBar } from "../charts";

const SHIFT_ICON: Record<ShiftKey, typeof Sun> = { morning: Sun, evening: Wine, night: Moon };
const STAFF_PREVIEW = 6;

const forDay = (shifts: ScheduleShiftEntry[], date: ISODate) => shifts.filter((s) => s.date === date);
const sum = (list: ScheduleShiftEntry[], pick: (s: ScheduleShiftEntry) => number) => list.reduce((n, s) => n + pick(s), 0);

/* ------------------------------------------------------------------ */
/* Day                                                                 */
/* ------------------------------------------------------------------ */

/**
 * One day: every shift with its time, coverage (assigned / required) and the
 * staff assigned, with role and department context. With several outlets in
 * scope, shifts are grouped under their outlet. `actions` is the slot where
 * editing controls will go if the backend ever returns canEdit = true; the
 * Client is read-only until Beeliv confirms the rule.
 */
export function DayView({ shifts, date, showOutlet, actions }: { shifts: ScheduleShiftEntry[]; date: ISODate; showOutlet: boolean; actions?: (s: ScheduleShiftEntry) => ReactNode }) {
  const day = forDay(shifts, date);
  const attendance = useAttendanceRecords(date, date);
  const records = attendance.status === "ready" ? (attendance.data ?? []) : [];
  const outlets = [...new Map(day.map((s) => [s.outletId, s.outletName])).entries()];
  return (
    <div className="flex flex-col gap-4 min-[768px]:gap-5">
      {outlets.map(([outletId, outletName]) => (
        <div key={outletId} className="flex flex-col gap-4 min-[768px]:gap-5">
          {showOutlet ? <h2 className="-mb-1.5 text-[17px] font-bold text-(--ap-ink)">{outletName}</h2> : null}
          {SHIFT_ORDER.flatMap((k) => day.filter((s) => s.outletId === outletId && s.shift === k)).map((s) => (
            <ShiftCard key={s.id} shift={s} actions={actions?.(s)} records={records} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ShiftCard({ shift: s, actions, records }: { shift: ScheduleShiftEntry; actions?: ReactNode; records: AttendanceRecord[] }) {
  const [all, setAll] = useState(false);
  const phone = useIsPhone();
  const preview = phone ? 3 : STAFF_PREVIEW;
  const Icon = SHIFT_ICON[s.shift];
  const rostered = useMemo(() => [...s.staff].sort((a, b) => a.name.localeCompare(b.name)), [s.staff]);
  // People who did not come are listed on their own and do NOT count towards covering the shift.
  const absent = rostered.filter((p) => records.some((r) => r.memberId === p.memberId && r.date === s.date && r.shift === s.shift && r.status === "absent"));
  const staff = rostered.filter((p) => !absent.includes(p));
  const covered = Math.max(0, s.assigned - absent.length);
  const openSlots = Math.max(0, s.required - s.assigned);
  // Every position in one list: the filled ones with names, then the open ones, so 20 required = 18 people + 2 open.
  const entries: ({ kind: "person"; p: (typeof staff)[number] } | { kind: "open"; i: number })[] = [
    ...staff.map((p) => ({ kind: "person" as const, p })),
    ...Array.from({ length: openSlots }, (_, i) => ({ kind: "open" as const, i })),
  ];
  const shown = all ? entries : entries.slice(0, preview);
  const byDept = DEPARTMENT_ORDER.map((d) => ({ d, n: staff.filter((p) => p.departmentId === d).length })).filter((x) => x.n > 0);
  const listId = `staff-${s.id}`;
  const openCount = openSlots;
  return (
    <Reveal as="section" aria-label={`${s.label} shift at ${s.outletName}`} className="ap-card min-w-0 rounded-[18px] p-4.5 min-[768px]:p-5 max-[767px]:rounded-[20px]! max-[767px]:border! max-[767px]:bg-(--ap-surface)! max-[767px]:p-3.5!">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <CoverageBar label={`${s.label} shift`} detail={formatClockRange(s.start, s.end).replace(/ - /g, " – ")} assigned={covered} required={s.required} icon={<Icon className="size-5" aria-hidden="true" />} />
        </div>
        {actions}
      </div>

      {staff.length === 0 && openSlots === 0 ? (
        <p className="mt-3 rounded-xl bg-(--ap-tint-soft) px-4 py-4 text-[14px] text-(--ap-muted)">No staff are assigned to this shift.</p>
      ) : (
        <>
          <p className="mt-3.5 text-[13px] text-(--ap-muted) max-[767px]:hidden">
            {byDept.map((x, i) => (
              <span key={x.d}>
                {i > 0 ? " · " : ""}
                {DEPARTMENT_LABEL[x.d]} <b className="font-bold text-(--ap-ink-2) tabular-nums">{x.n}</b>
              </span>
            ))}
          </p>
          <ul id={listId} aria-label={`Staff on the ${s.label.toLowerCase()} shift`} className="m-0 mt-2 grid list-none grid-cols-1 gap-x-6 p-0 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-3">
            {shown.map((e) =>
              e.kind === "person" ? (
                <li key={e.p.memberId} className="flex min-h-14 items-center gap-3 border-t border-(--ap-line-2) py-2">
                  <PersonPhoto name={e.p.name} photoUrl={e.p.photoUrl} size={34} />
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate text-[14.5px] font-semibold text-(--ap-ink)">{e.p.name}</b>
                    <span className="block truncate text-[13px] text-(--ap-muted)">
                      {e.p.role} &middot; {DEPARTMENT_LABEL[e.p.departmentId]}
                    </span>
                  </span>
                </li>
              ) : (
                <li key={`open-${e.i}`} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2">
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-dashed border-(--ap-warn) text-(--ap-warn)" aria-hidden="true">
                    +
                  </span>
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate text-[14.5px] font-semibold text-(--ap-warn)">Open position</b>
                    <span className="block truncate text-[13px] text-(--ap-muted)">Not yet filled</span>
                  </span>
                </li>
              ),
            )}
          </ul>
          {entries.length > preview ? (
            <button type="button" aria-expanded={all} aria-controls={listId} onClick={() => setAll((v) => !v)} className="ap-hit mt-2 text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
              {all ? "Show fewer" : `Show all ${entries.length} positions`}
            </button>
          ) : null}
        </>
      )}

      {openCount > 0 || absent.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-(--ap-warn) bg-(--ap-tint-soft) px-3.5 py-2.5">
          <b className="text-[14px] text-(--ap-ink)">
            {covered} of {s.required} positions covered{openCount > 0 ? ` · ${openCount} open` : ""}{absent.length > 0 ? ` · ${absent.length} absent` : ""}
          </b>
          <Link href="/client/requests" className="text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
            Request staff
          </Link>
        </div>
      ) : null}

      {absent.length > 0 ? (
        <div className="mt-3 rounded-xl border border-(--ap-line-2) p-3.5 max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:border-t max-[767px]:px-0">
          <b className="text-[14px] text-(--ap-ink)">
            Did not come ({absent.length})
          </b>
          <ul className="m-0 mt-2 grid list-none gap-x-6 p-0 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-3" aria-label={`Absent on the ${s.label.toLowerCase()} shift`}>
            {absent.map((p) => (
              <li key={p.memberId} className="flex items-center gap-3 py-1.5">
                <PersonPhoto name={p.name} photoUrl={p.photoUrl} size={34} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[14.5px] font-semibold text-(--ap-ink)">{p.name}</b>
                  <span className="block truncate text-[13px] text-(--ap-muted)">{p.role}</span>
                </span>
                <span className="shrink-0 rounded-full bg-(--ap-rose-bg) px-2.5 py-0.5 text-[12px] font-bold text-(--ap-rose)">Absent</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Week                                                                */
/* ------------------------------------------------------------------ */

/** Seven day cards (a strip on desktop, a stack on phones). Each shows the three shifts' coverage; selecting a day opens it. */
export function WeekView({ shifts, weekStart, onOpenDay }: { shifts: ScheduleShiftEntry[]; weekStart: ISODate; onOpenDay: (d: ISODate) => void }) {
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <AnalyticsPanel title="Week at a glance" subtitle="Assigned / required per shift. Select a day to see who is on it.">
      <ul aria-label="Days this week" className="m-0 flex list-none flex-col p-0 min-[768px]:hidden">
        {days.map((d) => {
          const list = forDay(shifts, d);
          const a = sum(list, (s) => s.assigned);
          const open = sum(list, (s) => Math.max(0, s.required - s.assigned));
          return (
            <li key={d}>
              <button type="button" onClick={() => onOpenDay(d)} aria-current={d === today ? "date" : undefined} className="flex min-h-14 w-full items-center gap-3 border-t border-(--ap-line-2) py-2 text-left first:border-t-0">
                <span className="min-w-0 flex-1 leading-tight">
                  <b className={`block text-[15px] ${d === today ? "text-(--ap-violet)" : "text-(--ap-ink)"}`}>
                    {weekday(d)} {dayMonth(d)}
                  </b>
                  <span className="block text-[13px] text-(--ap-muted)">{a} scheduled</span>
                </span>
                <span className={`text-[13px] font-bold ${open > 0 ? "text-(--ap-warn)" : "text-(--ap-ok)"}`}>{open > 0 ? `${open} open` : "All filled"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="m-0 grid max-[767px]:hidden list-none grid-cols-1 gap-2.5 p-0 min-[768px]:grid-cols-2 min-[1101px]:grid-cols-7">
        {days.map((d) => {
          const list = forDay(shifts, d);
          const isToday = d === today;
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => onOpenDay(d)}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${weekday(d, "long")} ${dayMonth(d)}: ${sum(list, (s) => s.assigned)} scheduled. Open this day.`}
                className={`flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left ${isToday ? "border-(--ap-violet) bg-(--ap-tint)" : "border-(--ap-line-2) bg-(--ap-tint-soft) hover:border-(--ap-tint-2)"}`}
              >
                <span className="flex items-baseline justify-between gap-2 min-[1101px]:flex-col min-[1101px]:items-start min-[1101px]:gap-0">
                  <span className={`text-[12px] font-bold uppercase ${isToday ? "text-(--ap-violet)" : "text-(--ap-muted)"}`}>{weekday(d)}</span>
                  <b className="text-[15px] text-(--ap-ink)">{dayMonth(d)}</b>
                </span>
                <span className="flex flex-col gap-2.5">
                  {SHIFT_ORDER.map((k) => {
                    const g = list.filter((s) => s.shift === k);
                    const a = sum(g, (s) => s.assigned);
                    const r = sum(g, (s) => s.required);
                    const full = r > 0 && a >= r;
                    const pct = r > 0 ? Math.min(100, Math.round((a / r) * 100)) : 0;
                    const Icon = SHIFT_ICON[k];
                    return (
                      <span key={k} className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[13px] text-(--ap-ink-2)">
                          <Icon className="size-3.5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate capitalize">{k}</span>
                          <span className={`shrink-0 tabular-nums ${full ? "font-bold text-(--ap-ok)" : "font-semibold"}`}>
                            {a}
                            <span className="font-normal text-(--ap-muted)">/{r}</span>
                          </span>
                        </span>
                        <span className="h-1 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
                          <span className={`block h-full rounded-full ${full ? "bg-(--ap-ok)" : "bg-(--ap-warn)"}`} style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                    );
                  })}
                </span>
                {(() => {
                  const open = sum(list, (s) => Math.max(0, s.required - s.assigned));
                  return open > 0 ? (
                    <span className="text-[12px] font-bold text-(--ap-warn)">{open} open</span>
                  ) : (
                    <span className="text-[12px] font-bold text-(--ap-ok)">All filled</span>
                  );
                })()}
              </button>
            </li>
          );
        })}
      </ul>
    </AnalyticsPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Month                                                               */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Calendar grid Monday to Sunday. Each day shows how many staff are scheduled (and the shift split from tablet up); selecting a day opens it. */
export function MonthView({ shifts, gridStart, weeks, month, onOpenDay }: { shifts: ScheduleShiftEntry[]; gridStart: ISODate; weeks: number; month: number; onOpenDay: (d: ISODate) => void }) {
  const today = todayISO();
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  return (
    <AnalyticsPanel title="Month at a glance" subtitle="Staff scheduled each day. Select a day to see who is on it.">
      <div className="grid grid-cols-7 gap-1 min-[768px]:gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} aria-hidden="true" className="pb-1 text-center text-[11px] font-bold tracking-wide text-(--ap-muted) uppercase min-[768px]:text-[12px]">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const list = forDay(shifts, d);
          const inMonth = parseDate(d).getMonth() === month;
          const isToday = d === today;
          const total = sum(list, (s) => s.assigned);
          const split = SHIFT_ORDER.map((k) => sum(list.filter((s) => s.shift === k), (s) => s.assigned));
          return (
            <button
              key={d}
              type="button"
              onClick={() => onOpenDay(d)}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${weekday(d, "long")} ${dayMonth(d)}: ${total} scheduled. Morning ${split[0]}, evening ${split[1]}, night ${split[2]}.`}
              className={`flex min-h-[54px] min-w-0 flex-col items-center justify-start gap-0.5 rounded-lg border px-0.5 py-1.5 min-[768px]:min-h-[150px] min-[768px]:items-start min-[768px]:px-2.5 min-[768px]:py-2 ${
                isToday ? "border-(--ap-violet) bg-(--ap-tint)" : "border-(--ap-line-2) bg-(--ap-tint-soft) hover:border-(--ap-tint-2)"
              } ${inMonth ? "" : "opacity-50"}`}
            >
              <span className={`text-[13px] leading-none font-bold min-[768px]:text-[14px] ${isToday ? "text-(--ap-violet)" : "text-(--ap-ink)"}`}>{parseDate(d).getDate()}</span>
              {/* Phones: just the total. Tablet up: the same per-shift cover as the week view. */}
              <span className="text-[13px] font-semibold text-(--ap-ink-2) tabular-nums min-[768px]:hidden">{total}</span>
              <span className="mt-1 flex w-full flex-col gap-1.5 max-[767px]:hidden">
                {SHIFT_ORDER.map((k) => {
                  const g = list.filter((x) => x.shift === k);
                  const as = sum(g, (x) => x.assigned);
                  const r = sum(g, (x) => x.required);
                  const full = r > 0 && as >= r;
                  const pct = r > 0 ? Math.min(100, Math.round((as / r) * 100)) : 0;
                  const Icon = SHIFT_ICON[k];
                  return (
                    <span key={k} className="flex flex-col gap-0.5" aria-hidden="true">
                      <span className="flex items-center gap-1 text-left text-[11px] text-(--ap-ink-2)">
                        <Icon className="size-3 shrink-0 text-(--ap-muted)" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate capitalize">{k}</span>
                        <span className={`shrink-0 tabular-nums ${full ? "font-bold text-(--ap-ok)" : "font-semibold"}`}>
                          {as}
                          <span className="font-normal text-(--ap-muted)">/{r}</span>
                        </span>
                      </span>
                      <span className="h-[3px] overflow-hidden rounded-full bg-(--ap-line-2)">
                        <span className={`block h-full rounded-full ${full ? "bg-(--ap-ok)" : "bg-(--ap-warn)"}`} style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  );
                })}
                {(() => {
                  const open = sum(list, (x) => Math.max(0, x.required - x.assigned));
                  return open > 0 ? <span className="text-[11px] font-bold text-(--ap-warn)">{open} open</span> : <span className="text-[11px] font-bold text-(--ap-ok)">All filled</span>;
                })()}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-[12px] text-(--ap-muted) max-[767px]:hidden">Each day shows how many are assigned out of those required for each shift{" "}<span className="max-[767px]:hidden">and how many places are still open</span>.</p>
    </AnalyticsPanel>
  );
}

/** First Monday shown and week count for the month containing `anchor`. */
export function monthGrid(anchor: ISODate): { gridStart: ISODate; gridEnd: ISODate; weeks: number; month: number } {
  const d = parseDate(anchor);
  const first = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), 6);
  return { gridStart, gridEnd, weeks: (daysBetween(gridStart, gridEnd) + 1) / 7, month: d.getMonth() };
}
