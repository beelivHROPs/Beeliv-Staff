"use client";

/**
 * Small shared pieces for the four Workforce screens. Built new only where the
 * Client / Applicant / Admin sets have no equivalent: a themed field sheet
 * (ConfirmDialog has no inputs; the Interviews Sheet lacks the Admin role
 * theme), the Workforce status chips (statuses/labels follow the Staff and
 * Client apps), a scope (client > outlet) filter pair, and a history list.
 * Hrefs live here because the shared link helpers are not ours to edit.
 */
import Link from "next/link";
import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { useIsClient } from "@/components/applicant/motion";
import { AttendanceChip as ClientAttendanceChip, StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { FilterSelect } from "@/components/client/records-filters";
import type { FilterDef } from "@/components/admin/listKit";
import { formatDate, formatTime } from "@/lib/applicant/time";
import { dayMonth, formatClock, weekday } from "@/lib/client/format";
import type { AckState, AttendanceFlag, AttendanceStatus, HistoryEntry, LeaveStatus, PersonRef, ScopeFacets, WarningStatus } from "@/lib/admin/workforce/types";

/* ---------- links ---------- */

export const ATTENDANCE_HREF = "/admin/workforce/attendance";
export const LEAVE_HREF = "/admin/workforce/leave";
export const SCHEDULING_HREF = "/admin/workforce/scheduling";
export const WARNINGS_HREF = "/admin/workforce/warnings";
export const attendanceHref = (id: string) => `${ATTENDANCE_HREF}/${id}`;
export const warningHref = (id: string) => `${WARNINGS_HREF}/${id}`;
/** Staff 360 route is owned by the Staff build; link only. */
export const staffHref = (id: string) => `/admin/staff/directory/${id}`;

/* ---------- formatting (display only) ---------- */

export const CARD = "ap-card rounded-[20px] p-5 min-[768px]:p-6";
export const H2 = "text-[17px] font-bold text-(--ap-ink)";
export const DT = "text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase";
export const TH = "text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase";
export const LABEL = "mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)";

/** "Mon 12 Oct". */
export const dayLabelOf = (d: string) => `${weekday(d)} ${dayMonth(d)}`;
export const stamp = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;
export const clockOf = (iso: string | null) => (iso ? formatTime(iso) : null);
export const range = (start: string, end: string) => `${formatClock(start)} - ${formatClock(end)}`;
export function leaveRange(start: string, end: string) {
  return start === end ? dayLabelOf(start) : `${dayMonth(start)} - ${dayMonth(end)}`;
}

/* ---------- chips ---------- */

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = { present: "Present", late: "Late", absent: "Absent", "on-leave": "On leave", "not-yet": "Not yet in" };

export function AttendanceStatusChip({ status }: { status: AttendanceStatus }) {
  return status === "not-yet" ? <StatusChip tone="mute">{ATTENDANCE_LABEL[status]}</StatusChip> : <ClientAttendanceChip status={status} />;
}

const FLAG: Record<AttendanceFlag, { tone: ChipTone; label: string }> = {
  "correction-requested": { tone: "warn", label: "Correction requested" },
  corrected: { tone: "info", label: "Corrected" },
  "no-check-out": { tone: "warn", label: "No check-out" },
};
export function FlagChips({ flags }: { flags: AttendanceFlag[] }) {
  if (!flags.length) return <span className="text-(--ap-faint)">None</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <StatusChip key={f} tone={FLAG[f].tone}>
          {FLAG[f].label}
        </StatusChip>
      ))}
    </span>
  );
}

export const LEAVE_LABEL: Record<LeaveStatus, string> = { pending: "Pending", approved: "Approved", declined: "Declined", cancelled: "Cancelled" };
const LEAVE_TONE: Record<LeaveStatus, ChipTone> = { pending: "warn", approved: "ok", declined: "bad", cancelled: "mute" };
export const LeaveStatusChip = ({ status }: { status: LeaveStatus }) => <StatusChip tone={LEAVE_TONE[status]}>{LEAVE_LABEL[status]}</StatusChip>;

export const WARNING_LABEL: Record<WarningStatus, string> = { issued: "Issued", acknowledged: "Acknowledged", disputed: "Disputed", withdrawn: "Withdrawn" };
const WARNING_TONE: Record<WarningStatus, ChipTone> = { issued: "info", acknowledged: "ok", disputed: "bad", withdrawn: "mute" };
export const WarningStatusChip = ({ status }: { status: WarningStatus }) => <StatusChip tone={WARNING_TONE[status]}>{WARNING_LABEL[status]}</StatusChip>;

const ACK: Record<AckState, { tone: ChipTone; label: string }> = {
  "not-required": { tone: "mute", label: "Not required" },
  awaiting: { tone: "warn", label: "Awaiting staff" },
  acknowledged: { tone: "ok", label: "Acknowledged" },
};
export const AckChip = ({ ack }: { ack: AckState }) => <StatusChip tone={ACK[ack].tone}>{ACK[ack].label}</StatusChip>;

/* ---------- people ---------- */

export function StaffCell({ staff, sub, size = 40 }: { staff: PersonRef; sub?: ReactNode; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <AdminAvatar name={staff.name} photoUrl={staff.photoUrl} size={size} />
      <span className="min-w-0 leading-tight">
        <Link href={staffHref(staff.id)} className="block text-[14px] font-bold text-(--ap-ink) hover:text-(--ap-violet) min-[768px]:break-words max-[767px]:truncate">
          {staff.name}
        </Link>
        {sub ? <span className="block truncate text-[12px] text-(--ap-muted)">{sub}</span> : null}
      </span>
    </span>
  );
}

/* ---------- toolbar pieces ---------- */

export const ANY = "__any";
export const withAny = (label: string, opts: string[]) => [{ value: ANY, label }, ...opts.map((o) => ({ value: o, label: o }))];

/** Client then Outlet. Picking a client clears an outlet that does not belong to it. */
export function ScopeFilters({ facets, clientId, outletId, onChange }: { facets: ScopeFacets; clientId: string; outletId: string; onChange: (p: { clientId?: string; outletId?: string }) => void }) {
  const outlets = facets.outlets.filter((o) => !clientId || o.clientId === clientId);
  return (
    <>
      <FilterSelect
        label="Client"
        value={clientId || ANY}
        onChange={(v) => onChange({ clientId: v === ANY ? "" : v, outletId: "" })}
        options={[{ value: ANY, label: "All clients" }, ...facets.clients.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <FilterSelect label="Outlet" value={outletId || ANY} onChange={(v) => onChange({ outletId: v === ANY ? "" : v })} options={[{ value: ANY, label: "All outlets" }, ...outlets.map((o) => ({ value: o.id, label: o.name }))]} />
    </>
  );
}

/** The same Client and Outlet choices as ScopeFilters, as grouped-toolbar definitions. */
export function scopeFilterDefs(facets: ScopeFacets, clientId: string, outletId: string, onChange: (p: { clientId?: string; outletId?: string }) => void): FilterDef[] {
  const outlets = facets.outlets.filter((o) => !clientId || o.clientId === clientId);
  return [
    { key: "client", label: "Client", value: clientId || ANY, onChange: (v) => onChange({ clientId: v === ANY ? "" : v, outletId: "" }), options: [{ value: ANY, label: "All clients" }, ...facets.clients.map((c) => ({ value: c.id, label: c.name }))] },
    { key: "outlet", label: "Outlet", value: outletId || ANY, onChange: (v) => onChange({ outletId: v === ANY ? "" : v }), options: [{ value: ANY, label: "All outlets" }, ...outlets.map((o) => ({ value: o.id, label: o.name }))] },
  ];
}

/** Search box state that commits to the query after a short pause. */
export function useSearchCommit(commit: (v: string) => void) {
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return {
    text,
    onChange(v: string) {
      setText(v);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => commit(v.trim()), 250);
    },
    clear() {
      setText("");
      if (timer.current) clearTimeout(timer.current);
    },
  };
}

/* ---------- detail pieces ---------- */

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={DT}>{label}</dt>
      <dd className="mt-0.5 break-words text-(--ap-ink-2)">{value}</dd>
    </div>
  );
}

export function HistoryList({ history, empty }: { history: HistoryEntry[]; empty: string }) {
  if (history.length === 0) return <p className="text-[14px] text-(--ap-muted)">{empty}</p>;
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {[...history].reverse().map((h) => (
        <li key={h.id} className="border-b border-(--ap-line-2) py-3 first:pt-0 last:border-b-0 last:pb-0">
          <p className="text-[14px] text-(--ap-ink)">
            <b>{h.action}</b> by {h.actor}
          </p>
          {h.previous || h.next ? (
            <p className="text-[13px] text-(--ap-ink-2)">
              {h.previous ?? "None"} to {h.next ?? "None"}
            </p>
          ) : null}
          {h.note ? <p className="mt-1 text-[13px] text-(--ap-ink-2)">{h.note}</p> : null}
          <p className="text-[12px] text-(--ap-muted)">{stamp(h.at)}</p>
        </li>
      ))}
    </ol>
  );
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-wide text-(--ap-muted) uppercase">{label}</dt>
      <dd className="leading-snug break-words text-(--ap-ink-2)">{value}</dd>
    </div>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  return children ? <p className="mt-1 text-[13px] font-semibold text-[#C8102E]">{children}</p> : null;
}

/* ---------- sheets ---------- */

export const SHEET_BTN = "h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto";
export const DANGER_BTN = "ap-btn-danger";

/** Modal sheet. Phones: bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close (unless busy). */
export function Sheet({ title, description, busy = false, onClose, children, footer, wide = false }: { title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; footer: ReactNode; wide?: boolean }) {
  const isClient = useIsClient();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(busy ? undefined : onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!isClient) return null;
  return createPortal(
    <div
      className={`${ADMIN_THEME} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef} tabIndex={-1} role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:rounded-[22px] min-[768px]:p-7 ${wide ? "min-[768px]:w-[560px]" : "min-[768px]:w-[500px]"}`}
      >
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {title}
        </h2>
        {description ? <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{description}</p> : null}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Note-required sheet (decline, withdraw reasons). The confirm button stays disabled until a note is typed. */
export function NoteSheet({ title, description, label, confirmLabel, danger = false, busy = false, onCancel, onSubmit }: { title: string; description: string; label: string; confirmLabel: string; danger?: boolean; busy?: boolean; onCancel: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  const fieldId = useId();
  return (
    <Sheet
      title={title}
      description={description}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <button type="button" disabled={busy} onClick={onCancel} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={busy || !note.trim()} onClick={() => onSubmit(note.trim())} className={`ap-btn ${SHEET_BTN} ${danger ? DANGER_BTN : "ap-btn-p text-white!"}`}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <label htmlFor={fieldId} className={LABEL}>
        {label}
      </label>
      <textarea id={fieldId} autoFocus className="ap-input" rows={4} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the history with your name and the time.</p>
    </Sheet>
  );
}


/** Phone detail pill (spec colours). Same statuses as WarningStatusChip. */
export const WarningStatusPill = ({ status }: { status: WarningStatus }) => <PhonePill tone={pillTone(WARNING_TONE[status])}>{WARNING_LABEL[status]}</PhonePill>;
