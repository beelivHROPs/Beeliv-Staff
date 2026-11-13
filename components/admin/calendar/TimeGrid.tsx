"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { MIN, WEEKDAYS, clock, dayKey, fmtDayLong, isoWeek, sameDay, startOfDay } from "./dates";
import { Avatar, LineChip, ariaOf, hoverProps, type CalCtx } from "./EventChip";
import { EDGE, INK, TINT, layoutDay, onDay, toneStyle, wouldConflict, type Ev, type Placed } from "./model";

const SNAP = 15;
const snap = (m: number, step = SNAP) => Math.round(m / step) * step;

type Drag =
  | { kind: "slot"; col: number; a: number; b: number }
  | { kind: "move" | "resize"; x: Ev; startX: number; startY: number; grab: number; s: number; t: number; moved: boolean };

/**
 * Week / Day time grid: a sticky day header with an all-day row, hour rows from
 * `fromH` to `toH`, overlapping events side by side, a current-time line,
 * click / drag on an empty slot to create, drag to move and drag the bottom
 * edge to resize (mouse / pen; touch scrolls). Scrolls to "now" on open.
 */
export function TimeGrid({
  days,
  selected,
  today,
  now,
  items,
  ctx,
  fromH,
  toH,
  compact,
  onSelect,
  onOpenDay,
  onMore,
  onCreate,
  onChange,
}: {
  days: Date[];
  selected: Date;
  today: Date;
  now: number;
  items: Ev[];
  ctx: CalCtx;
  fromH: number;
  toH: number;
  compact: boolean;
  onSelect: (d: Date) => void;
  onOpenDay?: (d: Date) => void;
  onMore: (d: Date, list: Ev[], el: HTMLElement) => void;
  onCreate?: (start: Date, end: Date) => void;
  onChange?: (x: Ev, start: number, end: number) => void;
}) {
  const n = days.length;
  const hourPx = compact ? 60 : 68;
  const pxMin = hourPx / 60;
  const hours = Array.from({ length: toH - fromH }, (_, i) => fromH + i);
  const total = hours.length * hourPx;
  const gridCols: CSSProperties = { gridTemplateColumns: `var(--gutter) repeat(${n}, minmax(0, 1fr))` };

  const scroller = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppress = useRef(false);

  const dayMs = (d: Date, minutes: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, fromH * 60 + minutes).getTime();
  const placed = useMemo(() => days.map((d) => layoutDay(onDay(items, d), d, fromH, toH)), [days, items, fromH, toH]);
  const key0 = dayKey(days[0]);

  // Scroll to now (or to the working day) when the period changes.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const hasToday = days.some((d) => sameDay(d, today));
    let minute = 8 * 60;
    if (hasToday) {
      const d = new Date();
      minute = d.getHours() * 60 + d.getMinutes();
    } else {
      const firstTimed = days.flatMap((d) => onDay(items, d)).find((x) => !x.allDay);
      if (firstTimed) minute = new Date(firstTimed.s).getHours() * 60;
    }
    const target = ((minute - fromH * 60) / 60) * hourPx - 90;
    el.scrollTop = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key0, n, hourPx]);

  /* ---------- pointer plumbing ---------- */
  const geom = () => {
    const r = colsRef.current?.getBoundingClientRect();
    return r ? { left: r.left, top: r.top, w: r.width / n } : null;
  };
  const colAt = (x: number) => {
    const g = geom();
    return g ? Math.max(0, Math.min(n - 1, Math.floor((x - g.left) / g.w))) : 0;
  };
  const minuteAt = (y: number) => {
    const g = geom();
    return g ? Math.max(0, Math.min((toH - fromH) * 60, (y - g.top) / pxMin)) : 0;
  };

  const startSlot = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onCreate || e.button !== 0 || (e.target as HTMLElement).closest("[data-block]")) return;
    const m = minuteAt(e.clientY);
    const next: Drag = { kind: "slot", col: colAt(e.clientX), a: m, b: m };
    dragRef.current = next;
    setDrag(next);
  };

  const startMove = (e: React.PointerEvent, x: Ev, kind: "move" | "resize", col: number) => {
    if (!onChange || !x.type.movable || e.button !== 0 || e.pointerType === "touch") return;
    if (kind === "resize") e.stopPropagation();
    const grab = minuteAt(e.clientY) - ((x.s - dayMs(days[col], 0)) / MIN);
    const next: Drag = { kind, x, startX: e.clientX, startY: e.clientY, grab: kind === "move" ? grab : 0, s: x.s, t: x.t, moved: false };
    dragRef.current = next;
    setDrag(next);
  };

  const active = drag !== null;
  useEffect(() => {
    if (!active) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      let next: Drag = d;
      if (d.kind === "slot") next = { ...d, b: minuteAt(e.clientY) };
      else {
        const moved = d.moved || Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 5;
        if (!moved) return;
        if (d.kind === "move") {
          const col = colAt(e.clientX);
          const m = snap(minuteAt(e.clientY) - d.grab);
          const s = dayMs(days[col], Math.max(0, m));
          next = { ...d, moved, s, t: s + (d.x.t - d.x.s) };
        } else {
          const col = days.findIndex((day) => sameDay(day, new Date(d.x.s)));
          const t = dayMs(days[col < 0 ? 0 : col], Math.max(snap(minuteAt(e.clientY)), 0));
          next = { ...d, moved, t: Math.max(t, d.x.s + SNAP * MIN) };
        }
      }
      dragRef.current = next;
      setDrag(next);
    };
    const finish = (commit: boolean) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d || !commit) return;
      if (d.kind === "slot") {
        const day = days[d.col];
        let a = Math.min(d.a, d.b);
        let b = Math.max(d.a, d.b);
        if (b - a < 6) {
          a = Math.floor(a / 30) * 30;
          b = a + 60;
        } else {
          a = Math.floor(a / SNAP) * SNAP;
          b = Math.max(Math.ceil(b / SNAP) * SNAP, a + 30);
        }
        onCreate?.(new Date(dayMs(day, a)), new Date(dayMs(day, b)));
      } else if (d.moved) {
        suppress.current = true;
        window.setTimeout(() => (suppress.current = false), 0);
        if (d.s !== d.x.s || d.t !== d.x.t) onChange?.(d.x, d.s, d.t);
      }
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && finish(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, days, items]);

  const open = (x: Ev, el: HTMLElement) => {
    if (suppress.current) return;
    ctx.onOpen(x, el);
  };
  const blockCtx: CalCtx = { ...ctx, onOpen: open };

  const nowMin = (now - startOfDay(new Date(now)).getTime()) / MIN - fromH * 60;
  const dragging = drag && drag.kind !== "slot" && drag.moved ? drag : null;
  const ghostConflict = dragging ? wouldConflict(items, dragging.x, dragging.s, dragging.t) : false;

  return (
    <div className="[--gutter:44px] min-[768px]:[--gutter:56px]">
      <div ref={scroller} className="relative h-[clamp(620px,calc(100dvh-200px),1000px)] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-(--ap-line-2) bg-(--ap-surface)">
        {/* sticky header: days + all-day row */}
        <div className="sticky top-0 z-20 border-b border-(--ap-line-2) bg-(--ap-surface)">
          <div className="grid" style={gridCols}>
            <div className="flex flex-col items-center justify-end pb-1.5 text-[11px] leading-tight text-(--ap-muted)">
              <span title="ISO week number" className="font-bold">
                W{isoWeek(days[0])}
              </span>
              <span>WAT</span>
            </div>
            {days.map((d) => {
              const isToday = sameDay(d, today);
              const isSel = sameDay(d, selected);
              return (
                <div key={dayKey(d)} className="min-w-0 border-l border-(--ap-line-2) px-1 py-2 text-center">
                  <button
                    type="button"
                    data-day={dayKey(d)}
                    tabIndex={isSel || (n > 1 && !days.some((x) => sameDay(x, selected)) && sameDay(d, days[0])) ? 0 : -1}
                    onClick={() => (onOpenDay && n > 1 ? onOpenDay(d) : onSelect(d))}
                    aria-label={n > 1 ? `Open ${fmtDayLong(d)}` : fmtDayLong(d)}
                    aria-current={isToday ? "date" : undefined}
                    className="mx-auto flex max-w-full flex-col items-center gap-1 rounded-2xl px-2 py-0.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet)"
                  >
                    <span className="text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{n === 1 ? d.toLocaleDateString("en-GB", { weekday: "long" }) : WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                    <span className="relative flex items-center justify-center">
                      <span className={`flex size-10 items-center justify-center rounded-full text-[16px] leading-none font-bold tabular-nums transition-colors ${isToday ? "bg-(--cal-gold) text-(--cal-gold-ink) shadow-(--ap-shadow)" : isSel ? "bg-(--ap-tint) text-(--ap-ink) ring-2 ring-(--ap-violet) ring-offset-2 ring-offset-(--ap-surface)" : "text-(--ap-ink) hover:bg-(--ap-line-2)"}`}>{d.getDate()}</span>
                      {onDay(items, d).some((x) => x.e.attention) ? <span aria-hidden="true" className="absolute -top-0.5 -right-1"><AttentionBadge className="size-3.5" halo={false} /></span> : null}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="grid border-t border-(--ap-line-2)" style={gridCols}>
            <span className="flex items-start justify-center pt-1.5 text-[11px] leading-tight text-(--ap-muted)">All day</span>
            {days.map((d) => {
              const list = onDay(items, d).filter((x) => x.allDay);
              const shown = list.length > 3 ? list.slice(0, 2) : list;
              return (
                <div key={dayKey(d)} className="flex min-h-[34px] min-w-0 flex-col gap-1 border-l border-(--ap-line-2) p-1">
                  {shown.map((x) => (
                    <LineChip key={x.e.id} x={x} ctx={blockCtx} />
                  ))}
                  {list.length > shown.length ? (
                    <button type="button" data-more onClick={(e) => onMore(d, list, e.currentTarget)} className="h-6 rounded-lg px-1.5 text-left text-[12px] font-bold text-(--ap-violet) hover:bg-(--ap-line-2)">
                      +{list.length - shown.length} more
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="grid" style={{ ...gridCols, height: total }}>
          <div className="relative" aria-hidden="true">
            {hours.map((h, i) => (
              <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] text-(--ap-muted) tabular-nums" style={{ top: i === 0 ? 8 : i * hourPx }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div
            ref={colsRef}
            onPointerDown={startSlot}
            className="relative grid touch-pan-y select-none"
            style={{
              gridColumn: `2 / span ${n}`,
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              backgroundImage: `linear-gradient(to bottom, var(--ap-line-2) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ap-line-2) 55%, transparent) 1px, transparent 1px)`,
              backgroundSize: `100% ${hourPx}px, 100% ${hourPx}px`,
              backgroundPosition: `0 0, 0 ${hourPx / 2}px`,
            }}
          >
            {days.map((d, ci) => {
              const isToday = sameDay(d, today);
              return (
                <div key={dayKey(d)} className={`relative min-w-0 border-l border-(--ap-line-2) ${isToday ? "bg-[color-mix(in_srgb,var(--cal-gold)_9%,transparent)]" : ""}`} data-col={ci}>
                  {placed[ci].map((p) => (
                    <Block key={p.ev.e.id} p={p} ci={ci} pxMin={pxMin} ctx={blockCtx} dim={dragging?.x.e.id === p.ev.e.id} canMove={!!onChange && p.ev.type.movable} onStart={startMove} />
                  ))}
                  {isToday && nowMin >= 0 && nowMin <= (toH - fromH) * 60 ? (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-(--cal-gold)" style={{ top: nowMin * pxMin - 1 }}>
                      <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-(--cal-gold)" />
                      <span className="absolute -top-[9px] right-0 rounded-full bg-(--cal-gold) px-1.5 text-[11px] leading-[16px] font-bold text-(--cal-gold-ink)">{clock(now)}</span>
                    </div>
                  ) : null}
                  {drag && drag.kind === "slot" && drag.col === ci ? <SlotGhost drag={drag} pxMin={pxMin} fromH={fromH} /> : null}
                  {dragging && sameDay(new Date(dragging.s), d) ? <MoveGhost drag={dragging} pxMin={pxMin} d={d} fromH={fromH} conflict={ghostConflict} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ p, ci, pxMin, ctx, dim, canMove, onStart }: { p: Placed; ci: number; pxMin: number; ctx: CalCtx; dim: boolean; canMove: boolean; onStart: (e: React.PointerEvent, x: Ev, kind: "move" | "resize", col: number) => void }) {
  const x = p.ev;
  const conflict = ctx.conflicts.has(x.e.id);
  const height = Math.max(34, p.height * pxMin - 2);
  const tiny = height < 46;
  const person = x.e.people?.[0];
  const cancelled = x.e.status === "Cancelled";
  const step = p.cols > 1 ? `min(14px, calc(30% / ${p.cols - 1}))` : "0px";
  const style: CSSProperties = {
    ...toneStyle(x.type.tone),
    top: p.top * pxMin + 1,
    height,
    // Overlapping events cascade (each keeps most of the column width) instead of splitting it, so titles stay readable.
    left: `calc(${p.col} * ${step} + 2px)`,
    width: `calc(100% - ${p.cols - 1} * ${step} - 4px)`,
    ["--z" as string]: 5 + p.col,
  };
  return (
    <div data-block style={style} className={`group absolute z-(--z) min-w-0 hover:z-20 focus-within:z-20 ${dim ? "opacity-35" : ""}`}>
      <button
        type="button"
        data-ev={x.e.id}
        aria-label={ariaOf(x, conflict)}
        aria-haspopup="dialog"
        onClick={(e) => ctx.onOpen(x, e.currentTarget)}
        onPointerDown={(e) => onStart(e, x, "move", ci)}
        {...hoverProps(ctx, x)}
        title={`${x.e.title}, ${clock(x.s)} to ${clock(x.t)}`}
        className={`@container flex size-full min-w-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--ev)_22%,transparent)] px-2 text-left transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet) ${tiny ? "items-center gap-1.5" : "flex-col gap-0.5 py-1.5"} ${TINT} ${EDGE} ${INK} ${canMove ? "cursor-grab active:cursor-grabbing" : ""} ${conflict ? "outline-1 outline-dashed outline-(--ap-warn)" : ""} ${ctx.selectedId === x.e.id ? "ring-2 ring-(--ev)" : ""} ${cancelled ? "opacity-60" : ""}`}
      >
        {ctx.renderEvent ? (
          ctx.renderEvent(x.e, { view: ctx.view, type: x.type, compact: tiny, conflict })
        ) : tiny ? (
          <>
            <b className="shrink-0 text-[11px] tabular-nums">{clock(x.s)}</b>
            <span className={`min-w-0 flex-1 text-[12px] leading-tight font-semibold [overflow-wrap:normal] truncate ${cancelled ? "line-through" : ""}`}>{x.e.title}</span>
          </>
        ) : (
          <>
            <span className="flex w-full min-w-0 items-start gap-1">
              <span className={`min-w-0 flex-1 text-[12px] leading-tight font-bold [overflow-wrap:normal] ${"line-clamp-3"} ${cancelled ? "line-through" : ""}`}>{x.e.title}</span>
            </span>
            <span className="text-[11px] leading-tight tabular-nums opacity-90">
              {clock(x.s)} to {clock(x.t)}
            </span>
            {x.e.subtitle && height >= 64 ? <span className="line-clamp-2 text-[11px] leading-tight opacity-80">{x.e.subtitle}</span> : null}
            {person && height >= 52 ? (
              <span className="mt-auto flex min-w-0 items-center gap-1 text-[11px]">
                <Avatar name={person.name} className="hidden @min-[100px]:inline-flex" />
                <span className="hidden min-w-0 truncate @min-[130px]:inline">{person.name}</span>
              </span>
            ) : null}
          </>
        )}
      </button>
      {x.e.attention || conflict ? <span aria-hidden="true" className="pointer-events-none absolute -top-1 -right-1 z-10"><AttentionBadge className="size-3.5" halo={false} /></span> : null}
      {canMove ? <span aria-hidden="true" onPointerDown={(e) => onStart(e, x, "resize", ci)} className="absolute inset-x-1 -bottom-0.5 h-2 cursor-ns-resize rounded-full opacity-0 group-hover:bg-[color-mix(in_srgb,var(--ev)_55%,transparent)] group-hover:opacity-100" /> : null}
    </div>
  );
}

function SlotGhost({ drag, pxMin, fromH }: { drag: Extract<Drag, { kind: "slot" }>; pxMin: number; fromH: number }) {
  const moved = Math.abs(drag.b - drag.a) >= 6;
  let a = Math.min(drag.a, drag.b);
  let b = Math.max(drag.a, drag.b);
  if (!moved) {
    a = Math.floor(a / 30) * 30;
    b = a + 60;
  } else {
    a = Math.floor(a / SNAP) * SNAP;
    b = Math.max(Math.ceil(b / SNAP) * SNAP, a + 30);
  }
  const t = (m: number) => {
    const total = fromH * 60 + m;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0.5 z-[6] rounded-lg border-2 border-dashed border-(--ap-violet) bg-[color-mix(in_srgb,var(--ap-violet)_14%,transparent)] px-1.5 py-0.5 text-[11px] font-bold text-(--ap-violet) tabular-nums" style={{ top: a * pxMin, height: (b - a) * pxMin }}>
      {t(a)} to {t(b)}
    </div>
  );
}

function MoveGhost({ drag, pxMin, d, fromH, conflict }: { drag: Extract<Drag, { kind: "move" | "resize" }>; pxMin: number; d: Date; fromH: number; conflict: boolean }) {
  const d0 = startOfDay(d).getTime();
  const top = Math.max(0, (drag.s - d0) / MIN - fromH * 60);
  const h = Math.max(20, (drag.t - drag.s) / MIN);
  return (
    <div
      aria-hidden="true"
      style={{ ...toneStyle(drag.x.type.tone), top: top * pxMin, height: h * pxMin }}
      className={`pointer-events-none absolute inset-x-0.5 z-[7] flex flex-col rounded-lg border-2 border-dashed px-1.5 py-1 text-[11px] font-bold shadow-[0_8px_22px_rgba(0,0,0,.18)] ${TINT} ${INK} ${conflict ? "border-(--ap-warn)" : "border-[color:var(--ev)]"}`}
    >
      <span className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[12px]">{drag.x.e.title}</span>
        {conflict ? <AttentionBadge className="size-4" halo={false} /> : null}
      </span>
      <span className="tabular-nums">
        {clock(drag.s)} to {clock(drag.t)}
      </span>
      {conflict ? <span className="text-[11px] font-semibold">Overlaps another event for the same person</span> : null}
    </div>
  );
}
