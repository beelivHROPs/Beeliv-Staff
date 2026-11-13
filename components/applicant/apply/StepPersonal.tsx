"use client";

import { lgasOf } from "@/lib/shared/nigeria-locations";
import { UserRound } from "@/components/applicant/icons";
import { AddressInput, DatePicker, PhoneInput } from "@/components/applicant/form-fields";
import { SelectMenu } from "../SelectMenu";
import { GENDER_OPTIONS, NIGERIAN_STATES } from "@/lib/applicant/reference-data";
import { saveProfile, useApplicantStore } from "@/lib/applicant/service";
import type { ApplyFormData, Gender } from "@/lib/applicant/types";
import { Field, FormGrid, INPUT_CLS, Note } from "./parts";

/**
 * Profile-owned personal fields shown on Apply step 1 (wireframe
 * stepBody() s===0). They live on ApplicantProfile, not ApplyFormData —
 * the wireframe's own note says "Changes here also update your profile".
 *
 * FRONTEND-ONLY PLACEHOLDER: date of birth, gender, residential address,
 * state of origin and LGA (of origin) are rendered because the locked wireframe shows them on this step,
 * but they are personal data whose access rules are still pending in
 * docs/architecture/rbac.md (Beeliv's sensitive-data decision). No real
 * validation, masking or server persistence is implemented here — the
 * mock service writes them to localStorage only. NIN numbers and banking
 * details are NOT part of this step and must not be added to it.
 *
 * `state` / `lga` are the applicant's state and LGA of ORIGIN (Module 1 §2 /
 * SOURCE-OF-TRUTH §7), not their state of residence — so picking a
 * residential-address suggestion no longer fills them in.
 *
 * Gender is read from / written to the profile directly through the mock
 * service (like StepExperience's employment history), so ApplyBody's
 * PersonalProfileFields wiring doesn't need to change.
 */
export type PersonalProfileFields = {
  applicantId: string;
  dateOfBirth: string;
  address: string;
  state: string;
  lga: string;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Profile stores "14 March 1996"; <input type="date"> needs "1996-03-14". Pure string maths — no timezone drift. */
export function dobToInput(display: string): string {
  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(display.trim());
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(display) ? display : "";
  const month = MONTHS.findIndex((x) => x.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)));
  if (month < 0) return "";
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
export function inputToDob(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function StepPersonal({
  form,
  set,
  personal,
  setPersonal,
}: {
  form: ApplyFormData;
  set: <K extends keyof ApplyFormData>(k: K, v: ApplyFormData[K]) => void;
  personal: PersonalProfileFields;
  setPersonal: <K extends keyof PersonalProfileFields>(k: K, v: PersonalProfileFields[K]) => void;
}) {
  const gender = useApplicantStore().profile.gender;
  return (
    <div>
      <Note icon={UserRound} className="mb-4.5">
        Changes here also update your profile, so the next application is quicker.
      </Note>
      <FormGrid>
        <Field label="Applicant ID" htmlFor="ap-aid" hint="Created by Beeliv">
          <input id="ap-aid" className={INPUT_CLS} value={personal.applicantId} readOnly />
        </Field>
        <Field label="Full name" htmlFor="ap-fn">
          <input id="ap-fn" className={INPUT_CLS} autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Preferred name" htmlFor="ap-pn">
          <input id="ap-pn" className={INPUT_CLS} autoComplete="nickname" value={form.preferredName} onChange={(e) => set("preferredName", e.target.value)} />
        </Field>
        <Field label="Date of birth" htmlFor="ap-dob">
          <DatePicker
            id="ap-dob"
            title="Date of birth"
            initialView="years"
            max={todayIso()}
            placeholder="Select your date of birth"
            value={dobToInput(personal.dateOfBirth)}
            onChange={(v) => setPersonal("dateOfBirth", inputToDob(v))}
          />
        </Field>
        <Field label="Gender" htmlFor="ap-gen">
          <SelectMenu id="ap-gen" placeholder="Select gender" value={gender} options={GENDER_OPTIONS} onChange={(v) => void saveProfile({ gender: v as Gender })} />
        </Field>
        <Field label="Phone" htmlFor="ap-ph">
          <PhoneInput id="ap-ph" value={form.phone} onChange={(v) => set("phone", v)} />
        </Field>
        <Field label="WhatsApp" htmlFor="ap-wa">
          <PhoneInput id="ap-wa" autoComplete="off" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
        </Field>
        <Field label="Email" htmlFor="ap-em">
          <input id="ap-em" type="email" className={INPUT_CLS} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Residential address" htmlFor="ap-ad" full>
          <AddressInput id="ap-ad" value={personal.address} onChange={(v) => setPersonal("address", v)} />
        </Field>
        <Field label="State of origin" htmlFor="ap-sta">
          <SelectMenu
            id="ap-sta"
            placeholder="Select state of origin"
            value={personal.state}
            options={NIGERIAN_STATES}
            onChange={(v) => {
              setPersonal("state", v);
              if (!lgasOf(v).includes(personal.lga)) setPersonal("lga", "");
            }}
          />
        </Field>
        <Field label="LGA" htmlFor="ap-lga" hint="Local government area of origin">
          <SelectMenu id="ap-lga" placeholder={personal.state ? "Select local government" : "Select a state first"} value={personal.lga} options={[...lgasOf(personal.state)]} onChange={(v) => setPersonal("lga", v)} />
        </Field>
      </FormGrid>
    </div>
  );
}
