"use client";

import { useMemo } from "react";
import { AccountSetup } from "@/components/shared/setup/AccountSetup";
import { createClientSetupService } from "@/lib/client/setup-service";
import type { AuthMode } from "@/lib/auth/mode";

/**
 * First-time account setup for an invited Client. SETUP-ONLY: loads the setup
 * request and nothing from the business hooks (no outlets, client name, team).
 * The flow itself is shared with Admin and Staff: components/shared/setup/AccountSetup.tsx.
 * (The old ?step= links from the Overview checklist are ignored: setup is now one short flow.)
 */
const CLIENT_PROFILE_STEPS = [
  { id: "details", title: "Confirm your details", why: "Your name, job title and how you like to be contacted." },
  { id: "notifications", title: "Choose your notifications", why: "Pick the updates you want from Beeliv." },
  { id: "access", title: "Review your outlets and access", why: "See which outlets you can see." },
];

export function SetupBody({ mode }: { mode: AuthMode }) {
  const service = useMemo(() => createClientSetupService(mode), [mode]);
  return <AccountSetup portal="client" mode={mode} service={service} brand="Beeliv Client" what="Your client workspace" home="/client" supportHref="/client/support" profileSteps={CLIENT_PROFILE_STEPS} />;
}
