"use client";

/**
 * Note-required action sheet for Hold, Reject and Request More Information.
 * (components/applicant/ConfirmDialog has no text field, so the note is
 * collected here; plain confirmations such as Shortlist use confirmAction.)
 * Phones: bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close.
 */
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";

export interface NoteSheetConfig {
  title: string;
  description: string;
  label: string;
  confirmLabel: string;
  tone: "danger" | "neutral";
  /** The note is optional (e.g. Move to Talent Pool). */
  noteOptional?: boolean;
}

export function NoteSheet({ config, busy, error, onCancel, onSubmit }: { config: NoteSheetConfig; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (note: string) => void }) {
  const isClient = useIsClient();
  const [note, setNote] = useState("");
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(busy ? undefined : onCancel);
  const fieldId = useId();
  const ready = (config.noteOptional || note.trim().length > 0) && !busy;

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
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] min-[768px]:w-[500px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {config.title}
        </h2>
        <p className="mt-2 text-[15px] leading-[1.6] text-(--ap-muted)">{config.description}</p>
        <label htmlFor={fieldId} className="mt-4 block text-sm font-semibold text-(--ap-ink-2)">
          {config.label}
        </label>
        <textarea id={fieldId} autoFocus className="ap-input mt-1.5" rows={4} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the applicant&apos;s activity history with your name and the time.</p>
        {error ? (
          <p role="alert" className="mt-3 text-[15px] font-semibold text-(--ap-rose)">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onSubmit(note.trim())}
            className={`ap-btn h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto ${config.tone === "danger" ? "bg-(--ap-rose) text-(--ap-surface) hover:opacity-90" : "ap-btn-p text-white!"}`}
          >
            {busy ? "Working..." : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
