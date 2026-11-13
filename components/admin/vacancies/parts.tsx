"use client";

/** Small shared pieces for the Vacancies screens. */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ArrowRight, LockKeyhole } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { StatusChip } from "@/components/client/StatusChip";
import type { VacancyActivity, VacancyStatus } from "@/lib/admin/vacancies/types";
import { formatIsoDate, STATUS_LABEL, STATUS_TONE } from "./meta";
import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";

export function VacancyStatusChip({ status }: { status: VacancyStatus }) {
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

/** Card with an 18px serif title. */
export function Section({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ap-card min-w-0 rounded-[20px] p-5 min-[768px]:p-6 ${className}`}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="ap-serif text-[18px] leading-tight">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[12px] font-bold text-(--ap-muted)">{f.label}</dt>
          <dd className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink)">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BulletList({ items, empty = "Nothing added." }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="text-[14px] text-(--ap-muted)">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((t, i) => (
        <li key={`${i}-${t}`} className="flex gap-2.5 text-[15px] leading-snug text-(--ap-ink-2)">
          <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-(--ap-violet)" />
          <span className="min-w-0 break-words">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityList({ items }: { items: VacancyActivity[] }) {
  if (items.length === 0) return <p className="text-[14px] text-(--ap-muted)">No activity yet.</p>;
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((e) => (
        <li key={e.id} className="group relative flex gap-3 pb-5 last:pb-0">
          <span aria-hidden="true" className="absolute top-3 -bottom-1 left-[4px] w-px bg-(--ap-line) group-last:hidden" />
          <span aria-hidden="true" className="relative mt-1.5 size-[9px] shrink-0 rounded-full bg-(--ap-violet)" />
          <div className="min-w-0">
            <p className="text-[15px] leading-snug break-words">
              <b>{e.actor}</b> · {e.action}
            </p>
            {e.to ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] text-(--ap-ink-2)">
                <span>{e.from ?? "Not set"}</span>
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                <b>{e.to}</b>
              </p>
            ) : null}
            {e.reason ? <p className="mt-1 text-[14px] break-words text-(--ap-ink-2)">Reason: {e.reason}</p> : null}
            <p className="mt-0.5 text-[12px] text-(--ap-muted)">
              {formatIsoDate(e.at)}, {new Date(e.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Unauthorized state: the backend said this account may not see vacancies. */
export function Restricted({ what }: { what: string }) {
  return (
    <section data-admin-nonav="" className="ap-card flex max-w-[860px] flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-8" role="status">
      <span className="flex size-10 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-muted)">
        <LockKeyhole className="size-[19px]" aria-hidden="true" />
      </span>
      <h2 className="ap-serif text-[18px] leading-tight">This is not available to your account</h2>
      <p className="max-w-[58ch] text-[15px] leading-snug text-(--ap-muted)">{what} is not shared with your account. If you think you should have access, ask your Beeliv team.</p>
    </section>
  );
}

/**
 * Reason-required dialog (confirmAction has no text field). Phones: bottom
 * sheet; tablet and up: centred card. Esc / backdrop / Cancel close.
 */
export function ReasonDialog({
  title,
  description,
  label,
  confirmLabel,
  tone,
  onCancel,
  onSubmit,
}: {
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  tone: "danger" | "neutral";
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const isClient = useIsClient();
  const [reason, setReason] = useState("");
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onCancel);
  const fieldId = useId();
  const ready = reason.trim().length > 0;

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
      className={`applicant-shell admin-theme ${newsreader.variable} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[500px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{description}</p>
        <label htmlFor={fieldId} className="mt-4 block text-[14px] font-semibold text-(--ap-ink-2)">
          {label}
        </label>
        <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
        <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the vacancy&apos;s activity with your name and the time.</p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSubmit(reason.trim())}
            className={`ap-btn h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto ${tone === "danger" ? "bg-(--ap-rose) text-(--ap-surface) hover:opacity-90" : "ap-btn-p text-white!"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Phone detail pill (spec colours). */
export function VacancyStatusPill({ status }: { status: VacancyStatus }) {
  return <PhonePill tone={pillTone(STATUS_TONE[status])}>{STATUS_LABEL[status]}</PhonePill>;
}
