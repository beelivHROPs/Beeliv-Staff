"use client";

/**
 * Week and Day, the calm way: a strip of day circles (same look as the Month
 * grid) and the selected day as a TIMELINE LIST: time on the left, a thin line
 * with small dots, one slim neutral row per event. Event type is only a small
 * coloured dot. Only the current / next event gets a filled brand-colour row;
 * "needs attention" items carry the small red marker. Identical events (same type, start, end, title) merge
 * into one row ("Morning shift, 3 people") that opens the people list.
 */
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { EmptyState } from "@/components/applicant/primitives";
import { Calendar } from "@/components/applicant/icons";
import type { CalendarEvent, CalendarEventType } from "@/lib/admin/calendar/types";
import { WEEKDAYS, addMonths, clock, dayKey, fmtDayLong, sameDay } from "./dates";
import { ariaOf, hoverProps, type CalCtx } from "./EventChip";
import { MiniMonth } from "./MiniMonth";
import { onDay, prepare, toneStyle, type Ev } from "./model";

interface Group {
  key: string;
  lead: Ev;
  members: Ev[];
}

/** Merge identical events inside one day; all-day first, then by start time. */
function groupDay(list: Ev[]): Group[] {
  const map = new Map<string, Group>();
  for (const x of list) {
    const key = `${x.type.id}|${x.s}|${x.t}|${x.allDay ? 1 : 0}|${x.e.title}`;
    const g = map.get(key);
    if (g) g.members.push(x);
    else map.set(key, { key, lead: x, members: [x] });
  }
  return [...map.values()].sort((a, b) => Number(b.lead.allDay) - Number(a.lead.allDay) || a.lead.s - b.lead.s || a.lead.t - b.lead.t);
}

/* ------------------------------------------------------------------ strip */

/** Seven day circles, styled like the Month grid: gold selected, ring on today, red dot when something needs action. */
export function WeekStrip({ days, selected, today, items, onSelect }: { days: Date[]; selected: Date; today: Date; items: Ev[]; onSelect: (d: Date) => void }) {
  return (
    <div role="group" aria-label="Days of this week" className="grid grid-cols-7 gap-x-1">
      {days.map((d) => {
        const list = onDay(items, d);
        const isToday = sameDay(d, today);
        const isSel = sameDay(d, selected);
        const needs = list.some((x) => x.e.attention);
        return (
          <button
            key={dayKey(d)}
            type="button"
            data-day={dayKey(d)}
            onClick={() => onSelect(d)}
            aria-label={`${fmtDayLong(d)}, ${list.length ? `${list.length} planned` : "nothing planned"}`}
            aria-current={isToday ? "date" : undefined}
            aria-pressed={isSel}
            className="flex min-w-0 flex-col items-center gap-1 rounded-2xl py-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet)"
          >
            <span className="text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
            <span className="relative flex items-center justify-center">
              <span
                className={`flex size-10 items-center justify-center rounded-full text-[16px] font-bold tabular-nums transition-colors ${
                  isSel ? "bg-(--cal-gold) text-(--cal-gold-ink) shadow-(--ap-shadow)" : "text-(--ap-ink) hover:bg-(--ap-line-2)"
                } ${isToday ? "ring-2 ring-(--ap-violet) ring-offset-2 ring-offset-(--ap-surface)" : ""}`}
              >
                {d.getDate()}
              </span>
              {needs ? (
                <span aria-hidden="true" className="absolute -top-0.5 -right-1">
                  <AttentionBadge className="size-3.5" halo={false} />
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="flex h-3 items-center gap-0.5 text-[11px] leading-none font-semibold text-(--ap-muted) tabular-nums">
              {list.length === 0 ? null : list.length <= 2 ? Array.from({ length: list.length }, (_, i) => <span key={i} className="size-1.5 rounded-full bg-(--ap-faint)" />) : list.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- timeline */

function Row({ g, ctx, first, last, now, onGroup }: { g: Group; ctx: CalCtx; first: boolean; last: boolean; now: boolean; onGroup: (list: Ev[], title: string, el: HTMLElement) => void }) {
  const x = g.lead;
  const many = g.members.length > 1;
  const conflict = g.members.some((m) => ctx.conflicts.has(m.e.id));
  const attention = g.members.some((m) => m.e.attention);
  const filled = now;
  const cancelled = x.e.status === "Cancelled";
  const people = new Map<string, string>();
  for (const m of g.members) for (const p of m.e.people ?? []) people.set(p.id, p.name);
  const names = [...people.values()];
  const count = many ? Math.max(names.length, g.members.length) : names.length;
  const clients = [...new Set(g.members.map((m) => m.e.client?.name).filter((n): n is string => !!n))];
  const place = clients.length ? clients[0] + (clients.length > 1 ? ` +${clients.length - 1}` : "") : x.e.subtitle;
  const timeLabel = x.allDay ? "All day" : clock(x.s);

  return (
    <li className="grid grid-cols-[52px_20px_minmax(0,1fr)] gap-x-2.5 min-[768px]:grid-cols-[60px_24px_minmax(0,1fr)]" style={toneStyle(x.type.tone)}>
      <div className="pt-3.5 text-right leading-tight">
        <p className={`text-[13px] font-semibold tabular-nums ${now ? "text-(--ap-ink)" : "text-(--ap-muted)"}`}>{timeLabel}</p>
        {!x.allDay ? <p className="mt-0.5 text-[11.5px] text-(--ap-faint) tabular-nums">{clock(x.t)}</p> : null}
      </div>
      <div aria-hidden="true" className="relative">
        <span className="absolute left-1/2 w-px -translate-x-1/2 bg-(--ap-line)" style={{ top: first ? 22 : 0, bottom: last ? "calc(100% - 22px)" : 0 }} />
        <span className={`absolute left-1/2 -translate-x-1/2 rounded-full ring-4 ring-(--ap-surface) ${now ? "top-[17px] size-3.5 bg-(--ap-violet)" : "top-[18px] size-2.5 bg-[color:var(--ev)]"}`} />
      </div>
      <div className="min-w-0 py-1">
        <button
          type="button"
          data-ev={x.e.id}
          aria-label={many ? `${timeLabel}, ${x.e.title}, ${count} people, ${x.type.label}${conflict ? ", double-booked" : ""}` : ariaOf(x, conflict)}
          aria-haspopup="dialog"
          onClick={(e) => (many ? onGroup(g.members, x.e.title, e.currentTarget) : ctx.onOpen(x, e.currentTarget))}
          {...(many ? {} : hoverProps(ctx, x))}
          className={`flex w-full min-w-0 items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet) ${
            filled ? "bg-(--ap-violet) text-white hover:brightness-110" : "text-(--ap-ink) hover:bg-(--ap-tint-soft)"
          } ${cancelled ? "opacity-60" : ""}`}
        >
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] leading-snug font-bold [overflow-wrap:anywhere] ${cancelled ? "line-through" : ""}`}>
              {x.e.title}
              {many ? <span className="font-semibold"> · {count} people</span> : null}
            </span>
            {place ? <span className={`block text-[13px] leading-snug [overflow-wrap:anywhere] ${filled ? "text-white/80" : "text-(--ap-muted)"}`}>{place}</span> : null}
            {!many && names.length > 0 ? <span className={`block text-[12px] leading-snug [overflow-wrap:anywhere] ${filled ? "text-white/70" : "text-(--ap-faint)"}`}>{names.length > 1 ? `${names.length} people` : names[0]}</span> : null}
          </span>
          {conflict || attention ? <AttentionBadge className="mt-0.5 size-4 shrink-0" halo={false} /> : null}
        </button>
      </div>
    </li>
  );
}

/** The selected day as a timeline list. `now` is the current ms clock. */
export function DayTimeline({ day, today, now, items, ctx, onGroup, emptyAction }: { /** Pill button under the empty-day message (e.g. "Schedule interview"). */ emptyAction?: ReactNode; day: Date; today: Date; now: number; items: Ev[]; ctx: CalCtx; onGroup: (d: Date, list: Ev[], title: string, el: HTMLElement) => void }) {
  const groups = useMemo(() => groupDay(onDay(items, day)), [items, day]);
  // The current event, else the next one to start (today only).
  const nowKey = useMemo(() => {
    if (!sameDay(day, today)) return null;
    const timed = groups.filter((g) => !g.lead.allDay);
    return (timed.find((g) => g.lead.s <= now && now < g.lead.t) ?? timed.find((g) => g.lead.s > now))?.key ?? null;
  }, [groups, day, today, now]);

  if (groups.length === 0) {
    return <EmptyState icon={Calendar} title={`Nothing planned for ${fmtDayLong(day)}`} description="Interviews, shifts, leave and deadlines for this day will show up here." action={emptyAction} />;
  }
  return (
    <ul aria-label={`Schedule for ${fmtDayLong(day)}`} className="m-0 flex list-none flex-col p-0">
      {groups.map((g, i) => (
        <Row key={g.key} g={g} ctx={ctx} first={i === 0} last={i === groups.length - 1} now={g.key === nowKey} onGroup={(l, t, el) => onGroup(day, l, t, el)} />
      ))}
    </ul>
  );
}

/** Whole week (or the shown range) has nothing: say it once. */
export function WeekEmpty({ action }: { action?: ReactNode }) {
  return <EmptyState icon={Calendar} title="Nothing planned this week" description="Interviews, shifts, leave and deadlines show up here once they are scheduled. Use the arrows to look at another week." action={action} />;
}

/** "Today, Saturday 17 October" with the planned count and an optional control on the right. */
export function DayHeading({ day, today, count, right }: { day: Date; today: Date; count: number; right?: ReactNode }) {
  return (
    <div className="mt-4 mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--ap-line-2) pt-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] leading-tight font-bold text-(--ap-ink)">{sameDay(day, today) ? `Today, ${fmtDayLong(day)}` : fmtDayLong(day)}</h3>
        {count > 0 ? <p className="text-[13px] text-(--ap-muted)">{count} planned</p> : null}
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------ side column */

/** Desktop side column for Week / Day: a small month navigator and a plain "Needs your attention" list, on one calm surface. */
export function TimelineSide({ date, today, events, types, onSelect }: { date: Date; today: Date; events: CalendarEvent[]; types: CalendarEventType[]; onSelect: (d: Date) => void }) {
  const items = useMemo(() => prepare(events, types), [events, types]);
  const [nav, setNav] = useState<{ for: string; month: Date } | null>(null);
  const navMonth = nav && nav.for === dayKey(date) ? nav.month : date;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const attention = items.filter((x) => x.e.attention && x.t >= start).slice(0, 4);
  return (
    <aside aria-label="Calendar navigator" className="ap-card min-w-0 rounded-[20px] p-5">
      <MiniMonth variant="side" month={navMonth} selected={date} today={today} items={[]} onSelect={onSelect} onMonthChange={(dir) => setNav({ for: dayKey(date), month: addMonths(navMonth, dir) })} />
      <section aria-label="Needs your attention" className="mt-5 border-t border-(--ap-line-2) pt-4">
        <h3 className="text-[15px] font-bold text-(--ap-ink)">{attention.length ? "Needs your attention" : "You are all caught up"}</h3>
        {attention.length === 0 ? (
          <p className="mt-1 text-[13px] text-(--ap-muted)">Nothing on the calendar needs action right now.</p>
        ) : (
          <ul className="m-0 mt-1 flex list-none flex-col p-0">
            {attention.map((x) => (
              <li key={x.e.id} className="border-t border-(--ap-line-2) py-3 first:border-t-0">
                <p className="text-[12px] text-(--ap-muted)">{fmtDayLong(new Date(x.s))}</p>
                <p className="text-[14px] leading-snug font-bold break-words text-(--ap-ink)">{x.e.title}</p>
                {x.e.href ? (
                  <Link href={x.e.href} className="text-[13px] font-bold text-(--ap-violet)">
                    {x.e.hrefLabel ?? "Open"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
