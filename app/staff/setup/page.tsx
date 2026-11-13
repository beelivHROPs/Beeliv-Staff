import type { Metadata } from "next";
import { SetupBody } from "@/components/staff/setup/SetupBody";
import { AreaNotOpen } from "@/components/shared/AreaGate";
import { authMode } from "@/lib/auth/mode";
import { areaOpen, publicSiteUrl } from "@/lib/env/sample-data";

export const metadata: Metadata = { title: "Account setup", robots: { index: false, follow: false } };

/**
 * Lives OUTSIDE app/staff/(business) on purpose: that layout swaps every child for the
 * "pending" screen while the Staff entitlement is pending, so a setup page inside it could
 * never render for the people who need it. It repeats the layout's closed-area check.
 * proxy.ts (not changed here) must allow /staff/setup for pending talent sessions; see
 * docs/SETUP-FLOW-SIMPLIFIED-2026-11-12.md.
 */
export default function StaffSetupPage() {
  if (!areaOpen("staff")) return <AreaNotOpen siteUrl={publicSiteUrl()} />;
  return (
    <main id="main-content">
      <SetupBody mode={authMode()} />
    </main>
  );
}
