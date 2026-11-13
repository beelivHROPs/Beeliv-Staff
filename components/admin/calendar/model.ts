/** Calendar kit internals: normalised events, tone tokens, side-by-side overlap layout and conflict detection. */
import type { CSSProperties } from "react";
import type { CalendarEvent, CalendarEventType, CalendarTone } from "@/lib/admin/calendar/types";
import { DAY_MS, MIN, addDays, startOfDay } from "./dates";

/** A normalised event: epoch ms, its type resolved, and whether it belongs in the all-day row. */
export interface Ev {
  e: CalendarEvent;
  type: CalendarEventType;
  s: number;
  t: number;
  allDay: boolean;
}

const FALLBACK_TYPE: CalendarEventType = { id: "other", label: "Other", tone: "ink", movable: false };

export function prepare(events: CalendarEvent[], types: CalendarEventType[]): Ev[] {
  const byId = new Map(types.map((t) => [t.id, t]));
  return events
    .map((e) => {
      const s = new Date(e.start).getTime();
      let t = new Date(e.end).getTime();
      if (!(t > s)) t = s + 30 * MIN;
      return { e, type: byId.get(e.typeId) ?? FALLBACK_TYPE, s, t, allDay: !!e.allDay || t - s >= DAY_MS };
    })
    .filter((x) => Number.isFinite(x.s))
    .sort((a, b) => a.s - b.s || b.t - a.t);
}

/** Events touching the given local day. */
export function onDay(list: Ev[], day: Date): Ev[] {
  const a = startOfDay(day).getTime();
  const b = addDays(day, 1);
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return list.filter((x) => x.s < end && x.t > a);
}

/**
 * Tone -> one CSS variable, `--ev`. Chips derive tint, edge and text from it with
 * color-mix against the surface / ink tokens, so every tone adapts to light and
 * dark mode. Red is deliberately NOT a tone: attention uses AttentionBadge only.
 */
const ACCENT: Record<CalendarTone, string> = {
  violet: "var(--ap-violet)",
  plum: "color-mix(in srgb, var(--ap-violet) 55%, var(--ap-gold))",
  green: "var(--ap-ok)",
  teal: "color-mix(in srgb, var(--ap-ok) 55%, var(--ap-gold))",
  amber: "var(--ap-warn)",
  gold: "var(--ap-gold)",
  slate: "var(--ap-muted)",
  ink: "var(--ap-ink-2)",
};
export const toneStyle = (tone: CalendarTone): CSSProperties => ({ ["--ev" as string]: ACCENT[tone] });

/** Classes shared by every event surface (chip, block, dot). */
export const TINT = "bg-[color-mix(in_srgb,var(--ev)_16%,var(--ap-surface))]";
export const EDGE = "border-l-[3px] border-l-[color:var(--ev)]";
export const INK = "text-[color-mix(in_srgb,var(--ev)_70%,var(--ap-ink))]";

export interface Placed {
  ev: Ev;
  /** Minutes from the top of the grid. */
  top: number;
  height: number;
  col: number;
  cols: number;
}

/** Lay out one day's timed events inside [fromH, toH]; overlapping events sit side by side. */
export function layoutDay(items: Ev[], day: Date, fromH: number, toH: number): Placed[] {
  const d0 = startOfDay(day).getTime();
  const gridMins = (toH - fromH) * 60;
  const rows = items
    .filter((x) => !x.allDay)
    .map((ev) => {
      let top = (ev.s - d0) / MIN - fromH * 60;
      let end = (ev.t - d0) / MIN - fromH * 60;
      top = Math.max(0, Math.min(top, gridMins - 20));
      end = Math.min(gridMins, Math.max(end, top + 20));
      return { ev, top, end: Math.max(end, top + 20) };
    })
    .sort((a, b) => a.top - b.top || b.end - a.end);

  const placed: Placed[] = [];
  let cluster: { p: Placed; end: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const c of cluster) c.p.cols = colEnds.length;
    cluster = [];
    colEnds = [];
  };
  for (const r of rows) {
    if (r.top >= clusterEnd && cluster.length) flush();
    let col = colEnds.findIndex((end) => end <= r.top);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(r.end);
    } else colEnds[col] = r.end;
    const p: Placed = { ev: r.ev, top: r.top, height: r.end - r.top, col, cols: 1 };
    placed.push(p);
    cluster.push({ p, end: r.end });
    clusterEnd = cluster.length === 1 ? r.end : Math.max(clusterEnd, r.end);
  }
  flush();
  return placed;
}

/** Ids of timed events that overlap another event with a person in common (double-booked). */
export function findConflicts(list: Ev[]): Set<string> {
  const byPerson = new Map<string, Ev[]>();
  for (const x of list) {
    if (x.allDay) continue;
    for (const p of x.e.people ?? []) byPerson.set(p.id, [...(byPerson.get(p.id) ?? []), x]);
  }
  const out = new Set<string>();
  for (const group of byPerson.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (a.s < b.t && b.s < a.t && a.e.id !== b.e.id) {
          out.add(a.e.id);
          out.add(b.e.id);
        }
      }
    }
  }
  return out;
}

/** Would the proposed time overlap another event that shares a person with this one? */
export function wouldConflict(list: Ev[], ev: Ev, s: number, t: number): boolean {
  const ids = new Set((ev.e.people ?? []).map((p) => p.id));
  if (ids.size === 0) return false;
  return list.some((o) => !o.allDay && o.e.id !== ev.e.id && (o.e.people ?? []).some((p) => ids.has(p.id)) && o.s < t && s < o.t);
}
