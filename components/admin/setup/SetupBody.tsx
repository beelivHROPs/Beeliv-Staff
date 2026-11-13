"use client";

import { useMemo } from "react";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { AccountSetup } from "@/components/shared/setup/AccountSetup";
import { createAdminSetupService } from "@/lib/admin/setup/service";
import type { AuthMode } from "@/lib/auth/mode";
import { MfaPanel } from "./MfaPanel";

/**
 * First-run account setup for an invited Admin (HR / Operations). Same flow as Client
 * and Staff (components/shared/setup/AccountSetup.tsx) plus ONE extra mandatory step:
 * the authenticator (L5), which stays here because Admin access requires it.
 */
export function SetupBody({ mode }: { mode: AuthMode }) {
  const service = useMemo(() => createAdminSetupService(mode), [mode]);
  return (
    <AccountSetup
      portal="admin"
      mode={mode}
      service={service}
      brand="Beeliv Admin"
      what="The admin workspace"
      home="/admin"
      themeClass={ADMIN_THEME}
      renderSecurity={({ onVerified, preview }) => <MfaPanel onVerified={onVerified} service={service} preview={preview} embedded />}
    />
  );
}
