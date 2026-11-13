"use client";

/**
 * "Edit details" for an outlet: only non-sensitive fields (address, city, phone,
 * notes). The save writes a history entry (who, when, what changed). Phones:
 * bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close.
 */
import { PhoneInput } from "@/components/applicant/form-fields";
import { isValidPhone } from "@/lib/phone/phone";
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import type { OutletEdit } from "@/lib/admin/clients/types";

const label = "mt-4 block text-[13px] font-bold text-(--ap-ink-2)";

export function OutletEditSheet({ initial, busy, error, onCancel, onSave }: { initial: { address: string; city: string; phone: string; notes: string }; busy: boolean; error: string | null; onCancel: () => void; onSave: (edit: OutletEdit) => void }) {
  const isClient = useIsClient();
  const id = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(busy ? undefined : onCancel);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [phone, setPhone] = useState(initial.phone);
  const [notes, setNotes] = useState(initial.notes);
  const ready = !!address.trim() && !!city.trim() && (!phone || isValidPhone(phone)) && !busy;

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
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] min-[768px]:w-[520px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={`${id}-t`} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          Edit outlet details
        </h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-(--ap-muted)">Only address, city, phone and notes. The change is saved in the outlet&apos;s history with your name and the time.</p>
        <label htmlFor={`${id}-a`} className={label}>
          Address
        </label>
        <input id={`${id}-a`} className="ap-input mt-1.5" value={address} maxLength={200} onChange={(e) => setAddress(e.target.value)} />
        <label htmlFor={`${id}-c`} className={label}>
          City
        </label>
        <input id={`${id}-c`} className="ap-input mt-1.5" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
        <label htmlFor={`${id}-p`} className={label}>
          Phone
        </label>
        <div className="mt-1.5">
          <PhoneInput quiet id={`${id}-p`} value={phone} onChange={setPhone} invalid={Boolean(phone) && !isValidPhone(phone)} />
        </div>
        <label htmlFor={`${id}-n`} className={label}>
          Opening notes
        </label>
        <textarea id={`${id}-n`} className="ap-input mt-1.5" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error ? (
          <p role="alert" className="mt-3 text-[14px] font-semibold text-[#C8102E]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button type="button" disabled={!ready} onClick={() => onSave({ address, city, phone, notes })} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
