"use client";

/**
 * Small pieces shared by the Assignment / Schedule / Attendance screens:
 * error card, back link, shift status chip, shift agenda timeline, date helper.
 * Presentation only - no scheduling or attendance rules live here.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronLeft, Clock3 } from "@/components/applicant/icons";
import { ErrorPanel } from "../ErrorPanel";
import { formatClock, dayMonth, parseDate } from "@/lib/staff/format";
import type { Shift, ShiftEvent, ShiftStatus } from "@/lib/staff/types";

/** Shimmer block used by every skeleton. */
export const SK = "ap-shimmer rounded-2xl";

/** "29 Sep 2026" (dayMonth has no year). */
export function fullDate(d: string): string {
  return `${dayMonth(d)} ${parseDate(d).getFullYear()}`;
}

/** "Monday, 29 Sep 2026". */
export function fullDateLong(d: string): string {
  return `${parseDate(d).toLocaleDateString("en-GB", { weekday: "long" })}, ${fullDate(d)}`;
}

/** Error state with retry (brief section 19). */
export function PanelError({ what, retry }: { what: string; retry: () => void }) {
  return <ErrorPanel title={`We couldn't load ${what}`} retry={retry} />;
}

export function BackCrumb({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-1.5 inline-flex items-center gap-1.5 py-1 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[1100px]:min-h-11 max-[1100px]:py-0"
    >
      <ChevronLeft className="size-3.75" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Backend-reported shift status as a chip. */
const STATUS: Record<ShiftStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "ap-chip-violet" },
  updated: { label: "Updated", cls: "ap-chip-warn" },
  cancelled: { label: "Cancelled", cls: "bg-(--ap-rose-bg) text-(--ap-rose)" },
  completed: { label: "Completed", cls: "ap-chip-ok" },
};

export function ShiftStatusChip({ status }: { status: ShiftStatus }) {
  const s = STATUS[status];
  return <span className={`ap-chip ${s.cls}`}>{s.label}</span>;
}

/** Shift agenda ("shift events"): same timeline style as Home. `nowKey` (HH:mm) highlights the current step. */
export function ShiftTimeline({ events, nowKey }: { events: ShiftEvent[]; nowKey?: string }) {
  const list = [...events].sort((x, y) => x.time.localeCompare(y.time));
  const last = list.length ? list[list.length - 1].time : "";
  const currentIdx = nowKey && list.length && nowKey >= list[0].time && nowKey < last ? list.map((e) => e.time <= nowKey).lastIndexOf(true) : -1;
  return (
    <ol className="relative flex flex-col">
      {list.map((e, i) => {
        const cur = i === currentIdx;
        return (
          <li key={e.time + e.label} className={`relative grid grid-cols-[78px_28px_minmax(0,1fr)] items-start gap-x-2 rounded-xl py-2.5 pr-2 ${cur ? "bg-(--ap-tint)" : ""}`}>
            <span className="ap-sm pl-1.5 font-bold text-(--ap-ink-2)">{formatClock(e.time)}</span>
            <span className="relative flex flex-col items-center self-stretch">
              <span className={`z-[1] flex size-6 items-center justify-center rounded-full border-2 ${cur ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-tint-2) bg-white text-(--ap-violet)"}`}>
                {e.kind === "break" ? <Clock3 className="size-3" /> : e.kind === "end" ? <Check className="size-3" strokeWidth={2.4} /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {i < list.length - 1 ? <span className="absolute top-6 -bottom-2.5 w-px bg-(--ap-line)" aria-hidden="true" /> : null}
            </span>
            <span className="min-w-0">
              <b className="ap-sm block text-(--ap-ink)">{e.label}</b>
              {e.detail ? <span className="ap-label block text-(--ap-muted)">{e.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Label/value grid used on detail screens (same soft field style as Home's assignment card). */
export function FieldGrid({ fields, cols = "min-[768px]:grid-cols-3" }: { fields: [string, ReactNode][]; cols?: string }) {
  return (
    <dl className={`grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 ${cols}`}>
      {fields.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="ap-label text-(--ap-muted)">{k}</dt>
          <dd className="ap-sm mt-1 rounded-xl border border-(--ap-line) bg-(--ap-tint-soft) px-3 py-2 font-semibold break-words text-(--ap-ink)">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Convenience for pages that need "the shift with this id" within a window. */
export function findShift(shifts: Shift[] | null, id: string | null): Shift | null {
  return shifts?.find((s) => s.id === id) ?? null;
}
