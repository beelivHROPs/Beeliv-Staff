"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Reveal } from "@/components/public/kit";
import { stagger } from "@/components/public/primitives";
import { requestPasswordReset } from "@/lib/public-site/auth";
import { FORGOT_COPY } from "@/lib/public-site/auth-content";
import { normaliseEmail, validateEmail } from "@/lib/public-site/auth-rules";
import { authPaths } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";
import { useAuthLive } from "@/lib/ui/auth-live";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { KeyIcon, MailIcon } from "./AuthIcons";
import { RateLimitNotice } from "@/components/shared/states/RateLimitNotice";
import { AuthField, FormAlert, SubmitButton, useFieldRefs } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

/** `skeleton`: the route's loading frame (same layout, no motion; see loading.tsx). */
export function ForgotForm({
  skeleton = false,
  previewLimited = false,
  portal = "talent",
}: {
  portal?: Portal;
  skeleton?: boolean;
  /** MOCK preview: /forgot-password?state=limited shows the rate-limit state. */
  previewLimited?: boolean;
}) {
  const router = useRouter();
  const paths = authPaths(portal);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Server-supplied wait (seconds) while rate limited; null = not limited.
  const live = useAuthLive();
  const [limit, setLimit] = useState<number | null>(previewLimited && !live ? 45 : null);
  const { register, focusFirstInvalid } = useFieldRefs<"email">();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || limit !== null) return;
    setSubmitted(true);
    setFailure(null);

    const problem = validateEmail(email);
    setError(problem);
    if (problem) {
      setShake((n) => n + 1);
      focusFirstInvalid(["email"], { email: problem });
      return;
    }

    setPending(true);
    const clean = normaliseEmail(email);
    const res = await requestPasswordReset({ email: clean });
    if (res.ok) {
      // Stay in the loading state while the next screen opens. The address is
      // carried in the URL so /forgot-password/sent can show it.
      router.push(`${paths.sentPath}?email=${encodeURIComponent(clean)}`);
      return;
    }
    setPending(false);
    if (res.code === "rate-limited") setLimit(res.retryAfterSeconds ?? 60);
    else setFailure(res.message);
  }

  return (
    <AuthFrame screen="forgot" skeleton={skeleton} portal={portal === "talent" ? undefined : portal}>
      <AuthBody logo={false} onSubmit={onSubmit} ariaBusy={pending}>
        <IconTile>
          <KeyIcon />
        </IconTile>
        <AuthHeading
          lead={FORGOT_COPY.headLead}
          accent={FORGOT_COPY.headAccent}
          sub={FORGOT_COPY.sub}
          delay={0.22}
        />

        <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
          <AuthField
            id="fp-e"
            label={FORGOT_COPY.emailLabel}
            icon={<MailIcon />}
            type="email"
            name="email"
            placeholder={FORGOT_COPY.emailPlaceholder}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            value={email}
            error={error}
            shakeKey={shake}
            ref={register("email")}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(validateEmail(e.target.value));
            }}
            onBlur={(e) => {
              if (submitted || e.target.value) setError(validateEmail(e.target.value));
            }}
          />
        </Reveal>

        {limit !== null && (
          <RateLimitNotice
            key={limit}
            retryAfterSeconds={limit}
            message="Too many requests."
            onElapsed={() => setLimit(null)}
          />
        )}

        <Reveal when="mount" y={16} delay={stagger(5, 0.1)}>
          <SubmitButton
            label={FORGOT_COPY.submit}
            pendingLabel={FORGOT_COPY.submitting}
            pending={pending}
            blocked={limit !== null}
          />
        </Reveal>

        <FormAlert>{failure}</FormAlert>

        <AuthFoot
          lead={FORGOT_COPY.rememberedPrompt}
          href={paths.loginPath}
          label={FORGOT_COPY.rememberedLink}
          delay={stagger(6, 0.1)}
        />
      </AuthBody>
    </AuthFrame>
  );
}
