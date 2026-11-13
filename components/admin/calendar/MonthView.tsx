"use client";

import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { WEEKDAYS, dayKey, fmtDayLong, isoWeek, monthWeeks, sameDay, sameMonth } from "./dates";
import { LineChip, type CalCtx } from "./EventChip";
import { onDay, type Ev } from "./model";

/**
 * Month grid (tablet / desktop). Each day lists its events as chips; days with
 * more than fit show "+n more", which opens a list. One roving tab stop (the
 * selected day), arrow keys move between days (handled by AdminCalendar).
 */
export function MonthView({
  month,
  selected,
  today,
  items,
  ctx,
  maxChips,
  onSelect,
  onOpenDay,
  onMore,
  onCreate,
}: {
  month: Date;
  selected: Date;
  today: Date;
  items: Ev[];
  ctx: CalCtx;
  maxChips: number;
  onSelect: (d: Date) => void;
  onOpenDay: (d: Date) => void;
  onMore: (d: Date, list: Ev[], el: HTMLElement) => void;
  onCreate?: (d: Date) => void;
}) {
  const weeks = monthWeeks(month);
  return (
    <div role="grid" aria-label={`Month view, ${month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`} className="min-w-0 overflow-hidden rounded-xl border border-(--ap-line)">
      <div role="row" className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] border-b border-(--ap-line) bg-(--ap-tint-soft)">
        <span role="columnheader" className="py-2 text-center text-[11px] font-bold text-(--ap-muted)" title="ISO week number">
          Wk
        </span>
        {WEEKDAYS.map((w) => (
          <span key={w} role="columnheader" className="py-2 text-center text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
            {w}
          </span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={dayKey(week[0])} role="row" className={`grid grid-cols-[32px_repeat(7,minmax(0,1fr))] ${wi > 0 ? "border-t border-(--ap-line)" : ""}`}>
          <span className="flex items-start justify-center pt-2.5 text-[11px] font-semibold text-(--ap-faint) tabular-nums" aria-label={`Week ${isoWeek(week[0])}`}>
            {isoWeek(week[0])}
          </span>
          {week.map((d) => {
            const list = onDay(items, d);
            const inMonth = sameMonth(d, month);
            const isToday = sameDay(d, today);
            const isSel = sameDay(d, selected);
            const overflow = list.length > maxChips;
            const shown = overflow ? list.slice(0, maxChips - 1) : list;
            const hidden = list.length - shown.length;
            const needs = list.some((x) => x.e.attention);
            return (
              <div
                key={dayKey(d)}
                role="gridcell"
                data-day={dayKey(d)}
                tabIndex={isSel ? 0 : -1}
                aria-selected={isSel}
                aria-label={`${fmtDayLong(d)}, ${list.length} event${list.length === 1 ? "" : "s"}`}
                onClick={(e) => e.target === e.currentTarget && onSelect(d)}
                onDoubleClick={(e) => e.target === e.currentTarget && onCreate?.(d)}
                className={`@container flex min-h-[104px] min-w-0 flex-col gap-1 border-l border-(--ap-line) p-1.5 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-inset ${isSel ? "bg-(--ap-tint)" : inMonth ? "" : "bg-(--ap-tint-soft)"}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => onOpenDay(d)}
                    aria-label={`Open ${fmtDayLong(d)}`}
                    className={`flex size-7 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${
                      isToday ? "bg-(--ap-violet) text-white" : inMonth ? "text-(--ap-ink) hover:bg-(--ap-line-2)" : "text-(--ap-faint) hover:bg-(--ap-line-2)"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                  {needs ? <AttentionBadge className="size-4" halo={false} /> : null}
                </div>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  {shown.map((x) => (
                    <LineChip key={x.e.id} x={x} ctx={ctx} />
                  ))}
                  {hidden > 0 ? (
                    <button
                      type="button"
                      data-more
                      onClick={(e) => onMore(d, list, e.currentTarget)}
                      className="h-5 rounded-md px-1.5 text-left text-[12px] font-bold text-(--ap-violet) hover:bg-(--ap-line-2)"
                    >
                      +{hidden} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
