"use client";

/**
 * DayTimeline: a 5-day strip plus a one-day agenda timeline (time column, rail, dot, one card per event).
 * Shared so Admin Calendar, Staff Schedule and Client Schedules can reuse it. Presentation only: the
 * caller supplies days and events. Swiping the strip (or the optional prev/next) moves the window.
 */
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import "./schedule.css";

export interface TimelineDay {
  key: string;
  /** Short weekday, e.g. "Mon". */
  dow: string;
  num: number;
  count: number;
}

export interface TimelineEvent {
  id: string;
  /** Left-column label, e.g. "10:00" or "All day". */
  time: string;
  title: string;
  meta?: string;
  /** Face/icon circle colour (any CSS colour). */
  tone: string;
  /** Initials or short text inside the circle. */
  face: string;
  /** ONE status pill. */
  status?: { label: string; kind: "ok" | "wait" | "bad" };
  href?: string | null;
  /** Instead of href: the card is a button that opens something in place. */
  onOpen?: () => void;
  /** Shared initials palette slot (data-av, see AdminAvatar); overrides `tone` on Admin phones. */
  av?: number;
  /** The next / needs-action card gets the tinted gradient. */
  highlight?: boolean;
}

export function DayTimeline({ days, selected, events, onSelectDay, onShift, between, empty, wrap = false }: { /** Names and titles wrap instead of being cut with an ellipsis. */ wrap?: boolean; days: TimelineDay[]; selected: string; events: TimelineEvent[]; onSelectDay: (key: string) => void; onShift?: (dir: -1 | 1) => void; /** Rendered between the strip and the timeline (count chips, section heading). */ between?: ReactNode; /** Shown instead of the timeline when there are no events. */ empty?: ReactNode }) {
  const x0 = useRef<number | null>(null);
  const end = (x: number) => {
    if (x0.current === null) return;
    const dx = x - x0.current;
    x0.current = null;
    if (Math.abs(dx) < 50) return;
    if (onShift) onShift(dx < 0 ? 1 : -1);
  };
  return (
    <div className={wrap ? "dt dt-wrap" : "dt"}>
      <div className="dt-strip" role="group" aria-label="Days" onTouchStart={(e) => (x0.current = e.touches[0].clientX)} onTouchEnd={(e) => end(e.changedTouches[0].clientX)}>
        {days.map((d) => (
          <button key={d.key} type="button" className={`dt-day${d.key === selected ? " on" : ""}`} aria-pressed={d.key === selected} aria-label={`${d.dow} ${d.num}${d.count ? `, ${d.count} planned` : ""}`} onClick={() => onSelectDay(d.key)}>
            {d.dow}
            <b>{d.num}</b>
            {d.count > 0 ? <i aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {between}
      {events.length === 0 ? (
        <div>{empty}</div>
      ) : (
        <ol className="dt-tl">
          {events.map((ev) => {
            const inner = (
              <>
                <span className="dt-face" data-av={ev.av} style={{ background: ev.tone }} aria-hidden="true">{ev.face}</span>
                <span className="dt-body">
                  <b>{ev.title}</b>
                  {ev.meta ? <span>{ev.meta}</span> : null}
                </span>
                {ev.status ? <span className={`dt-pill ${ev.status.kind}`}>{ev.status.label}</span> : null}
              </>
            );
            return (
              <li key={ev.id} className="dt-ev">
                <time>{ev.time}</time>
                {ev.onOpen ? <button type="button" onClick={ev.onOpen} className={`dt-card dt-btn${ev.highlight ? " tint" : ""}`}>{inner}</button> : ev.href ? <Link href={ev.href} className={`dt-card${ev.highlight ? " tint" : ""}`}>{inner}</Link> : <div className={`dt-card${ev.highlight ? " tint" : ""}`}>{inner}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
