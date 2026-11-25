import { StaffShell } from "@/components/staff/StaffShell";
import { StaffLiveGate } from "@/components/staff/StaffLiveGate";
import { StaffModeProvider } from "@/components/staff/StaffModeProvider";
import { staffEnrollmentConfig } from "@/lib/server/staff-enrollment/mode";
import { AreaNotOpen } from "@/components/shared/AreaGate";
import { PilotMenuProvider } from "@/lib/pilot/context";
import { pilotMenuState } from "@/lib/pilot/server";
import { areaOpen, publicSiteUrl } from "@/lib/env/sample-data";
import { staffSetupOnly } from "@/lib/server/auth/staff-layout";
import { AuthFailure } from "@/lib/server/auth/service";
import { authPaths } from "@/lib/auth/portals";
import { redirect } from "next/navigation";

// Everything in Staff except sign-in, invitation and reset (outside this group, never gated; URLs unchanged).
// A closed area returns the not-open page WITHOUT rendering {children}, and before any backend read.
export default async function StaffBusinessLayout({ children }: LayoutProps<"/">) {
  if (!areaOpen("staff")) return <AreaNotOpen siteUrl={publicSiteUrl()} />;
  // Lead 2026-11-25: this presentation check must never crash the page (it caused the "500 Something Went Wrong" page on
  // a brief sign-in refresh or Supabase hiccup). Signed out -> login. Any other failure -> show the page normally; every
  // data request is still authorised on its own and shows its own approved error + retry.
  let setupOnly = false;
  try {
    setupOnly = await staffSetupOnly();
  } catch (error) {
    if (error instanceof AuthFailure && error.code === "unauthenticated") redirect(authPaths("staff").loginPath);
  }
  const pilot = await pilotMenuState();
  const config = staffEnrollmentConfig();
  return (
    <StaffModeProvider config={config}>
      <PilotMenuProvider on={pilot.on} devSwitch={pilot.devSwitch}>
        <StaffShell setupOnly={setupOnly}>
          <StaffLiveGate live={config.mode === "live"}>{children}</StaffLiveGate>
        </StaffShell>
      </PilotMenuProvider>
    </StaffModeProvider>
  );
}
