"use client";

/** Shared pieces of the invite sheets: a checkbox row and the result panel that shows the invitation link. */
import { useState, type ReactNode } from "react";
import { PrimaryButton } from "@/components/admin/offers/Sheet";
import { Disc } from "@/components/admin/overview/Disc";
import { Check, Exclaim } from "@/components/applicant/icons";
import { sendInvitation } from "@/lib/admin/team-access/hooks";
import type { Invitation } from "@/lib/admin/team-access/types";

export function Checkbox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-(--ap-line) px-3 py-2 text-[14px] text-(--ap-ink-2)">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 shrink-0 accent-(--ap-violet)" />
      <span className="min-w-0 break-words">{children}</span>
    </label>
  );
}

/**
 * After a record and its invitation are created: the invitation is NOT sent
 * automatically. Sending is an explicit action ("Send invitation"). No link is
 * shown or put in a mailto: here: the raw link appears once, only in
 * AccessLinkSheet ("Create access link" in Invitations). The system itself
 * emails nothing in the demo ("Email delivery is connected later").
 */
export function InviteLinkResult({ inv: first, onClose }: { inv: Invitation; onClose: () => void }) {
  const [inv, setInv] = useState(first);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sent = inv.delivery.status !== "not-sent";
  async function send() {
    setBusy(true);
    setError(null);
    try {
      setInv(await sendInvitation(inv.id));
    } catch {
      setError("We could not send the invitation. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className={`mt-4 flex items-start gap-3 rounded-xl p-3.5 ${sent ? "bg-(--ap-ok-bg)" : "bg-(--ap-warn-bg)"}`}>
        <Disc icon={sent ? Check : Exclaim} tone={sent ? "ok" : "pending"} />
        <p className="min-w-0 text-[14px] leading-snug text-(--ap-ink)">
          {sent ? (
            <>
              <b>Invitation sent (recorded)</b> for {inv.name} ({inv.email}). Email delivery is connected later, so nothing was emailed. You can resend or revoke it from Invitations.
            </>
          ) : (
            <>
              <b>Record created. The invitation has not been sent.</b> Choose Send invitation, or create an access link from Invitations. Nothing is sent automatically.
            </>
          )}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2.5 min-[560px]:flex-row min-[560px]:flex-wrap">
        {!sent ? (
          <button type="button" disabled={busy} onClick={send} className="ap-btn ap-btn-p h-12 text-[15px] font-semibold text-white! min-[560px]:h-11">
            {busy ? "Working..." : "Send invitation"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-(--ap-muted)" role="status">
          The access link is shown once, only when you create it from Invitations.
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={onClose}>{sent ? "Done" : "Close without sending"}</PrimaryButton>
      </div>
    </div>
  );
}
