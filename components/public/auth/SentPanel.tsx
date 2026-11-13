"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Reveal } from "@/components/public/kit";
import { DUR, EASE } from "@/components/public/motion";
import { T, stagger } from "@/components/public/primitives";
import { AUTH_BACKEND_CONNECTED, resendResetLink } from "@/lib/public-site/auth";
import {
  AUTH_MESSAGES,
  RESEND_COOLDOWN_SECONDS,
  RESET_LINK_EXPIRY_SECONDS,
  SENT_COPY,
} from "@/lib/public-site/auth-content";
import { authPaths } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { CheckIcon, MailDrawIcon } from "./AuthIcons";
import { FlowNotice, FormAlert, PillLink } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

/** m:ss with a padded minute ("29:58", "09:59") so the width never changes while it ticks. */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const secondsLeft = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

/**
 * Check your email. `email` comes from the URL (?email=) set by the Forgot
 * password screen; if it is missing the sentence says "your email address"
 * rather than showing a made-up address.
 */
export function SentPanel({
  email,
  skeleton = false,
  portal = "talent",
}: {
  portal?: Portal;
  email: string | null;
  /** The route's loading frame: no focus grab, no timers, no motion. */
  skeleton?: boolean;
}) {
  const paths = authPaths(portal);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Both countdowns are deadlines (timestamps), read against ONE shared clock,
  // so a hidden/backgrounded tab catches up correctly instead of drifting. The
  // link was just sent, so both start running on arrival.
  const [times, setTimes] = useState(() => {
    const t = Date.now();
    return {
      now: t,
      expiresAt: t + RESET_LINK_EXPIRY_SECONDS * 1000,
      cooldownEndsAt: t + RESEND_COOLDOWN_SECONDS * 1000,
    };
  });
  const [resending, setResending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Move focus to the heading so screen-reader users hear the new screen.
  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton]);

  const expiryLeft = secondsLeft(times.expiresAt, times.now);
  const remaining = secondsLeft(times.cooldownEndsAt, times.now);
  const expired = expiryLeft === 0;
  const ticking = !skeleton && (expiryLeft > 0 || remaining > 0);

  // Single shared tick source: one interval, plus a refresh when the tab
  // becomes visible again. Cleared on unmount and once both timers are done.
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
    // An expired link can always be resent, whatever the 30 s cooldown says.
    if (resending || (remaining > 0 && !expired) || !email) return;
    setResending(true);
    setFailure(null);
    const res = await resendResetLink({ email });
    setResending(false);
    if (res.ok) {
      const t = Date.now();
      setConfirmed(true);
      setNotice(res.notice);
      // A new link: restart the expiry countdown and the resend cooldown.
      setTimes({
        now: t,
        expiresAt: t + RESET_LINK_EXPIRY_SECONDS * 1000,
        cooldownEndsAt: t + RESEND_COOLDOWN_SECONDS * 1000,
      });
    } else {
      setFailure(res.message || AUTH_MESSAGES.resendFailed);
    }
  }

  const waiting = remaining > 0 && !expired;
  const canResend = !!email && !waiting && !resending;

  return (
    <AuthFrame screen="sent" skeleton={skeleton} portal={portal === "talent" ? undefined : portal}>
      <AuthBody as="div" logo={false}>
        <IconTile>
          <MailDrawIcon still={skeleton} />
        </IconTile>

        <AuthHeading
          headingRef={headingRef}
          lead={SENT_COPY.headLead}
          accent={SENT_COPY.headAccent}
          delay={0.22}
          sub={
            <>
              {SENT_COPY.bodyLead}
              <b className="font-bold break-words text-(--ink) [overflow-wrap:anywhere]">{email ?? SENT_COPY.emailFallback}</b>
              {expired ? (
                SENT_COPY.bodyExpired
              ) : (
                <>
                  {SENT_COPY.bodyExpiresLead}
                  {/* Static for screen readers; the ticking digits are hidden from them. */}
                  <span className="sr-only">
                    {SENT_COPY.expiresSr(RESET_LINK_EXPIRY_SECONDS)}
                  </span>
                  <span aria-hidden="true" className="tabular-nums">
                    {formatClock(expiryLeft)}
                  </span>
                  {SENT_COPY.bodyEnd}
                </>
              )}
              {/* Announced once, only when the link expires. */}
              <span role="status" className="sr-only">
                {expired ? AUTH_MESSAGES.linkExpired : ""}
              </span>
            </>
          }
        />

        <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
          <PillLink href={paths.loginPath} label={SENT_COPY.back} />
        </Reveal>

        <Reveal when="mount" y={16} delay={stagger(5, 0.1)} className="flex flex-col gap-2">
          <p className="text-sm leading-[1.55] text-(--muted-text)">
            <T>{SENT_COPY.spamLead}</T>
            {email ? (
              <button
                type="button"
                onClick={onResend}
                aria-disabled={!canResend}
                className="inline cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm font-medium text-(--beeliv-purple) transition-colors duration-300 hover:text-(--deep-plum) aria-disabled:cursor-default aria-disabled:text-(--muted-text) aria-disabled:hover:text-(--muted-text)"
              >
                <T>{waiting ? AUTH_MESSAGES.resendWait(remaining) : SENT_COPY.resend}</T>
              </button>
            ) : (
              // Opened without an address in the URL: nothing to resend to.
              <Link href={paths.forgotPath} className="font-medium">
                <T>{SENT_COPY.resend}</T>
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
          <FlowNotice>
            {notice ??
              "No email was sent. Please return to sign in and try again, or contact Beeliv for help."}
          </FlowNotice>
        )}

        <AuthFoot
          lead={SENT_COPY.wrongPrompt}
          href={paths.forgotPath}
          label={SENT_COPY.wrongLink}
          delay={stagger(6, 0.1)}
        />
      </AuthBody>
    </AuthFrame>
  );
}
