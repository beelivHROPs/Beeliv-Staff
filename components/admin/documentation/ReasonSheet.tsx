"use client";

/**
 * Reason-required sheet for "Request resubmission". confirmAction has no text
 * field, so the reason is collected here and the final yes/no goes through
 * confirmAction. Phones: bottom sheet. Tablet and up: centred card.
 * Esc / backdrop / Cancel close. Uses surface tokens so dark mode works.
 */
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { useIsClient } from "@/components/applicant/motion";

export function ReasonSheet({ title, description, confirmLabel, onCancel, onSubmit }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onSubmit: (reason: string) => void }) {
  const isClient = useIsClient();
  const [reason, setReason] = useState("");
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onCancel);
  const fieldId = useId();

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
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[500px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{description}</p>
        <label htmlFor={fieldId} className="mt-4 block text-[14px] font-semibold text-(--ap-ink-2)">
          Reason
        </label>
        <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
        <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the document history with your name and the time.</p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button type="button" disabled={reason.trim().length === 0} onClick={() => onSubmit(reason.trim())} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
