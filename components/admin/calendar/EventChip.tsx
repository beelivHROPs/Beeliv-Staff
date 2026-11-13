"use client";

import type { CSSProperties, ReactNode } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import type { CalendarEvent, CalendarEventType } from "@/lib/admin/calendar/types";
import { clock, initials } from "./dates";
import { EDGE, INK, TINT, toneStyle, type Ev } from "./model";

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface RenderEventContext {
  view: CalendarView;
  type: CalendarEventType;
  /** True for small surfaces (month chips, narrow time-grid blocks). */
  compact: boolean;
  conflict: boolean;
}

/** Shared by every surface so chips, blocks and agenda rows behave the same. */
export interface CalCtx {
  conflicts: Set<string>;
  view: CalendarView;
  selectedId: string | null;
  onOpen: (ev: Ev, el: HTMLElement) => void;
  onHover: (ev: Ev | null, el?: HTMLElement) => void;
  renderEvent?: (event: CalendarEvent, ctx: RenderEventContext) => ReactNode;
}

export const timeText = (x: Ev) => (x.allDay ? "All day" : `${clock(x.s)} to ${clock(x.t)}`);
export const startText = (x: Ev) => (x.allDay ? "" : clock(x.s));

export function ariaOf(x: Ev, conflict: boolean) {
  return `${x.allDay ? "All day" : clock(x.s)}, ${x.e.title}, ${x.type.label}${x.e.subtitle ? `, ${x.e.subtitle}` : ""}${conflict ? ", double-booked" : ""}${x.e.attention ? ", needs attention" : ""}`;
}

export function hoverProps(ctx: CalCtx, x: Ev) {
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => e.pointerType === "mouse" && ctx.onHover(x, e.currentTarget),
    onPointerLeave: () => ctx.onHover(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => ctx.onHover(x, e.currentTarget),
    onBlur: () => ctx.onHover(null),
  };
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--ev)] text-[11px] leading-none font-bold text-white ${className}`}>
      {initials(name)}
    </span>
  );
}

/** One-line chip: month cells, all-day row, day popover. */
export function LineChip({ x, ctx, className = "" }: { x: Ev; ctx: CalCtx; className?: string }) {
  const conflict = ctx.conflicts.has(x.e.id);
  const person = x.e.people?.[0];
  const cancelled = x.e.status === "Cancelled";
  return (
    <button
      type="button"
      data-ev={x.e.id}
      aria-label={ariaOf(x, conflict)}
      aria-haspopup="dialog"
      onClick={(e) => ctx.onOpen(x, e.currentTarget)}
      {...hoverProps(ctx, x)}
      style={toneStyle(x.type.tone) as CSSProperties}
      className={`@container flex min-h-[26px] w-full min-w-0 items-center gap-1.5 rounded-lg py-1 pr-1.5 pl-2 text-left text-[12px] leading-tight transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet) ${TINT} ${EDGE} ${INK} ${conflict ? "outline-1 outline-dashed outline-offset-0 outline-(--ap-warn)" : ""} ${ctx.selectedId === x.e.id ? "ring-2 ring-(--ev)" : ""} ${cancelled ? "opacity-60" : ""} ${className}`}
    >
      {ctx.renderEvent ? (
        ctx.renderEvent(x.e, { view: ctx.view, type: x.type, compact: true, conflict })
      ) : (
        <>
          {!x.allDay ? <b className="shrink-0 tabular-nums">{clock(x.s)}</b> : null}
          <span title={x.e.title} className={`min-w-0 flex-1 font-semibold [overflow-wrap:normal] truncate ${cancelled ? "line-through" : ""}`}>{x.e.title}</span>
          {x.e.attention || conflict ? <AttentionBadge className="size-3.5" halo={false} /> : null}
          {person ? <Avatar name={person.name} className="hidden @min-[170px]:inline-flex" /> : null}
        </>
      )}
    </button>
  );
}

/** The coloured square used in legends, mini-month dots and agenda rows. */
export function Dot({ tone, className = "" }: { tone: CalendarEventType["tone"]; className?: string }) {
  return <span aria-hidden="true" style={toneStyle(tone)} className={`inline-block size-2.5 shrink-0 rounded-full bg-[color:var(--ev)] ${className}`} />;
}
