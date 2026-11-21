"use client";

import { useEffect, useRef, useState } from "react";
import { stagger } from "@/components/public/primitives";
import { confirmEmail, takeEmailLink, type EmailLinkParams, type LinkState } from "@/lib/public-site/auth";
import { AUTH_ROUTES, VERIFIED_COPY } from "@/lib/public-site/auth-content";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { AlertIcon, ShieldCheckIcon } from "./AuthIcons";
import { PillLink } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

type Status = "checking" | "verified" | "unavailable" | "incomplete" | LinkState;

/** A real confirmation is required. Neither query previews nor a plain visit can verify an email. */
export function VerifiedPanel({ skeleton = false, initialLink = null }: { skeleton?: boolean; initialLink?: EmailLinkParams | null }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRef = useRef<EmailLinkParams | null>(initialLink);
  const checkedRef = useRef(false);
  const [status, setStatus] = useState<Status>("checking");
  useEffect(() => {
    if (skeleton) return;
    const link = takeEmailLink();
    if (link) linkRef.current = link;
    if (checkedRef.current) return;
    checkedRef.current = true;
    // The one-time value stays in this component's memory only. Never retry a confirmation automatically.
    void confirmEmail(linkRef.current).then((res) => {
      linkRef.current = null;
      if (res.ok) setStatus("verified");
      else setStatus(res.code === "registration-incomplete" ? "incomplete" : res.code === "link-expired" ? "expired" : res.code === "link-invalid" ? "invalid" : "unavailable");
    });
  }, [skeleton]);
  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton, status]);
  const copy = status === "expired" ? VERIFIED_COPY.expired : status === "invalid" ? VERIFIED_COPY.invalid
    : status === "incomplete" ? { headLead: "Email confirmed. ", headAccent: "Finish your account.", sub: "Return to signup and enter your details and password to finish creating your account." }
    : status === "unavailable" ? { headLead: "We could not ", headAccent: "confirm verification.", sub: "Try logging in. If your email still needs confirmation, request a new link." }
    : status === "checking" ? { headLead: VERIFIED_COPY.checkingLead, headAccent: VERIFIED_COPY.checkingAccent, sub: VERIFIED_COPY.checkingSub }
    : { headLead: VERIFIED_COPY.headLead, headAccent: VERIFIED_COPY.headAccent, sub: VERIFIED_COPY.sub };
  const failed = status === "expired" || status === "invalid" || (status === "unavailable" || status === "incomplete");
  return (
    <AuthFrame screen="verified" skeleton={skeleton}>
      <AuthBody as="div" logo={false}>
        <IconTile slot="authVerifiedIllustration">
          {failed ? <AlertIcon size={26} strokeWidth={1.7} /> : <ShieldCheckIcon still={skeleton} />}
        </IconTile>
        <AuthHeading headingRef={headingRef} lead={copy.headLead} accent={copy.headAccent} sub={copy.sub} delay={0.22} />
        {status === "verified" && <PillLink href={AUTH_ROUTES.login} label={VERIFIED_COPY.submit} />}
        {failed && <PillLink href={status === "unavailable" ? AUTH_ROUTES.login : AUTH_ROUTES.signup} label={status === "incomplete" ? "Finish signup" : status === "unavailable" ? "Log in" : VERIFIED_COPY.failSubmit} />}
        {failed && <AuthFoot lead={VERIFIED_COPY.failFootPrompt} href={AUTH_ROUTES.login} label={VERIFIED_COPY.failFootLink} delay={stagger(5, 0.1)} />}
      </AuthBody>
    </AuthFrame>
  );
}
