"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/public/kit";
import { useMotionAllowed } from "@/components/public/motion";
import { T, stagger } from "@/components/public/primitives";
import { signup } from "@/lib/public-site/auth";
import {
  AUTH_ROUTES,
  PASSWORD_RULE,
  SIGNUP_COPY,
  AUTH_MESSAGES,
} from "@/lib/public-site/auth-content";
import {
  passwordStrength,
  validateEmail,
  validateFullName,
  validateNewPassword,
  canonicalAccountPhone,
  validateAccountPhone,
} from "@/lib/public-site/auth-rules";
import type { Job } from "@/lib/public-site/jobs";
import { PreloaderScreen } from "@/components/applicant/Preloader";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { MailIcon, UserIcon } from "./AuthIcons";
import {
  ArrowLink,
  AuthField,
  AuthPhoneField,
  CheckField,
  FlowNotice,
  FormAlert,
  PasswordField,
  PasswordHint,
  PillLink,
  SegmentedSwitch,
  SubmitButton,
  useFieldRefs,
} from "./fields";
import { AuthFoot, AuthHeading } from "./parts";
import { RoleCard } from "./RoleCard";

type Field = "fullName" | "email" | "phone" | "password" | "consent";
const ORDER: readonly Field[] = ["fullName", "email", "phone", "password", "consent"];
type Values = { fullName: string; email: string; phone: string; password: string };

const check: Record<Exclude<Field, "consent">, (v: string) => string | null> = {
  fullName: validateFullName,
  email: validateEmail,
  phone: validateAccountPhone,
  password: validateNewPassword,
};

/**
 * UI-only switch state. It is never sent to the data layer: public signup
 * always creates an applicant account. Choosing "Hire talent" does NOT create
 * anything: after the switch pill has slid across, the visitor is sent to the
 * /request form (businesses are set up by the Beeliv team). Until then (and if
 * navigation fails) the form is replaced by a short notice with a link there.
 */

/** Wait for the switch pill's slide (0.5 s) before leaving; skipped under reduced motion. */
const REDIRECT_DELAY_MS = 400;
type SwitchChoice = "find-work" | "hire-talent";

const SWITCH_OPTIONS = [
  { value: "find-work", label: SIGNUP_COPY.switchFindWork },
  { value: "hire-talent", label: SIGNUP_COPY.switchHireTalent },
] as const satisfies readonly { value: SwitchChoice; label: string }[];

/**
 * Sign up. `job` set = the job-application variant (/signup?job=<id>):
 * "Apply for [Role]." heading, the role card + 3-step progress, and
 * "Create account". No job = the general variant with the
 * Find work / Hire talent switch.
 */
export function SignupForm({
  job,
  jobNotice = null,
  skeleton = false,
}: {
  job: Job | null;
  /** Plain message when the job asked for is unknown or closed (the general sign-up is shown instead). */
  jobNotice?: string | null;
  /** The route's loading frame (same layout, no motion; see loading.tsx). */
  skeleton?: boolean;
}) {
  const [choice, setChoice] = useState<SwitchChoice>("find-work");
  const hire = !job && choice === "hire-talent";
  const [values, setValues] = useState<Values>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [shake, setShake] = useState<Record<Field, number>>({
    fullName: 0,
    email: 0,
    phone: 0,
    password: 0,
    consent: 0,
  });
  const [submitted, setSubmitted] = useState(false);
  // Arrival preloader (covers the navigation into the dashboard).
  const [arriving, setArriving] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const { register, focusFirstInvalid } = useFieldRefs<Field>();
  const router = useRouter();
  const motionOk = useMotionAllowed();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Back-forward-cache restore: come back to a fresh "Find work" state.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setChoice("find-work");
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  function onChoose(next: SwitchChoice) {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
    setChoice(next);
    setFailure(null);
    setNotice(null);
    if (next === "hire-talent") {
      if (motionOk) {
        redirectTimer.current = setTimeout(
          () => router.push(AUTH_ROUTES.requestFromSignup),
          REDIRECT_DELAY_MS,
        );
      } else {
        router.push(AUTH_ROUTES.requestFromSignup);
      }
    }
  }

  const setValue = (name: keyof Values, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: check[name](value) }));
  };
  const blur = (name: keyof Values, value: string) => {
    if (submitted || value) setErrors((e) => ({ ...e, [name]: check[name](value) }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Defence in depth: the "Hire talent" state has no form to submit.
    if (pending || hire) return;
    setSubmitted(true);
    setFailure(null);
    setNotice(null);

    const next: Partial<Record<Field, string | null>> = {
      fullName: check.fullName(values.fullName),
      email: check.email(values.email),
      phone: check.phone(values.phone),
      password: check.password(values.password),
      consent: consent ? null : AUTH_MESSAGES.consentRequired,
    };
    setErrors(next);
    if (ORDER.some((k) => next[k])) {
      setShake((s) => {
        const out = { ...s };
        for (const k of ORDER) if (next[k]) out[k] += 1;
        return out;
      });
      focusFirstInvalid(ORDER, next);
      return;
    }

    setPending(true);
    setArriving(true);
    const res = await signup({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: canonicalAccountPhone(values.phone) ?? values.phone.trim(),
      password: values.password,
      acceptedTerms: consent,
      jobId: job?.id ?? null,
    });
    if (res.ok) {
      // Do not keep the password in memory once it has been handed over.
      setValues((v) => ({ ...v, password: "" }));
      setNotice(res.notice);
      if (job) {
        // Job-application signup: continue straight into the applicant
        // dashboard's apply flow for this job, instead of the general
        // "check your email to verify" detour below. No real Supabase auth
        // is wired yet (project-lead direction, 2026-09-28: signup/login are
        // a frontend-only pass-through for now — do not gate /applicant/**
        // on any session/auth check), so this is a plain, unconditional
        // navigation once the form itself succeeds.
        //
        // OPEN ITEM for when real auth lands: email verification will need
        // to happen first, with the job id threaded through it (verify-email
        // -> verify-email/success -> here) rather than skipped. That's an
        // auth/backend integration question, flagged for the Security/RBAC
        // and Database agents rather than decided here.
        setStep(2);
        // `from=signup` tells the dashboard which arrival preloader to show
        // (it reads and strips the param itself).
        router.push(`/applicant/apply?job=${encodeURIComponent(job.id)}&from=signup`);
        return;
      }
      // General "Get Started -> find work" signup: same frontend-only
      // pass-through as the job-specific path above (project-lead direction,
      // 2026-09-28), landing on the dashboard Overview since there is no
      // specific job attached. Same OPEN ITEM applies: real email
      // verification (AUTH_ROUTES.verifyEmail) gets reinstated in front of
      // this once real auth lands. Stay in the pending state while it opens.
      router.push("/applicant?from=signup");
      return;
    }
    setPending(false);
    setArriving(false);
    setFailure(res.message);
  }

  const copy = job ? SIGNUP_COPY.job : SIGNUP_COPY.general;
  const strength = passwordStrength(values.password);

  return (
    <>
    {arriving ? <PreloaderScreen kind={job ? "signup-job" : "signup"} vars={{ role: job?.role, company: job?.company }} /> : null}
    <AuthFrame
      screen="signup"
      skeleton={skeleton}
      panelExtra={job ? <RoleCard job={job} step={step} tone="panel" /> : undefined}
    >
      <AuthBody gap={20} onSubmit={onSubmit} ariaBusy={pending}>
        <AuthHeading
          lead={copy.headLead}
          accent={job ? `${job.role}.` : SIGNUP_COPY.general.headAccent}
          sub={copy.sub}
        />

        {jobNotice ? (
          <p role="status" className="ps-sm m-0 rounded-xl bg-[rgba(91,8,123,.06)] px-4 py-3 text-[15px] text-(--ink)">
            {jobNotice}
          </p>
        ) : null}

        {job && (
          // Shown on Phone AND Compact (the "popup card" header has no room
          // for the role card); hidden only on Full, where BrandPanel shows
          // the tone="panel" version instead (panelExtra, above).
          <Reveal
            when="mount"
            y={16}
            delay={stagger(2, 0.1)}
            className="[@media(min-width:1280px)_and_(min-height:780px)]:hidden"
          >
            <RoleCard job={job} step={step} tone="page" />
          </Reveal>
        )}

        {!job && (
          <Reveal when="mount" y={16} delay={stagger(2, 0.1)}>
            <SegmentedSwitch
              legend={SIGNUP_COPY.switchLabel}
              name="choice"
              value={choice}
              onChange={onChoose}
              options={SWITCH_OPTIONS}
            />
          </Reveal>
        )}

        {hire ? (
          <>
            <Reveal when="mount" y={12} delay={0.05}>
              <p role="status" className="au-note">
                {SIGNUP_COPY.hireNote}
              </p>
            </Reveal>
            <PillLink href={AUTH_ROUTES.requestFromSignup} label={SIGNUP_COPY.hireAction} />
          </>
        ) : (
          <>
          <Reveal when="mount" y={16} delay={stagger(3, 0.1)}>
            <AuthField
              id="su-n"
              label={SIGNUP_COPY.nameLabel}
              icon={<UserIcon />}
              type="text"
              name="name"
              placeholder={SIGNUP_COPY.namePlaceholder}
              autoComplete="name"
              value={values.fullName}
              error={errors.fullName}
              shakeKey={shake.fullName}
              ref={register("fullName")}
              onChange={(e) => setValue("fullName", e.target.value)}
              onBlur={(e) => blur("fullName", e.target.value)}
            />
          </Reveal>

          <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
            <AuthField
              id="su-e"
              label={SIGNUP_COPY.emailLabel}
              icon={<MailIcon />}
              type="email"
              name="email"
              placeholder={SIGNUP_COPY.emailPlaceholder}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              value={values.email}
              error={errors.email}
              shakeKey={shake.email}
              ref={register("email")}
              onChange={(e) => setValue("email", e.target.value)}
              onBlur={(e) => blur("email", e.target.value)}
            />
          </Reveal>

          <Reveal when="mount" y={16} delay={stagger(5, 0.1)}>
            <AuthPhoneField
              id="su-ph"
              label={SIGNUP_COPY.phoneLabel}
              value={values.phone}
              error={errors.phone}
              shakeKey={shake.phone}
              inputRef={register("phone")}
              onChange={(v) => setValue("phone", v)}
              onBlur={(v) => blur("phone", v)}
            />
          </Reveal>

          <Reveal when="mount" y={16} delay={stagger(6, 0.1)}>
            <PasswordField
              id="su-p"
              label={SIGNUP_COPY.passwordLabel}
              name="password"
              placeholder={SIGNUP_COPY.passwordPlaceholder}
              autoComplete="new-password"
              value={values.password}
              error={errors.password}
              shakeKey={shake.password}
              ref={register("password")}
              hintClassName="flex items-center justify-between gap-3"
              hint={<PasswordHint text={PASSWORD_RULE.hint} score={strength} />}
              onChange={(e) => setValue("password", e.target.value)}
              onBlur={(e) => blur("password", e.target.value)}
            />
          </Reveal>

          <Reveal when="mount" y={16} delay={stagger(7, 0.1)}>
            <CheckField
              id="su-ok"
              top
              checked={consent}
              onChange={(c) => {
                setConsent(c);
                if (errors.consent && c) setErrors((e) => ({ ...e, consent: null }));
              }}
              error={errors.consent}
              shakeKey={shake.consent}
              ref={register("consent")}
            >
              {SIGNUP_COPY.consentLead}
              <Link href={AUTH_ROUTES.terms} target="_blank" rel="noopener">
                {SIGNUP_COPY.consentTerms}
              </Link>
              {SIGNUP_COPY.consentAnd}
              <Link href={AUTH_ROUTES.privacy} target="_blank" rel="noopener">
                {SIGNUP_COPY.consentPrivacy}
              </Link>
              .
            </CheckField>
          </Reveal>

          <SubmitButton
              label={copy.submit}
              pendingLabel={SIGNUP_COPY.submitting}
              pending={pending}
              icon={<UserIcon />}
            />

          <FormAlert>{failure}</FormAlert>
          <FlowNotice>{notice}</FlowNotice>

          <Reveal when="mount" y={12} delay={stagger(9, 0.1)}>
            <p className="ps-sm text-center">
              <T>{SIGNUP_COPY.hiringPrompt.trimEnd()}</T>{" "}
              <ArrowLink
                href={AUTH_ROUTES.request}
                label={SIGNUP_COPY.hiringLink}
                className="font-semibold"
              />
            </p>
          </Reveal>
          </>
        )}

        <AuthFoot
          lead={SIGNUP_COPY.loginPrompt}
          href={
            job
              ? `${AUTH_ROUTES.login}?job=${encodeURIComponent(job.id)}`
              : AUTH_ROUTES.login
          }
          label={SIGNUP_COPY.loginLink}
          delay={stagger(10, 0.1)}
        />
      </AuthBody>
    </AuthFrame>
    </>
  );
}
