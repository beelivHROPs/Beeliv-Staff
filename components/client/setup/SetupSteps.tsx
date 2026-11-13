"use client";

import { ArrowRight, Briefcase, Calendar, Check, Clock3, FileText, LockKeyhole, MapPin, ShieldCheck, UsersRound } from "@/components/applicant/icons";
import { CheckMark } from "@/components/applicant/documentation/controls";
import { PhoneInput } from "@/components/applicant/form-fields";
import { phoneError } from "@/lib/phone/phone";
import { Field, FormGrid, INPUT_CLS, Note, SubHead } from "@/components/applicant/apply/parts";
import { useState } from "react";
import { ReadButton } from "@/components/shared/agreements/AgreementReader";
import type { SetupAgreement } from "@/lib/admin/setup/types";
import type { Outlet } from "@/lib/client/types";
import { BarChart3, Wallet } from "../icons";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";
const BTN = "ap-btn text-[15px] font-semibold";

function OutletList({ outlets, badge }: { outlets: Outlet[]; badge?: string }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[641px]:grid-cols-2">
      {outlets.map((o) => (
        <li key={o.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-(--ap-line-2) px-3.5 py-3">
          <MapPin className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
          <span className="min-w-0">
            <b className="block truncate text-[15px]">{o.name}</b>
            <span className="ap-sm block truncate">{o.location}</span>
          </span>
          {badge ? (
            <span className="ap-label ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-(--ap-ok)">
              <Check className="size-3.5" aria-hidden="true" />
              {badge}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ 1 Welcome */

const WHAT_IT_DOES = [
  { icon: UsersRound, text: "See your Beeliv-managed workforce and how attendance looks today." },
  { icon: Calendar, text: "Follow schedules and shift coverage across your outlets." },
  { icon: Briefcase, text: "Review candidates Beeliv sends you and request more staff." },
  { icon: ShieldCheck, text: "Keep an eye on compliance and payroll schedule information." },
] as const;

/**
 * No business data here: setup-only sessions load no client name, outlets or
 * team. Those appear in the workspace once Beeliv confirms access.
 */
export function StepWelcome() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SubHead>What Beeliv Client is for</SubHead>
        <ul className="flex flex-col gap-3">
          {WHAT_IT_DOES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="ap-bd pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <Note icon={ShieldCheck}>Your outlets and access are set by Beeliv and appear once your account is active.</Note>
    </div>
  );
}

/* ------------------------------------------------------------ 2 Details */

/** Only what the setup wire accepts: name and phone. Email is the verified, read-only sign-in address. */
export function detailsErrors(d: { fullName: string; phone: string }): { fullName?: string; jobTitle?: string; phone?: string } {
  return {
    // Job title is optional (pilot rule L2); Settings reuses this.
    jobTitle: undefined,
    fullName: d.fullName.trim() ? undefined : "Enter your full name.",
    phone: phoneError(d.phone) ?? undefined,
  };
}

export function StepDetails({ name, phone, onName, onPhone, tried, email }: { name: string; phone: string; onName: (v: string) => void; onPhone: (v: string) => void; tried: boolean; email: string }) {
  const err = tried ? detailsErrors({ fullName: name, phone }) : {};
  return (
    <div className="flex flex-col gap-4">
      <FormGrid>
        <Field label="Full name" htmlFor="setup-name" error={err.fullName}>
          <input id="setup-name" className={INPUT_CLS} autoComplete="name" value={name} onChange={(e) => onName(e.target.value)} aria-invalid={err.fullName ? true : undefined} aria-describedby={err.fullName ? "setup-name-err" : undefined} />
        </Field>
        <Field label="Email" htmlFor="setup-email" hint="The address your invitation was sent to. Read-only.">
          <input id="setup-email" className={INPUT_CLS} value={email} readOnly aria-readonly="true" />
        </Field>
        <Field label="Phone number" htmlFor="setup-phone" error={err.phone} hint="Choose your country, then enter the number. Each phone number can be used on one account only.">
          <PhoneInput quiet id="setup-phone" value={phone} onChange={onPhone} invalid={Boolean(err.phone)} />
        </Field>
      </FormGrid>
      <p className="ap-sm">Job title, profile photo, contact preference and notifications are optional. You can add them in Settings once your account is active.</p>
    </div>
  );
}

/* ------------------------------------------------------------ Access (Settings) */

const CAN_SEE = [
  { icon: UsersRound, label: "Workforce", detail: "Beeliv-managed staff at your outlets." },
  { icon: Clock3, label: "Attendance", detail: "Who is present, late or absent." },
  { icon: Calendar, label: "Schedules", detail: "Shifts and coverage." },
  { icon: Briefcase, label: "Candidates", detail: "People Beeliv submits for your review." },
  { icon: ShieldCheck, label: "Compliance", detail: "Authorised document status." },
  { icon: Wallet, label: "Payroll visibility", detail: "Authorised payroll schedule information." },
  { icon: BarChart3, label: "Analytics", detail: "Summaries built from the same records." },
] as const;

/** Outlets + visible vs restricted. Used by Settings > Outlets & access (post-activation, not setup). */
export function AccessSummary({ outlets }: { outlets: Outlet[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SubHead>Your outlets</SubHead>
        <OutletList outlets={outlets} badge="Access" />
      </div>

      <div>
        <SubHead>What you can see</SubHead>
        <ul className="grid grid-cols-1 gap-2.5 min-[641px]:grid-cols-2">
          {CAN_SEE.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex min-w-0 items-start gap-3 rounded-xl border border-(--ap-line-2) px-3.5 py-3">
              <Icon className="mt-0.5 size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0">
                <b className="block text-[15px]">{label}</b>
                <span className="ap-sm block">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <SubHead>What stays restricted</SubHead>
        <div className="flex items-start gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3.5 py-3">
          <LockKeyhole className="mt-0.5 size-[18px] shrink-0 text-(--ap-muted)" aria-hidden="true" />
          <span className="ap-bd">Sensitive HR information, such as personal identity and banking details and internal HR records, is kept by Beeliv and never shown in Beeliv Client.</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 3 Policies */

/**
 * Real agreements come from the server (setup.agreements). Absent wording
 * (body null) shows a banner only: nothing to read, nothing to accept, nothing
 * submitted. Responses are sent with the server's own id / hash / revision.
 */
export function StepPolicies({ agreements, contentReady, onRespond, tried }: { agreements: SetupAgreement[]; contentReady: boolean; onRespond: (a: SetupAgreement, accepted: boolean) => void; tried: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {!contentReady ? <p className="ap-bd rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-(--ap-muted)">Some wording is not published yet, so setup cannot be completed. Beeliv will publish it; nothing here is accepted on your behalf.</p> : null}
      {agreements.map((a) => (
        <PolicyCard key={a.id} a={a} tried={tried} onRespond={(v) => onRespond(a, v)} />
      ))}
    </div>
  );
}

/** One policy: read the full text first, then accept. Reading is not acceptance. */
function PolicyCard({ a, tried, onRespond }: { a: SetupAgreement; tried: boolean; onRespond: (accepted: boolean) => void }) {
  const [read, setRead] = useState(false);
  const accepted = a.response === true;
  const bad = tried && a.required && a.body !== null && !accepted;
  return (
    <div data-ap-field className="rounded-2xl border border-(--ap-line) p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <b className="block text-[16px]">{a.title}</b>
          {a.version ? <span className="ap-sm">{a.version}</span> : null}
        </div>
        {accepted ? (
          <span className="ap-label ml-auto inline-flex shrink-0 items-center gap-1 font-bold text-(--ap-ok)">
            <Check className="size-3.5" aria-hidden="true" /> Accepted
          </span>
        ) : null}
      </div>
      {a.body !== null ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ReadButton title={a.title} version={a.version} body={a.body} onRead={() => setRead(true)} />
            {!accepted && !read ? <span className="ap-sm text-(--ap-muted)">Read it first. Then you can accept.</span> : null}
          </div>
          <button type="button" role="checkbox" aria-checked={accepted} aria-invalid={bad ? true : undefined} disabled={!accepted && !read} onClick={() => onRespond(!accepted)} className={`mt-3 flex w-full items-start gap-3 rounded-xl text-left text-[15px] leading-[1.5] text-(--ap-ink-2) disabled:opacity-50 ${FOCUS}`}>
            <CheckMark checked={accepted} />
            <span>I have read and accept this.</span>
          </button>
          {bad ? (
            <p className="ap-sm mt-1.5 text-(--ap-rose)" role="alert">
              Read it, then tick this to continue.
            </p>
          ) : null}
        </>
      ) : (
        <p className="ap-bd mt-3 rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-(--ap-muted)">Wording pending from Beeliv. You will be able to read and accept this once Beeliv publishes it.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ 4 Finish */

/** Finish is a SERVER check; this page never claims completion. `reasons` is what the server said is missing. */
export function StepFinish({ reasons, busy, onFinish }: { reasons: string[] | null; busy: boolean; onFinish: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="ap-bd">When your details and policies are in, ask Beeliv to check your setup. Access opens only after Beeliv confirms it.</p>
      <div>
        <button type="button" disabled={busy} onClick={onFinish} className={`${BTN} ap-btn-p h-12 text-white! ${FOCUS}`}>
          {busy ? "Checking..." : "Finish setup"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div aria-live="polite">
        {reasons ? (
          <div role="alert">
            <b className="text-[15px]">Not complete yet</b>
            <ul className="mt-1.5 list-disc pl-5 text-[15px] text-(--ap-ink-2)">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <Note icon={ShieldCheck}>Beeliv confirms completion, not this page.</Note>
    </div>
  );
}
