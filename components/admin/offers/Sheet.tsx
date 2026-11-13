"use client";

/**
 * Shared sheet shell for the Offers, Team & Access and Reports screens: phones
 * get a bottom sheet, tablet and up a centred card. Esc / backdrop / Cancel
 * close (unless `busy`). Surface tokens only, so dark mode works. Also exports
 * ReasonSheet (a reason is required and recorded in the record's history).
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { useIsClient } from "@/components/applicant/motion";

export function SheetFrame({
  title,
  description,
  onClose,
  busy = false,
  width = 520,
  footer,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  width?: number;
  footer: ReactNode;
  children: ReactNode;
}) {
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
        style={{ maxWidth: width }}
        className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:rounded-[22px] min-[768px]:p-7"
      >
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {title}
        </h2>
        {description ? <div className="mt-2 text-[14px] leading-[1.55] text-(--ap-muted)">{description}</div> : null}
        {children}
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

export const FIELD_LABEL = "mt-4 block text-[13px] font-bold text-(--ap-ink-2)";
export const BTN_WIDE = "h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto";

export function CancelButton({ onClick, disabled, label = "Cancel" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`ap-btn ap-btn-s ${BTN_WIDE}`}>
      {label}
    </button>
  );
}

export function PrimaryButton({ onClick, disabled, children, danger = false }: { onClick: () => void; disabled?: boolean; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`ap-btn ${BTN_WIDE} ${danger ? "ap-btn-danger" : "ap-btn-p text-white!"}`}>
      {children}
    </button>
  );
}

export function ReasonSheet({
  title,
  description,
  label = "Reason",
  confirmLabel,
  danger = false,
  busy = false,
  error,
  onCancel,
  onSubmit,
}: {
  title: string;
  description?: ReactNode;
  label?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const fieldId = useId();
  return (
    <SheetFrame
      title={title}
      description={description}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <CancelButton onClick={onCancel} disabled={busy} />
          <PrimaryButton danger={danger} disabled={busy || reason.trim().length === 0} onClick={() => onSubmit(reason.trim())}>
            {busy ? "Working..." : confirmLabel}
          </PrimaryButton>
        </>
      }
    >
      <label htmlFor={fieldId} className={FIELD_LABEL}>
        {label}
      </label>
      <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
      <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the history with your name and the time.</p>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}
