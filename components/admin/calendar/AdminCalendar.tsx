"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { DatePicker } from "@/components/applicant/form-fields";
import { ChevronLeft, ChevronRight } from "@/components/applicant/icons";
import type { CalendarEvent, CalendarEventType } from "@/lib/admin/calendar/types";
import { AgendaList } from "./AgendaView";
import { addDays, addMonths, dayKey, fmtDayLong, fmtMonth, fmtWeekRange, isoWeek, parseKey, sameDay, sameMonth, startOfDay, startOfWeek } from "./dates";
import type { CalCtx, CalendarView, RenderEventContext } from "./EventChip";
import { useLayout, useNow } from "./hooks";
import { Legend } from "./Legend";
import { MiniMonth } from "./MiniMonth";
import { findConflicts, onDay, prepare, type Ev } from "./model";
import { MonthView } from "./MonthView";
import { DayListCard, DetailCard, HoverCard, rectOf } from "./Popovers";
import { TimeGrid } from "./TimeGrid";
import { DayHeading, DayTimeline, WeekEmpty, WeekStrip } from "./TimelineView";

export type { CalendarView, RenderEventContext };

export interface AdminCalendarProps {
  /** All events to place. Filtering by client / person is the caller's job; type visibility is handled here. */
  events: CalendarEvent[];
  /** Configurable event types (label, colour tone, whether movable). */
  types: CalendarEventType[];
  view: CalendarView;
  /** The selected day. The visible month / week / day follows it. */
  date: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  /** Called when an event is activated (click / Enter). */
  onEventClick?: (event: CalendarEvent) => void;
  /** Set false to skip the built-in detail card and handle onEventClick yourself. Default true. */
  detail?: boolean;
  /** Click or drag on an empty slot (week / day), or double-click a month cell. */
  onSlotCreate?: (start: Date, end: Date) => void;
  /** Drag-to-move / resize finished. Only types with movable = true can be changed. ISO strings. */
  onEventChange?: (event: CalendarEvent, start: string, end: string) => void;
  /** Replace the chip / block contents. The kit still draws the coloured surface, edge and hover. */
  renderEvent?: (event: CalendarEvent, ctx: RenderEventContext) => ReactNode;
  /** Extra content under the legend in the desktop side panel. */
  sidePanelExtra?: ReactNode;
  /** Visible hours of the time grid. Default [6, 22]. */
  hours?: [number, number];
  /** Dims the grid while new data loads. */
  loading?: boolean;
  /** Controlled type visibility (ids to hide). Omit for internal state. */
  /** Pill button shown in the empty-day / empty-week message of Week and Day (e.g. "Schedule interview"). Omit to hide it. */
  emptyAction?: ReactNode;
  /** "none" hides the toolbar, legend and side panel so a page can supply its own chrome. Default "full". */
  chrome?: "full" | "none";
  hiddenTypeIds?: string[];
  onHiddenTypeIdsChange?: (ids: string[]) => void;
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "agenda", label: "Agenda" },
];

type Pop = { kind: "detail"; x: Ev; anchor: ReturnType<typeof rectOf>; opener: HTMLElement } | { kind: "day"; day: Date; title?: string; list: Ev[]; anchor: ReturnType<typeof rectOf>; opener: HTMLElement };

export function AdminCalendar(props: AdminCalendarProps) {
  const { events, types, view, date, onViewChange, onDateChange, onEventClick, detail = true, onSlotCreate, onEventChange, renderEvent, sidePanelExtra, emptyAction, hours = [6, 22], loading = false, chrome = "full" } = props;
  const bare = chrome === "none";
  const layout = useLayout();
  const now = useNow();
  const today = useMemo(() => startOfDay(new Date(now)), [now]);
  const root = useRef<HTMLDivElement>(null);

  /* ---------- data ---------- */
  const all = useMemo(() => prepare(events, types), [events, types]);
  const [ownHidden, setOwnHidden] = useState<string[]>([]);
  const hiddenIds = props.hiddenTypeIds ?? ownHidden;
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const toggleType = (id: string) => {
    const next = hidden.has(id) ? hiddenIds.filter((x) => x !== id) : [...hiddenIds, id];
    if (props.onHiddenTypeIdsChange) props.onHiddenTypeIdsChange(next);
    else setOwnHidden(next);
  };
  const items = useMemo(() => all.filter((x) => !hidden.has(x.type.id)), [all, hidden]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of all) c[x.type.id] = (c[x.type.id] ?? 0) + 1;
    return c;
  }, [all]);
  const conflicts = useMemo(() => findConflicts(items), [items]);

  /* ---------- popovers ---------- */
  const [pop, setPop] = useState<Pop | null>(null);
  const [hover, setHover] = useState<{ x: Ev; anchor: ReturnType<typeof rectOf> } | null>(null);
  const hoverTimer = useRef<number | null>(null);
  useEffect(() => () => void (hoverTimer.current && window.clearTimeout(hoverTimer.current)), []);
  const phone = layout === "phone";

  const popRef = useRef<Pop | null>(null);
  const openPop = (p: Pop) => {
    popRef.current = p;
    setPop(p);
  };
  const closePop = useCallback(() => {
    const p = popRef.current;
    popRef.current = null;
    setPop(null);
    if (p?.opener && document.contains(p.opener)) p.opener.focus({ preventScroll: true });
  }, []);

  const ctx: CalCtx = {
    conflicts,
    view,
    selectedId: pop?.kind === "detail" ? pop.x.e.id : null,
    renderEvent,
    onOpen: (x, el) => {
      onEventClick?.(x.e);
      setHover(null);
      if (detail) openPop({ kind: "detail", x, anchor: rectOf(el), opener: popRef.current?.kind === "day" ? popRef.current.opener : el });
    },
    onHover: (x, el) => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      if (!x || !el || phone || pop) return setHover(null);
      hoverTimer.current = window.setTimeout(() => setHover({ x, anchor: rectOf(el) }), 320);
    },
  };

  /* ---------- navigation ---------- */
  const go = (d: Date) => onDateChange(d);
  const step = (dir: -1 | 1) => go(view === "month" ? addMonths(date, dir) : view === "week" ? addDays(date, 7 * dir) : view === "day" ? addDays(date, dir) : addDays(date, 7 * dir));
  const unit = view === "agenda" ? "week" : view;
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const title =
    view === "month" ? fmtMonth(date) : view === "week" ? fmtWeekRange(weekDays[0], weekDays[6]) : view === "day" ? `${fmtDayLong(date)} ${date.getFullYear()}` : `From ${fmtDayLong(date)}`;
  const sub = view === "week" ? `Week ${isoWeek(date)}` : view === "agenda" ? "Next 30 days" : "";
  const isCurrent = view === "month" ? sameMonth(date, today) : view === "week" ? sameDay(weekStart, startOfWeek(today)) : sameDay(date, today);

  const [nav, setNav] = useState<{ for: string; month: Date } | null>(null);
  const navMonth = nav && nav.for === dayKey(date) ? nav.month : date;

  /* ---------- keyboard: arrows between days, Enter opens ---------- */
  const focusKey = useRef<string | null>(null);
  useEffect(() => {
    if (!focusKey.current) return;
    const el = root.current?.querySelector<HTMLElement>(`[data-day="${focusKey.current}"]`);
    focusKey.current = null;
    el?.focus({ preventScroll: true });
  }, [date, view]);
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    const cell = t.closest<HTMLElement>("[data-day]");
    if (!cell || t.closest("[data-ev]") || e.altKey || e.ctrlKey || e.metaKey || (t !== cell && !(t instanceof HTMLButtonElement && t.dataset.day))) return;
    const cur = parseKey(cell.dataset.day!);
    const vertical = view === "month";
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowLeft": next = addDays(cur, -1); break;
      case "ArrowRight": next = addDays(cur, 1); break;
      case "ArrowUp": if (vertical) next = addDays(cur, -7); break;
      case "ArrowDown": if (vertical) next = addDays(cur, 7); break;
      case "PageUp": next = addMonths(cur, -1); break;
      case "PageDown": next = addMonths(cur, 1); break;
      case "Home": next = startOfWeek(cur); break;
      case "End": next = addDays(startOfWeek(cur), 6); break;
      case "Enter":
      case " ":
        if (t === cell) {
          e.preventDefault();
          go(cur);
          onViewChange("day");
        }
        return;
      default: return;
    }
    if (next) {
      e.preventDefault();
      focusKey.current = dayKey(next);
      go(next);
    }
  };

  /* ---------- derived views ---------- */
  const create = onSlotCreate;
  const monthCreate = create ? (d: Date) => create(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10)) : undefined;
  const openDay = (d: Date) => {
    go(d);
    onViewChange("day");
  };
  const onMore = (d: Date, list: Ev[], el: HTMLElement) => openPop({ kind: "day", day: d, list, anchor: rectOf(el), opener: el });
  const agendaDays = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(date), i));
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const empty = items.length === 0;

  const legendWrap = (
    <Legend types={types} counts={counts} hidden={hidden} onToggle={toggleType} layout="wrap" />
  );
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoursOn, setHoursOn] = useState(false);

  const sidePanel = layout === "desktop" && !bare;
  const body = (() => {
    if (phone) {
      const dayList = <AgendaList days={[startOfDay(date)]} items={items} today={today} ctx={ctx} showEmpty emptyText="Nothing scheduled on this day." />;
      if (view === "agenda") return <AgendaList days={agendaDays} items={items} today={today} ctx={ctx} emptyText="Nothing scheduled in the next 30 days." />;
      if (view === "day") {
        return (
          <div
            className="flex flex-col gap-3"
            onTouchStart={(e) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              const s = swipe.current;
              swipe.current = null;
              if (!s) return;
              const dx = e.changedTouches[0].clientX - s.x;
              const dy = e.changedTouches[0].clientY - s.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
            }}
          >
            {dayList}
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-4">
          <MiniMonth variant="phone" month={date} selected={date} today={today} items={items} weekOnly={view === "week"} onSelect={go} onStep={step} />
          {dayList}
        </div>
      );
    }
    if (view === "month") {
      return <MonthView month={date} selected={date} today={today} items={items} ctx={ctx} maxChips={layout === "desktop" ? 3 : 2} onSelect={go} onOpenDay={openDay} onMore={onMore} onCreate={monthCreate} />;
    }
    if (view === "agenda") return <AgendaList days={agendaDays} items={items} today={today} ctx={ctx} emptyText="Nothing scheduled in the next 30 days." />;
    const onGroup = (d: Date, list: Ev[], title: string, el: HTMLElement) => openPop({ kind: "day", day: d, title, list, anchor: rectOf(el), opener: el });
    if (view === "week" || (view === "day" && !hoursOn)) {
      const dayCount = onDay(items, date).length;
      const weekEmpty = view === "week" && weekDays.every((d) => onDay(items, d).length === 0);
      return (
        <div>
          {view === "week" ? <WeekStrip days={weekDays} selected={date} today={today} items={items} onSelect={go} /> : null}
          {weekEmpty ? (
            <div className="mt-4 border-t border-(--ap-line-2) pt-2">
              <WeekEmpty action={emptyAction} />
            </div>
          ) : (
          <>
          <DayHeading
            day={date}
            today={today}
            count={dayCount}
            right={
              view === "day" ? (
                <button type="button" aria-pressed={false} onClick={() => setHoursOn(true)} className="ap-btn ap-btn-s ap-btn-sm h-10">
                  Hours
                </button>
              ) : null
            }
          />
          <DayTimeline day={date} today={today} now={now} items={items} ctx={ctx} onGroup={onGroup} emptyAction={emptyAction} />
          </>
          )}
        </div>
      );
    }
    const days = [startOfDay(date)];
    return (
      <div>
        <div className="mb-3 flex justify-end">
          <button type="button" aria-pressed onClick={() => setHoursOn(false)} className="ap-btn ap-btn-s ap-btn-sm h-10">
            Hide hours
          </button>
        </div>
        <TimeGrid
          days={days}
          selected={date}
          today={today}
          now={now}
          items={items}
          ctx={ctx}
          fromH={hours[0]}
          toH={hours[1]}
          compact={layout !== "desktop"}
          onSelect={go}
          onOpenDay={openDay}
          onMore={onMore}
          onCreate={create}
          onChange={onEventChange ? (x, s, t) => onEventChange(x.e, new Date(s).toISOString(), new Date(t).toISOString()) : undefined}
        />
      </div>
    );
  })();

  return (
    <div ref={root} onKeyDown={onKeyDown} className="min-w-0" aria-busy={loading}>
      {/* toolbar */}
      {bare ? null : (
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <button type="button" onClick={() => go(today)} disabled={isCurrent} className="ap-btn ap-btn-s ap-btn-sm h-10">
          Today
        </button>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => step(-1)} aria-label={`Previous ${unit}`} className="ap-btn ap-btn-s ap-btn-sm size-10 p-0">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label={`Next ${unit}`} className="ap-btn ap-btn-s ap-btn-sm size-10 p-0">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <h3 className="text-[17px] leading-tight font-bold text-(--ap-ink)" aria-live="polite">
            {title}
          </h3>
          <p className="text-[12px] text-(--ap-muted)">
            {sub ? `${sub}, ` : ""}Africa/Lagos (WAT)
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-(--ap-muted) max-[767px]:order-last max-[767px]:w-full">
          <span className="max-[767px]:min-w-[92px]">Jump to date</span>
          <div className="w-[170px] max-[767px]:flex-1">
            <DatePicker id="cal-jump" value={dayKey(date)} onChange={(v) => v && go(parseKey(v))} title="Jump to date" />
          </div>
        </div>
        <div role="group" aria-label="Calendar view" className="flex rounded-xl border border-(--ap-line) p-1 max-[767px]:w-full">
          {VIEWS.map((v) => {
            const on = v.key === view;
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={on}
                onClick={() => onViewChange(v.key)}
                className={`h-8 flex-1 rounded-lg px-3.5 text-[13px] font-bold transition-colors motion-reduce:transition-none ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-muted) hover:text-(--ap-ink)"}`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      )}

      {layout !== "desktop" && !bare ? (
        <div className="mb-3">
          {phone ? (
            <button type="button" aria-expanded={legendOpen} onClick={() => setLegendOpen((v) => !v)} className="ap-hit text-[13px] font-bold text-(--ap-violet)">
              {legendOpen ? "Hide event types" : `Event types (${types.length - hidden.size} shown)`}
            </button>
          ) : null}
          {!phone || legendOpen ? <div className={phone ? "mt-2" : ""}>{legendWrap}</div> : null}
        </div>
      ) : null}

      <div className={sidePanel ? "grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5" : ""}>
        {sidePanel ? (
          <aside aria-label="Calendar navigator" className="flex flex-col gap-5">
            <MiniMonth variant="side" month={navMonth} selected={date} today={today} items={items} onSelect={go} onMonthChange={(dir) => setNav({ for: dayKey(date), month: addMonths(navMonth, dir) })} />
            <div>
              <h4 className="mb-1.5 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">Event types</h4>
              <Legend types={types} counts={counts} hidden={hidden} onToggle={toggleType} layout="list" />
            </div>
            {sidePanelExtra}
          </aside>
        ) : null}
        <div className={`min-w-0 transition-opacity motion-reduce:transition-none ${loading ? "opacity-60" : ""}`}>
          {empty && all.length > 0 ? <p className="mb-3 rounded-xl bg-(--ap-tint-soft) px-3 py-2 text-[13px] text-(--ap-muted)">Every event type is hidden. Turn a type back on to see events.</p> : null}
          {body}
        </div>
      </div>

      {hover && !pop ? <HoverCard x={hover.x} anchor={hover.anchor} /> : null}
      {pop?.kind === "detail" ? <DetailCard x={pop.x} anchor={pop.anchor} phone={phone} conflict={conflicts.has(pop.x.e.id)} onClose={closePop} /> : null}
      {pop?.kind === "day" ? <DayListCard day={pop.day} title={pop.title} items={pop.list} anchor={pop.anchor} phone={phone} ctx={ctx} onClose={closePop} /> : null}
    </div>
  );
}
