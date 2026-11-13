"use client";

/**
 * Small shared pieces for the three recruitment screens (Shortlisting,
 * Interviews, Assessments). Built new only where neither the Client nor the
 * Applicant component set has an equivalent: a text-field sheet (ConfirmDialog
 * has no inputs), a restricted (unauthorized) panel that does not point
 * at Client support, and a notice banner. Everything else is reused.
 */
import Link from "next/link";
import { PhonePill } from "@/components/admin/PhoneDetail";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { Check, Exclaim, LockKeyhole, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { PageHeading } from "@/components/applicant/primitives";
import { useNoticeSound } from "@/lib/admin/use-notice-sound";
import type { SoundName } from "@/lib/admin/sound";
import { ListSkeleton as SharedListSkeleton } from "@/components/admin/listKit";
import { Disc } from "@/components/admin/overview/Disc";
import type { ChipTone } from "@/components/client/StatusChip";
import { StatusMark } from "@/components/admin/standard/StatusMark";
import type { InterviewRecommendation, InterviewStatus } from "@/lib/admin/interviews/types";

export type Notice = { kind: "ok" | "error"; text: string; /** Overrides the default "saved" sound for an ok notice (e.g. "rejected" for a cancellation). */ sound?: SoundName };

export function NoticeBanner({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  useNoticeSound(notice?.kind ?? null, notice?.text ?? "", true, notice?.sound);
  if (!notice) return null;
  return (
    <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
      <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
      <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function RestrictedPanel({ title, what }: { title: string; what: string }) {
  return (
    <>
      <PageHeading title={title} />
      <section role="status" data-admin-nonav="" className="ap-card flex flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-8">
        <Disc icon={LockKeyhole} tone="brand" className="size-12" />
        <h2 className="ap-serif text-[18px] leading-tight">This is not available to your account</h2>
        <p className="max-w-[58ch] text-[15px] leading-snug text-(--ap-muted)">{what} is outside the clients and outlets your role covers. If you think you should have access, ask Beeliv Head of Operations.</p>
        <Link href="/admin" className="ap-btn ap-btn-s ap-btn-sm">
          Back to Overview
        </Link>
      </section>
    </>
  );
}

export function ListSkeleton({ title }: { title: string; rows?: number }) {
  return <SharedListSkeleton title={title} label={`Loading ${title}`} />;
}

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
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
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

export const SHEET_BTN = "h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto";

/** Note-required sheet (Hold / Reject / Cancel / Reschedule reasons). Confirm button is disabled until a note is typed. */
export function NoteSheet({ title, description, label, confirmLabel, danger = false, busy = false, error = null, onCancel, onSubmit }: { title: string; description: string; label: string; confirmLabel: string; danger?: boolean; busy?: boolean; error?: string | null; onCancel: () => void; onSubmit: (note: string) => void }) {
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
          <button type="button" disabled={busy || !note.trim()} onClick={() => onSubmit(note.trim())} className={`ap-btn ${SHEET_BTN} ${danger ? "bg-(--ap-rose) text-(--ap-surface) hover:opacity-90" : "ap-btn-p text-white!"}`}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <label htmlFor={fieldId} className="block text-[14px] font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the history with your name and the time.</p>
      {error ? (
        <p role="alert" className="mt-3 text-[15px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}

/* ---------- chips (Client StatusChip reused) ---------- */

const STATUS: Record<InterviewStatus, { tone: ChipTone; label: string }> = {
  "to-schedule": { tone: "warn", label: "To schedule" },
  scheduled: { tone: "info", label: "Scheduled" },
  completed: { tone: "ok", label: "Completed" },
  cancelled: { tone: "mute", label: "Cancelled" },
};
export function InterviewStatusChip({ status }: { status: InterviewStatus }) {
  const s = STATUS[status];
  return <StatusMark tone={s.tone}>{s.label}</StatusMark>;
}

const REC: Record<InterviewRecommendation, { tone: ChipTone; label: string }> = {
  proceed: { tone: "ok", label: "Proceed" },
  hold: { tone: "warn", label: "Hold" },
  reject: { tone: "bad", label: "Reject" },
  "another-stage": { tone: "plum", label: "Another stage" },
};
export function RecommendationChip({ rec }: { rec: InterviewRecommendation | null }) {
  if (!rec) return <span className="text-[14px] text-(--ap-muted)">Not recorded</span>;
  return <StatusMark tone={REC[rec].tone}>{REC[rec].label}</StatusMark>;
}

/** Phone detail pill (spec colours): cancelled is rose, completed mint, the rest sand. */
export function InterviewStatusPill({ status }: { status: InterviewStatus }) {
  return <PhonePill tone={status === "completed" ? "ok" : status === "cancelled" ? "bad" : "wt"}>{STATUS[status].label}</PhonePill>;
}
