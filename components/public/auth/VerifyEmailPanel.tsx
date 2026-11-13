"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Reveal } from "@/components/public/kit";
import { DUR, EASE } from "@/components/public/motion";
import { T, stagger } from "@/components/public/primitives";
import { AUTH_BACKEND_CONNECTED, verifyEmailResend } from "@/lib/public-site/auth";
import {
  AUTH_MESSAGES,
  AUTH_ROUTES,
  RESEND_COOLDOWN_SECONDS,
  VERIFY_COPY,
} from "@/lib/public-site/auth-content";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { CheckIcon, MailCheckIcon } from "./AuthIcons";
import { FlowNotice, FormAlert, PillLink } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

const secondsLeft = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

/**
 * Verify your email (after applicant signup). DERIVED FROM THE AUTH FRAME:
 * there is no wireframe board for this screen, so it mirrors the Check-your-email
 * screen (tile, heading, primary pill, "resend the link" with the 30 s
 * cooldown, "Wrong email?" foot) and copy is draft. `email` comes from the URL
 * (?email=) and is only ever a well-formed address; if missing the sentence
 * says "your email address" and there is nothing to resend to.
 */
export function VerifyEmailPanel({
  email,
  skeleton = false,
}: {
  email: string | null;
  /** The route's loading frame: no focus grab, no timers, no motion. */
  skeleton?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Cooldown is a deadline (timestamp), so a backgrounded tab catches up
  // instead of drifting. The email was just sent, so it starts on arrival.
  const [times, setTimes] = useState(() => {
    const t = Date.now();
    return { now: t, cooldownEndsAt: t + RESEND_COOLDOWN_SECONDS * 1000 };
  });
  const [resending, setResending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton]);

  const remaining = secondsLeft(times.cooldownEndsAt, times.now);
  const ticking = !skeleton && remaining > 0;

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setTimes((t) => ({ ...t, now: Date.now() }));
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ticking]);

  async function onResend() {
    if (resending || remaining > 0 || !email) return;
    setResending(true);
    setFailure(null);
    const res = await verifyEmailResend({ email });
    setResending(false);
    if (res.ok) {
      const t = Date.now();
      setConfirmed(true);
      setNotice(res.notice);
      setTimes({ now: t, cooldownEndsAt: t + RESEND_COOLDOWN_SECONDS * 1000 });
    } else {
      setFailure(res.message || AUTH_MESSAGES.resendFailed);
    }
  }

  const waiting = remaining > 0;
  const canResend = !!email && !waiting && !resending;

  return (
    <AuthFrame screen="verify" skeleton={skeleton}>
      <AuthBody as="div" logo={false}>
        <IconTile slot="authVerifyIllustration">
          <MailCheckIcon still={skeleton} />
        </IconTile>

        <AuthHeading
          headingRef={headingRef}
          lead={VERIFY_COPY.headLead}
          accent={VERIFY_COPY.headAccent}
          delay={0.22}
          sub={
            <>
              {VERIFY_COPY.bodyLead}
              <b className="font-bold break-words text-(--ink) [overflow-wrap:anywhere]">
                {email ?? VERIFY_COPY.emailFallback}
              </b>
              {VERIFY_COPY.bodyEnd}
            </>
          }
        />

        <PillLink href={AUTH_ROUTES.login} label={VERIFY_COPY.back} />

        <Reveal when="mount" y={16} delay={stagger(5, 0.1)} className="flex flex-col gap-2">
          <p className="text-sm leading-[1.55] text-(--muted-text)">
            <T>{VERIFY_COPY.spamLead}</T>
            {email ? (
              <button
                type="button"
                onClick={onResend}
                aria-disabled={!canResend}
                className="inline cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm font-medium text-(--beeliv-purple) transition-colors duration-300 hover:text-(--deep-plum) aria-disabled:cursor-default aria-disabled:text-(--muted-text) aria-disabled:hover:text-(--muted-text)"
              >
                <T>{waiting ? AUTH_MESSAGES.resendWait(remaining) : VERIFY_COPY.resend}</T>
              </button>
            ) : (
              // Opened without an address in the URL: nothing to resend to.
              <Link href={AUTH_ROUTES.signup} className="font-medium">
                <T>{VERIFY_COPY.noEmailAction}</T>
              </Link>
            )}
            .
          </p>
          {confirmed && (
            <motion.p
              role="status"
              className="flex items-center gap-1.5 text-[13px] font-medium text-(--beeliv-purple)"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.fast, ease: EASE }}
            >
              <CheckIcon size={14} />
              {AUTH_MESSAGES.resendSent}
            </motion.p>
          )}
        </Reveal>

        <FormAlert>{failure}</FormAlert>
        {!AUTH_BACKEND_CONNECTED && !skeleton && (
          <FlowNotice>{notice ?? VERIFY_COPY.flowNote}</FlowNotice>
        )}

        <AuthFoot
          lead={VERIFY_COPY.wrongPrompt}
          href={AUTH_ROUTES.signup}
          label={VERIFY_COPY.wrongLink}
          delay={stagger(6, 0.1)}
        />
      </AuthBody>
    </AuthFrame>
  );
}
