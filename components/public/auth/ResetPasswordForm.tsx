"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Reveal } from "@/components/public/kit";
import { stagger } from "@/components/public/primitives";
import {
  AUTH_BACKEND_CONNECTED,
  FLOW_TEST_ONLY,
  checkResetLink,
  takeEmailLink,
  updatePassword,
  type EmailLinkParams,
  type LinkState,
} from "@/lib/public-site/auth";
import {
  PASSWORD_RULE,
  RESET_COPY,
  RESET_LINK_EXPIRY_SECONDS,
} from "@/lib/public-site/auth-content";
import {
  passwordStrength,
  validateConfirmPassword,
  validateNewPassword,
} from "@/lib/public-site/auth-rules";
import { authPaths } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { AlertIcon, LockIcon } from "./AuthIcons";
import {
  FormAlert,
  PasswordField,
  PasswordHint,
  PillLink,
  SubmitButton,
  useFieldRefs,
} from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

type Field = "password" | "confirm";
const ORDER: readonly Field[] = ["password", "confirm"];
type Status = "checking" | "valid" | LinkState;

/**
 * Reset password: where the emailed reset link lands. DERIVED FROM THE AUTH
 * FRAME: no wireframe board exists (tile + heading + fields + pill as on
 * Forgot / Sign up); copy is draft.
 *
 * States: valid link (the form), expired link, invalid / already-used link.
 * `previewState` is the flow-test-only `?state=expired|invalid` (null once a
 * backend is connected; see parseFlowTestState in lib/public-site/auth.ts).
 *
 * Security: any one-time code/token in the URL is read once and scrubbed from
 * the address bar and history immediately (takeEmailLink); the password lives
 * only in this component's state, is cleared once handed over, and never goes
 * into a URL; failure wording never reveals whether an account exists.
 */
export function ResetPasswordForm({
  previewState = null,
  previewUsed = false,
  skeleton = false,
  portal = "talent",
}: {
  portal?: Portal;
  previewState?: LinkState | null;
  /** MOCK preview (?state=used): the link was already used (shown as its own message). */
  previewUsed?: boolean;
  /** The route's loading frame (same layout, no motion; see loading.tsx). */
  skeleton?: boolean;
}) {
  const router = useRouter();
  const paths = authPaths(portal);
  const framePortal = portal === "talent" ? undefined : portal;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRef = useRef<EmailLinkParams | null>(null);
  const checkedRef = useRef(false);
  const [status, setStatus] = useState<Status>(
    skeleton ? "valid" : AUTH_BACKEND_CONNECTED ? "checking" : !FLOW_TEST_ONLY ? "invalid" : (previewState ?? (previewUsed ? "invalid" : "valid")),
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [shake, setShake] = useState<Record<Field, number>>({ password: 0, confirm: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { register, focusFirstInvalid } = useFieldRefs<Field>();

  // Read the link credential (if any) and scrub it from the URL/history at
  // once. Only when a backend is connected is it then checked.
  useEffect(() => {
    if (skeleton) return;
    const link = takeEmailLink();
    if (link) linkRef.current = link;
    if (!AUTH_BACKEND_CONNECTED || checkedRef.current) return;
    checkedRef.current = true; // a one-time code must be exchanged exactly once
    void checkResetLink(linkRef.current).then(setStatus);
  }, [skeleton]);

  // Move focus to the heading on arrival and whenever the state changes, so a
  // screen-reader user hears which state they are in.
  useEffect(() => {
    if (!skeleton && status !== "checking") headingRef.current?.focus({ preventScroll: true });
  }, [skeleton, status]);

  const setPasswordValue = (value: string) => {
    setPassword(value);
    if (errors.password) setErrors((e) => ({ ...e, password: validateNewPassword(value) }));
    // Once the confirmation has been checked, keep it in step with the password.
    if (errors.confirm !== undefined && confirm) {
      setErrors((e) => ({ ...e, confirm: validateConfirmPassword(confirm, value) }));
    }
  };
  const setConfirmValue = (value: string) => {
    setConfirm(value);
    if (errors.confirm) setErrors((e) => ({ ...e, confirm: validateConfirmPassword(value, password) }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || status === "checking") return;
    setSubmitted(true);
    setFailure(null);

    const next: Partial<Record<Field, string | null>> = {
      password: validateNewPassword(password),
      confirm: validateConfirmPassword(confirm, password),
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
    const res = await updatePassword({ password });
    if (res.ok) {
      // Do not keep the password in memory once it has been handed over. Stay
      // in the loading state while the success screen opens.
      setPassword("");
      setConfirm("");
      router.push(paths.resetSuccessPath);
      return;
    }
    setPending(false);
    if (res.code === "link-expired") setStatus("expired");
    else if (res.code === "link-invalid") setStatus("invalid");
    else setFailure(res.message || RESET_COPY.failed);
  }

  const strength = passwordStrength(password);

  // Expired / used / invalid: same frame, no form.
  if (status === "expired" || status === "invalid") {
    const used = status === "invalid" && previewUsed;
    const copy = used
      ? { headLead: "This link was already ", headAccent: "used." }
      : status === "expired"
        ? RESET_COPY.expired
        : RESET_COPY.invalid;
    return (
      <AuthFrame screen="resetExpired" skeleton={skeleton} portal={framePortal}>
        <AuthBody as="div" logo={false}>
          <IconTile slot="authLinkExpiredIllustration">
            <AlertIcon size={26} strokeWidth={1.7} />
          </IconTile>
          <AuthHeading
            headingRef={headingRef}
            lead={copy.headLead}
            accent={copy.headAccent}
            sub={
              used
                ? "A reset link only works once. Request a new link to choose a new password."
                : status === "expired"
                  ? RESET_COPY.expired.sub(RESET_LINK_EXPIRY_SECONDS)
                  : RESET_COPY.invalid.sub
            }
            delay={0.22}
          />
          <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
            <PillLink href={paths.forgotPath} label={RESET_COPY.requestNew} />
          </Reveal>
          <AuthFoot
            lead={RESET_COPY.rememberedPrompt}
            href={paths.loginPath}
            label={RESET_COPY.rememberedLink}
            delay={stagger(5, 0.1)}
          />
        </AuthBody>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame screen="reset" skeleton={skeleton} portal={framePortal}>
      <AuthBody logo={false} onSubmit={onSubmit} ariaBusy={pending || status === "checking"}>
        <IconTile slot="authResetIllustration">
          <LockIcon size={26} strokeWidth={1.7} />
        </IconTile>
        <AuthHeading
          headingRef={headingRef}
          lead={RESET_COPY.headLead}
          accent={RESET_COPY.headAccent}
          sub={RESET_COPY.sub}
          delay={0.22}
        />

        <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
          <PasswordField
            id="rp-p"
            label={RESET_COPY.newLabel}
            name="password"
            placeholder={RESET_COPY.newPlaceholder}
            autoComplete="new-password"
            value={password}
            error={errors.password}
            shakeKey={shake.password}
            ref={register("password")}
            hintClassName="flex items-center justify-between gap-3"
            hint={<PasswordHint text={PASSWORD_RULE.hint} score={strength} />}
            onChange={(e) => setPasswordValue(e.target.value)}
            onBlur={(e) => {
              if (submitted || e.target.value)
                setErrors((x) => ({ ...x, password: validateNewPassword(e.target.value) }));
            }}
          />
        </Reveal>

        <Reveal when="mount" y={16} delay={stagger(5, 0.1)}>
          <PasswordField
            id="rp-c"
            label={RESET_COPY.confirmLabel}
            name="confirm-password"
            placeholder={RESET_COPY.confirmPlaceholder}
            autoComplete="new-password"
            value={confirm}
            error={errors.confirm}
            shakeKey={shake.confirm}
            ref={register("confirm")}
            onChange={(e) => setConfirmValue(e.target.value)}
            onBlur={(e) => {
              if (submitted || e.target.value)
                setErrors((x) => ({
                  ...x,
                  confirm: validateConfirmPassword(e.target.value, password),
                }));
            }}
          />
        </Reveal>

        <Reveal when="mount" y={16} delay={stagger(6, 0.1)}>
          <SubmitButton
            label={RESET_COPY.submit}
            pendingLabel={RESET_COPY.submitting}
            pending={pending || status === "checking"}
          />
        </Reveal>

        <FormAlert>{failure}</FormAlert>

        <AuthFoot
          lead={RESET_COPY.rememberedPrompt}
          href={paths.loginPath}
          label={RESET_COPY.rememberedLink}
          delay={stagger(7, 0.1)}
        />
      </AuthBody>
    </AuthFrame>
  );
}
