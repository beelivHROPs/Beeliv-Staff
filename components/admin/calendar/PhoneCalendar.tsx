"use client";

/**
 * Admin Calendar, PHONE only (<768px): the AGENDA TIMELINE design (admin-home-options option D).
 * Header (day + count + search), a 5-day strip, real count chips, then one day's timeline built by the
 * shared DayTimeline. One primary action (Schedule interview). Same data and links as the desktop calendar.
 * Max 5 events per day, then "Show more"; the rest live on each event's own page.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "@/components/applicant/icons";
import { GlassIcon } from "@/components/shared/icons/GlassIcon";
import { DayTimeline, type TimelineEvent } from "@/components/shared/schedule/DayTimeline";
import type { CalendarEvent, CalendarEventType, CalendarTone } from "@/lib/admin/calendar/types";
import { addDays, clock, dayKey, initials, startOfDay } from "./dates";
import { useNow } from "./hooks";
import { onDay, prepare } from "./model";

const TONE_FACE: Record<CalendarTone, string> = { violet: "#8a7ab5", plum: "#c0678d", green: "#5fa58a", teal: "#4f9fa0", amber: "#d08a5b", gold: "#b89a52", slate: "#8b8497", ink: "#7a6f86" };
const ROUND = "flex size-[42px] shrink-0 items-center justify-center rounded-full bg-(--ap-surface) text-(--ap-ink) shadow-[0_3px_10px_rgba(60,30,80,.08)] active:scale-95";

export function PhoneCalendar({ today, events, types, scheduleHref }: { today: Date; events: CalendarEvent[]; types: CalendarEventType[]; scheduleHref: string }) {
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(today);
  const [more, setMore] = useState(false);
  const all = useMemo(() => prepare(events, types), [events, types]);
  const days = Array.from({ length: 5 }, (_, i) => addDays(from, i));
  const items = onDay(all, day).sort((a, b) => a.s - b.s);
  const isToday = dayKey(day) === dayKey(today);
  // The next event still to come (or the first needing action) gets the tinted card.
  const nowMs = useNow();
  const hot = items.find((x) => x.e.attention) ?? items.find((x) => !x.allDay && x.s >= nowMs) ?? null;
  const shown = (more ? items : items.slice(0, 5)).map<TimelineEvent>((x) => ({
    id: x.e.id,
    time: x.allDay ? "All day" : clock(x.s),
    title: x.e.title,
    meta: [x.type.label, x.e.subtitle].filter(Boolean).join(" · "),
    tone: TONE_FACE[x.type.tone],
    face: initials(x.e.title) || "•",
    status: x.e.attention ? { label: "Needs you", kind: "wait" } : x.e.status ? { label: x.e.status, kind: "ok" } : undefined,
    href: x.e.href,
    highlight: x === hot,
  }));

  const needs = all.filter((x) => x.e.attention).length;
  const interviews = all.filter((x) => x.type.id === "interview").length;
  const leave = all.filter((x) => x.type.id === "leave").length;
  const chips = [
    { n: needs, l: "need you" },
    { n: interviews, l: "interviews" },
    { n: leave, l: "leave" },
  ].filter((c) => c.n > 0);

  const pick = (d: Date) => {
    setDay(d);
    setMore(false);
  };
  const shift = (dir: -1 | 1) => {
    const f = addDays(from, 7 * dir);
    setFrom(f);
    pick(f);
  };
  const label = isToday ? `Today, ${day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "")}` : day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="flex flex-col min-[768px]:hidden">
      <div className="flex items-center gap-2 pb-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] leading-tight font-extrabold text-(--ap-ink)" aria-live="polite">{label}</p>
          <p className="text-[13.5px] text-(--ap-muted)">{items.length === 0 ? "Nothing scheduled" : `${items.length} ${items.length === 1 ? "thing" : "things"} scheduled`}</p>
        </div>
        <button type="button" aria-label="Previous week" onClick={() => shift(-1)} className={ROUND}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next week" onClick={() => shift(1)} className={ROUND}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {items.length > 0 ? (
        <Link href={scheduleHref} style={{ color: "#fff", backgroundImage: "linear-gradient(135deg,#8b2252,#c24a86)", boxShadow: "0 10px 20px rgba(139,34,82,.28)" }} className="mb-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-extrabold">
          <Plus className="size-5" aria-hidden="true" /> Schedule interview
        </Link>
      ) : null}

      <DayTimeline
        days={days.map((d) => ({ key: dayKey(d), dow: d.toLocaleDateString("en-GB", { weekday: "short" }), num: d.getDate(), count: onDay(all, d).length }))}
        selected={dayKey(day)}
        events={shown}
        onSelectDay={(k) => pick(days.find((d) => dayKey(d) === k) ?? day)}
        onShift={shift}
        wrap
        between={
          <>
            {chips.length > 0 ? (
              <div className="mt-3 flex gap-2">
                {chips.map((c) => (
                  <div key={c.l} className="flex-1 rounded-[18px] bg-(--ap-surface) px-3 py-2.5 shadow-[0_6px_16px_rgba(60,30,80,.06)]">
                    <b className="block text-[22px] leading-none text-(--ap-ink)">{c.n}</b>
                    <span className="text-[13px] font-bold text-(--ap-muted)">{c.l}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <h3 className="mx-0.5 mt-[18px] mb-2.5 flex items-baseline gap-1.5 text-[17px] font-bold text-(--ap-ink)">
              Schedule <small className="text-[13px] font-bold text-(--ap-muted)">({items.length})</small>
              {items.length > 5 ? (
                <button type="button" onClick={() => setMore((m) => !m)} className="ml-auto min-h-11 text-[13.5px] font-extrabold text-[#8b2252] dark:text-(--ap-violet)">
                  {more ? "Show less" : "See all"}
                </button>
              ) : null}
            </h3>
          </>
        }
        empty={
          <div className="flex flex-col items-center rounded-[24px] bg-(--ap-surface) px-5 py-7 text-center shadow-[0_8px_24px_rgba(60,30,80,.07)]">
            <GlassIcon name="calendar" size={84} />
            <p className="mt-3 text-[17px] font-bold text-(--ap-ink)">Nothing planned</p>
            <p className="mt-1 text-[14px] text-(--ap-muted)">{startOfDay(day) < startOfDay(today) ? "Nothing was scheduled for this day." : "Interviews and shifts you schedule will show here."}</p>
            <Link href={scheduleHref} className="mt-4 flex h-11 items-center justify-center rounded-full px-6 text-[15px] font-extrabold" style={{ color: "#fff", backgroundImage: "linear-gradient(135deg,#8b2252,#c24a86)" }}>
              Schedule interview
            </Link>
          </div>
        }
      />
      {!more && items.length > 5 ? (
        <button type="button" onClick={() => setMore(true)} className="mx-auto mt-1 flex h-11 items-center rounded-full bg-(--ap-surface) px-5 text-[14px] font-bold text-(--ap-ink) shadow-[0_6px_16px_rgba(60,30,80,.06)]">
          Show {items.length - 5} more
        </button>
      ) : null}
    </div>
  );
}
