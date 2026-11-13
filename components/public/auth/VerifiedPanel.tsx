"use client";

import { useEffect, useRef, useState } from "react";
import { stagger } from "@/components/public/primitives";
import {
  AUTH_BACKEND_CONNECTED,
  FLOW_TEST_ONLY,
  confirmEmail,
  takeEmailLink,
  type EmailLinkParams,
  type LinkState,
} from "@/lib/public-site/auth";
import { AUTH_ROUTES, VERIFIED_COPY } from "@/lib/public-site/auth-content";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { AlertIcon, ShieldCheckIcon } from "./AuthIcons";
import { FlowNotice, PillLink } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

type Status = "checking" | "verified" | LinkState;

/**
 * Email verified (the emailed confirmation link lands here). DERIVED FROM THE
 * AUTH FRAME: no wireframe board exists; copy is draft. "Continue" always goes
 * to /login (applicant-only, no auto-login).
 *
 * `previewState` is the flow-test-only `?state=expired|invalid` preview (null
 * once a backend is connected; see parseFlowTestState in lib/public-site/auth.ts).
 * The failure states exist so a real rejected link has somewhere to land; they
 * are not in any approved design.
 */
export function VerifiedPanel({
  previewState = null,
  skeleton = false,
}: {
  previewState?: LinkState | null;
  skeleton?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkRef = useRef<EmailLinkParams | null>(null);
  const checkedRef = useRef(false);
  const [status, setStatus] = useState<Status>(
    skeleton ? "verified" : AUTH_BACKEND_CONNECTED ? "checking" : !FLOW_TEST_ONLY ? "invalid" : (previewState ?? "verified"),
  );

  // Read the one-time credential (if any) and scrub it from the URL/history at
  // once. Only when a backend is connected is it then confirmed.
  useEffect(() => {
    if (skeleton) return;
    const link = takeEmailLink();
    if (link) linkRef.current = link;
    if (!AUTH_BACKEND_CONNECTED || checkedRef.current) return;
    checkedRef.current = true; // a one-time code must be exchanged exactly once
    void confirmEmail(linkRef.current).then((res) => {
      if (res.ok) setStatus("verified");
      else setStatus(res.code === "link-expired" ? "expired" : "invalid");
    });
  }, [skeleton]);

  // Move focus to the heading on arrival and whenever the state changes.
  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton, status]);

  const copy =
    status === "expired"
      ? VERIFIED_COPY.expired
      : status === "invalid"
        ? VERIFIED_COPY.invalid
        : status === "checking"
          ? {
              headLead: VERIFIED_COPY.checkingLead,
              headAccent: VERIFIED_COPY.checkingAccent,
              sub: VERIFIED_COPY.checkingSub,
            }
          : {
              headLead: VERIFIED_COPY.headLead,
              headAccent: VERIFIED_COPY.headAccent,
              sub: VERIFIED_COPY.sub,
            };
  const failed = status === "expired" || status === "invalid";

  return (
    <AuthFrame screen="verified" skeleton={skeleton}>
      <AuthBody as="div" logo={false}>
        <IconTile slot="authVerifiedIllustration">
          {failed ? <AlertIcon size={26} strokeWidth={1.7} /> : <ShieldCheckIcon still={skeleton} />}
        </IconTile>

        <AuthHeading
          headingRef={headingRef}
          lead={copy.headLead}
          accent={copy.headAccent}
          sub={copy.sub}
          delay={0.22}
        />

        {status === "verified" && (
          <PillLink href={AUTH_ROUTES.login} label={VERIFIED_COPY.submit} />
        )}
        {failed && (
          <PillLink href={AUTH_ROUTES.signup} label={VERIFIED_COPY.failSubmit} />
        )}

        {status === "verified" && !AUTH_BACKEND_CONNECTED && !skeleton && (
          <FlowNotice>{VERIFIED_COPY.flowNote}</FlowNotice>
        )}

        {failed && (
          <AuthFoot
            lead={VERIFIED_COPY.failFootPrompt}
            href={AUTH_ROUTES.login}
            label={VERIFIED_COPY.failFootLink}
            delay={stagger(5, 0.1)}
          />
        )}
      </AuthBody>
    </AuthFrame>
  );
}
