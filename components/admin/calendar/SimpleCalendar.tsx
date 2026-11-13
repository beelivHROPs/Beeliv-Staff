"use client";

/**
 * The calm default calendar: one big month grid (dots on phones, up to two
 * one-line chips on larger screens) and a simple day sheet that opens when a
 * day is clicked (right side sheet on desktop, bottom sheet on phones).
 */
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Calendar, ChevronRight, Plus, Users, Video, X } from "@/components/applicant/icons";
import type { CalendarEvent, CalendarEventType } from "@/lib/admin/calendar/types";
import { WEEKDAYS, clock, dayKey, fmtDayLong, monthWeeks, parseKey, sameDay, sameMonth } from "./dates";
import { useLayout } from "./hooks";
import { onDay, prepare, toneStyle, type Ev } from "./model";

const TINT_LEVEL = [
  "",
  "bg-[color-mix(in_srgb,var(--ap-violet)_6%,transparent)]",
  "bg-[color-mix(in_srgb,var(--ap-violet)_11%,transparent)]",
  "bg-[color-mix(in_srgb,var(--ap-violet)_17%,transparent)]",
] as const;

export function SimpleMonth({ month, selected, today, events, types, onSelect, dir = 0 }: { month: Date; selected: Date | null; today: Date; events: CalendarEvent[]; types: CalendarEventType[]; onSelect: (d: Date) => void; /** 1 = moved forward a month, -1 = back: sets the slide direction. */ dir?: number }) {
  const phone = useLayout() === "phone";
  const calm = useReducedMotion();
  const items = prepare(events, types);
  const weeks = monthWeeks(month);
  const grid = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-day]");
    if (!t) return;
    const d = parseKey(t.dataset.day!);
    const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
    grid.current?.querySelector<HTMLElement>(`[data-day="${dayKey(n)}"]`)?.focus();
  };
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  return (
    <div ref={grid} onKeyDown={onKey} role="group" aria-label={`${month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, select a day to see what is planned`}>
      <div className="mb-1 grid grid-cols-7" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-2 text-center text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">
            {phone ? w[0] : w}
          </span>
        ))}
      </div>
      <motion.div
        key={monthKey}
        initial={calm ? false : { opacity: 0, x: dir * 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
        className="grid gap-y-1"
      >
        {weeks.map((week) => (
          <div key={dayKey(week[0])} className="grid grid-cols-7 gap-x-1">
            {week.map((d) => {
              const list = onDay(items, d);
              const isToday = sameDay(d, today);
              const isSel = !!selected && sameDay(d, selected);
              const inMonth = sameMonth(d, month);
              // No dots: a day with plans gets a soft tint behind its number, deeper when it is busier.
              const level = list.length === 0 ? 0 : list.length === 1 ? 1 : list.length <= 3 ? 2 : 3;
              const needs = list.some((x) => x.e.attention);
              return (
                <motion.button
                  key={dayKey(d)}
                  type="button"
                  data-day={dayKey(d)}
                  onClick={() => onSelect(d)}
                  whileTap={calm ? undefined : { scale: 0.93 }}
                  whileHover={calm ? undefined : { scale: 1.06 }}
                  aria-label={`${fmtDayLong(d)}, ${list.length ? `${list.length} planned` : "nothing planned"}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSel}
                  className="relative flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-center focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet) min-[768px]:min-h-[64px]"
                >
                  <span className="relative flex items-center justify-center">
                    {isSel ? <motion.span layoutId="cal-selected" transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-hidden="true" className="absolute inset-0 rounded-full bg-(--cal-gold) shadow-(--ap-shadow)" /> : null}
                    <span className={`relative flex size-10 items-center justify-center rounded-full text-[16px] font-bold tabular-nums transition-colors ${isSel ? "" : TINT_LEVEL[level]} ${isToday ? "ring-2 ring-(--ap-violet) ring-offset-2 ring-offset-(--ap-surface)" : ""} ${isSel ? "text-(--cal-gold-ink)" : inMonth ? "text-(--ap-ink)" : "text-(--ap-faint)"}`}>{d.getDate()}</span>
                    {needs ? <span aria-hidden="true" className="absolute -top-0.5 -right-1"><AttentionBadge className="size-3.5" halo={false} /></span> : null}
                  </span>
                </motion.button>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function TinyLegend({ types }: { types: CalendarEventType[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12px] text-(--ap-muted)" aria-label="Colour key">
      {types.map((t) => (
        <li key={t.id} className="flex items-center gap-1.5" style={toneStyle(t.tone)}>
          <span aria-hidden="true" className="size-2 rounded-full bg-[color:var(--ev)]" /> {t.label}
        </li>
      ))}
    </ul>
  );
}

const iconOf = (id: string) => (id === "interview" ? Video : id === "shift" || id === "leave" ? Users : Calendar);

function part(x: Ev): number {
  if (x.allDay) return 0;
  const h = new Date(x.s).getHours();
  return h < 12 ? 1 : h < 17 ? 2 : 3;
}
function dayOfYear(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86_400_000);
}
function isoWeekOf(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
}
const PART_LABEL = ["All day", "Morning", "Afternoon", "Evening"];

export function DaySheet({ day, events, types, scheduleHref, onClose, inline = false }: { day: Date; events: CalendarEvent[]; types: CalendarEventType[]; scheduleHref: string; onClose: () => void; /** Show as a plain card next to the calendar instead of a pop-over sheet. */ inline?: boolean }) {
  const phone = useLayout() === "phone";
  const ref = useRef<HTMLDivElement>(null);
  const items = onDay(prepare(events, types), day);
  useEffect(() => {
    if (inline) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [onClose, inline]);
  const groups = [0, 1, 2, 3].map((p) => ({ p, list: items.filter((x) => part(x) === p) })).filter((g) => g.list.length > 0);
  return (
    <>
      {inline ? null : <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ap-ink)_35%,transparent)]" />}
      <div
        ref={ref}
        {...(inline ? { role: "region" } : { role: "dialog", "aria-modal": true })}
        aria-label={fmtDayLong(day)}
        tabIndex={-1}
        className={inline ? "ap-card flex min-w-0 flex-col rounded-[20px] text-(--ap-ink)" : `fixed z-50 flex flex-col border-(--ap-line) bg-(--ap-surface) text-(--ap-ink) shadow-(--ap-shadow) outline-none ${phone ? "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[20px] border-t" : "inset-y-0 right-0 w-[420px] max-w-full border-l"}`}
      >
        <div className="flex items-start gap-3.5 border-b border-(--ap-line-2) p-5">
          {inline ? (
            <span aria-hidden="true" className="flex w-[64px] shrink-0 flex-col items-center rounded-2xl bg-(--ap-tint) py-2 text-(--ap-violet)">
              <span className="text-[12px] font-bold tracking-[.08em] uppercase">{day.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="font-serif text-[34px] leading-none font-bold">{day.getDate()}</span>
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[18px] leading-tight font-bold">{fmtDayLong(day)}</h2>
            <p className="mt-0.5 text-[13px] text-(--ap-muted)">{items.length === 0 ? "Nothing planned" : `${items.length} planned`}</p>
            {inline ? <p className="text-[12px] text-(--ap-faint)">Day {dayOfYear(day)}, Week {isoWeekOf(day)}</p> : null}
          </div>
          {inline ? null : (
            <button type="button" onClick={onClose} aria-label="Close" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={inline ? "p-5" : "min-h-0 flex-1 overflow-y-auto p-5"}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-(--ap-violet) text-white">
                <Calendar className="size-6" />
              </span>
              <p className="text-[17px] font-bold">Nothing planned for this day</p>
              <Link href={scheduleHref} className="ap-btn ap-btn-p h-11 text-white!">
                Schedule interview
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <section key={g.p} aria-label={PART_LABEL[g.p]}>
                  <h3 className="mb-2 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{PART_LABEL[g.p]}</h3>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {g.list.map((x) => {
                      const Icon = iconOf(x.type.id);
                      const who = (x.e.people ?? []).map((p) => p.name).join(", ");
                      return (
                        <li key={x.e.id} style={toneStyle(x.type.tone)} className="flex gap-3 rounded-2xl border border-(--ap-line) p-3.5">
                          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--ev)] text-white">
                            <Icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-(--ap-muted) tabular-nums">{x.allDay ? "All day" : `${clock(x.s)} to ${clock(x.t)}`}</p>
                            <p className="flex items-start gap-1.5 text-[15px] leading-snug font-bold break-words">
                              {x.e.title}
                              {x.e.attention ? <AttentionBadge className="mt-0.5 size-4" halo={false} /> : null}
                            </p>
                            <p className="text-[13px] text-(--ap-ink-2)">{[x.type.label, x.e.subtitle].filter(Boolean).join(", ")}</p>
                            {who ? <p className="text-[13px] text-(--ap-muted)">With {who}</p> : null}
                            {x.e.href ? (
                              <Link href={x.e.href} className="ap-btn ap-btn-s ap-btn-sm mt-2.5">
                                {x.e.hrefLabel ?? "Open"}
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <Link href={scheduleHref} className="ap-btn ap-btn-s h-11 justify-center">
                Schedule interview
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** "Today (3)": the selected day's plan, directly under the grid, as compact rows. */
export function DayAgenda({ day, today, events, types, scheduleHref }: { day: Date; today: Date; events: CalendarEvent[]; types: CalendarEventType[]; scheduleHref: string }) {
  const items = onDay(prepare(events, types), day).sort((a, b) => a.s - b.s);
  const label = sameDay(day, today) ? "Today" : fmtDayLong(day);
  return (
    <section aria-label={`Plan for ${fmtDayLong(day)}`} className="mt-5 border-t border-(--ap-line-2) pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-baseline gap-2 text-[17px] font-bold text-(--ap-ink)">
          {label}
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-(--ap-tint) px-1.5 text-[13px] font-bold text-(--ap-violet)">{items.length}</span>
        </h3>
        <Link href={scheduleHref} aria-label="Schedule an interview" className="ap-btn ap-btn-s ap-btn-sm size-10 p-0">
          <Plus className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-(--ap-tint-soft) px-4 py-5 text-center text-[14px] text-(--ap-muted)">Nothing planned for this day.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((x) => {
            const Icon = iconOf(x.type.id);
            const inner = (
              <>
                <span aria-hidden="true" style={toneStyle(x.type.tone)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--ev)] text-white">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-(--ap-ink)">{x.e.title}</span>
                  <span className="block truncate text-[13px] text-(--ap-muted)">
                    {x.allDay ? "All day" : `${clock(x.s)} to ${clock(x.t)}`}
                    {x.e.subtitle ? `, ${x.e.subtitle}` : ""}
                  </span>
                </span>
                {x.e.attention ? <AttentionBadge className="size-5" halo={false} /> : <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />}
              </>
            );
            return (
              <li key={x.e.id}>
                {x.e.href ? (
                  <Link href={x.e.href} className="flex items-center gap-3 rounded-2xl border border-(--ap-line) px-3.5 py-2.5 transition-colors hover:bg-(--ap-tint-soft)">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-(--ap-line) px-3.5 py-2.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Right column: a bold "needs you" card and a short "coming up" list. */
export function SideCards({ today, events, types, scheduleHref }: { today: Date; events: CalendarEvent[]; types: CalendarEventType[]; scheduleHref: string }) {
  const all = prepare(events, types).sort((a, b) => a.s - b.s);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const upcoming = all.filter((x) => x.t >= start);
  const attention = upcoming.filter((x) => x.e.attention).slice(0, 3);
  const next = upcoming.filter((x) => !x.e.attention).slice(0, 5);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-label="Needs your attention" className="relative overflow-hidden rounded-[22px] bg-[image:var(--ap-gradient)] bg-(--admin-primary,#8b2252) p-5 text-white shadow-(--ap-shadow)">
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-10 size-36 rounded-full border border-white/20" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-4 size-20 rounded-full border border-white/20" />
        <h3 className="text-[17px] font-bold">{attention.length ? "Needs your attention" : "You are all caught up"}</h3>
        {attention.length === 0 ? (
          <p className="mt-1 text-[14px] text-white/80">Nothing on the calendar needs action right now.</p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
            {attention.map((x) => (
              <li key={x.e.id} className="rounded-2xl bg-white/12 px-3.5 py-2.5">
                <p className="text-[12px] font-semibold text-white/75">{fmtDayLong(new Date(x.s))}</p>
                <p className="text-[15px] font-bold">{x.e.title}</p>
                {x.e.href ? (
                  <Link href={x.e.href} className="mt-1.5 inline-flex h-8 items-center rounded-full bg-(--cal-gold) px-3.5 text-[13px] font-bold text-(--cal-gold-ink)">
                    {x.e.hrefLabel ?? "Open"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Coming up" className="ap-card rounded-[22px] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-(--ap-ink)">Coming up</h3>
          <Link href={scheduleHref} className="text-[13px] font-bold text-(--ap-violet)">Schedule</Link>
        </div>
        {next.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">Nothing else is planned.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {next.map((x) => (
              <li key={x.e.id} className="flex items-center gap-3">
                <span aria-hidden="true" className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-(--ap-tint) py-1 text-(--ap-violet)">
                  <span className="text-[11px] font-bold uppercase">{new Date(x.s).toLocaleDateString("en-GB", { month: "short" })}</span>
                  <span className="text-[17px] leading-none font-bold">{new Date(x.s).getDate()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-(--ap-ink)">{x.e.title}</span>
                  <span className="block truncate text-[12px] text-(--ap-muted)">{x.allDay ? "All day" : clock(x.s)}, {x.type.label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
