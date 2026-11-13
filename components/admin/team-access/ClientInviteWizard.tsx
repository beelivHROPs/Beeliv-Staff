"use client";

/**
 * Invite client: Beeliv creates the client AND its outlets inside the invite.
 * Steps: 1 Business details, 2 Outlets (at least one), 3 Who to invite
 * (contact, access level, which outlets), 4 Review. Creating records the
 * client, its outlets and a pending invitation, then shows the invite link
 * (Copy link, Open in my email app). Existing clients are not imported: they
 * receive a link and onboard themselves. Nothing is emailed.
 */
import { useId, useState } from "react";
import { NeedsConfirmation } from "@/components/admin/offers/parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { Plus, Trash2 } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { playAdminSound } from "@/lib/admin/sound";
import { inviteUser } from "@/lib/admin/team-access/hooks";
import type { Invitation, TeamFacets } from "@/lib/admin/team-access/types";
import { Checkbox, InviteLinkResult } from "./InviteParts";

type OutletDraft = { name: string; address: string; city: string };
const STEP_TITLE = ["Business details", "Outlets", "Who to invite", "Review"];

export function ClientWizard({ facets, onClose, onDone }: { facets: TeamFacets; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  const uid = useId();
  const [step, setStep] = useState(0);
  const [bName, setBName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [bCity, setBCity] = useState("");
  const [bAddr, setBAddr] = useState("");
  const [outlets, setOutlets] = useState<OutletDraft[]>([{ name: "", address: "", city: "" }]);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [levelId, setLevelId] = useState("");
  const [access, setAccess] = useState<number[]>([0]);
  const [days, setDays] = useState(String(facets.expiryOptions[1]?.days ?? facets.expiryOptions[0]?.days ?? 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Invitation | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(cEmail.trim());
  const outletsOk = outlets.length > 0 && outlets.every((o) => o.name.trim() && o.city.trim());
  const valid = [!!bName.trim() && !!typeId && !!bCity.trim(), outletsOk, !!cName.trim() && emailOk && !!levelId && access.length > 0, true][step];
  const setOutlet = (i: number, patch: Partial<OutletDraft>) => setOutlets(outlets.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const removeOutlet = (i: number) => {
    setOutlets(outlets.filter((_, j) => j !== i));
    setAccess(access.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };
  const typeName = facets.clientTypes.find((t) => t.id === typeId)?.name ?? "";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const inv = await inviteUser({
        kind: "client",
        name: cName,
        email: cEmail,
        accessLevelId: levelId,
        outletIds: [],
        allClients: false,
        scopeClientIds: [],
        expiresInDays: Number(days),
        newClient: { name: bName, typeId, city: bCity, address: bAddr, outlets, accessOutletIdx: access },
      });
      setSent(inv);
      playAdminSound("saved"); // invitation created (the confirmation screen is already showing)
      onDone?.(inv);
    } catch (e) {
      setError(e instanceof Error && e.message === "duplicate" ? "That email already has an account or a pending invitation. Resend or revoke the existing invitation instead." : "We could not create the client and invitation. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <SheetFrame title="Client invited" onClose={onClose} width={560} footer={null}>
        <InviteLinkResult inv={sent} onClose={onClose} />
      </SheetFrame>
    );
  }

  return (
    <SheetFrame
      title={`Invite client: ${STEP_TITLE[step]}`}
      description={<>Step {step + 1} of 4. Beeliv creates the client and its outlets here; the client only sets personal items after opening the link.</>}
      onClose={onClose}
      busy={busy}
      width={580}
      footer={
        <>
          {step === 0 ? <CancelButton onClick={onClose} /> : <CancelButton onClick={() => setStep(step - 1)} disabled={busy} label="Back" />}
          {step < 3 ? (
            <PrimaryButton disabled={!valid} onClick={() => setStep(step + 1)}>
              Next
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={busy} onClick={submit}>
              {busy ? "Working..." : "Create client and invitation"}
            </PrimaryButton>
          )}
        </>
      }
    >
      {step === 0 ? (
        <>
          <label htmlFor={`${uid}-bn`} className={FIELD_LABEL}>
            Business name
          </label>
          <input id={`${uid}-bn`} className="ap-input mt-1.5" value={bName} maxLength={100} onChange={(e) => setBName(e.target.value)} />
          <span className={FIELD_LABEL}>Business type</span>
          <SelectMenu label="Business type" value={typeId} placeholder="Choose a type" onChange={setTypeId} options={facets.clientTypes.map((t) => ({ value: t.id, label: t.name }))} className="mt-1.5" />
          <label htmlFor={`${uid}-bc`} className={FIELD_LABEL}>
            City
          </label>
          <input id={`${uid}-bc`} className="ap-input mt-1.5" value={bCity} maxLength={80} onChange={(e) => setBCity(e.target.value)} />
          <label htmlFor={`${uid}-ba`} className={FIELD_LABEL}>
            Head office address (optional)
          </label>
          <input id={`${uid}-ba`} className="ap-input mt-1.5" value={bAddr} maxLength={160} onChange={(e) => setBAddr(e.target.value)} />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {outlets.map((o, i) => (
              <li key={i} className="rounded-xl border border-(--ap-line) p-3">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[14px]">Outlet {i + 1}</b>
                  <button type="button" aria-label={`Remove outlet ${i + 1}`} disabled={outlets.length <= 1} onClick={() => removeOutlet(i)} className="ap-hit flex size-9 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2) disabled:opacity-40">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <input aria-label={`Outlet ${i + 1} name`} placeholder="Outlet name" className="ap-input mt-2" value={o.name} maxLength={80} onChange={(e) => setOutlet(i, { name: e.target.value })} />
                <div className="mt-2 grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
                  <input aria-label={`Outlet ${i + 1} address`} placeholder="Address (optional)" className="ap-input" value={o.address} maxLength={160} onChange={(e) => setOutlet(i, { address: e.target.value })} />
                  <input aria-label={`Outlet ${i + 1} city`} placeholder="City" className="ap-input" value={o.city} maxLength={80} onChange={(e) => setOutlet(i, { city: e.target.value })} />
                </div>
              </li>
            ))}
          </ul>
          {!outletsOk ? <p className="mt-2 text-[13px] text-(--ap-muted)">At least one outlet is required, each with a name and a city.</p> : null}
          <button type="button" onClick={() => setOutlets([...outlets, { name: "", address: "", city: bCity }])} className="ap-btn ap-btn-s ap-btn-sm mt-3">
            <Plus className="size-4" aria-hidden="true" /> Add another outlet
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <label htmlFor={`${uid}-cn`} className={FIELD_LABEL}>
            Contact name
          </label>
          <input id={`${uid}-cn`} className="ap-input mt-1.5" value={cName} maxLength={80} onChange={(e) => setCName(e.target.value)} />
          <label htmlFor={`${uid}-ce`} className={FIELD_LABEL}>
            Contact email
          </label>
          <input id={`${uid}-ce`} type="email" className="ap-input mt-1.5" value={cEmail} maxLength={120} onChange={(e) => setCEmail(e.target.value)} aria-invalid={!!cEmail && !emailOk} />
          {cEmail && !emailOk ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">Enter a valid email address.</p> : null}
          <span className={FIELD_LABEL}>Access level</span>
          <SelectMenu label="Access level" value={levelId} placeholder="Choose an access level" onChange={setLevelId} options={facets.accessLevels.map((l) => ({ value: l.id, label: l.name }))} className="mt-1.5" />
          <span className={FIELD_LABEL}>Outlets this person can see</span>
          <div className="mt-1.5 flex flex-col gap-2">
            {outlets.map((o, i) => (
              <Checkbox key={i} id={`${uid}-a${i}`} checked={access.includes(i)} onChange={() => setAccess(access.includes(i) ? access.filter((x) => x !== i) : [...access, i])}>
                {o.name || `Outlet ${i + 1}`}
              </Checkbox>
            ))}
          </div>
          <span className={FIELD_LABEL}>Invitation expires after</span>
          <SelectMenu label="Invitation expiry" value={days} onChange={setDays} options={facets.expiryOptions.map((o) => ({ value: String(o.days), label: o.label }))} className="mt-1.5" />
          <div className="mt-3">
            <NeedsConfirmation>What each client access level may do.</NeedsConfirmation>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 flex flex-col gap-3 text-[14px] leading-snug text-(--ap-ink-2)">
          <div className="rounded-xl bg-(--ap-tint-soft) p-3.5">
            <b className="block text-[15px] text-(--ap-ink)">{bName}</b>
            {typeName}, {bCity}
            {bAddr ? <span className="block">{bAddr}</span> : null}
          </div>
          <div className="rounded-xl bg-(--ap-tint-soft) p-3.5">
            <b className="block text-(--ap-ink)">{outlets.length === 1 ? "1 outlet" : `${outlets.length} outlets`}</b>
            <ul className="m-0 mt-1 list-none p-0">
              {outlets.map((o, i) => (
                <li key={i}>
                  {o.name}, {o.city}
                  {o.address ? `, ${o.address}` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-(--ap-tint-soft) p-3.5">
            <b className="block text-(--ap-ink)">{cName}</b>
            {cEmail}
            <span className="block">
              {facets.accessLevels.find((l) => l.id === levelId)?.name} · sees {access.map((i) => outlets[i]?.name || `Outlet ${i + 1}`).join(", ")}
            </span>
          </div>
          <p className="text-[13px] text-(--ap-muted)">Creating this adds the client and its outlets and an invitation that is NOT sent yet. On the next screen you choose Send invitation, or copy the link. Email delivery is connected later; nothing is emailed.</p>
          {error ? (
            <p role="alert" className="text-[14px] font-semibold text-(--ap-rose)">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </SheetFrame>
  );
}
