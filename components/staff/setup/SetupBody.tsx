"use client";

import { useMemo } from "react";
import { AccountSetup } from "@/components/shared/setup/AccountSetup";
import { createStaffSetupService } from "@/lib/staff/setup-service";
import { PROFILE_STEP_COPY } from "@/lib/staff/onboarding-checklist";
import type { AuthMode } from "@/lib/auth/mode";

/**
 * First-time account setup for an invited Staff member (Talent app, "staff" entitlement).
 * Calls the same real setup requests as Client/Admin. SETUP-ONLY: no Staff business data.
 * Documents (passport photo, NIN copy, next of kin, education), bank/NIN and optional consent
 * are NOT part of setup; they stay on the Home checklist and never block.
 */
export function SetupBody({ mode }: { mode: AuthMode }) {
  const service = useMemo(() => createStaffSetupService(mode), [mode]);
  return <AccountSetup portal="staff" mode={mode} service={service} brand="Beeliv Staff" what="Your Staff Hub" home="/staff" profileSteps={[...PROFILE_STEP_COPY]} />;
}
