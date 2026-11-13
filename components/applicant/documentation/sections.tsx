"use client";

/**
 * Documentation form steps 1–6 (BEELIV-APPLICANT-JOURNEY.md §4 recommended
 * order): Personal & identity → Current employment → Previous employment →
 * Next of kin → NIN & bank details → Documents.
 *
 * "One field, one home" (docs/BEELIV-RECRUITMENT-SPEC.md §4): profile-owned
 * values (email, phone, birthday, sex, nationality, state of origin, LGA,
 * home address, passport photo, employer name/title/dates, emergency contact)
 * are SHOWN here read-only with a way to update them in the profile — never
 * asked a second time.
 *
 * "Required"/"Optional" tags on every field are a PROPOSAL — requiredness is
 * TBD in the source docs (see DocField in ./controls.tsx).
 */
import { useState } from "react";
import { Briefcase, IdCard, Image as ImageIcon, LockKeyhole, ShieldCheck, UserRound } from "@/components/applicant/icons";
import { AddressInput, PhoneInput } from "@/components/applicant/form-fields";
import { formatPhone } from "@/lib/phone/phone";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { FormGrid, INPUT_CLS, LINK_CLS, Note, Segmented, STROKE, SubHead } from "@/components/applicant/apply/parts";
import {
  EDUCATION_OPTIONS,
  NIGERIAN_BANKS,
  RELATIONSHIP_STATUS_OPTIONS,
  bankNameLooksLikeApplicant,
  formatIsoLabel,
  isValidPhone,
  type EmployerDetail,
  type NextOfKinSection,
  type PersonalSection,
  type ProfileFacts,
  type ProfileJob,
  type SensitiveDetails,
} from "@/lib/applicant/documentation";
import { DigitsInput, DocField, SwitchRow } from "./controls";
import { FileSlot } from "./uploads";

type Setter<T> = <K extends keyof T>(key: K, value: T[K]) => void;

/** Small "Not saved in this preview" marker for memory-only (🔒) fields. */
export function MemoryOnlyTag() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-semibold text-(--ap-info)">
      <LockKeyhole className="size-3" strokeWidth={STROKE} aria-hidden="true" />
      Not saved in this preview
    </span>
  );
}

/** Read-only key/value card for values that live in the profile. */
function FromProfile({ title, rows, onEditProfile, editLabel = "Update in your profile" }: { title: string; rows: [string, string][]; onEditProfile: () => void; editLabel?: string }) {
  const missing = rows.filter(([, v]) => !v.trim()).length;
  return (
    <section className="rounded-[14px] border border-(--ap-line) bg-[#fbfafc] px-4.5 py-4 max-[767px]:px-4" aria-label={title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <b className="flex items-center gap-2 text-[15px]">
          <UserRound className="size-[18px] text-(--ap-violet)" strokeWidth={STROKE} aria-hidden="true" />
          {title}
        </b>
        <button type="button" onClick={onEditProfile} className={LINK_CLS}>
          {editLabel}
        </button>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3.5 max-[640px]:grid-cols-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[13px] font-semibold text-(--ap-muted)">{label}</dt>
            <dd className={`m-0 text-[15px] font-semibold wrap-anywhere ${value.trim() ? "text-(--ap-ink)" : "text-(--ap-warn)"}`}>{value.trim() || "Missing — add it in your profile"}</dd>
          </div>
        ))}
      </dl>
      {missing ? (
        <p className="ap-sm mt-3">
          {missing} detail{missing === 1 ? " is" : "s are"} missing from your profile. Add {missing === 1 ? "it" : "them"} there once and it&apos;s reused everywhere.
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ 1 */

export function PersonalStep({
  facts,
  personal,
  set,
  sensitive,
  setSensitive,
  existingPhoto,
  sessionPhoto,
  onPhoto,
  onEditProfile,
}: {
  facts: ProfileFacts;
  personal: PersonalSection;
  set: Setter<PersonalSection>;
  sensitive: SensitiveDetails;
  setSensitive: Setter<SensitiveDetails>;
  existingPhoto: string | null;
  sessionPhoto: string | null;
  onPhoto: (fileName: string) => void;
  onEditProfile: () => void;
}) {
  return (
    <div>
      <FromProfile
        title="From your profile"
        onEditProfile={onEditProfile}
        rows={[
          ["Email address", facts.email],
          ["Phone number", formatPhone(facts.phone)],
          ["Birthday", formatIsoLabel(facts.birthday)],
          ["Gender", facts.sex],
          ["Nationality", facts.nationality],
          ["State of origin", facts.stateOfOrigin],
          ["LGA, province and/or ethnic tribe", facts.lgaTribe],
          ["Home address", facts.homeAddress],
        ]}
      />

      <SubHead className="mt-6">A few more details</SubHead>
      <FormGrid>
        <DocField label="Educational qualification" htmlFor="dc-edu" need="required">
          {/* Options PROPOSED pending Beeliv (lib/applicant/documentation.ts). */}
          <SelectMenu id="dc-edu" placeholder="Select qualification" value={personal.education} options={EDUCATION_OPTIONS} onChange={(v) => set("education", v)} />
        </DocField>
        <DocField label="Relationship status" htmlFor="dc-rel" need="required">
          {/* Options PROPOSED pending Beeliv (lib/applicant/documentation.ts). */}
          <SelectMenu id="dc-rel" placeholder="Select status" value={personal.relationshipStatus} options={RELATIONSHIP_STATUS_OPTIONS} onChange={(v) => set("relationshipStatus", v)} />
        </DocField>
        {/* 🔒 Sensitive (RECRUITMENT-SPEC §4): memory only. */}
        <div className="col-span-full flex min-w-0 flex-col gap-1.5">
          <span className="text-[14px] font-semibold text-(--ap-ink-2)">
            Are you physically challenged?
            <span className="ml-2 text-[12px] font-semibold text-(--ap-violet)">Required</span>
            <MemoryOnlyTag />
          </span>
          <Segmented
            label="Are you physically challenged?"
            value={sensitive.physicallyChallenged}
            options={["No", "Yes"] as const}
            onChange={(v) => {
              setSensitive("physicallyChallenged", v);
              if (v === "No") setSensitive("physicalDetail", "");
            }}
          />
        </div>
        {sensitive.physicallyChallenged === "Yes" ? (
          <div className="ap-step-fwd col-span-full">
            <DocField label="Anything you'd like Beeliv to know?" htmlFor="dc-pcd" need="optional" hint="Only what you're comfortable sharing, e.g. support you may need at work.">
              <textarea id="dc-pcd" className="ap-input" rows={3} autoComplete="off" value={sensitive.physicalDetail} onChange={(e) => setSensitive("physicalDetail", e.target.value)} />
            </DocField>
          </div>
        ) : null}
        <DocField label="Passport photograph" need="required" full hint={existingPhoto || sessionPhoto ? "Kept in your profile documents and reused." : "Added to your profile documents, so you won't need it again."}>
          <FileSlot title="Passport photograph" icon={ImageIcon} kind="photo" existingFileName={existingPhoto} uploadedFileName={sessionPhoto} onUploaded={onPhoto} />
        </DocField>
      </FormGrid>
    </div>
  );
}

/* ---------------------------------------------------------------- 2 + 3 */

/**
 * Employer detail for the profile's current / most recent previous job
 * (spec §4: not a second list). Organisation, title and dates are the
 * profile's; this step only adds location, contact, description, manager.
 */
export function EmploymentStep({
  variant,
  job,
  detail,
  setDetail,
  off,
  setOff,
  onEditProfile,
}: {
  variant: "current" | "previous";
  job: ProfileJob | null;
  detail: EmployerDetail;
  setDetail: Setter<EmployerDetail>;
  /** notEmployed / none — only used when the profile has no such job. */
  off: boolean;
  setOff: (v: boolean) => void;
  onEditProfile: () => void;
}) {
  const isCurrent = variant === "current";
  const p = isCurrent ? "dc-cur" : "dc-prev";

  if (!job) {
    return (
      <div>
        <Note icon={Briefcase} className="mb-4">
          {isCurrent ? "Your profile doesn't list a current job." : "Your profile doesn't list a previous job."}{" "}
          <button type="button" onClick={onEditProfile} className={`${LINK_CLS} !inline !min-h-0`}>
            Add it to your employment history
          </button>{" "}
          if you have one, or confirm below.
        </Note>
        <SwitchRow
          label={isCurrent ? "I'm not currently employed" : "No previous employment"}
          detail={isCurrent ? "Turn this on to confirm you don't have a job right now." : "Turn this on if this would be your first job."}
          checked={off}
          onChange={setOff}
        />
      </div>
    );
  }

  return (
    <div>
      <section className="rounded-[14px] border border-(--ap-line) bg-[#fbfafc] px-4.5 py-4 max-[767px]:px-4" aria-label="From your employment history">
        <div className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-(--ap-tint) text-(--ap-violet)">
              <Briefcase className="size-5" strokeWidth={STROKE} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <b className="block text-[15px] wrap-anywhere">{job.organisation}</b>
              <span className="ap-sm block">
                {job.role} · {job.period}
              </span>
            </span>
          </span>
          <button type="button" onClick={onEditProfile} className={`${LINK_CLS} shrink-0`}>
            Edit in profile
          </button>
        </div>
      </section>

      <SubHead className="mt-6">Add the details Beeliv needs</SubHead>
      <FormGrid>
        <DocField label="Where is it located?" htmlFor={`${p}-loc`} need="required" full>
          <AddressInput id={`${p}-loc`} placeholder="e.g. 12 Aminu Kano Crescent" value={detail.location} onChange={(v) => setDetail("location", v)} />
        </DocField>
        <DocField label="Organisation website, email or social media handle" htmlFor={`${p}-web`} need="optional" full>
          <input
            id={`${p}-web`}
            className={INPUT_CLS}
            autoComplete="off"
            placeholder="e.g. www.example.com or @example"
            value={detail.contact}
            onChange={(e) => setDetail("contact", e.target.value)}
          />
        </DocField>
        <DocField label="Reporting manager / supervisor name" htmlFor={`${p}-mgr`} need="required" full>
          <input id={`${p}-mgr`} className={INPUT_CLS} autoComplete="off" value={detail.manager} onChange={(e) => setDetail("manager", e.target.value)} />
        </DocField>
        <DocField label={`Job description (${job.role})`} htmlFor={`${p}-desc`} need="required" full hint="A few lines on what you do or did day to day.">
          <textarea id={`${p}-desc`} className="ap-input" rows={4} value={detail.description} onChange={(e) => setDetail("description", e.target.value)} />
        </DocField>
      </FormGrid>
    </div>
  );
}

/* ------------------------------------------------------------------ 4 */

export function NextOfKinStep({
  value,
  set,
  emergency,
  onSameAsEmergency,
}: {
  value: NextOfKinSection;
  set: Setter<NextOfKinSection>;
  emergency: { name: string; relationship: string; phone: string };
  onSameAsEmergency: (on: boolean) => void;
}) {
  const hasEmergency = !!emergency.name.trim();
  const same = value.sameAsEmergency && hasEmergency;
  return (
    <div>
      {hasEmergency ? (
        <SwitchRow
          label="Same as my emergency contact"
          detail={`${emergency.name}${emergency.relationship ? ` · ${emergency.relationship}` : ""}`}
          checked={same}
          onChange={onSameAsEmergency}
        />
      ) : null}

      <div className={hasEmergency ? "mt-5" : ""}>
        <FormGrid>
          {same ? (
            <div key="same" className="ap-step-fwd col-span-full rounded-[14px] border border-(--ap-line) bg-[#fbfafc] px-4.5 py-4 max-[767px]:px-4">
              <dl className="m-0 grid grid-cols-3 gap-x-6 gap-y-3.5 max-[640px]:grid-cols-1">
                {(
                  [
                    ["Name", emergency.name],
                    ["Relationship", emergency.relationship],
                    ["Phone", formatPhone(emergency.phone)],
                  ] as const
                ).map(([label, v]) => (
                  <div key={label} className="flex min-w-0 flex-col gap-0.5">
                    <dt className="text-[13px] font-semibold text-(--ap-muted)">{label}</dt>
                    <dd className={`m-0 text-[15px] font-semibold wrap-anywhere ${v.trim() ? "" : "text-(--ap-warn)"}`}>{v.trim() || "Missing"}</dd>
                  </div>
                ))}
              </dl>
              {!isValidPhone(emergency.phone) ? <p className="ap-sm mt-3 text-(--ap-warn)">Your emergency contact&apos;s phone number needs updating in your profile.</p> : null}
            </div>
          ) : (
            <>
              <DocField label="Name of next of kin" htmlFor="dc-nok-n" need="required">
                <input id="dc-nok-n" className={INPUT_CLS} autoComplete="off" value={value.name} onChange={(e) => set("name", e.target.value)} />
              </DocField>
              <DocField label="Relationship with next of kin" htmlFor="dc-nok-r" need="required">
                <input
                  id="dc-nok-r"
                  className={INPUT_CLS}
                  autoComplete="off"
                  placeholder="e.g. Brother, Mother, Spouse"
                  value={value.relationship}
                  onChange={(e) => set("relationship", e.target.value)}
                />
              </DocField>
              <DocField label="Phone number of next of kin" htmlFor="dc-nok-p" need="required" full>
                <PhoneInput id="dc-nok-p" autoComplete="off" value={value.phone} onChange={(v) => set("phone", v)} />
              </DocField>
            </>
          )}
          <DocField label="Contact address of next of kin" htmlFor="dc-nok-a" need="required" full>
            <AddressInput id="dc-nok-a" placeholder="e.g. 5 Obafemi Awolowo Way" value={value.address} onChange={(v) => set("address", v)} />
          </DocField>
        </FormGrid>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 5 */

/**
 * SENSITIVE (🔒). Values arrive from, and go back to, the parent's React
 * state only — never the persisted draft. See lib/applicant/documentation.ts.
 */
export function SensitiveStep({ value, set, profileName }: { value: SensitiveDetails; set: Setter<SensitiveDetails>; profileName: string }) {
  const confirmMismatch = value.bankAccountConfirm.length === 10 && value.bankAccountConfirm !== value.bankAccountNumber;
  // "Other" in the bank list reveals a text box; the typed name is what gets saved as the bank name.
  const [otherBank, setOtherBank] = useState(false);
  const customBank = otherBank || value.bankName === "Other" || (!!value.bankName && !(NIGERIAN_BANKS as readonly string[]).includes(value.bankName));
  const nameWarn = value.bankAccountName.trim() !== "" && !bankNameLooksLikeApplicant(value.bankAccountName, profileName);
  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-(--ap-line) bg-[#fbf8fd] px-4 py-3.5" role="note" aria-labelledby="dc-sens-h">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-(--ap-tint) text-(--ap-violet)">
          <LockKeyhole className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <b id="dc-sens-h" className="block text-[15px] text-(--ap-ink)">
            These details aren&apos;t saved in this preview
          </b>
          <span className="ap-bd block text-(--ap-ink-2)">
            Secure submission for NIN and bank details isn&apos;t switched on yet, so what you type here stays on this page only. It&apos;s cleared when you leave or
            refresh, and it isn&apos;t sent to Beeliv.
          </span>
        </span>
      </div>

      <SubHead>National Identification Number</SubHead>
      <FormGrid>
        <DocField label="NIN" htmlFor="dc-nin" need="required" full>
          <DigitsInput id="dc-nin" length={11} maskable placeholder="11-digit NIN" value={value.nin} onChange={(v) => set("nin", v)} />
        </DocField>
      </FormGrid>

      <SubHead className="mt-6">Bank details</SubHead>
      <FormGrid>
        <DocField label="Full name on bank account" htmlFor="dc-bname" need="required" full>
          <input
            id="dc-bname"
            className={INPUT_CLS}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            spellCheck={false}
            value={value.bankAccountName}
            onChange={(e) => set("bankAccountName", e.target.value)}
          />
          {nameWarn ? (
            <p className="mt-1.5 text-[13px] text-(--ap-warn)" role="status">
              This doesn&apos;t look like the name on your profile ({profileName}). Salary is paid to this account, so check it is your own, in your own name.
            </p>
          ) : null}
        </DocField>
        <DocField label="Bank account number" htmlFor="dc-bnum" need="required" hint="Your 10-digit NUBAN account number.">
          <DigitsInput id="dc-bnum" length={10} placeholder="0123456789" value={value.bankAccountNumber} onChange={(v) => set("bankAccountNumber", v)} />
        </DocField>
        <DocField label="Confirm account number" htmlFor="dc-bnum2" need="required" hint="Type it again (pasting is turned off) so a typo can&apos;t slip through.">
          <DigitsInput id="dc-bnum2" length={10} noPaste placeholder="Type it again" value={value.bankAccountConfirm} onChange={(v) => set("bankAccountConfirm", v)} />
          {confirmMismatch ? (
            <p className="mt-1.5 text-[13px] text-(--ap-rose)" role="alert">
              The two account numbers don&apos;t match. Check both.
            </p>
          ) : null}
        </DocField>
        <DocField label="Bank name" htmlFor="dc-bank" need="required">
          {/* PROPOSED bank list pending Beeliv (lib/applicant/documentation.ts). */}
          <SelectMenu
            id="dc-bank"
            placeholder="Select bank"
            value={customBank ? "Other" : value.bankName}
            options={NIGERIAN_BANKS}
            onChange={(v) => {
              if (v === "Other") {
                setOtherBank(true);
                if ((NIGERIAN_BANKS as readonly string[]).includes(value.bankName)) set("bankName", "");
              } else {
                setOtherBank(false);
                set("bankName", v);
              }
            }}
          />
          {customBank ? (
            <input
              id="dc-bank-other"
              className={`${INPUT_CLS} mt-2`}
              autoComplete="off"
              aria-label="Bank name"
              placeholder="Type your bank's name"
              maxLength={80}
              value={value.bankName === "Other" ? "" : value.bankName}
              onChange={(e) => set("bankName", e.target.value)}
            />
          ) : null}
        </DocField>
      </FormGrid>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[14px] border border-(--ap-line) bg-[#fbf8fd] px-4 py-3.5">
        <input
          type="checkbox"
          className="mt-0.5 size-[18px] shrink-0 accent-(--ap-violet)"
          checked={value.bankOwnAccount}
          onChange={(e) => set("bankOwnAccount", e.target.checked)}
        />
        <span className="ap-bd text-(--ap-ink-2)">
          I confirm this account is in my own name and I understand my salary will be paid into it.
        </span>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ 6 */

export function DocumentsStep({
  existingNinCopy,
  ninCopyFileName,
  onNinCopy,
  existingPhoto,
  sessionPhoto,
  onPhoto,
}: {
  existingNinCopy: string | null;
  /** Memory only (🔒). */
  ninCopyFileName: string | null;
  onNinCopy: (name: string) => void;
  existingPhoto: string | null;
  /** Photo uploaded during this visit (it's saved to the profile documents). */
  sessionPhoto: string | null;
  onPhoto: (name: string) => void;
}) {
  return (
    <div>
      <SubHead>Copy of your NIN</SubHead>
      <FileSlot title="Copy of your NIN" icon={IdCard} kind="document" existingFileName={existingNinCopy} uploadedFileName={ninCopyFileName} onUploaded={onNinCopy} />
      <p className="ap-sm mt-2">
        {existingNinCopy && !ninCopyFileName
          ? "The NIN slip you gave as your valid ID counts as your NIN copy. Replace it only if it has changed."
          : "A new NIN copy isn't kept in this preview. It's cleared when you leave this page."}
      </p>

      <SubHead className="mt-6">Passport photograph</SubHead>
      <FileSlot title="Passport photograph" icon={ImageIcon} kind="photo" existingFileName={existingPhoto} uploadedFileName={sessionPhoto} onUploaded={onPhoto} />

      <Note icon={ShieldCheck} className="mt-5">
        Files aren&apos;t really uploaded in this preview. Only the file name is kept so you can see how it works.
      </Note>
    </div>
  );
}
