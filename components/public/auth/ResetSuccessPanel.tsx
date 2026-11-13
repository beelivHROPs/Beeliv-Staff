"use client";

import { useEffect, useRef } from "react";
import { Reveal } from "@/components/public/kit";
import { stagger } from "@/components/public/primitives";
import { AUTH_BACKEND_CONNECTED } from "@/lib/public-site/auth";
import { RESET_DONE_COPY } from "@/lib/public-site/auth-content";
import { authPaths } from "@/lib/auth/portals";
import type { Portal } from "@/lib/auth/types";
import { AuthBody, AuthFrame } from "./AuthFrame";
import { ShieldCheckIcon } from "./AuthIcons";
import { FlowNotice, PillLink } from "./fields";
import { AuthHeading, IconTile } from "./parts";

/**
 * Password reset confirmation. DERIVED FROM THE AUTH FRAME: no wireframe board
 * exists; copy is draft. "Log in" goes to /login: there is deliberately no
 * auto-login after a reset.
 */
export function ResetSuccessPanel({
  skeleton = false,
  portal = "talent",
}: {
  skeleton?: boolean;
  portal?: Portal;
}) {
  const paths = authPaths(portal);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton]);

  return (
    <AuthFrame screen="resetDone" skeleton={skeleton} portal={portal === "talent" ? undefined : portal}>
      <AuthBody as="div" logo={false}>
        <IconTile slot="authResetSuccessIllustration">
          <ShieldCheckIcon still={skeleton} />
        </IconTile>
        <AuthHeading
          headingRef={headingRef}
          lead={RESET_DONE_COPY.headLead}
          accent={RESET_DONE_COPY.headAccent}
          sub={RESET_DONE_COPY.sub}
          delay={0.22}
        />
        <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
          <PillLink href={paths.loginPath} label={RESET_DONE_COPY.submit} />
        </Reveal>
        {!AUTH_BACKEND_CONNECTED && !skeleton && (
          <FlowNotice>{RESET_DONE_COPY.flowNote}</FlowNotice>
        )}
      </AuthBody>
    </AuthFrame>
  );
}
