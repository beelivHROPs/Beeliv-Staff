"use client";

/**
 * Small shared pieces for Client Review and Client Requests. Built new only
 * because the existing Admin dialogs (ReasonDialog, ReasonSheet) take a single
 * text box; the Submit and Record-feedback sheets need a select and several
 * fields. Uses ADMIN_THEME so dark mode works inside the portal.
 */
import Link from "next/link";
import { useEffect, useId, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { Disc } from "@/components/admin/overview/Disc";
import { Check, ChevronLeft, Exclaim, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { PageHeading } from "@/components/applicant/primitives";
import { useNoticeSound } from "@/lib/admin/use-notice-sound";

export type Notice = { kind: "ok" | "error"; text: string };

export function NoticeBanner({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  useNoticeSound(notice?.kind ?? null, notice?.text ?? "");
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

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> {label}
    </Link>
  );
}

export function ListSkeleton({ title, rows = 5 }: { title: string; rows?: number }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <PageHeading title={title} />
      <div className={`${sk} mb-3 h-12`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${sk} h-[76px]`} />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton({ label }: { label: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
      <h1 className="sr-only">{label}</h1>
      <div className={`${sk} mb-3 h-6 w-32`} />
      <div className={`${sk} mb-4 h-[150px] w-full`} />
      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className={`${sk} h-[300px]`} />
        <div className={`${sk} h-[300px]`} />
      </div>
    </div>
  );
}

export const SHEET_BTN = "h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto";
export const DANGER_BTN = "ap-btn-danger";

/** Modal sheet. Phones: bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close. */
export function Sheet({
  title,
  description,
  onCancel,
  onSubmit,
  confirmLabel,
  ready,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onSubmit: () => void;
  confirmLabel: string;
  ready: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const isClient = useIsClient();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onCancel);
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
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[520px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{description}</p>
        <div className="mt-4 flex flex-col gap-4">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" onClick={onCancel} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={!ready} onClick={onSubmit} className={`ap-btn ${SHEET_BTN} ${danger ? DANGER_BTN : "ap-btn-p text-white!"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Label + textarea pair used inside sheets. */
export function TextField({ label, value, onChange, hint, required = false, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean; rows?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-(--ap-ink-2)">
        {label}
        {required ? "" : " (optional)"}
      </label>
      <textarea id={id} className="ap-input mt-1.5" rows={rows} value={value} maxLength={1000} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="mt-1.5 text-[13px] text-(--ap-muted)">{hint}</p> : null}
    </div>
  );
}

export function SelectField({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      <div className="mt-1.5">{children(id)}</div>
    </div>
  );
}
