import { StaffShell } from "@/components/staff/StaffShell";
import { StaffLiveGate } from "@/components/staff/StaffLiveGate";
import { StaffModeProvider } from "@/components/staff/StaffModeProvider";
import { staffEnrollmentConfig } from "@/lib/server/staff-enrollment/mode";
import { AreaNotOpen } from "@/components/shared/AreaGate";
import { PilotMenuProvider } from "@/lib/pilot/context";
import { pilotMenuState } from "@/lib/pilot/server";
import { areaOpen, publicSiteUrl } from "@/lib/env/sample-data";
import { staffSetupOnly } from "@/lib/server/auth/staff-layout";

// Everything in Staff except sign-in, invitation and reset (outside this group, never gated; URLs unchanged).
// A closed area returns the not-open page WITHOUT rendering {children}, and before any backend read.
export default async function StaffBusinessLayout({ children }: LayoutProps<"/">) {
  if (!areaOpen("staff")) return <AreaNotOpen siteUrl={publicSiteUrl()} />;
  const setupOnly = await staffSetupOnly();
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
