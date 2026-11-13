"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/public/kit";
import { T, stagger } from "@/components/public/primitives";
import { AUTH_ROUTES, LOGIN_COPY, RESEND_COOLDOWN_SECONDS } from "@/lib/public-site/auth-content";
import { validateEmail, validateLoginPassword } from "@/lib/public-site/auth-rules";
import { PORTAL_FRAMES, PORTAL_NAMES, authPaths } from "@/lib/auth/portals";
import { resendVerificationEmail, signIn } from "@/lib/auth/service";
import { playWelcome } from "@/lib/admin/sound";
import { inviteReturnPath } from "@/lib/auth-ui/invite-state";
import type { ApiError, Portal, SignInResult } from "@/lib/auth/types";
import { OfflineBanner } from "@/components/shared/states/OfflineBanner";
import { RateLimitNotice } from "@/components/shared/states/RateLimitNotice";
import { ServiceError } from "@/components/shared/states/ServiceError";
import { SessionExpiredDialog } from "@/components/shared/states/SessionExpiredDialog";
import { PreloaderScreen } from "@/components/applicant/Preloader";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { ErrorSummary } from "./ErrorSummary";
import { CheckIcon, LockIcon, MailIcon } from "./AuthIcons";
import { AuthField, CheckField, PasswordField, SubmitButton, useFieldRefs } from "./fields";
import { AuthFoot, AuthHeading } from "./parts";

type Field = "email" | "password";
const ORDER: readonly Field[] = ["email", "password"];
const FIELD_ID: Record<Field, string> = { email: "li-e", password: "li-p" };

/** What the last attempt (or a ?state= preview) ended in. */
export type LoginOutcome =
  | { kind: "wrong" }
  | { kind: "unverified" }
  | { kind: "limited"; seconds: number }
  | { kind: "error"; error: ApiError };

/** `?state=` previews (MOCK ONLY: remove with lib/auth/mock.ts). */
export type LoginPreview = "wrong" | "unverified" | "limited" | "error" | "session-expired";

const WRONG_COPY = "That email or password is not right. Try again, or reset your password.";

/**
 * `skeleton`: the route's loading frame (same layout, no motion; see loading.tsx).
 * `jobId`: set when login was reached from a job's "Apply Now" (/login?job=id).
 * `portal`: /login?portal=client|staff|admin frames the same form for that app
 *   (its own accent, heading and panel). One identity; the server decides where
 *   a person may go.
 * `next`: same-site return URL (already validated by the page).
 * `preview`: show a state on arrival (demo/mock only).
 */
export function LoginForm({
  skeleton = false,
  jobId = null,
  jobNotice = null,
  portal = "talent",
  next = null,
  preview: requestedPreview = null,
}: {
  skeleton?: boolean;
  jobId?: string | null;
  /** Plain message when the job asked for is unknown or closed. */
  jobNotice?: string | null;
  portal?: Portal;
  next?: string | null;
  preview?: LoginPreview | null;
}) {
  const preview = process.env.NODE_ENV === "production" ? null : requestedPreview;
  const router = useRouter();
  const frame = PORTAL_FRAMES[portal];
  const paths = authPaths(portal);
  const isTalent = portal === "talent";
  const [email, setEmail] = useState(
    preview === "wrong" || preview === "unverified" ? "you@example.com" : "",
  );
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [shake, setShake] = useState<Record<Field, number>>({ email: 0, password: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<LoginOutcome | null>(() => {
    if (preview === "wrong") return { kind: "wrong" };
    if (preview === "unverified") return { kind: "unverified" };
    if (preview === "limited") return { kind: "limited", seconds: 45 };
    if (preview === "error")
      return {
        kind: "error",
        error: {
          code: "unavailable",
          message: "We couldn't sign you in right now. Please try again in a moment.",
          supportRef: "BLV-4F2A91",
        },
      };
    return null;
  });
  const [summaryKey, setSummaryKey] = useState(0);
  const [sessionOpen, setSessionOpen] = useState(preview === "session-expired");
  const [arriving, setArriving] = useState(false);
  const { register } = useFieldRefs<Field>();
  const unverifiedRef = useRef<HTMLDivElement>(null);

  // Resend-verification state (server-confirmed only).
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const limited = outcome?.kind === "limited";
  const [validation, setValidation] = useState<{ fieldId: string; message: string }[]>([]);

  useEffect(() => {
    if (outcome?.kind === "unverified") unverifiedRef.current?.focus();
  }, [outcome]);

  const check: Record<Field, (v: string) => string | null> = {
    email: validateEmail,
    password: validateLoginPassword,
  };

  const onChange = (name: Field, value: string) => {
    if (name === "email") setEmail(value);
    else setPassword(value);
    if (errors[name]) setErrors((e) => ({ ...e, [name]: check[name](value) }));
  };
  const onBlur = (name: Field, value: string) => {
    if (submitted || value) setErrors((e) => ({ ...e, [name]: check[name](value) }));
  };

  // A return to the person's own invitation (set by the invitation screen's "Sign in to check" link).
  // Only the exact same-site invite route of this app is honoured (see inviteReturnPath); it is handled
  // here in the browser and is not sent to the server as a destination.
  const inviteReturn = inviteReturnPath(next, portal);

  function destinationFor(res: Extract<SignInResult, { ok: true }>) {
    if (inviteReturn) return inviteReturn;
    if (isTalent && jobId) return `/applicant/apply?job=${encodeURIComponent(jobId)}&from=login`;
    if (isTalent && !next) return "/applicant?from=login";
    return res.destination;
  }

  async function attempt() {
    if (pending || limited) return;
    setSubmitted(true);
    setOutcome(null);
    setValidation([]);

    const nextErrors = { email: check.email(email), password: check.password(password) };
    setErrors(nextErrors);
    const bad = ORDER.filter((k) => nextErrors[k]);
    if (bad.length) {
      setShake((s) => ({
        email: nextErrors.email ? s.email + 1 : s.email,
        password: nextErrors.password ? s.password + 1 : s.password,
      }));
      setValidation(bad.map((k) => ({ fieldId: FIELD_ID[k], message: nextErrors[k]! })));
      setSummaryKey((k) => k + 1);
      return;
    }

    setPending(true);
    if (isTalent) setArriving(true);
    const res = await signIn({ email: email.trim(), password, remember, portal, next: inviteReturn ? null : next });
    if (res.ok) {
      // Welcome sound: Admin and Client portals only (no-op for talent / staff).
      playWelcome(portal);
      // Stay pending while the next page opens.
      router.push(destinationFor(res));
      return;
    }
    setPending(false);
    setArriving(false);
    switch (res.reason) {
      case "invalid_credentials":
        setPassword(""); // keep the email, clear the password
        setOutcome({ kind: "wrong" });
        break;
      case "email_unverified":
        setOutcome({ kind: "unverified" });
        break;
      case "rate_limited":
        setOutcome({ kind: "limited", seconds: res.error.retryAfterSeconds ?? 60 });
        break;
      case "suspended":
        router.push(paths.suspendedPath);
        return;
      case "no_access":
        router.push(
          `${paths.deniedPath}${res.availablePortal ? `?available=${res.availablePortal}` : ""}`,
        );
        return;
      default:
        setOutcome({ kind: "error", error: res.error });
    }
    setSummaryKey((k) => k + 1);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await attempt();
  }

  async function onResend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResendError(null);
    const res = await resendVerificationEmail(email.trim());
    setResending(false);
    if (res.ok) {
      setResendDone(true);
      setNow(Date.now());
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } else {
      setResendError("We couldn't send that just now. Try again in a moment.");
    }
  }

  const showSummary = validation.length > 0 || outcome?.kind === "wrong";

  return (
    <>
      {arriving ? <PreloaderScreen kind={jobId ? "login-job" : "login"} vars={{}} /> : null}
      {!skeleton && <OfflineBanner />}
      {!skeleton && (
        <SessionExpiredDialog
          open={sessionOpen}
          returnUrl={next ?? "/"}
          signInHref={paths.loginPath}
          onSignIn={() => setSessionOpen(false)}
        />
      )}
      <AuthFrame
        screen="login"
        skeleton={skeleton}
        portal={isTalent ? undefined : portal}
        panel={frame.panel ?? undefined}
      >
        <AuthBody onSubmit={onSubmit} ariaBusy={pending}>
          <AuthHeading lead={frame.headLead} accent={frame.headAccent} sub={frame.sub} />

          {jobNotice ? (
            <p role="status" className="ps-sm m-0 rounded-xl bg-[rgba(91,8,123,.06)] px-4 py-3 text-[15px] text-(--ink)">
              {jobNotice}
            </p>
          ) : null}

          {showSummary && (
            <ErrorSummary
              focusKey={summaryKey}
              title={
                outcome?.kind === "wrong"
                  ? WRONG_COPY
                  : "Check the details below and try again."
              }
              items={outcome?.kind === "wrong" ? [] : validation}
            />
          )}

          <Reveal when="mount" y={16} delay={stagger(3, 0.1)}>
            <AuthField
              id="li-e"
              label={LOGIN_COPY.emailLabel}
              icon={<MailIcon />}
              type="email"
              name="email"
              placeholder={LOGIN_COPY.emailPlaceholder}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              value={email}
              error={errors.email}
              shakeKey={shake.email}
              ref={register("email")}
              onChange={(e) => onChange("email", e.target.value)}
              onBlur={(e) => onBlur("email", e.target.value)}
            />
          </Reveal>

          <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
            <PasswordField
              id="li-p"
              label={LOGIN_COPY.passwordLabel}
              name="password"
              placeholder={LOGIN_COPY.passwordPlaceholder}
              autoComplete="current-password"
              value={password}
              error={errors.password}
              shakeKey={shake.password}
              ref={register("password")}
              onChange={(e) => onChange("password", e.target.value)}
              onBlur={(e) => onBlur("password", e.target.value)}
            />
          </Reveal>

          <Reveal
            when="mount"
            y={16}
            delay={stagger(5, 0.1)}
            className="-mt-1 flex items-center justify-between"
          >
            <CheckField id="li-r" checked={remember} onChange={setRemember}>
              {LOGIN_COPY.remember}
            </CheckField>
            <Link href={paths.forgotPath} className="py-2.5 text-sm font-medium">
              <T>{LOGIN_COPY.forgot}</T>
            </Link>
          </Reveal>

          {outcome?.kind === "unverified" && (
            <div ref={unverifiedRef} tabIndex={-1} role="status" className="au-panel outline-none">
              <p>
                Please confirm your email first. We sent a link to{" "}
                <b>{email.trim() || "your email address"}</b>.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="au-linkbtn"
                  onClick={onResend}
                  aria-disabled={resending || cooldown > 0}
                >
                  {resending
                    ? "Sending…"
                    : cooldown > 0
                      ? `Send the link again in ${cooldown}s`
                      : "Send the link again"}
                </button>
              </div>
              {resendDone && (
                <p role="status" className="au-ok">
                  <CheckIcon size={14} /> We&apos;ve sent the link again.
                </p>
              )}
              {resendError && (
                <p role="alert" className="text-[13.5px]" style={{ color: "var(--au-error)" }}>
                  {resendError}
                </p>
              )}
            </div>
          )}

          {outcome?.kind === "limited" && (
            <RateLimitNotice
              key={`${outcome.seconds}-${summaryKey}`}
              retryAfterSeconds={outcome.seconds}
              onElapsed={() => setOutcome(null)}
            />
          )}

          {outcome?.kind === "error" && (
            <ServiceError
              title="We couldn't sign you in"
              error={{ message: outcome.error.code === "unavailable" || outcome.error.code === "outcome_unknown" ? "We couldn't sign you in right now. Please try again in a moment." : outcome.error.message }}
              onRetry={() => void attempt()}
              retrying={pending}
              focusOnMount
            />
          )}

          <Reveal when="mount" y={16} delay={stagger(6, 0.1)}>
            <SubmitButton
              label={LOGIN_COPY.submit}
              pendingLabel={LOGIN_COPY.submitting}
              pending={pending}
              blocked={limited}
              icon={<LockIcon />}
            />
          </Reveal>

          {isTalent ? (
            <AuthFoot
              lead={LOGIN_COPY.newPrompt}
              href={
                jobId
                  ? `${AUTH_ROUTES.signup}?job=${encodeURIComponent(jobId)}`
                  : AUTH_ROUTES.signup
              }
              label={LOGIN_COPY.newLink}
              delay={stagger(7, 0.1)}
            />
          ) : (
            <Reveal when="mount" y={12} delay={stagger(7, 0.1)} className="mt-auto">
              <p className="au-foot mt-0">
                <T>{`Accounts for ${PORTAL_NAMES[portal]} are created by invitation. Check your email for a message from Beeliv.`}</T>
              </p>
            </Reveal>
          )}
        </AuthBody>
      </AuthFrame>
    </>
  );
}

