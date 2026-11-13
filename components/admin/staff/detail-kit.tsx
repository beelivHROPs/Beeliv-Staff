"use client";

/**
 * Small building blocks for the Staff record (Admin, desktop and phone): the status pill, the four
 * "At a glance" cards, label / value rows, the pill row used inside tabs, and the "5 rows then Show more"
 * helper. Presentation only. Docs: docs/design-references/admin-staff-detail-2026-10-27.md.
 */
import { useState, type ReactNode } from "react";
import type { IconComponent } from "@/components/applicant/icons";
import { StaffStatusPill } from "./parts";
import type { StaffDetail, StaffStatus } from "@/lib/admin/staff/types";

/* ---------- pills (same hues as the Attendance and phone pills) ---------- */

export type PillTone = "ok" | "wt" | "bad" | "info" | "mute";
const PILL: Record<PillTone, string> = {
  ok: "bg-[#e3f6ea] text-[#17803d] [html[data-admin-theme=dark]_&]:bg-[#12302a] [html[data-admin-theme=dark]_&]:text-[#7fdcb6]",
  wt: "bg-[#fdf0d8] text-[#9a5a06] [html[data-admin-theme=dark]_&]:bg-[#33261a] [html[data-admin-theme=dark]_&]:text-[#f0c27a]",
  bad: "bg-[#fde8ea] text-[#b4232c] [html[data-admin-theme=dark]_&]:bg-[#36172a] [html[data-admin-theme=dark]_&]:text-[#f4a9c6]",
  info: "bg-[#efe8f6] text-[#5b3f86] [html[data-admin-theme=dark]_&]:bg-[#2c2140] [html[data-admin-theme=dark]_&]:text-[#cbb8ee]",
  mute: "bg-[#f0edf2] text-[#6b6270] [html[data-admin-theme=dark]_&]:bg-[#2a1d27] [html[data-admin-theme=dark]_&]:text-[#cdbfd0]",
};
export function Pill({ tone, children, className = "" }: { tone: PillTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] leading-none font-bold whitespace-nowrap ${PILL[tone]} ${className}`}>{children}</span>;
}

/* ---------- the ONE status of a staff member ---------- */

export type StaffState = "active" | "on-leave" | "suspended" | "awaiting";
export const STATE_LABEL: Record<StaffState, string> = { active: "Active", "on-leave": "On leave", suspended: "Suspended", awaiting: "Awaiting assignment" };
const STATE_TONE: Record<StaffState, PillTone> = { active: "ok", "on-leave": "info", suspended: "bad", awaiting: "wt" };

/** No current assignment = approved but not placed yet. */
export const isAwaiting = (s: StaffDetail) => !s.assignments.some((a) => a.status === "current");
export const stateOf = (s: StaffDetail): StaffState => (isAwaiting(s) ? "awaiting" : (s.status as StaffStatus));

export function StateChip({ state }: { state: StaffState }) {
  return <Pill tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Pill>;
}
/** Phone pill (the .pd-pill colours). Same four states. */
export function StatePhonePill({ state, status }: { state: StaffState; status: StaffStatus }) {
  if (state !== "awaiting") return <StaffStatusPill status={status} />;
  return (
    <span className="pd-pill" data-tone="wt">
      Awaiting assignment
    </span>
  );
}

/* ---------- numbers behind the four cards (all from data already on the page) ---------- */

const DAY = 86_400_000;
const inclusiveDays = (from: string, to: string) => Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY) + 1);

export function metricsOf(s: StaffDetail) {
  const counted = s.attendance.filter((a) => a.state !== "On leave");
  const onTime = counted.filter((a) => a.state === "Present").length;
  const pendingLeave = s.leave.filter((l) => l.state === "Pending");
  const done = s.training.filter((t) => t.state !== "Pending").length;
  const valid = s.documents.filter((d) => d.state === "verified").length;
  const broken = s.documents.filter((d) => d.state === "missing" || d.state === "rejected").length;
  const review = s.documents.filter((d) => d.state === "needs-review" || d.state === "resubmitted" || d.state === "uploaded").length;
  return {
    att: { counted: counted.length, onTime, pct: counted.length ? Math.round((onTime / counted.length) * 100) : null },
    leave: { pendingRequests: pendingLeave.length, pendingDays: pendingLeave.reduce((n, l) => n + inclusiveDays(l.from, l.to), 0) },
    training: { total: s.training.length, done, notYet: s.training.length - done },
    docs: { total: s.documents.length, valid, broken, review },
  };
}

/* ---------- At a glance card ---------- */

type Tone = "normal" | "warn" | "bad";
const BAR: Record<Tone, string> = { normal: "bg-[#8b2252]", warn: "bg-[#c98a1b]", bad: "bg-[#d6455a]" };

export function GlanceCard({ icon: Icon, tile, title, value, unit, caption, progress, tone = "normal", chip, label, onClick }: { icon: IconComponent; tile: string; title: string; value: ReactNode; unit?: ReactNode; caption: string; progress?: number | null; tone?: Tone; chip?: string | null; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="ap-card ap-hit flex min-w-0 flex-col items-stretch gap-0 rounded-xl p-4 text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none max-[767px]:p-3.5"
    >
      <span className="flex items-center gap-2.5">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white ${tile}`} aria-hidden="true">
          <Icon className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 text-[13px] leading-tight font-bold text-(--ap-ink-2)">{title}</span>
      </span>
      <span className="mt-3 flex items-baseline gap-1.5 leading-none">
        <b className="text-[28px] font-bold text-(--ap-ink) tabular-nums">{value}</b>
        {unit ? <span className="text-[14px] font-semibold text-(--ap-muted) tabular-nums">{unit}</span> : null}
      </span>
      <span className="mt-1.5 block text-[13px] leading-snug text-(--ap-muted)">{caption}</span>
      {progress !== null && progress !== undefined ? (
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
          <span className={`block h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </span>
      ) : null}
      {chip ? (
        <span className="mt-2.5 block">
          <Pill tone={tone === "bad" ? "bad" : "wt"}>{chip}</Pill>
        </span>
      ) : null}
    </button>
  );
}

/* ---------- cards and rows ---------- */

/** White 12px card, hairline border, 16px padding. On phones the shared flattening rule makes nested ones transparent. */
export function DCard({ title, right, hideTitleOnPhone = false, children, className = "" }: { title: string; right?: ReactNode; hideTitleOnPhone?: boolean; children: ReactNode; className?: string }) {
  return (
    <section className={`ap-card min-w-0 rounded-xl p-4 ${className}`}>
      <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${hideTitleOnPhone ? "max-[767px]:mb-1" : ""}`}>
        <h2 className={`min-w-0 text-[16px] leading-tight font-bold text-(--ap-ink) ${hideTitleOnPhone ? "max-[767px]:sr-only" : ""}`}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Label on the left, value on the right; wraps, never clips. */
export function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  return (
    <dl className="m-0">
      {shown.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-4 border-t border-(--ap-line-2) py-2.5 text-[14px] first:border-t-0 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-(--ap-muted)">{r.label}</dt>
          <dd className="m-0 min-w-0 text-right font-semibold break-words text-(--ap-ink)">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Quiet text link button used inside cards ("View all", "Open"). */
export const LINK_BTN = "ap-hit text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

/** One row of 36px pills (All first, count inside). Plum when active. */
export function PillRow<T extends string>({ label, options, value, onChange }: { label: string; options: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] leading-none font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-1 focus-visible:outline-none ${on ? "border-[#8b2252] bg-[#8b2252] text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
          >
            {o.label}
            {o.count !== undefined ? <span className={`tabular-nums ${on ? "text-white/80" : "text-(--ap-muted)"}`}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** "5 rows, then Show more" for every list on the page. */
export const PAGE = 5;
export function useFive<T>(items: T[]) {
  const [n, setN] = useState(PAGE);
  const rows = items.slice(0, n);
  const more =
    items.length > n ? (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-(--ap-muted)">
        <span>
          Showing {n} of {items.length}
        </span>
        <button type="button" onClick={() => setN(n + PAGE)} className="ap-btn ap-btn-s ap-btn-sm">
          Show more
        </button>
      </div>
    ) : null;
  return { rows, more };
}
