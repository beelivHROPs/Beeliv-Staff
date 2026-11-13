"use client";

/** Sheets for Resend and Convert to staff (Offers). Withdraw uses the shared ReasonSheet. */
import { useId, useState } from "react";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { useOfferFacets } from "@/lib/admin/offers/hooks";
import type { ConvertInput, OfferDetail } from "@/lib/admin/offers/types";
import { formatYmd } from "./meta";
import { NeedsConfirmation } from "./parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "./Sheet";

export function ResendSheet({ offer, busy, error, onCancel, onSubmit }: { offer: OfferDetail; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (expiresAt: string | null) => void }) {
  const id = useId();
  const expired = offer.status === "expired";
  const [date, setDate] = useState(expired ? "" : (offer.expiresAt ?? ""));
  const ready = !busy && (!expired || !!date);
  return (
    <SheetFrame
      title={expired ? "Resend this expired offer" : "Resend this offer"}
      description={`${offer.applicant.name} gets an in-app notification again. Nothing is emailed in the demo.`}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} disabled={busy} />
          <PrimaryButton disabled={!ready} onClick={() => onSubmit(date || null)}>
            {busy ? "Working..." : "Resend offer"}
          </PrimaryButton>
        </>
      }
    >
      <label htmlFor={id} className={FIELD_LABEL}>
        {expired ? "New response date (required)" : "Respond by (optional change)"}
      </label>
      <div className="mt-1.5">
        <DatePicker id={id} title="Respond by" value={date} onChange={setDate} placeholder="Choose a date" />
      </div>
      {expired ? <p className="mt-1.5 text-[13px] text-(--ap-muted)">The offer expired on {offer.expiresAt ? formatYmd(offer.expiresAt) : "its response date"}. Resending reopens it.</p> : null}
      <div className="mt-3">
        <NeedsConfirmation>Whether an expired offer can be reopened, or must be re-approved by Operations.</NeedsConfirmation>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}

function Check2({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-(--ap-line) p-3 text-[14px] leading-snug text-(--ap-ink-2)">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-(--ap-violet)" />
      <span>{children}</span>
    </label>
  );
}

/**
 * Convert to staff: the guided step after Accepted. It adds the staff
 * entitlement to the SAME person (no second account, no second person) and
 * creates a PENDING staff-activation record with the first assignment. Staff
 * access itself switches on at the approved lifecycle point (spec 23.4), which
 * needs Beeliv confirmation.
 */
export function ConvertSheet({ offer, busy, error, onCancel, onSubmit }: { offer: OfferDetail; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (input: ConvertInput) => void }) {
  const uid = useId();
  const facets = useOfferFacets().data;
  const [same, setSame] = useState(false);
  const [dup, setDup] = useState(false);
  const [clientId, setClientId] = useState(offer.clientId);
  const [outletId, setOutletId] = useState(offer.outletId);
  const [role, setRole] = useState(offer.role);
  const [start, setStart] = useState(offer.startDate);
  const ready = same && dup && !!clientId && !!outletId && !!role && !!start && !busy;
  return (
    <SheetFrame
      title="Convert to staff"
      description={`${offer.applicant.name} accepted the offer. This adds staff access to the same person and records their first assignment.`}
      busy={busy}
      onClose={onCancel}
      width={560}
      footer={
        <>
          <CancelButton onClick={onCancel} disabled={busy} />
          <PrimaryButton disabled={!ready} onClick={() => onSubmit({ confirmSamePerson: same, confirmNoDuplicate: dup, clientId, outletId, role, startDate: start })}>
            {busy ? "Working..." : "Create pending activation"}
          </PrimaryButton>
        </>
      }
    >
      <ol className="m-0 mt-4 list-decimal pl-5 text-[14px] leading-snug text-(--ap-ink-2)">
        <li>Confirm the person.</li>
        <li>Check the first assignment.</li>
        <li>A pending staff-activation record is created and written to history.</li>
      </ol>
      <Check2 id={`${uid}-same`} checked={same} onChange={setSame}>
        Applicant and Staff access are on the <b>same person</b>: {offer.applicant.name}. Their applications, documents and history stay linked.
      </Check2>
      <Check2 id={`${uid}-dup`} checked={dup} onChange={setDup}>
        I checked there is <b>no duplicate account</b> or second person record for them.
      </Check2>

      <span className={FIELD_LABEL}>Client</span>
      <SelectMenu
        label="Client"
        value={clientId}
        onChange={(v) => {
          setClientId(v);
          setOutletId("");
        }}
        options={(facets?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
        className="mt-1.5"
      />
      <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
        <div>
          <span className={FIELD_LABEL}>Outlet</span>
          <SelectMenu label="Outlet" value={outletId} placeholder="Choose an outlet" onChange={setOutletId} options={(facets?.outlets ?? []).filter((o) => o.clientId === clientId).map((o) => ({ value: o.id, label: o.name }))} className="mt-1.5" />
        </div>
        <div>
          <span className={FIELD_LABEL}>Role</span>
          <SelectMenu label="Role" value={role} onChange={setRole} options={facets?.roles ?? []} className="mt-1.5" />
        </div>
      </div>
      <label htmlFor={`${uid}-start`} className={FIELD_LABEL}>
        Start date
      </label>
      <div className="mt-1.5">
        <DatePicker id={`${uid}-start`} title="Start date" value={start} onChange={setStart} placeholder="Choose a date" />
      </div>
      <div className="mt-3">
        <NeedsConfirmation>Which lifecycle point switches staff access on (Accepted, Placed or Onboarding), and who confirms the placement.</NeedsConfirmation>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}
