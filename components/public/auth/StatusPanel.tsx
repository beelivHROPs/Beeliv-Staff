"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Reveal } from "@/components/public/kit";
import { stagger } from "@/components/public/primitives";
import type { AuthScreen } from "@/lib/public-site/auth-content";
import { AuthBody, AuthFrame, type PanelCopy } from "./AuthFrame";
import { PillLink } from "./fields";
import { AuthFoot, AuthHeading, IconTile } from "./parts";

/**
 * A no-form status screen in the auth frame (suspended, access denied,
 * invitation unusable, account ready). Focus moves to the heading on arrival so
 * screen-reader users hear which screen they are on.
 */
export function StatusPanel({
  icon,
  lead,
  accent,
  sub,
  primary,
  foot,
  panel,
  portal,
  screen = "resetExpired",
  children,
}: {
  icon: ReactNode;
  lead: string;
  accent: string;
  sub: ReactNode;
  primary?: { href: string; label: string };
  foot?: { lead: string; href: string; label: string };
  panel?: PanelCopy;
  portal?: "client" | "staff" | "admin";
  /** Frame/illustration. Default is the "link can't be used" art; pass "reset" where the link must not look expired. */
  screen?: AuthScreen;
  /** Extra content between the heading and the button (e.g. a secondary link). */
  children?: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <AuthFrame screen={screen} portal={portal} panel={panel}>
      <AuthBody as="div" logo={false}>
        <IconTile>{icon}</IconTile>
        <AuthHeading headingRef={headingRef} lead={lead} accent={accent} sub={sub} delay={0.22} />
        {children}
        {primary && (
          <Reveal when="mount" y={16} delay={stagger(4, 0.1)}>
            <PillLink href={primary.href} label={primary.label} />
          </Reveal>
        )}
        {foot && <AuthFoot lead={foot.lead} href={foot.href} label={foot.label} delay={stagger(5, 0.1)} />}
      </AuthBody>
    </AuthFrame>
  );
}
