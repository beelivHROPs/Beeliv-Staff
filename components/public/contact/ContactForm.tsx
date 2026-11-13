"use client";

/**
 * The Contact form (Contact-Desktop / Contact-Mobile.dc.html): a single-step
 * form, not a wizard like Request Talent.
 *
 * - "I'm..." selector: "work" (default) and "other" stay on this form.
 *   Selecting "business" navigates straight to /request - both boards' own
 *   note says selecting it "sends you to the Request Talent form, so every
 *   business lead lands in one place" (mobile board: "opens the Request
 *   Talent form"). Nothing here duplicates that 4-step wizard.
 * - Submit validates inline, shakes and focuses the first invalid field,
 *   otherwise calls submitContact() (lib/public-site/contact.ts, backend not
 *   connected yet) and swaps the form for an inline "Message sent" state -
 *   no Contact-Sent wireframe exists to send the visitor to (see
 *   contact-content.ts).
 * - The Role / CV fields are the wireframe's "(work only)" fields: shown
 *   only when "I'm looking for work" is selected. DRAFT decision, flagged for
 *   project-lead confirmation - the static wireframe draws no conditional
 *   logic, only that annotation.
 */

import { SelectMenu } from "@/components/applicant/SelectMenu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { CheckField, FormAlert, useFieldRefs } from "@/components/public/auth/fields";
import { SendIcon } from "@/components/public/icons";
import { T } from "@/components/public/primitives";
import { submitContact } from "@/lib/public-site/contact";
import {
  CONTACT_CONSENT,
  CONTACT_FIELDS,
  CONTACT_KIND,
  CONTACT_MESSAGES,
  CONTACT_ROUTES,
  CONTACT_SENT,
  type ContactKind,
} from "@/lib/public-site/contact-content";
import {
  CONTACT_FIELD_ORDER,
  clean,
  emptyContactDraft,
  orNull,
  validateContact,
  type ContactDraft,
  type ContactErrors,
  type ContactFieldKey,
} from "@/lib/public-site/contact-rules";
import { CfField, CfSubmitButton, KindCard } from "./parts";

const OTHER_ROLE = CONTACT_FIELDS.roleOther.option;

export function ContactForm() {
  const router = useRouter();
  const [kind, setKind] = useState<ContactKind>(CONTACT_KIND.default);
  const [draft, setDraft] = useState<ContactDraft>(emptyContactDraft);
  const [cvName, setCvName] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [shake, setShake] = useState<Partial<Record<ContactFieldKey, number>>>({});
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const reduce = useReducedMotion();
  const [roleChoice, setRoleChoice] = useState("");
  const [roleOther, setRoleOther] = useState("");
  const { register, focusFirstInvalid } = useFieldRefs<ContactFieldKey>();

  // Once the form swaps to the "Message sent" state, bring the visitor back
  // to the top of the page (same reduced-motion convention as the hero
  // pillar indicator's smooth-scroll: instant jump instead of smooth when
  // the visitor has asked for reduced motion). Runs once, right when `sent`
  // flips to true - not on every render.
  useEffect(() => {
    if (!sent) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [sent]);

  function onSelectKind(next: ContactKind) {
    if (next === "business") {
      // Selecting "business" sends the visitor straight to Request Talent
      // (see file header). It never becomes a real selection on this form.
      router.push(CONTACT_ROUTES.request);
      return;
    }
    setKind(next);
  }

  function set<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key as ContactFieldKey]) {
      const next = { ...draft, [key]: value };
      const msg = validateContact(next)[key as ContactFieldKey];
      setErrors((e) => {
        const rest = { ...e };
        if (msg) rest[key as ContactFieldKey] = msg;
        else delete rest[key as ContactFieldKey];
        return rest;
      });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const errs = validateContact(draft);
    setErrors(errs);
    const bad = Object.keys(errs) as ContactFieldKey[];
    if (bad.length > 0) {
      setShake((s) => {
        const out = { ...s };
        for (const k of bad) out[k] = (out[k] ?? 0) + 1;
        return out;
      });
      focusFirstInvalid(CONTACT_FIELD_ORDER, errs);
      return;
    }

    setPending(true);
    setFailure(null);
    const res = await submitContact({
      kind: kind === "work" ? "work" : "other",
      name: clean(draft.name),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      role: kind === "work" ? orNull(draft.role) : null,
      message: clean(draft.message),
      hasCv: kind === "work" && cvName !== "",
      consent: draft.consent,
    });
    if (res.ok) {
      setPending(false);
      setSent(true);
      return;
    }
    setPending(false);
    setFailure(res.message || CONTACT_MESSAGES.failure);
  }

  if (sent) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-[18px] border border-(--soft-border) bg-white p-8 text-center wf-d:p-[calc(44*var(--u))]"
      >
        <motion.span
          aria-hidden="true"
          className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[rgba(91,8,123,.08)]"
          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-(--beeliv-purple)"
              initial={{ scale: 1, opacity: 0.45 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
            />
          )}
          <SendIcon size={24} strokeWidth={2.4} stroke="var(--beeliv-purple)" />
        </motion.span>
        <motion.h2
          className="ps-serif [--fs-d:35] [--fs-m:26]"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <T>{CONTACT_SENT.title}</T>
        </motion.h2>
        <motion.p
          className="ps-bd mx-auto"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.32 }}
        >
          <T>{CONTACT_SENT.body}</T>
        </motion.p>
      </div>
    );
  }

  const showWorkFields = kind === "work";

  return (
    <form
      method="post"
      noValidate
      aria-busy={pending}
      aria-label="Contact"
      onSubmit={onSubmit}
      className="flex flex-col gap-7 wf-d:rounded-[18px] wf-d:border wf-d:border-(--soft-border) wf-d:bg-white wf-d:p-[calc(44*var(--u))] wf-d:shadow-[0_14px_40px_rgba(17,17,27,.06)]"
    >
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0 wf-d:gap-[14px]">
        <legend className="ps-eb mb-2.5 p-0 !text-(--muted-text) wf-d:mb-[14px]">
          <T>{CONTACT_KIND.legend}</T>
        </legend>
        <div className="flex flex-col gap-2.5 wf-d:grid wf-d:grid-cols-3 wf-d:gap-[14px]">
          {CONTACT_KIND.options.map((o) => (
            <KindCard
              key={o.value}
              id={`ct-${o.value}`}
              name="ct"
              value={o.value}
              label={o.label}
              checked={o.value === "business" ? false : kind === o.value}
              onSelect={() => onSelectKind(o.value)}
            />
          ))}
        </div>
      </fieldset>

      <div className="ps-hr" />

      <div className="grid grid-cols-1 gap-4 wf-d:grid-cols-2 wf-d:gap-[18px]">
        <CfField
          id="ct-n"
          label={CONTACT_FIELDS.name.label}
          value={draft.name}
          onChange={(v) => set("name", v)}
          error={errors.name}
          shakeKey={shake.name ?? 0}
          inputRef={register("name")}
          autoComplete="name"
          maxLength={200}
        />
        <CfField
          id="ct-e"
          label={CONTACT_FIELDS.email.label}
          type="email"
          inputMode="email"
          value={draft.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
          shakeKey={shake.email ?? 0}
          inputRef={register("email")}
          autoComplete="email"
          maxLength={254}
        />
        <CfField
          id="ct-p"
          label={CONTACT_FIELDS.phone.label}
          type="tel"
          inputMode="tel"
          value={draft.phone}
          onChange={(v) => set("phone", v)}
          error={errors.phone}
          shakeKey={shake.phone ?? 0}
          inputRef={register("phone")}
          autoComplete="tel"
          maxLength={40}
        />
        {showWorkFields && (
          <>
            <div className="cf-f">
              <label htmlFor="ct-r">
                <T>{CONTACT_FIELDS.role.label}</T>
                <span className="cf-note"> {CONTACT_FIELDS.role.note}</span>
              </label>
              <SelectMenu
                id="ct-r"
                value={roleChoice}
                placeholder="Select a role"
                options={[...CONTACT_FIELDS.roleOptions, OTHER_ROLE]}
                onChange={(v) => {
                  setRoleChoice(v);
                  set("role", v === OTHER_ROLE ? roleOther : v);
                }}
              />
            </div>
            {roleChoice === OTHER_ROLE && (
              <CfField
                id="ct-ro"
                label={CONTACT_FIELDS.roleOther.label}
                placeholder={CONTACT_FIELDS.roleOther.placeholder}
                value={roleOther}
                onChange={(v) => {
                  setRoleOther(v);
                  set("role", v);
                }}
                maxLength={200}
              />
            )}
          </>
        )}
      </div>

      <CfField
        id="ct-m"
        label={CONTACT_FIELDS.message.label}
        multiline
        value={draft.message}
        onChange={(v) => set("message", v)}
        error={errors.message}
        shakeKey={shake.message ?? 0}
        inputRef={register("message")}
        maxLength={2000}
      />

      {showWorkFields && (
        <CfField
          id="ct-cv"
          label={CONTACT_FIELDS.cv.label}
          note={CONTACT_FIELDS.cv.note}
          type="file"
          accept=".pdf,.doc,.docx"
          value={cvName}
          onChange={setCvName}
        />
      )}

      <CheckField
        id="ct-ok"
        checked={draft.consent}
        onChange={(v) => set("consent", v)}
        error={errors.consent}
        shakeKey={shake.consent ?? 0}
        top
        ref={register("consent")}
      >
        {CONTACT_CONSENT.lead}{" "}
        <Link href={CONTACT_ROUTES.privacy}>{CONTACT_CONSENT.link}</Link>
      </CheckField>

      <FormAlert>{failure}</FormAlert>

      <CfSubmitButton pending={pending} className="self-start" />
    </form>
  );
}
