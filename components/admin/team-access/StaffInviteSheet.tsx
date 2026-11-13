"use client";

/**
 * Invite staff: Beeliv creates a minimal legacy staff record (name, contact,
 * role, client / outlet, start date), checks for duplicates, shows a review
 * step, and only then creates the record and its invitation. The invitation is
 * NEVER sent automatically: the next screen has an explicit "Send invitation".
 * Existing staff are not imported; they receive a link and onboard themselves
 * (auth-and-invitations contract section 5). No recruitment history is invented.
 */
import { playAdminSound } from "@/lib/admin/sound";
import { useId, useState } from "react";
import { NeedsConfirmation } from "@/components/admin/offers/parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { findDuplicates, inviteUser } from "@/lib/admin/team-access/hooks";
import type { DuplicateMatch, Invitation, InvitePrefill, TeamFacets } from "@/lib/admin/team-access/types";
import { formatDate } from "@/lib/applicant/time";
import { PhoneInput } from "@/components/applicant/form-fields";
import { canonicalAccountPhone, validateOptionalAccountPhone } from "@/lib/public-site/auth-rules";
import { Checkbox, InviteLinkResult } from "./InviteParts";

const STEPS = ["Details", "Review"];
/** Generic on purpose: never names or describes the other account. No "different person" bypass for a phone. */
const PHONE_TAKEN = "This phone number can't be used for a new record. Check the number, or ask an authorised administrator to review it.";

export function StaffWizard({ facets, prefill, onClose, onDone }: { facets: TeamFacets; prefill?: InvitePrefill; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  const uid = useId();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [role, setRole] = useState("");
  const [clientId, setClientId] = useState(prefill?.clientId ?? "");
  const [outletId, setOutletId] = useState(prefill?.outletIds?.[0] ?? "");
  const [start, setStart] = useState("");
  const [checking, setChecking] = useState(false);
  const [dupes, setDupes] = useState<DuplicateMatch[] | null>(null);
  const [differentPerson, setDifferentPerson] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Invitation | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const outlets = facets.outlets.filter((o) => o.clientId === clientId);
  // Phone is optional here, but when given it must be canonical international (explicit country code).
  const phoneError = validateOptionalAccountPhone(phone);
  const detailsOk = !!name.trim() && emailOk && !phoneError && !!role && !!clientId && !!outletId && !!start;
  const exact = (dupes ?? []).filter((d) => d.match === "exact");
  const phoneTaken = (dupes ?? []).some((d) => d.match === "phone");
  const similar = (dupes ?? []).filter((d) => d.match === "similar");
  const clientName = facets.clients.find((c) => c.id === clientId)?.name ?? "";
  const outletName = outlets.find((o) => o.id === outletId)?.name ?? "";

  async function next() {
    setChecking(true);
    setError(null);
    try {
      const found = await findDuplicates({ name, email, phone: canonicalAccountPhone(phone) ?? "" });
      setDupes(found);
      // Email and phone matches always block. Only a same-name match can be confirmed as a different person.
      if (!found.some((d) => d.match === "exact" || d.match === "phone") && (!found.some((d) => d.match === "similar") || differentPerson)) setStep(1);
    } catch {
      setError("We could not check for duplicates. Nothing was changed. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const inv = await inviteUser({ kind: "staff", name, email, phone: canonicalAccountPhone(phone) ?? undefined, staffRole: role, clientId, outletIds: [outletId], startDate: start, allClients: false, scopeClientIds: [], expiresInDays: 7 });
      setSent(inv);
      playAdminSound("saved"); // invitation created (the confirmation screen is already showing)
      onDone?.(inv);
    } catch (e) {
      setError(e instanceof Error && e.message === "duplicate" ? "That email already has an account or a pending invitation." : e instanceof Error && e.message === "phone-duplicate" ? PHONE_TAKEN : "We could not create the staff record. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <SheetFrame title="Staff record created" onClose={onClose} width={560} footer={null}>
        <InviteLinkResult inv={sent} onClose={onClose} />
      </SheetFrame>
    );
  }

  return (
    <SheetFrame
      title={`Invite staff: ${STEPS[step]}`}
      description={<>Step {step + 1} of 2. This creates a minimal staff record and an invitation. The person confirms the rest themselves. Nothing is sent until you choose Send invitation.</>}
      onClose={onClose}
      busy={busy || checking}
      width={560}
      footer={
        <>
          {step === 0 ? <CancelButton onClick={onClose} /> : <CancelButton onClick={() => setStep(0)} disabled={busy} label="Back" />}
          {step === 0 ? (
            <PrimaryButton disabled={!detailsOk || checking} onClick={next}>
              {checking ? "Checking..." : "Check and review"}
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={busy} onClick={create}>
              {busy ? "Working..." : "Create record"}
            </PrimaryButton>
          )}
        </>
      }
    >
      {step === 0 ? (
        <>
          <label htmlFor={`${uid}-n`} className={FIELD_LABEL}>
            Full name
          </label>
          <input id={`${uid}-n`} className="ap-input mt-1.5" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setDupes(null); }} />
          <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-e`} className={FIELD_LABEL}>
                Email address
              </label>
              <input id={`${uid}-e`} type="email" className="ap-input mt-1.5" value={email} maxLength={120} aria-invalid={!!email && !emailOk} onChange={(e) => { setEmail(e.target.value); setDupes(null); }} />
              {email && !emailOk ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">Enter a valid email address.</p> : null}
            </div>
            <div>
              <label htmlFor={`${uid}-p`} className={FIELD_LABEL}>
                Phone (optional)
              </label>
              <div className="mt-1.5">
                <PhoneInput quiet id={`${uid}-p`} value={phone} invalid={phoneTouched && !!phoneError} onBlur={() => setPhoneTouched(true)} onChange={(v) => { setPhone(v); setDupes(null); }} />
              </div>
              {phoneTouched && phoneError ?<p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{phoneError}</p> : null}
            </div>
          </div>
          <span className={FIELD_LABEL}>Role</span>
          <SelectMenu label="Role" value={role} placeholder="Choose a role" onChange={setRole} options={facets.staffRoles} className="mt-1.5" />
          <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
            <div>
              <span className={FIELD_LABEL}>Client</span>
              <SelectMenu label="Client" value={clientId} placeholder="Choose a client" onChange={(v) => { setClientId(v); setOutletId(""); }} options={facets.clients.map((c) => ({ value: c.id, label: c.name }))} className="mt-1.5" />
            </div>
            <div>
              <span className={FIELD_LABEL}>Outlet</span>
              <SelectMenu label="Outlet" value={outletId} placeholder={clientId ? "Choose an outlet" : "Choose a client first"} onChange={setOutletId} options={outlets.map((o) => ({ value: o.id, label: o.name }))} className="mt-1.5" />
            </div>
          </div>
          <label htmlFor={`${uid}-sd`} className={FIELD_LABEL}>
            Start date
          </label>
          <div className="mt-1.5">
            <DatePicker id={`${uid}-sd`} title="Start date" value={start} onChange={setStart} placeholder="Choose a date" />
          </div>

          {exact.length > 0 ? (
            <div role="alert" className="mt-4 rounded-xl bg-(--ap-rose-bg) p-3.5 text-[14px] leading-snug text-(--ap-ink)">
              <b>This email already exists, so a second record cannot be created.</b>
              <ul className="m-0 mt-1.5 list-none p-0">
                {exact.map((d) => (
                  <li key={d.id}>
                    {d.name} ({d.email}): {d.where}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {phoneTaken ? (
            <div role="alert" className="mt-4 rounded-xl bg-(--ap-rose-bg) p-3.5 text-[14px] leading-snug text-(--ap-ink)">
              <b>{PHONE_TAKEN}</b>
            </div>
          ) : null}
          {exact.length === 0 && !phoneTaken && similar.length > 0 ? (
            <div role="alert" className="mt-4 rounded-xl bg-(--ap-warn-bg) p-3.5 text-[14px] leading-snug text-(--ap-ink)">
              <b>Someone with the same name already exists.</b>
              <ul className="m-0 mt-1.5 mb-2 list-none p-0">
                {similar.map((d) => (
                  <li key={d.id}>
                    {d.name} ({d.email}): {d.where}
                  </li>
                ))}
              </ul>
              <Checkbox id={`${uid}-diff`} checked={differentPerson} onChange={setDifferentPerson}>
                This is a different person. Continue.
              </Checkbox>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3 text-[14px] leading-snug text-(--ap-ink-2)">
          <div className="rounded-xl bg-(--ap-tint-soft) p-3.5">
            <b className="block text-[15px] text-(--ap-ink)">{name}</b>
            {email}
            {phone ? <span className="block">{phone}</span> : null}
          </div>
          <div className="rounded-xl bg-(--ap-tint-soft) p-3.5">
            <b className="block text-(--ap-ink)">{role}</b>
            {clientName}, {outletName}
            <span className="block">Starts {formatDate(start)}</span>
          </div>
          <p className="text-[13px] text-(--ap-muted)">No duplicate was found. Creating the record does not send anything: on the next screen you choose Send invitation. The person uses the same Talent account as applicants; no recruitment history is invented.</p>
          <NeedsConfirmation>Which fields a legacy staff record must have before an invitation.</NeedsConfirmation>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}
