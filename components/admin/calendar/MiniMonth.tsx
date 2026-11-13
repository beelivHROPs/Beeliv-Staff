"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "@/components/applicant/icons";
import { WEEKDAYS, dayKey, fmtDayLong, fmtMonth, isoWeek, monthWeeks, sameDay, sameMonth, startOfWeek } from "./dates";
import { onDay, toneStyle, type Ev } from "./model";

/**
 * Month navigator with event dots. Two sizes:
 *  - "side": the compact navigator in the desktop side panel (own header + arrows, week numbers).
 *  - "phone": a full-width strip under the toolbar (no header; swipe left / right to step).
 * `weekOnly` shows just the selected week (phone Week view).
 */
export function MiniMonth({
  variant,
  month,
  selected,
  today,
  items,
  weekOnly = false,
  onSelect,
  onStep,
  onMonthChange,
}: {
  variant: "side" | "phone";
  month: Date;
  selected: Date;
  today: Date;
  items: Ev[];
  weekOnly?: boolean;
  onSelect: (d: Date) => void;
  /** Phone swipe: -1 previous, 1 next (a month, or a week when weekOnly). */
  onStep?: (dir: -1 | 1) => void;
  /** Side header arrows move only the navigator's month. */
  onMonthChange?: (dir: -1 | 1) => void;
}) {
  const phone = variant === "phone";
  const all = monthWeeks(month);
  const weeks = weekOnly ? [all.find((w) => w.some((d) => sameDay(d, selected))) ?? [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(startOfWeek(selected).getTime() + i * 86_400_000)) ] : all;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const selWeek = startOfWeek(selected).getTime();

  return (
    <div
      className="min-w-0"
      onTouchStart={phone ? (e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }) : undefined}
      onTouchEnd={
        phone
          ? (e) => {
              const s = touch.current;
              touch.current = null;
              if (!s) return;
              const dx = e.changedTouches[0].clientX - s.x;
              const dy = e.changedTouches[0].clientY - s.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onStep?.(dx < 0 ? 1 : -1);
            }
          : undefined
      }
    >
      {!phone ? (
        <div className="mb-2 flex items-center justify-between">
          <b className="text-[14px] text-(--ap-ink)">{fmtMonth(month)}</b>
          <span className="flex gap-1">
            <button type="button" onClick={() => onMonthChange?.(-1)} aria-label="Previous month in navigator" className="flex size-8 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onMonthChange?.(1)} aria-label="Next month in navigator" className="flex size-8 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
      <div className={`grid ${phone ? "grid-cols-7" : "grid-cols-[22px_repeat(7,minmax(0,1fr))]"} text-center`} role="grid" aria-label={`${fmtMonth(month)} navigator`}>
        {!phone ? <span aria-hidden="true" /> : null}
        {WEEKDAYS.map((w) => (
          <span key={w} aria-hidden="true" className={`pb-1 text-[11px] font-bold text-(--ap-muted) ${phone ? "uppercase" : ""}`}>
            {phone ? w : w[0]}
          </span>
        ))}
        {weeks.map((week) => (
          <div key={dayKey(week[0])} role="row" className="contents">
            {!phone ? (
              <span aria-hidden="true" className="flex items-center justify-center text-[11px] text-(--ap-faint) tabular-nums">
                {isoWeek(week[0])}
              </span>
            ) : null}
            {week.map((d) => {
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const inMonth = sameMonth(d, month);
              const inWeek = startOfWeek(d).getTime() === selWeek;
              const tones = [...new Set(onDay(items, d).map((x) => x.type.tone))].slice(0, 3);
              const count = onDay(items, d).length;
              return (
                <button
                  key={dayKey(d)}
                  type="button"
                  role="gridcell"
                  tabIndex={phone ? 0 : -1}
                  onClick={() => onSelect(d)}
                  aria-label={`${fmtDayLong(d)}, ${count} event${count === 1 ? "" : "s"}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={isSel}
                  className={`relative flex flex-col items-center justify-center gap-0.5 ${phone ? "h-12 rounded-xl" : "h-9 rounded-lg"} ${inWeek && !phone ? "bg-(--ap-tint-soft)" : ""} hover:bg-(--ap-line-2) focus-visible:outline-2 focus-visible:outline-(--ap-violet)`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full leading-none tabular-nums ${phone ? "size-8 text-[15px]" : "size-6 text-[12px]"} ${
                      isSel ? "bg-(--ap-violet) font-bold text-white" : isToday ? "font-bold text-(--ap-violet) ring-1 ring-(--ap-violet)" : inMonth ? "font-semibold text-(--ap-ink)" : "text-(--ap-faint)"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                    {tones.map((t) => (
                      <span key={t} style={toneStyle(t)} className="size-1.5 rounded-full bg-[color:var(--ev)]" />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
