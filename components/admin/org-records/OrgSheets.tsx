"use client";

/**
 * Sheets for the org-records actions: Add / Edit client, Add outlet, Deactivate (client or outlet, reason required),
 * Add staff member. Same shell as OutletEditSheet / ReasonSheet (bottom sheet on phones, centred card from tablet up,
 * Esc / backdrop / Cancel close, focus trapped). They collect input only: the caller runs the write and passes back
 * `busy` and a plain-language `error`. Staff ID, references, status and revision are never fields here.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { PhoneInput } from "@/components/applicant/form-fields";
import { useIsClient } from "@/components/applicant/motion";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { useRoles } from "@/lib/admin/lists/store";
import { loadPlacementChoices, type PlacementChoice } from "@/lib/admin/org-records/live";
import type { ClientFields, OutletFields, StaffFields } from "@/lib/admin/org-records/writes";
import { orgErrorMessage } from "@/lib/admin/org-records/transport";
import { checkPhone, isValidPhone } from "@/lib/phone/phone";

const LABEL = "mt-4 block text-[13px] font-bold text-(--ap-ink-2)";
const HINT = "mt-1.5 text-[13px] text-(--ap-muted)";

function Shell({ title, description, busy, error, submitLabel, ready, onCancel, onSubmit, tone = "primary", children }: {
  title: string; description?: string; busy: boolean; error: string | null; submitLabel: string; ready: boolean; onCancel: () => void; onSubmit: () => void; tone?: "primary" | "danger"; children: ReactNode;
}) {
  const isClient = useIsClient();
  const id = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(busy ? undefined : onCancel);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (!isClient) return null;
  return createPortal(
    <div
      className={`${ADMIN_THEME} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[540px] min-[768px]:rounded-[22px] min-[768px]:p-7">
      <form onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }}>
        <h2 id={`${id}-t`} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">{title}</h2>
        {description ? <p className="mt-2 text-[14px] leading-[1.55] text-(--ap-muted)">{description}</p> : null}
        {children}
        {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-[#C8102E]">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">Cancel</button>
          <button type="submit" disabled={!ready || busy} className={`ap-btn ${tone === "danger" ? "ap-btn-s" : "ap-btn-p"} h-12 w-full text-[15px] font-semibold ${tone === "danger" ? "text-[#C8102E]!" : "text-white!"} min-[768px]:h-11 min-[768px]:w-auto`}>
            {busy ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, value, onChange, max, required, list, hint, disabled, type = "text" }: { label: string; value: string; onChange: (v: string) => void; max: number; required?: boolean; list?: string; hint?: string; disabled?: boolean; type?: string }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className={LABEL}>{label}{required ? "" : " (optional)"}</label>
      <input id={id} type={type} className="ap-input mt-1.5" value={value} maxLength={max} list={list} disabled={disabled} required={required} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className={HINT}>{hint}</p> : null}
    </>
  );
}
function PhoneField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className={LABEL}>{label} (optional)</label>
      <div className="mt-1.5"><PhoneInput quiet id={id} value={value} onChange={onChange} invalid={Boolean(value) && !isValidPhone(value)} /></div>
    </>
  );
}
/** "" for empty, the canonical +digits for a valid number, null for a partly typed one. */
const canonicalPhone = (v: string): string | null => (v.trim() === "" ? "" : isValidPhone(v) ? checkPhone(v).canonical : null);

const BUSINESS_TYPES = ["Restaurant", "Hotel", "Lounge or bar", "Cafe", "Event centre", "Catering business"];

/* ---------------------------------------- client ---------------------------------------- */

export function ClientSheet({ mode, initial, busy, error, onCancel, onSubmit }: {
  mode: "add" | "edit"; initial?: ClientFields; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (v: ClientFields) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [businessType, setType] = useState(initial?.businessType ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const listId = useId();
  const ready = name.trim().length >= 2 && !!businessType.trim() && !!city.trim();
  return (
    <Shell
      title={mode === "add" ? "Add client" : "Edit client details"} busy={busy} error={error} ready={ready} submitLabel={mode === "add" ? "Add client" : "Save"} onCancel={onCancel}
      description={mode === "add" ? "Business details only. The client ID is created for you, and nobody is invited or emailed." : "Business details only. The change is recorded with your name and the time."}
      onSubmit={() => onSubmit({ name, businessType, city, address })}
    >
      <Field label="Business name" required value={name} onChange={setName} max={200} />
      <Field label="Type of business" required value={businessType} onChange={setType} max={120} list={listId} />
      <datalist id={listId}>{BUSINESS_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      <Field label="City" required value={city} onChange={setCity} max={120} />
      <Field label="Address" value={address} onChange={setAddress} max={300} />
    </Shell>
  );
}

/* ---------------------------------------- outlet ---------------------------------------- */

export function OutletSheet({ clientName, busy, error, onCancel, onSubmit }: { clientName: string; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (v: OutletFields) => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [manager, setManager] = useState("");
  const [notes, setNotes] = useState("");
  const notesId = useId();
  const canon = canonicalPhone(phone);
  const ready = !!name.trim() && !!city.trim() && canon !== null;
  return (
    <Shell title="Add outlet" description={`A new outlet for ${clientName}. Its outlet ID is created for you.`} busy={busy} error={error} ready={ready} submitLabel="Add outlet" onCancel={onCancel} onSubmit={() => onSubmit({ name, address, city, phone: canon ?? "", manager, notes })}>
      <Field label="Outlet name" required value={name} onChange={setName} max={200} />
      <Field label="Address" value={address} onChange={setAddress} max={300} />
      <Field label="City" required value={city} onChange={setCity} max={120} />
      <PhoneField label="Phone" value={phone} onChange={setPhone} />
      <Field label="Manager or contact" value={manager} onChange={setManager} max={120} />
      <label htmlFor={notesId} className={LABEL}>Opening notes (optional)</label>
      <textarea id={notesId} className="ap-input mt-1.5" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Shell>
  );
}

/* --------------------------------------- deactivate --------------------------------------- */

export function DeactivateSheet({ title, description, confirmLabel, busy, error, onCancel, onSubmit }: { title: string; description: string; confirmLabel: string; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const id = useId();
  return (
    <Shell title={title} description={description} busy={busy} error={error} ready={reason.trim().length >= 3} submitLabel={confirmLabel} tone="danger" onCancel={onCancel} onSubmit={() => onSubmit(reason.trim())}>
      <label htmlFor={id} className={LABEL}>Reason</label>
      <textarea id={id} autoFocus className="ap-input mt-1.5" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className={HINT}>Required (3 to 300 characters). Recorded with your name and the time. Nothing is deleted.</p>
    </Shell>
  );
}

/* ------------------------------------------ staff ------------------------------------------ */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function StaffSheet({ busy, error, onCancel, onSubmit }: { busy: boolean; error: string | null; onCancel: () => void; onSubmit: (v: StaffFields) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [clientId, setClientId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [startDate, setStart] = useState(today);
  const [choices, setChoices] = useState<PlacementChoice[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const roles = useRoles();
  const listId = useId();
  const startId = useId();
  useEffect(() => {
    let off = false;
    loadPlacementChoices().then((c) => !off && setChoices(c), (e: unknown) => !off && setLoadError(orgErrorMessage(e, "We could not load your clients. Close this and try again.")));
    return () => { off = true; };
  }, []);
  const outlets = useMemo(() => choices?.find((c) => c.id === clientId)?.outlets ?? [], [choices, clientId]);
  const canon = canonicalPhone(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = fullName.trim().length >= 2 && emailOk && canon !== null && !!clientId && !!outletId && !!role.trim() && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate <= today();
  return (
    <Shell
      title="Add staff member" busy={busy} error={error ?? loadError} ready={ready && !loadError} submitLabel="Add staff member" onCancel={onCancel}
      description="A minimal record: who they are and where they work. The Staff ID is created for you. This does not give them access or send an email."
      onSubmit={() => onSubmit({ fullName, email, phone: canon ?? "", department: "", placement: { clientId, outletId, role, startDate } })}
    >
      <Field label="Full name" required value={fullName} onChange={setFullName} max={200} />
      <Field label="Email" required type="email" value={email} onChange={setEmail} max={254} />
      <PhoneField label="Phone" value={phone} onChange={setPhone} />
      <Field label="Role or job title" required value={role} onChange={setRole} max={80} list={listId} />
      <datalist id={listId}>{roles.map((r) => <option key={r.id} value={r.name} />)}</datalist>
      <label className={LABEL}>Client</label>
      <SelectMenu label="Client" value={clientId} placeholder={choices ? "Choose a client" : "Loading clients..."} onChange={(v) => { setClientId(v); setOutletId(""); }} options={(choices ?? []).map((c) => ({ value: c.id, label: c.name }))} className="mt-1.5" />
      <label className={LABEL}>Outlet</label>
      <SelectMenu label="Outlet" value={outletId} placeholder={clientId ? (outlets.length ? "Choose an outlet" : "This client has no active outlet") : "Choose a client first"} onChange={setOutletId} options={outlets.map((o) => ({ value: o.id, label: o.name }))} className="mt-1.5" />
      <label htmlFor={startId} className={LABEL}>Start date</label>
      <input id={startId} type="date" className="ap-input mt-1.5" value={startDate} max={today()} onChange={(e) => setStart(e.target.value)} />
      <p className={HINT}>Today or earlier. A future start date is not accepted yet.</p>
    </Shell>
  );
}
