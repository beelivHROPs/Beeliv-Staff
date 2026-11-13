"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { X } from "@/components/applicant/icons";
import { clock, fmtDayLong, fmtDayShort } from "./dates";
import { Avatar, Dot, LineChip, timeText, type CalCtx } from "./EventChip";
import { toneStyle, type Ev } from "./model";

type Anchor = { left: number; top: number; right: number; bottom: number };
export const rectOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};

/** Place a card beside its anchor, flipped / clamped to stay on screen. */
function usePlacement(anchor: Anchor, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.right + 8;
    if (left + w > vw - 8) left = anchor.left - w - 8;
    if (left < 8) left = Math.min(Math.max(8, anchor.left), vw - w - 8);
    let top = anchor.top;
    if (top + h > vh - 8) top = vh - h - 8;
    setPos({ left, top: Math.max(8, top) });
  }, [anchor, enabled]);
  return { ref, pos };
}

function useDismiss(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (ref.current && t && !ref.current.contains(t) && !t.closest("[data-ev],[data-more]")) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const scroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [ref, onClose]);
}

/** Floating card on tablet / desktop, bottom sheet on phones. */
function Shell({ anchor, phone, onClose, label, children }: { anchor: Anchor; phone: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const { ref, pos } = usePlacement(anchor, !phone);
  useDismiss(ref, onClose);
  useEffect(() => ref.current?.focus({ preventScroll: true }), [ref]);
  const style: CSSProperties = phone ? {} : { left: pos?.left ?? -9999, top: pos?.top ?? 0 };
  return (
    <>
      {phone ? <div aria-hidden="true" className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ap-ink)_40%,transparent)]" /> : null}
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        style={style}
        className={`fixed z-50 border border-(--ap-line) bg-(--ap-surface) text-(--ap-ink) shadow-(--ap-shadow) outline-none ${
          phone ? "inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[20px] p-4 pb-6" : "max-h-[calc(100dvh-16px)] w-[330px] overflow-y-auto rounded-2xl p-4 shadow-[0_18px_44px_rgba(0,0,0,.22)]"
        }`}
      >
        {children}
      </div>
    </>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="ap-hit -mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

function whenText(x: Ev): string {
  const a = new Date(x.s);
  if (x.allDay) {
    const b = new Date(x.t - 1);
    return a.toDateString() === b.toDateString() ? `${fmtDayLong(a)}, all day` : `${fmtDayShort(a)} to ${fmtDayShort(b)}`;
  }
  return `${fmtDayLong(a)}, ${clock(x.s)} to ${clock(x.t)}`;
}

export function DetailCard({ x, anchor, phone, conflict, onClose }: { x: Ev; anchor: Anchor; phone: boolean; conflict: boolean; onClose: () => void }) {
  const e = x.e;
  return (
    <Shell anchor={anchor} phone={phone} onClose={onClose} label={`${e.title}, ${x.type.label}`}>
      <div style={toneStyle(x.type.tone)} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
            <Dot tone={x.type.tone} /> {x.type.label}
          </p>
          <h3 className="mt-1 text-[17px] leading-snug font-bold break-words">{e.title}</h3>
          {e.subtitle ? <p className="text-[13px] text-(--ap-muted)">{e.subtitle}</p> : null}
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <p className="mt-3 text-[14px] font-semibold text-(--ap-ink-2)">{whenText(x)}</p>
      <p className="text-[12px] text-(--ap-muted)">Africa/Lagos (WAT)</p>

      {e.attention || conflict ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-(--ap-tint-soft) p-2.5 text-[13px] text-(--ap-ink-2)">
          <AttentionBadge className="size-5" halo={false} />
          <span>{conflict ? "Double-booked: someone on this event is also on another event at the same time." : (e.status ?? "Needs attention")}</span>
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-[84px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        {e.status ? (
          <>
            <dt className="text-(--ap-muted)">Status</dt>
            <dd className="font-semibold">{e.status}</dd>
          </>
        ) : null}
        {e.client ? (
          <>
            <dt className="text-(--ap-muted)">Client</dt>
            <dd>{e.client.name}</dd>
          </>
        ) : null}
        {e.details?.map((d) => (
          <div key={d.label} className="contents">
            <dt className="text-(--ap-muted)">{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
      </dl>

      {e.people?.length ? (
        <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0" style={toneStyle(x.type.tone)}>
          {e.people.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-[13px]">
              <Avatar name={p.name} /> {p.name}
            </li>
          ))}
        </ul>
      ) : null}

      {e.href ? (
        <Link href={e.href} className="ap-btn ap-btn-p ap-btn-sm mt-4 w-full justify-center text-white!">
          {e.hrefLabel ?? "Open record"}
        </Link>
      ) : null}
    </Shell>
  );
}

/** "+n more" for a day: every event of that day, each opening its own detail card. */
export function DayListCard({ day, title, items, anchor, phone, ctx, onClose }: { day: Date; /** Set for a grouped card (e.g. "Morning shift"): the heading becomes the title and the day moves underneath. */ title?: string; items: Ev[]; anchor: Anchor; phone: boolean; ctx: CalCtx; onClose: () => void }) {
  return (
    <Shell anchor={anchor} phone={phone} onClose={onClose} label={title ? `${title}, ${fmtDayLong(day)}` : `Events on ${fmtDayLong(day)}`}>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-[17px] leading-snug font-bold break-words">{title ?? fmtDayLong(day)}</h3>
        <CloseBtn onClose={onClose} />
      </div>
      <p className="text-[13px] text-(--ap-muted)">
        {title ? `${fmtDayLong(day)}, ` : ""}
        {title ? Math.max(new Set(items.flatMap((x) => (x.e.people ?? []).map((p) => p.id))).size, items.length) : items.length} {title ? "people" : items.length === 1 ? "event" : "events"}
      </p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
        {items.map((x) => (
          <li key={x.e.id}>
            <LineChip x={x} ctx={ctx} className="h-7!" />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function HoverCard({ x, anchor }: { x: Ev; anchor: Anchor }) {
  const { ref, pos } = usePlacement(anchor, true);
  const names = (x.e.people ?? []).map((p) => p.name).join(", ");
  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, ...toneStyle(x.type.tone) }}
      className="pointer-events-none fixed z-50 w-[260px] rounded-xl border border-(--ap-line) bg-(--ap-surface) p-3 text-(--ap-ink) shadow-[0_12px_30px_rgba(0,0,0,.2)]"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
        <Dot tone={x.type.tone} /> {x.type.label}
      </p>
      <p className="mt-1 text-[14px] leading-snug font-bold break-words">{x.e.title}</p>
      <p className="text-[13px] text-(--ap-ink-2)">{timeText(x)}</p>
      {x.e.subtitle ? <p className="text-[12px] text-(--ap-muted)">{x.e.subtitle}</p> : null}
      {names ? <p className="mt-1 text-[12px] text-(--ap-muted)">{names}</p> : null}
    </div>
  );
}
