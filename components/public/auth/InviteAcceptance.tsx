"use client";

/**
 * /invite/[token]: accept an invitation, on the typed rev-2 boundary
 * (docs/contracts/auth-invitation-wire.md). InviteLoader decides whether this
 * screen is shown at all (unavailable / temporary failure never reach it).
 *
 * States here: valid-new-account (set password, confirm name/phone),
 * valid-existing-account (sign in to accept; no second account), accepting,
 * rejected inputs (inputs kept), "We could not confirm completion" (outcome
 * unknown: sign in to check, or try again) and success ("Invitation accepted",
 * setup is next). Before verification the screen shows ONLY the masked email and the
 * app (kind): no inviter, organisation, role, scope or prefill. The person
 * cannot change the role, scope or assignment granted: the screen has no
 * control for them and sends none.
 */

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/public/kit";
import { stagger } from "@/components/public/primitives";
import { PASSWORD_RULE } from "@/lib/public-site/auth-content";
import {
  canonicalAccountPhone,
  normaliseEmail,
  passwordStrength,
  validateAccountPhone,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validateLoginPassword,
  validateNewPassword,
} from "@/lib/public-site/auth-rules";
import { checkInvitationCompletion, submitInvitation } from "@/lib/auth/invitation-client";
import type { InvitationKind, InvitationPreview } from "@/lib/auth/invitation-wire";
import type { AuthMode } from "@/lib/auth/mode";
import { PORTAL_NAMES, authPaths } from "@/lib/auth/portals";
import {
  canSubmitAgain,
  eventForAttemptReason,
  initialFlow,
  inviteKey,
  inviteRoutePath,
  reduceInvite,
  showCheckCompletion,
  showRetry,
} from "@/lib/auth-ui/invite-state";
import type { ApiError, Portal } from "@/lib/auth/types";
import { OfflineBanner } from "@/components/shared/states/OfflineBanner";
import { RateLimitNotice } from "@/components/shared/states/RateLimitNotice";
import { ServiceError } from "@/components/shared/states/ServiceError";
import { UnsavedChangesGuard } from "@/components/shared/states/UnsavedChangesGuard";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { CheckIcon, MailIcon, UserIcon } from "./AuthIcons";
import { ErrorSummary } from "./ErrorSummary";
import { AuthField, AuthPhoneField, PasswordField, PasswordHint, SubmitButton } from "./fields";
import { InvitationUnavailable } from "./InviteStates";
import { AuthFoot, AuthHeading } from "./parts";
import { StatusPanel } from "./StatusPanel";

/** The only previews this screen can be given. */
export type ValidInvitation = Extract<InvitationPreview, { state: "valid-new-account" | "valid-existing-account" }>;

type Field = "fullName" | "phone" | "email" | "password" | "confirm";
const FIELD_ID: Record<Field, string> = {
  fullName: "iv-n",
  phone: "iv-ph",
  email: "iv-e",
  password: "iv-p",
  confirm: "iv-c",
};

type CheckNote = { tone: "info" | "warn"; title: string; text: string; supportRef?: string };

const WRONG ="That email or password is not right. Try again, or reset your password.";

/** Wire kind -> the app frame/wording. "internal" is shown as Admin. */
const appOf = (kind: InvitationKind): "client" | "staff" | "admin" => (kind === "internal" ? "admin" : kind);

type AcceptanceProps = {
  token: string;
  preview: ValidInvitation;
  /** "live" = the real backend; "preview" = development fixtures. Decided on the server. */
  mode: AuthMode;
  /** The app whose /invite route this is. "talent" = the shared /invite route (staff invitations). */
  routePortal?: Portal;
  /** PREVIEW MODE ONLY: `?demo=fail` makes the first accept attempt fail with an unknown outcome. */
  demo?: string | null;
};

/**
 * Keyed by the invitation's identity (token + app + mode): a reused instance can never carry a
 * success, a "gone" card or a recovery state from another invitation.
 */
export function InviteAcceptance(props: AcceptanceProps) {
  return (
    <InviteAcceptanceInner
      key={inviteKey({ token: props.token, portal: props.routePortal ?? "talent", mode: props.mode })}
      {...props}
    />
  );
}

function InviteAcceptanceInner({
  token,
  preview,
  mode,
  demo = null,
  routePortal = "talent",
}: AcceptanceProps) {
  const app = appOf(preview.kind);
  const paths = authPaths(app);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState<{ kind: InvitationKind; destination: string } | null>(null);

  // ---- success ----
  if (done) {
    const doneApp = appOf(done.kind);
    return (
      <StatusPanel
        portal={doneApp}
        icon={<CheckIcon size={26} strokeWidth={2} />}
        lead="Invitation "
        accent="accepted."
        sub={`Welcome to ${PORTAL_NAMES[doneApp]}. Setup is next.`}
        panel={{ lead: "Invitation ", accent: "accepted.", body: "Your invitation has been accepted. Finish setup to continue.", back: { href: "/", label: "Back to home" } }}
        primary={{
          href: done.destination,
          label: doneApp === "client" ? "Continue to setup →" : "Continue →",
        }}
      />
    );
  }

  // ---- the server said the link is not (or no longer) usable: one generic card ----
  if (gone) return <InvitationUnavailable routePortal={routePortal} />;

  return (
    <AcceptForm
      token={token}
      preview={preview}
      mode={mode}
      demo={demo}
      routePortal={routePortal}
      app={app}
      paths={paths}
      onDone={setDone}
      onGone={() => setGone(true)}
    />
  );
}

function AcceptForm({
  token,
  preview,
  mode,
  demo,
  routePortal,
  app,
  paths,
  onDone,
  onGone,
}: {
  token: string;
  preview: ValidInvitation;
  mode: AuthMode;
  demo: string | null;
  routePortal: Portal;
  app: "client" | "staff" | "admin";
  paths: ReturnType<typeof authPaths>;
  onDone: (d: { kind: InvitationKind; destination: string }) => void;
  onGone: () => void;
}) {
  const existing = preview.state === "valid-existing-account";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [shake, setShake] = useState<Record<Field, number>>({
    fullName: 0, phone: 0, email: 0, password: 0, confirm: 0,
  });
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [summaryKey, setSummaryKey] = useState(0);
  const [summary, setSummary] = useState<{ title: string; items: { fieldId?: string; message: string }[] } | null>(null);
  const [failure, setFailure] = useState<ApiError | null>(null);
  /**
   * Recovery state (lib/auth-ui/invite-state.ts). `flow.unknown` = the server could not tell us whether
   * an earlier attempt created the account: never "nothing changed". It survives later validation errors,
   * 429s and wrong-password results and ends only on a confirmed completion or an explicit Dismiss.
   */
  const [flow, dispatch] = useReducer(reduceInvite, inviteKey({ token, portal: routePortal, mode }), initialFlow);
  const unknown = showCheckCompletion(flow) ? flow.unknown : null;
  const [limit, setLimit] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  /** "Check completion" (observation only): in flight, its latest plain-wording result, its own rate limit. */
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState<CheckNote | null>(null);
  const [checkLimit, setCheckLimit] = useState<number | null>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  // A new check result appears below the buttons: bring it into view.
  const noteRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (checkNote) noteRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [checkNote]);

  // The recovery sign-in link keeps the invitation: after login the person returns to this exact invite route.
  const returnPath = inviteRoutePath(routePortal, token);
  const signInHref = returnPath
    ? `${authPaths(routePortal).loginPath}?next=${encodeURIComponent(returnPath)}`
    : paths.loginPath;

  const order: Field[] = existing
    ? ["email", "password"]
    : ["fullName", "phone", "password", "confirm"];

  const rules: Record<Field, () => string | null> = {
    fullName: () => validateFullName(fullName),
    phone: () => validateAccountPhone(phone),
    email: () => validateEmail(email),
    password: () => (existing ? validateLoginPassword(password) : validateNewPassword(password)),
    confirm: () => validateConfirmPassword(confirm, password),
  };

  // Dirty = the person has typed something.
  const dirty = !success && (!!fullName || !!phone || !!email || !!password || !!confirm);

  async function attempt() {
    if (pending || checking || limit !== null) return;
    setSubmitted(true);
    setFailure(null);
    setCheckNote(null);
    setSummary(null);
    if (!canSubmitAgain(flow, existing)) {
      // A new-account retry could meet an account the earlier attempt already created.
      setSummary({ title: "Check completion first, or dismiss the notice, before creating your account again.", items: [] });
      setSummaryKey((k) => k + 1);
      return;
    }

    const next: Partial<Record<Field, string | null>> = {};
    for (const f of order) next[f] = rules[f]();
    setErrors(next);
    const bad = order.filter((f) => next[f]);
    if (bad.length) {
      setShake((s) => {
        const o = { ...s };
        for (const f of bad) o[f] += 1;
        return o;
      });
      setSummary({
        title: "Check the details below and try again.",
        items: bad.map((f) => ({ fieldId: FIELD_ID[f], message: next[f]! })),
      });
      setSummaryKey((k) => k + 1);
      return;
    }

    setPending(true);
    const res = await submitInvitation(
      {
        portal: routePortal,
        token,
        password,
        email: existing ? normaliseEmail(email) : undefined,
        profile: existing
          ? undefined
          : { fullName: fullName.trim(), phone: canonicalAccountPhone(phone) ?? phone.trim() },
      },
      mode,
      demo,
    );
    setPending(false);
    if (res.ok) {
      dispatch({ type: "confirmed" });
      setSuccess(true); // stops the unsaved-changes guard before we switch screens
      setPassword("");
      setConfirm("");
      onDone({ kind: res.kind, destination: res.destination });
      return;
    }
    // The earlier doubt (if any) is never cleared by this result.
    dispatch(eventForAttemptReason(res.reason, res.error.supportRef));
    switch (res.reason) {
      case "invitation_unavailable":
        // With an earlier uncertain attempt the link may simply have been used by it: stay here so
        // Check completion remains available. Otherwise show the one generic card.
        if (!flow.unknown) onGone();
        return;
      case "invalid_credentials":
        setPassword("");
        setSummary({ title: WRONG, items: [] });
        setSummaryKey((k) => k + 1);
        return;
      case "rate_limited":
        setLimit(res.error.retryAfterSeconds ?? 60);
        return;
      case "weak_password":
      case "validation_failed":
        // Rejected before anything was created: inputs stay so they can be fixed.
        setSummary({ title: res.error.message, items: [] });
        setSummaryKey((k) => k + 1);
        return;
      case "outcome_unknown":
      case "unavailable":
      case "offline":
        // Timeout / 5xx / unconfirmed reply: the account MAY have been created (recorded above).
        return;
      default:
        // Other safe, clearly-refused outcomes (forbidden, invalid_request, ...).
        setFailure(res.error);
    }
  }

  /**
   * "Check completion": ONLY observes whether the earlier attempt went through. Sends no
   * password or profile, never replays acceptance, and shows success only on a confirmed
   * result. Entered values and the portal stay as they are on every outcome.
   */
  async function checkCompletion() {
    if (checking || pending || checkLimit !== null) return;
    setCheckNote(null);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setCheckNote({ tone: "warn", title: "You're offline", text: "Reconnect, then check again. No completion check was sent." });
      return;
    }
    setChecking(true);
    const res = await checkInvitationCompletion({ portal: routePortal, token }, mode, demo);
    setChecking(false);
    if (res.ok) {
      dispatch({ type: "confirmed" });
      setSuccess(true); // stops the unsaved-changes guard before we switch screens
      setPassword("");
      setConfirm("");
      onDone({ kind: res.kind, destination: res.destination });
      return;
    }
    // Anything below is "not confirmed": the earlier doubt stays until confirmed or dismissed.
    switch (res.reason) {
      case "rate_limited":
        setCheckLimit(res.error.retryAfterSeconds ?? 60);
        return;
      case "unauthenticated":
      case "invalid_credentials":
      case "no_access":
      case "forbidden":
        setCheckNote({
          tone: "info",
          title: "Sign in to check",
          text: "We can only check once you are signed in with the invited email. Sign in below; you'll come back to this invitation to finish.",
        });
        return;
      case "suspended":
        setCheckNote({ tone: "warn", title: "This account is not active", text: "Please contact Beeliv.", supportRef: res.error.supportRef });
        return;
      case "offline":
        setCheckNote({
          tone: "warn",
          title: "We couldn't reach Beeliv",
          text: "Check your connection, then check again. Your details are still here.",
          supportRef: res.error.supportRef,
        });
        return;
      default:
        // outcome_unknown / unavailable / anything else: still not confirmed.
        setCheckNote({
          tone: "warn",
          title: "We still can't confirm",
          text: "Nothing is confirmed yet. Check again in a moment, or sign in to see whether your account is ready.",
          supportRef: res.error.supportRef,
        });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await attempt();
  }

  const check = (f: Field, v: string): string | null =>
    f === "fullName" ? validateFullName(v)
    : f === "phone" ? validateAccountPhone(v)
    : f === "email" ? validateEmail(v)
    : f === "password" ? (existing ? validateLoginPassword(v) : validateNewPassword(v))
    : validateConfirmPassword(v, password);
  const setVal = (f: Field, v: string) => {
    ({ fullName: setFullName, phone: setPhone, email: setEmail, password: setPassword, confirm: setConfirm })[f](v);
    // Reward early: an error clears as soon as the value is valid.
    if (errors[f]) setErrors((e) => ({ ...e, [f]: check(f, v) }));
  };
  const blur = (f: Field, v: string) => {
    if (submitted || v) setErrors((e) => ({ ...e, [f]: check(f, v) }));
  };

  return (
    <>
      <OfflineBanner />
      <UnsavedChangesGuard dirty={dirty} />
      <AuthFrame
        screen="reset"
        portal={app}
        panel={{
          lead: existing ? "Welcome " : "Welcome to ",
          accent: existing ? "back." : "Beeliv.",
          body: existing
            ? "Sign in to accept your invitation."
            : "Create your password to continue.",
          back: { href: paths.loginPath, label: "Back to log in" },
        }}
      >
        <AuthBody logo={false} onSubmit={onSubmit} ariaBusy={pending}>
          <AuthHeading
            headingRef={headingRef}
            lead={existing ? "Accept your " : "Welcome to "}
            accent={existing ? "invitation." : "Beeliv."}
            sub={
              existing
                ? "You already have a Beeliv account. Sign in to accept this invitation."
                : "Create your password to continue."
            }
            delay={0.15}
          />

          <Reveal when="mount" y={12} delay={0.25}>
            <div className="au-panel">
              <p className="text-[14px] text-(--muted-text)">
                Invitation sent to <b className="text-(--ink)">{preview.emailMasked}</b>
              </p>
            </div>
          </Reveal>

          {summary && <ErrorSummary focusKey={summaryKey} title={summary.title} items={summary.items} />}

          {existing ? (
            <>
              <AuthField
                id="iv-e"
                label="Email"
                icon={<MailIcon />}
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                value={email}
                error={errors.email}
                shakeKey={shake.email}
                hint={`Use the email this invitation was sent to (${preview.emailMasked}).`}
                onChange={(e) => setVal("email", e.target.value)}
                onBlur={(e) => blur("email", e.target.value)}
              />
              <PasswordField
                id="iv-p"
                label="Password"
                name="password"
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                error={errors.password}
                shakeKey={shake.password}
                onChange={(e) => setVal("password", e.target.value)}
                onBlur={(e) => blur("password", e.target.value)}
              />
              <p className="-mt-2 text-sm">
                <Link href={paths.forgotPath} className="font-medium">
                  Forgot password?
                </Link>
              </p>
            </>
          ) : (
            <>
              <AuthField
                id="iv-n"
                label="Full name"
                icon={<UserIcon />}
                name="name"
                placeholder="Your full name"
                autoComplete="name"
                value={fullName}
                error={errors.fullName}
                shakeKey={shake.fullName}
                onChange={(e) => setVal("fullName", e.target.value)}
                onBlur={(e) => blur("fullName", e.target.value)}
              />
              <AuthPhoneField
                id="iv-ph"
                label="Phone number"
                value={phone}
                error={errors.phone}
                shakeKey={shake.phone}
                onChange={(v) => setVal("phone", v)}
                onBlur={(v) => blur("phone", v)}
              />
              <PasswordField
                id="iv-p"
                label="Create a password"
                name="password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={password}
                error={errors.password}
                shakeKey={shake.password}
                hintClassName="flex items-center justify-between gap-3"
                hint={<PasswordHint text={PASSWORD_RULE.hint} score={passwordStrength(password)} />}
                onChange={(e) => setVal("password", e.target.value)}
                onBlur={(e) => blur("password", e.target.value)}
              />
              <PasswordField
                id="iv-c"
                label="Confirm password"
                name="confirm-password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirm}
                error={errors.confirm}
                shakeKey={shake.confirm}
                onChange={(e) => setVal("confirm", e.target.value)}
                onBlur={(e) => blur("confirm", e.target.value)}
              />
            </>
          )}

          {limit !== null && (
            <RateLimitNotice
              key={limit}
              retryAfterSeconds={limit}
              onElapsed={() => setLimit(null)}
            />
          )}

          {unknown && (
            <>
              <ServiceError
                title="We could not confirm completion"
                error={{
                  message: `Your account may already be set up.${flow.linkClosed ? " This link no longer shows as open, which can happen if your earlier try went through." : ""} Check completion, or sign in to see whether it is ready, before trying again.`,
                  supportRef: unknown.supportRef,
                }}
                focusOnMount
                extraAction={
                  <>
                    <button
                      type="button"
                      className="st-btn"
                      data-variant="secondary"
                      onClick={() => void checkCompletion()}
                      aria-disabled={checking || pending || checkLimit !== null}
                      disabled={checking || pending || checkLimit !== null}
                    >
                      {checking ? "Checking…" : "Check completion"}
                    </button>
                    <button
                      type="button"
                      className="st-btn"
                      data-variant="secondary"
                      onClick={() => dispatch({ type: "dismiss" })}
                      aria-disabled={checking || pending}
                      disabled={checking || pending}
                    >
                      Dismiss
                    </button>
                  </>
                }
              />
              <p className="-mt-2 text-[13.5px] text-(--muted-text)">
                Dismiss only if you are sure your account was not set up. The notice goes away and you can try again.
              </p>
              {checkLimit !== null && (
                <RateLimitNotice
                  key={checkLimit}
                  retryAfterSeconds={checkLimit}
                  message="Too many checks."
                  onElapsed={() => setCheckLimit(null)}
                />
              )}
              {checkNote && !checking && (
                <div
                  role="status"
                  data-tone={checkNote.tone}
                  className="st st-card"
                  ref={noteRef}
                >
                  <p className="st-title">{checkNote.title}</p>
                  <p className="st-text">{checkNote.text}</p>
                </div>
              )}
              <p className="-mt-2 text-sm">
                <Link href={signInHref} className="font-medium">
                  Sign in to check →
                </Link>
                {returnPath ? <span className="text-(--muted-text)"> You&apos;ll come back to this invitation after signing in.</span> : null}
              </p>
            </>
          )}

          {failure && (
            <ServiceError
              title="We couldn't finish that"
              error={failure}
              // A retry button only when no earlier attempt may have committed.
              onRetry={showRetry(flow) ? () => void attempt() : undefined}
              retrying={pending}
              focusOnMount
            />
          )}

          <SubmitButton
            label={existing ? "Sign in and accept →" : "Create account →"}
            pendingLabel={existing ? "Signing in…" : "Creating your account…"}
            pending={pending}
            blocked={limit !== null || !canSubmitAgain(flow, existing)}
          />

          <AuthFoot
            lead={existing ? "Not your account? " : "Already have an account? "}
            href={paths.loginPath}
            label="Log in"
            delay={stagger(7, 0.1)}
          />
        </AuthBody>
      </AuthFrame>
    </>
  );
}
