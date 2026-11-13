"use client";

/**
 * Staff profile: the sections where a person adds their own details, following
 * Beeliv's onboarding form (docs/requirements/beeliv-onboarding-documentation-form-2026-09-29.md).
 * One section = one card = one Add button; a section opens its own small form.
 *
 *  - Personal details, Education, Employment: readable back to the person.
 *  - Next of kin, NIN, Bank, Accessibility (SENSITIVE): WRITE-ONLY. The form never
 *    starts with a saved value, and after saving the card shows only the masked
 *    status the backend returns. Values are never put in a URL, toast, log or
 *    analytics event. Format checks (NIN 11 digits, account 10 digits) are inline.
 *
 * Same look as the rest of the Staff profile: Panel, Facts, ActionPill, the shared
 * form fields. The backend/RLS decides who may see any of it (data-visibility-matrix.md).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DatePicker, PhoneInput } from "@/components/applicant/form-fields";
import { FieldError, useFlagInvalid } from "@/components/applicant/form-feedback";
import { Check, IdCard, Pencil, Plus, ShieldCheck, UserRound, UsersRound } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { inputToDob } from "@/components/applicant/apply/StepPersonal";
import { toast } from "@/components/ui/toast";
import { GENDER_OPTIONS, NIGERIAN_STATES } from "@/lib/applicant/reference-data";
import { saveProfile, useApplicantStore } from "@/lib/applicant/service";
import { currentJob, formatIsoLabel, periodToRange, previousJob, profileFacts } from "@/lib/applicant/documentation";
import { isValidPhone } from "@/lib/phone/phone";
import { useEmployment } from "@/lib/staff/hooks";
import { EDUCATION_OPTIONS, EMPTY_EMPLOYER, NIGERIAN_BANKS, RELATIONSHIP_STATUS_OPTIONS, digitsOnly, isValidNin, isValidNuban } from "@/lib/staff/personal-details";
import { saveAccessibility, saveBankDetails, saveEmployer, saveNextOfKin, saveNin, savePersonalDetails } from "@/lib/staff/service";
import type { Loadable, SensitiveState, StaffEmployer, StaffPersonalDetails, StaffSensitiveStatus } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Dot, Facts, Panel, Segmented, Sk } from "../kit";
import { withStaffPreloader } from "../StaffPreloader";

/* ---------- shared bits ---------- */

const GRID = "grid grid-cols-2 gap-x-5 gap-y-4 max-[640px]:grid-cols-1";
const NOT_ADDED = <span className="font-medium text-(--ap-faint)">Not added</span>;
const val = (v: string | null | undefined): ReactNode => (v && v.trim() ? v : NOT_ADDED);

const hashIs = (id: string) => typeof window !== "undefined" && window.location.hash === `#${id}`;

/** Gives a section a stable anchor so the onboarding checklist can point to it. */
function Anchor({ id, children }: { id: string; children: ReactNode }) {
  useEffect(() => {
    if (hashIs(id)) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);
  return (
    <div id={id} className="scroll-mt-24">
      {children}
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div data-ap-field className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      {children}
      {hint && !error ? <span className="text-[13px] text-(--ap-muted)">{hint}</span> : null}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </div>
  );
}

function FormActions({ busy, onCancel, label = "Save" }: { busy: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="mt-4 flex flex-col gap-2.5 min-[768px]:flex-row">
      <ActionPill type="submit" variant="dark" loading={busy} icon={Check} fit className="max-[767px]:w-full">
        {label}
      </ActionPill>
      <ActionPill variant="outline" disabled={busy} arrow={false} fit onClick={onCancel} className="max-[767px]:w-full">
        Cancel
      </ActionPill>
    </div>
  );
}

function EntryPill({ empty, what, onClick }: { empty: boolean; what: string; onClick: () => void }) {
  return (
    <ActionPill variant="outline" compact arrow={false} icon={empty ? Plus : Pencil} onClick={onClick} ariaLabel={`${empty ? "Add" : "Edit"} ${what}`}>
      {empty ? "Add" : "Edit"}
    </ActionPill>
  );
}

/** Loading and error states for a card that depends on one load. */
function Gate<T>({ load, title, error, children }: { load: Loadable<T>; title: string; error: string; children: (data: T) => ReactNode }) {
  if (load.status === "loading") return <Sk className="h-[120px]" />;
  if (load.status === "error" || load.data === null) return <Panel title={title}><ErrorPanel title={error} retry={load.retry} /></Panel>;
  return <>{children(load.data)}</>;
}

const saveFailed = () => toast.add({ title: "We couldn't save your changes", description: "Please try again.", type: "error" });

/* ---------- Personal details ---------- */

export function PersonalDetailsCard({ load }: { load: Loadable<StaffPersonalDetails> }) {
  return (
    <Gate load={load} title="Personal details" error="We couldn't load your details">
      {(d) => <PersonalDetailsBody d={d} />}
    </Gate>
  );
}

function PersonalDetailsBody({ d }: { d: StaffPersonalDetails }) {
  const noneYet = [d.sex, d.relationshipStatus, d.birthday, d.nationality, d.stateOfOrigin, d.lga, d.homeAddress].every((v) => !v);
  const [editing, setEditing] = useState(() => hashIs("personal"));
  return (
    <Anchor id="personal">
      <Panel title="Personal details" aside={editing ? undefined : <EntryPill empty={noneYet} what="personal details" onClick={() => setEditing(true)} />}>
        {editing ? (
          <PersonalDetailsForm d={d} onDone={() => setEditing(false)} />
        ) : noneYet ? (
          <p className="text-[16px] text-(--ap-muted)">Add your birthday, address and where you are from. Beeliv keeps these on your record.</p>
        ) : (
          <Facts
            rows={[
              ["Sex", val(d.sex)],
              ["Relationship status", val(d.relationshipStatus)],
              ["Birthday", val(formatIsoLabel(d.birthday))],
              ["Nationality", val(d.nationality)],
              ["State of origin", val(d.stateOfOrigin)],
              ["LGA, province or tribe", val(d.lga)],
              ["Home address", val(d.homeAddress)],
            ]}
          />
        )}
      </Panel>
    </Anchor>
  );
}

function PersonalDetailsForm({ d, onDone }: { d: StaffPersonalDetails; onDone: () => void }) {
  // Same person as the application: anything already given there is offered as a starting point to confirm.
  const facts = profileFacts(useApplicantStore().profile);
  const [v, setV] = useState({
    sex: d.sex || (facts.sex as StaffPersonalDetails["sex"]),
    relationshipStatus: d.relationshipStatus,
    birthday: d.birthday || facts.birthday,
    nationality: d.nationality || facts.nationality,
    stateOfOrigin: d.stateOfOrigin || facts.stateOfOrigin,
    lga: d.lga || facts.lgaTribe,
    homeAddress: d.homeAddress || facts.homeAddress,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((cur) => ({ ...cur, [k]: x }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const next: StaffPersonalDetails = { ...d, ...v, nationality: v.nationality.trim(), lga: v.lga.trim(), homeAddress: v.homeAddress.trim() };
      await withStaffPreloader("save", async () => {
        await savePersonalDetails(next);
        // The same person's application profile holds these too, so it stays in step.
        await saveProfile({ gender: next.sex, dateOfBirth: next.birthday ? inputToDob(next.birthday) : "", nationality: next.nationality, state: next.stateOfOrigin, lga: next.lga, address: next.homeAddress });
      });
      toast.add({ title: "Personal details saved", type: "success" });
      onDone();
    } catch {
      saveFailed();
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <div className={GRID}>
        <Field id="pd-sex" label="Sex">
          <SelectMenu id="pd-sex" placeholder="Select" value={v.sex} options={GENDER_OPTIONS} onChange={(x) => set("sex", x as StaffPersonalDetails["sex"])} />
        </Field>
        <Field id="pd-rel" label="Relationship status">
          <SelectMenu id="pd-rel" placeholder="Select" value={v.relationshipStatus} options={RELATIONSHIP_STATUS_OPTIONS} onChange={(x) => set("relationshipStatus", x)} />
        </Field>
        <Field id="pd-birthday" label="Birthday">
          <DatePicker id="pd-birthday" title="Birthday" initialView="years" max={new Date().toISOString().slice(0, 10)} value={v.birthday} onChange={(x) => set("birthday", x)} />
        </Field>
        <Field id="pd-nationality" label="Nationality">
          <input id="pd-nationality" className="ap-input" value={v.nationality} maxLength={60} autoComplete="country-name" onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field id="pd-state" label="State of origin">
          <SelectMenu id="pd-state" placeholder="Select state of origin" value={v.stateOfOrigin} options={NIGERIAN_STATES} onChange={(x) => set("stateOfOrigin", x)} />
        </Field>
        <Field id="pd-lga" label="LGA, province or ethnic tribe">
          <input id="pd-lga" className="ap-input" value={v.lga} maxLength={80} onChange={(e) => set("lga", e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <Field id="pd-address" label="Home address">
          <input id="pd-address" className="ap-input" value={v.homeAddress} maxLength={200} autoComplete="street-address" onChange={(e) => set("homeAddress", e.target.value)} />
        </Field>
      </div>
      <p className="mt-3 text-[14px] text-(--ap-muted)">Your email comes from your account and your team is set by Beeliv, so neither is asked here.</p>
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

/* ---------- Education ---------- */

export function EducationCard({ load }: { load: Loadable<StaffPersonalDetails> }) {
  return (
    <Gate load={load} title="Education" error="We couldn't load your education">
      {(d) => <EducationBody d={d} />}
    </Gate>
  );
}

function EducationBody({ d }: { d: StaffPersonalDetails }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(d.education);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await withStaffPreloader("save", () => savePersonalDetails({ ...d, education: value }));
      toast.add({ title: "Education saved", type: "success" });
      setEditing(false);
    } catch {
      saveFailed();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Anchor id="education">
      <Panel title="Education" aside={editing ? undefined : <EntryPill empty={!d.education} what="education" onClick={() => { setValue(d.education); setEditing(true); }} />}>
        {editing ? (
          <form onSubmit={save} noValidate>
            <div className="max-w-[420px]">
              <Field id="ed-level" label="Highest educational qualification">
                <SelectMenu id="ed-level" placeholder="Select" value={value} options={EDUCATION_OPTIONS} onChange={setValue} />
              </Field>
            </div>
            <FormActions busy={busy} onCancel={() => setEditing(false)} />
          </form>
        ) : d.education ? (
          <Facts rows={[["Qualification", d.education]]} />
        ) : (
          <p className="text-[16px] text-(--ap-muted)">Nothing is on file here yet.</p>
        )}
      </Panel>
    </Anchor>
  );
}

/* ---------- Employment: current and previous job ---------- */

export function EmploymentCard() {
  const load = useEmployment();
  return (
    <Gate load={load} title="Employment history" error="We couldn't load your jobs">
      {(e) => <EmploymentBody current={e.current} previous={e.previous} />}
    </Gate>
  );
}

function EmploymentBody({ current, previous }: { current: StaffEmployer | null; previous: StaffEmployer | null }) {
  const [editing, setEditing] = useState<"current" | "previous" | null>(null);
  return (
    <Anchor id="employment">
      <Panel title="Employment history">
        <div className="flex flex-col gap-5">
          <JobBlock which="current" title="Current job" entry={current} editing={editing === "current"} onEdit={() => setEditing("current")} onDone={() => setEditing(null)} />
          <div className="border-t border-(--ap-line-2) pt-5">
            <JobBlock which="previous" title="Previous job" entry={previous} editing={editing === "previous"} onEdit={() => setEditing("previous")} onDone={() => setEditing(null)} />
          </div>
        </div>
      </Panel>
    </Anchor>
  );
}

function JobBlock({ which, title, entry, editing, onEdit, onDone }: { which: "current" | "previous"; title: string; entry: StaffEmployer | null; editing: boolean; onEdit: () => void; onDone: () => void }) {
  const period = entry && which === "previous" && entry.startMonth ? `${formatIsoLabel(entry.startMonth)} to ${entry.endMonth ? formatIsoLabel(entry.endMonth) : "Present"}` : "";
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold text-(--ap-ink)">{title}</h3>
        {editing ? null : <EntryPill empty={!entry} what={title.toLowerCase()} onClick={onEdit} />}
      </div>
      {editing ? (
        <JobForm which={which} initial={entry} onDone={onDone} />
      ) : entry ? (
        <Facts
          rows={[
            ["Organisation", val(entry.organisation)],
            ["Location", val(entry.location)],
            ["Website, e-mail or social", val(entry.contact)],
            ["Position", val(entry.position)],
            ["Description", val(entry.description)],
            ["Reporting manager", val(entry.manager)],
            ...(which === "previous" ? ([["Period", val(period)]] as [string, ReactNode][]) : []),
          ]}
        />
      ) : (
        <p className="text-[16px] text-(--ap-muted)">{which === "current" ? "Add where you work now, if you are working." : "Add your most recent previous job, if you have one."}</p>
      )}
    </div>
  );
}

function JobForm({ which, initial, onDone }: { which: "current" | "previous"; initial: StaffEmployer | null; onDone: () => void }) {
  // Starting point from the application's job history when nothing is saved here yet.
  const talent = useApplicantStore().profile;
  const seed = initial ?? seedFromProfile(which, talent);
  const [v, setV] = useState<StaffEmployer>(seed);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const set = (k: keyof StaffEmployer, x: string) => setV((cur) => ({ ...cur, [k]: x }));
  const noOrg = !v.organisation.trim();
  const badRange = which === "previous" && !!v.startMonth && !!v.endMonth && v.endMonth < v.startMonth;
  const thisMonth = new Date().toISOString().slice(0, 7);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (noOrg || badRange) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    try {
      const clean: StaffEmployer = { ...v, organisation: v.organisation.trim(), location: v.location.trim(), contact: v.contact.trim(), position: v.position.trim(), description: v.description.trim(), manager: v.manager.trim(), startMonth: which === "previous" ? v.startMonth : "", endMonth: which === "previous" ? v.endMonth : "" };
      await withStaffPreloader("save", () => saveEmployer(which, clean));
      toast.add({ title: which === "current" ? "Current job saved" : "Previous job saved", type: "success" });
      onDone();
    } catch {
      saveFailed();
      setBusy(false);
    }
  }
  const p = `job-${which}`;
  return (
    <form ref={formRef} onSubmit={save} noValidate>
      <div className={GRID}>
        <Field id={`${p}-org`} label="Organisation name" error={tried && noOrg ? "Enter the organisation's name." : undefined}>
          <input id={`${p}-org`} className="ap-input" value={v.organisation} maxLength={120} aria-invalid={tried && noOrg ? true : undefined} onChange={(e) => set("organisation", e.target.value)} />
        </Field>
        <Field id={`${p}-loc`} label="Where is it located?">
          <input id={`${p}-loc`} className="ap-input" value={v.location} maxLength={120} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field id={`${p}-contact`} label="Website, e-mail or social media handle">
          <input id={`${p}-contact`} className="ap-input" value={v.contact} maxLength={120} autoCapitalize="off" onChange={(e) => set("contact", e.target.value)} />
        </Field>
        <Field id={`${p}-pos`} label="Job position">
          <input id={`${p}-pos`} className="ap-input" value={v.position} maxLength={80} onChange={(e) => set("position", e.target.value)} />
        </Field>
        <Field id={`${p}-mgr`} label="Reporting manager or supervisor">
          <input id={`${p}-mgr`} className="ap-input" value={v.manager} maxLength={80} onChange={(e) => set("manager", e.target.value)} />
        </Field>
        {which === "previous" ? (
          <>
            <Field id={`${p}-start`} label="Start month">
              <DatePicker id={`${p}-start`} mode="month" title="Start month" max={thisMonth} value={v.startMonth} onChange={(x) => set("startMonth", x)} />
            </Field>
            <Field id={`${p}-end`} label="End month" error={tried && badRange ? "The end month can't be before the start month." : undefined}>
              <DatePicker id={`${p}-end`} mode="month" title="End month" max={thisMonth} value={v.endMonth} invalid={tried && badRange} onChange={(x) => set("endMonth", x)} />
            </Field>
          </>
        ) : null}
      </div>
      <div className="mt-4">
        <Field id={`${p}-desc`} label="Job description">
          <textarea id={`${p}-desc`} className="ap-input min-h-[96px]" value={v.description} maxLength={500} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

function seedFromProfile(which: "current" | "previous", talent: Parameters<typeof currentJob>[0]): StaffEmployer {
  const job = which === "current" ? currentJob(talent) : previousJob(talent);
  if (!job) return { ...EMPTY_EMPLOYER };
  const range = which === "previous" ? periodToRange(job.period) : { start: "", end: "" };
  return { ...EMPTY_EMPLOYER, organisation: job.organisation, location: job.location, position: job.role, startMonth: range.start, endMonth: range.end };
}

/* ---------- Sensitive sections (write-only) ---------- */

function SensitiveSection({ id, title, icon: Icon, state, rows, intro, form }: { id: string; title: string; icon: typeof UserRound; state: SensitiveState; rows: [string, string][]; intro: string; form: (close: () => void) => ReactNode }) {
  const [editing, setEditing] = useState(() => state === "empty" && hashIs(id));
  const empty = state === "empty";
  return (
    <Anchor id={id}>
      <Panel
        title={title}
        aside={
          editing ? undefined : (
            <ActionPill variant="outline" compact arrow={false} icon={empty ? Plus : Pencil} onClick={() => setEditing(true)} ariaLabel={empty ? `Add ${title.toLowerCase()}` : `Request a change to ${title.toLowerCase()}`}>
              {empty ? "Add" : "Change"}
            </ActionPill>
          )
        }
      >
        {editing ? (
          <>
            <p className="mb-4 text-[14px] text-(--ap-muted)">{state === "empty" ? intro : "Enter the new details. Beeliv HR reviews the change before it replaces what is saved."}</p>
            {form(() => setEditing(false))}
          </>
        ) : empty ? (
          <p className="text-[16px] text-(--ap-muted)">{intro}</p>
        ) : (
          <>
            <ul className="divide-y divide-(--ap-line-2)">
              {rows.map(([label, value]) => (
                <li key={label} className="flex items-center gap-3.5 py-1 first:pt-0 last:pb-0">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 leading-snug">
                    <span className="block text-[14px] text-(--ap-muted)">{label}</span>
                    <b className="block text-[16px] tracking-[.04em] text-(--ap-ink) tabular-nums">{value}</b>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[14px] text-(--ap-muted)">
              {state === "change-pending" ? (
                <Dot tone="info">Change sent to Beeliv HR for review</Dot>
              ) : (
                "Saved. Only part of it is shown, for your security. Use Change to send an update for Beeliv HR to review."
              )}
            </div>
          </>
        )}
      </Panel>
    </Anchor>
  );
}

/** Runs a sensitive save: nothing typed is logged or shown; the toast names only the section. */
async function submitSensitive(work: () => Promise<StaffSensitiveStatus>, state: SensitiveState, what: string, onDone: () => void, fail: () => void) {
  try {
    await withStaffPreloader("save", work);
    toast.add({ title: state === "empty" ? `${what} saved` : "Change sent to Beeliv HR", type: "success" });
    onDone();
  } catch {
    fail();
  }
}

export function NextOfKinCard({ load }: { load: Loadable<StaffSensitiveStatus> }) {
  return (
    <Gate load={load} title="Next of kin" error="We couldn't load this section">
      {(s) => (
        <SensitiveSection
          id="next-of-kin"
          title="Next of kin"
          icon={UsersRound}
          state={s.nextOfKin.state}
          rows={[["Name", s.nextOfKin.maskedName ?? ""], ["Phone", s.nextOfKin.maskedPhone ?? ""]]}
          intro="No next of kin on file yet. Add one so Beeliv can reach someone in an emergency."
          form={(close) => <NextOfKinForm state={s.nextOfKin.state} onDone={close} />}
        />
      )}
    </Gate>
  );
}

function NextOfKinForm({ state, onDone }: { state: SensitiveState; onDone: () => void }) {
  const [v, setV] = useState({ name: "", phone: "", address: "", relationship: "" });
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const set = (k: keyof typeof v, x: string) => setV((cur) => ({ ...cur, [k]: x }));
  const noName = !v.name.trim();
  const badPhone = !isValidPhone(v.phone);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (noName || badPhone) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    await submitSensitive(
      () => saveNextOfKin({ name: v.name.trim(), phone: v.phone, address: v.address.trim(), relationship: v.relationship.trim() }),
      state,
      "Next of kin",
      onDone,
      () => {
        saveFailed();
        setBusy(false);
      },
    );
  }
  return (
    <form ref={formRef} onSubmit={save} noValidate autoComplete="off">
      <div className={GRID}>
        <Field id="nok-name" label="Name of next of kin" error={tried && noName ? "Enter their name." : undefined}>
          <input id="nok-name" className="ap-input" value={v.name} maxLength={80} autoComplete="off" aria-invalid={tried && noName ? true : undefined} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field id="nok-rel" label="Relationship">
          <input id="nok-rel" className="ap-input" value={v.relationship} maxLength={40} autoComplete="off" placeholder="e.g. Sister" onChange={(e) => set("relationship", e.target.value)} />
        </Field>
        <Field id="nok-phone" label="Phone number" error={tried && badPhone ? "Enter a complete phone number." : undefined}>
          <PhoneInput id="nok-phone" value={v.phone} onChange={(x) => set("phone", x)} invalid={tried && badPhone} quiet />
        </Field>
        <Field id="nok-address" label="Contact address">
          <input id="nok-address" className="ap-input" value={v.address} maxLength={200} autoComplete="off" onChange={(e) => set("address", e.target.value)} />
        </Field>
      </div>
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

export function NinCard({ load }: { load: Loadable<StaffSensitiveStatus> }) {
  return (
    <Gate load={load} title="Identity" error="We couldn't load this section">
      {(s) => (
        <SensitiveSection
          id="identity"
          title="Identity"
          icon={IdCard}
          state={s.nin.state}
          rows={[["National Identification Number (NIN)", s.nin.masked ?? ""]]}
          intro="Add your 11-digit National Identification Number. It is never shown back in full."
          form={(close) => <NinForm state={s.nin.state} onDone={close} />}
        />
      )}
    </Gate>
  );
}

function NinForm({ state, onDone }: { state: SensitiveState; onDone: () => void }) {
  const [nin, setNin] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const bad = tried && !isValidNin(nin);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isValidNin(nin)) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    await submitSensitive(
      () => saveNin({ nin }),
      state,
      "NIN",
      onDone,
      () => {
        saveFailed();
        setBusy(false);
      },
    );
  }
  return (
    <form ref={formRef} onSubmit={save} noValidate autoComplete="off">
      <div className="max-w-[420px]">
        <Field id="nin" label="NIN number" hint="11 digits" error={bad ? "A NIN has exactly 11 digits." : undefined}>
          <input
            id="nin"
            className="ap-input tabular-nums"
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={nin}
            aria-invalid={bad ? true : undefined}
            aria-describedby={bad ? "nin-err" : undefined}
            onChange={(e) => setNin(digitsOnly(e.target.value, 11))}
          />
        </Field>
      </div>
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

export function BankCard({ load }: { load: Loadable<StaffSensitiveStatus> }) {
  return (
    <Gate load={load} title="Banking / payroll" error="We couldn't load this section">
      {(s) => (
        <SensitiveSection
          id="banking"
          title="Banking / payroll"
          icon={ShieldCheck}
          state={s.bank.state}
          rows={[["Bank account number", s.bank.maskedAccount ?? ""]]}
          intro="Add the account name, account number and bank. Only part of the number is ever shown back."
          form={(close) => <BankForm state={s.bank.state} onDone={close} />}
        />
      )}
    </Gate>
  );
}

function BankForm({ state, onDone }: { state: SensitiveState; onDone: () => void }) {
  const [v, setV] = useState({ accountName: "", accountNumber: "", bankName: "" });
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const noName = !v.accountName.trim();
  const badNumber = !isValidNuban(v.accountNumber);
  const noBank = !v.bankName;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (noName || badNumber || noBank) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    await submitSensitive(
      () => saveBankDetails({ accountName: v.accountName.trim(), accountNumber: v.accountNumber, bankName: v.bankName }),
      state,
      "Bank details",
      onDone,
      () => {
        saveFailed();
        setBusy(false);
      },
    );
  }
  return (
    <form ref={formRef} onSubmit={save} noValidate autoComplete="off">
      <div className={GRID}>
        <Field id="bank-name" label="Full name on the bank account" error={tried && noName ? "Enter the name on the account." : undefined}>
          <input id="bank-name" className="ap-input" value={v.accountName} maxLength={100} autoComplete="off" aria-invalid={tried && noName ? true : undefined} onChange={(e) => setV((c) => ({ ...c, accountName: e.target.value }))} />
        </Field>
        <Field id="bank-bank" label="Bank name" error={tried && noBank ? "Choose your bank." : undefined}>
          <SelectMenu id="bank-bank" placeholder="Select your bank" value={v.bankName} options={NIGERIAN_BANKS} invalid={tried && noBank} onChange={(x) => setV((c) => ({ ...c, bankName: x }))} />
        </Field>
        <Field id="bank-number" label="Account number" hint="10 digits" error={tried && badNumber ? "A Nigerian account number has exactly 10 digits." : undefined}>
          <input
            id="bank-number"
            className="ap-input tabular-nums"
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={v.accountNumber}
            aria-invalid={tried && badNumber ? true : undefined}
            aria-describedby={tried && badNumber ? "bank-number-err" : undefined}
            onChange={(e) => setV((c) => ({ ...c, accountNumber: digitsOnly(e.target.value, 10) }))}
          />
        </Field>
      </div>
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

export function AccessibilityCard({ load }: { load: Loadable<StaffSensitiveStatus> }) {
  return (
    <Gate load={load} title="Physical challenge" error="We couldn't load this section">
      {(s) => (
        <SensitiveSection
          id="accessibility"
          title="Physical challenge"
          icon={UserRound}
          state={s.accessibility.state}
          rows={[["Physically challenged", "Answer saved"]]}
          intro="Tell Beeliv if you are physically challenged, so the right support can be arranged. Your answer is not shown back."
          form={(close) => <AccessibilityForm state={s.accessibility.state} onDone={close} />}
        />
      )}
    </Gate>
  );
}

function AccessibilityForm({ state, onDone }: { state: SensitiveState; onDone: () => void }) {
  const [answer, setAnswer] = useState<"yes" | "no" | "">("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const missing = tried && !answer;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!answer) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    await submitSensitive(
      () => saveAccessibility({ physicallyChallenged: answer === "yes", detail: answer === "yes" ? detail.trim() : "" }),
      state,
      "Your answer",
      onDone,
      () => {
        saveFailed();
        setBusy(false);
      },
    );
  }
  return (
    <form ref={formRef} onSubmit={save} noValidate autoComplete="off">
      <div data-ap-field className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-(--ap-ink-2)">Are you physically challenged?</span>
        <div {...(missing ? { "data-ap-invalid": "" } : {})}>
          <Segmented<"yes" | "no" | ""> label="Are you physically challenged?" value={answer} onChange={setAnswer} options={[{ key: "yes", label: "Yes" }, { key: "no", label: "No" }]} />
        </div>
        <FieldError id="acc-err">{missing ? "Choose Yes or No." : undefined}</FieldError>
      </div>
      {answer === "yes" ? (
        <div className="mt-4">
          <Field id="acc-detail" label="Short detail (optional)" hint="Only what Beeliv needs to arrange support.">
            <textarea id="acc-detail" className="ap-input min-h-[88px]" value={detail} maxLength={200} autoComplete="off" onChange={(e) => setDetail(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <FormActions busy={busy} onCancel={onDone} />
    </form>
  );
}

