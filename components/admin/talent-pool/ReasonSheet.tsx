"use client";

/**
 * Reason-required sheet for the two Talent Pool actions. confirmAction has no
 * text field, so the reason (and, for "Add to vacancy", the vacancy) is
 * collected here; the final yes/no then goes through confirmAction.
 * Phones: bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close.
 */
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { SelectMenu } from "@/components/applicant/SelectMenu";

export interface ReasonSheetConfig {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "neutral";
  /** When set, the sheet also asks which vacancy. */
  vacancies?: { value: string; label: string }[];
}

export function ReasonSheet({ config, onCancel, onSubmit }: { config: ReasonSheetConfig; onCancel: () => void; onSubmit: (reason: string, vacancyId: string) => void }) {
  const isClient = useIsClient();
  const [reason, setReason] = useState("");
  const [vacancyId, setVacancyId] = useState("");
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onCancel);
  const fieldId = useId();
  const ready = reason.trim().length > 0 && (!config.vacancies || vacancyId !== "");

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
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[500px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {config.title}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{config.description}</p>
        {config.vacancies ? (
          <div className="mt-4">
            <span className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">Vacancy</span>
            <SelectMenu label="Vacancy" placeholder="Choose a vacancy" value={vacancyId} onChange={setVacancyId} options={config.vacancies} />
          </div>
        ) : null}
        <label htmlFor={fieldId} className="mt-4 block text-[14px] font-semibold text-(--ap-ink-2)">
          Reason
        </label>
        <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
        <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the applicant&apos;s activity history with your name and the time.</p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSubmit(reason.trim(), vacancyId)}
            className={`ap-btn h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto ${config.tone === "danger" ? "bg-(--ap-rose) text-(--ap-surface) hover:opacity-90" : "ap-btn-p text-white!"}`}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
