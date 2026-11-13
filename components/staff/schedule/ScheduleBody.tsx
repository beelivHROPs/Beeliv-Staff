"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/applicant/icons";
import { GlassIcon } from "@/components/shared/icons/GlassIcon";
import { DayTimeline, type TimelineEvent } from "@/components/shared/schedule/DayTimeline";
import { addDays, dayNumber, formatClockRange, longDate, parseDate, todayISO, weekday } from "@/lib/staff/format";
import { useSchedule } from "@/lib/staff/hooks";
import type { Shift } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { Sk } from "../kit";
import { ScheduleDesktop } from "./ScheduleDesktop";

/**
 * Schedule (brief section 7). One fetch covers a window around today; the day strip filters it
 * locally so switching is instant. Phones (and tablets under 1000px): the shared DayTimeline
 * (docs/design-references/admin-home-options-2026-10-26.html, option D): a 5-day strip, one small
 * hours-this-week card, a counted heading and one card per shift on a time rail. From 1000px the
 * week grid takes over (ScheduleDesktop, unchanged). Only fields the schedule really has are shown:
 * no reporting time or manager is invented, and status comes from the backend. The detail page
 * (/staff/schedule/[id]) holds everything else.
 */

const PAST_DAYS = 60;
const FUTURE_DAYS = 90;
const STRIP = 5;

/** Monday of the week containing `d`. */
function weekStart(d: string): string {
  const dow = (parseDate(d).getDay() + 6) % 7; // Mon = 0
  return addDays(d, -dow);
}

function hoursOf(s: Shift): number {
  const [h1, m1] = s.startTime.split(":").map(Number);
  const [h2, m2] = s.endTime.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}

/** Outlet names often start with the client ("Kalina, Abuja"): show the client once and the place once. */
function titleOf(s: Shift): string {
  const c = s.client.trim();
  const o = s.outlet.trim();
  return o.toLowerCase().startsWith(c.toLowerCase()) ? o : `${c}, ${o}`;
}

/** ONE honest pill from the backend status (no swap or off state exists in the data, so none is invented). */
const PILL: Record<Shift["status"], { label: string; kind: "ok" | "wait" | "bad" }> = {
  scheduled: { label: "Confirmed", kind: "ok" },
  updated: { label: "Updated", kind: "wait" },
  cancelled: { label: "Cancelled", kind: "bad" },
  completed: { label: "Done", kind: "ok" },
};

/** Same name, same colour (the shared initials palette). */
const FACE = ["#c0678d", "#8a7ab5", "#5fa58a", "#d08a5b", "#5b8fd0", "#b36bb0"];
function faceOf(name: string): { tone: string; face: string } {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const w = name.split(/\s+/).filter(Boolean);
  return { tone: FACE[h % FACE.length], face: ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || "•" };
}

/** Phones and tablets keep the single-column Schedule; from 1000px the week grid takes over. */
export function ScheduleBody() {
  return (
    <>
      <div className="min-[1000px]:hidden">
        <ScheduleMobileBody />
      </div>
      <div className="max-[999px]:hidden">
        <ScheduleDesktop />
      </div>
    </>
  );
}

const ROUND = "flex size-[42px] shrink-0 items-center justify-center rounded-full bg-(--ap-surface) text-(--ap-ink) shadow-[0_3px_10px_rgba(60,30,80,.08)] active:scale-95";

function ScheduleMobileBody() {
  const today = todayISO();
  const range = useMemo(() => ({ from: addDays(today, -PAST_DAYS), to: addDays(today, FUTURE_DAYS) }), [today]);
  const { data, status, retry } = useSchedule(range);
  const shifts = useMemo(() => [...(data ?? [])].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)), [data]);

  const [from, setFrom] = useState(today);
  const [picked, setPicked] = useState(today);
  const days = Array.from({ length: STRIP }, (_, i) => addDays(from, i));
  const selected = days.includes(picked) ? picked : days[0];

  if (status === "loading") return <ScheduleLoading />;
  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-[560px] pt-2">
        <h1 className="sr-only">Schedule</h1>
        <ErrorPanel title="We couldn't load your schedule" retry={retry} />
      </div>
    );
  }

  const live = shifts.filter((s) => s.status !== "cancelled");
  const week = weekStart(today);
  const hours = live.filter((s) => s.date >= week && s.date <= addDays(week, 6)).reduce((n, s) => n + hoursOf(s), 0);
  const hoursText = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  const dayShifts = shifts.filter((s) => s.date === selected);
  // Today's (or the next) shift still to come is the tinted card.
  const next = live.find((s) => s.status !== "completed" && s.date >= today) ?? null;
  const events = dayShifts.map<TimelineEvent>((s) => ({
    id: s.id,
    time: s.startTime,
    title: titleOf(s),
    meta: `${s.role} · ${formatClockRange(s.startTime, s.endTime)}`,
    ...faceOf(s.client),
    status: PILL[s.status],
    href: `/staff/schedule/${s.id}`,
    highlight: s.id === next?.id,
  }));
  const move = (dir: -1 | 1) => {
    const f = addDays(from, STRIP * dir);
    setFrom(f);
    setPicked(f);
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col pb-2">
      <h1 className="sr-only">Schedule</h1>
      <div className="mb-3.5 flex items-center justify-between gap-3 rounded-[20px] bg-(--ap-surface) px-4 py-3 shadow-[0_6px_18px_rgba(60,30,80,.07)]">
        <span className="text-[15px] text-(--ap-muted)">Hours this week</span>
        <b className="text-[22px] leading-none text-(--ap-ink) tabular-nums">{hoursText}</b>
      </div>
      <DayTimeline
        wrap
        days={days.map((d) => ({ key: d, dow: weekday(d), num: dayNumber(d), count: live.filter((s) => s.date === d).length }))}
        selected={selected}
        events={events}
        onSelectDay={setPicked}
        onShift={move}
        between={
          <h2 className="mx-0.5 mt-[18px] mb-2.5 flex items-center gap-1.5 text-[17px] font-bold text-(--ap-ink)">
            <span>{selected === today ? "My shifts" : longDate(selected)}</span> <small className="text-[14px] font-bold text-(--ap-muted)">({dayShifts.length})</small>
            <span className="ml-auto flex items-center gap-2">
              <button type="button" aria-label="Earlier days" onClick={() => move(-1)} className={ROUND}>
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Later days" onClick={() => move(1)} className={ROUND}>
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </span>
          </h2>
        }
        empty={
          <div role="status" className="flex flex-col items-center rounded-[24px] bg-(--ap-surface) px-5 py-7 text-center shadow-[0_8px_24px_rgba(60,30,80,.07)]">
            <GlassIcon name="calendar" size={84} />
            <p className="mt-3 text-[17px] font-bold text-(--ap-ink)">{selected === today ? "No shift today" : "No shift this day"}</p>
            <p className="mt-1 text-[15px] text-(--ap-muted)">{longDate(selected)} has nothing planned.</p>
          </div>
        }
      />
    </div>
  );
}

/* ---------- loading ---------- */

/** Same shape as the page: hours card, day strip, a few shift cards. */
function ScheduleSkeletonBlocks() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3" aria-busy="true" aria-label="Loading your schedule">
      <h1 className="sr-only">Schedule</h1>
      <Sk className="h-[56px] rounded-[20px]" />
      <Sk className="h-[66px] rounded-[18px]" />
      <Sk className="mt-2 h-[80px] rounded-[20px]" />
      <Sk className="h-[80px] rounded-[20px]" />
    </div>
  );
}

export function ScheduleSkeleton() {
  return <ScheduleSkeletonBlocks />;
}

export function ScheduleLoading() {
  return <ScheduleSkeletonBlocks />;
}
