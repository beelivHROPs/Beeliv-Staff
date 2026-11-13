"use client";

import type { CSSProperties } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Calendar, Users, Video } from "@/components/applicant/icons";
import { clock, dayKey, fmtDayLong, sameDay } from "./dates";
import { Avatar, ariaOf, hoverProps, type CalCtx } from "./EventChip";
import { onDay, toneStyle, type Ev } from "./model";

function TypeIcon({ id }: { id: string }) {
  const c = "size-[18px]";
  return id === "interview" ? <Video className={c} /> : id === "shift" || id === "leave" ? <Users className={c} /> : <Calendar className={c} />;
}

function Row({ x, ctx }: { x: Ev; ctx: CalCtx }) {
  const conflict = ctx.conflicts.has(x.e.id);
  const names = (x.e.people ?? []).map((p) => p.name).join(", ");
  const cancelled = x.e.status === "Cancelled";
  return (
    <li>
      <button
        type="button"
        data-ev={x.e.id}
        aria-label={ariaOf(x, conflict)}
        aria-haspopup="dialog"
        onClick={(e) => ctx.onOpen(x, e.currentTarget)}
        {...hoverProps(ctx, x)}
        style={toneStyle(x.type.tone) as CSSProperties}
        className={`flex w-full min-w-0 items-center gap-3 rounded-2xl border border-(--ap-line) px-3.5 py-2.5 text-left transition-colors hover:bg-(--ap-tint-soft) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet) ${conflict ? "outline-1 outline-dashed outline-(--ap-warn)" : ""} ${cancelled ? "opacity-60" : ""}`}
      >
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--ev)] text-white">
          <TypeIcon id={x.type.id} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] leading-snug font-bold break-words text-(--ap-ink) ${cancelled ? "line-through" : ""}`}>{x.e.title}</span>
          <span className="block text-[13px] leading-snug text-(--ap-muted) tabular-nums">
            {x.allDay ? "All day" : `${clock(x.s)} to ${clock(x.t)}`}
            {[x.type.label, x.e.subtitle].filter(Boolean).length ? `, ${[x.type.label, x.e.subtitle].filter(Boolean).join(", ")}` : ""}
          </span>
          {names ? (
            <span className="mt-1 flex items-center gap-1.5 text-[12px] text-(--ap-muted)">
              <Avatar name={x.e.people![0].name} />
              <span className="min-w-0 break-words">{names}</span>
            </span>
          ) : null}
        </span>
        {x.e.attention || conflict ? <AttentionBadge className="size-5" halo={false} /> : null}
      </button>
    </li>
  );
}

/** Day-grouped list. Days with nothing are skipped unless `showEmpty` (phone day view). */
export function AgendaList({ days, items, today, ctx, showEmpty = false, emptyText }: { days: Date[]; items: Ev[]; today: Date; ctx: CalCtx; showEmpty?: boolean; emptyText: string }) {
  const groups = days.map((d) => ({ d, list: onDay(items, d) })).filter((g) => showEmpty || g.list.length > 0);
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-(--ap-line) px-4 py-10 text-center text-(--ap-muted)">
        <Calendar className="size-6" aria-hidden="true" />
        <p className="text-[14px]">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {groups.map(({ d, list }) => (
        <section key={dayKey(d)} aria-label={fmtDayLong(d)} data-day={dayKey(d)}>
          <h3 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-(--ap-ink)">
            {fmtDayLong(d)}
            {sameDay(d, today) ? <span className="rounded-full bg-(--cal-gold) px-2.5 py-0.5 text-[11px] text-(--cal-gold-ink)">Today</span> : null}
          </h3>
          {list.length === 0 ? (
            <p className="rounded-2xl bg-(--ap-tint-soft) px-4 py-3 text-[13px] text-(--ap-muted)">{emptyText}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {list.map((x) => (
                <Row key={x.e.id} x={x} ctx={ctx} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
