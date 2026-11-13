import { AdminShell } from "@/components/admin/AdminShell";
import { AreaNotOpen } from "@/components/shared/AreaGate";
import { PilotMenuProvider } from "@/lib/pilot/context";
import { pilotMenuState } from "@/lib/pilot/server";
import { areaOpen, publicSiteUrl, sampleDataOn } from "@/lib/env/sample-data";
import { SampleDataBanner } from "@/components/admin/SampleDataBanner";
import { AdminLiveIdentity } from "@/components/admin/AdminLiveIdentity";
import { authMode } from "@/lib/auth/mode";
import { getSession } from "@/lib/server/auth/service";
import { connection } from "next/server";
import type { AdminIdentityId } from "@/lib/admin/ops/identity";

// Real Admin role from the verified session (live auth only). Display only: the server checks stay the boundary.
async function liveIdentity(): Promise<AdminIdentityId | null> {
  if (authMode() !== "live") return null;
  // Per-request: the role belongs to whoever is signed in, so this must never be prerendered. Called OUTSIDE the
  // try so Next's request-time signal is not swallowed by the catch below.
  await connection();
  try {
    const { access } = await getSession("admin");
    if (!access) return null;
    return access.role === "head_of_operations" ? "ops" : access.role === "hr_manager" ? "hr-manager" : "hr-officer";
  } catch {
    return null; // signed out or no access: Proxy and the area pages handle that; never guess a role
  }
}
import { OrgRecordsModeProvider } from "@/components/admin/org-records/OrgRecordsModeProvider";
import { orgRecordsConfig } from "@/lib/server/org-records/mode";
import { TeamAccessModeProvider } from "@/components/admin/team-access/TeamAccessModeProvider";
import { teamAccessConfig } from "@/lib/server/auth/team-access-mode";

// Everything in Admin except sign-in, invitation, reset and setup (those sit outside this group so they are never
// gated; URLs are unchanged). A closed area returns the not-open page WITHOUT rendering {children}.
export default async function AdminBusinessLayout({ children }: LayoutProps<"/">) {
  if (!areaOpen("admin")) return <AreaNotOpen siteUrl={publicSiteUrl()} />;
  const [pilot, identity] = await Promise.all([pilotMenuState(), liveIdentity()]);
  return (
    <PilotMenuProvider on={pilot.on} devSwitch={pilot.devSwitch}>
      <OrgRecordsModeProvider config={orgRecordsConfig()}>
        <TeamAccessModeProvider config={teamAccessConfig()}>
          {identity ? <AdminLiveIdentity id={identity} /> : null}
          <AdminShell>
            <SampleDataBanner on={!sampleDataOn()} />
            {children}
          </AdminShell>
        </TeamAccessModeProvider>
      </OrgRecordsModeProvider>
    </PilotMenuProvider>
  );
}
