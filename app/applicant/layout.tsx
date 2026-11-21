import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/applicant/AppShell";
import { newsreader } from "@/components/applicant/fonts";
import "./applicant.css";
import "./applicant-buttons.css";
import { areaOpen, publicSiteUrl } from "@/lib/env/sample-data";
import { AreaNotOpen } from "@/components/shared/AreaGate";
import { demoAttr } from "@/lib/dev-demo-flag";
import { ShareSheetHost } from "@/components/shared/ShareSheet";
import { ScreenScale } from "@/components/shared/ScreenScale";
import {publicJobsEnabled} from '@/lib/server/public-jobs/runtime';
import { applicantUploadConfig } from "@/lib/applicant/uploads/server-config";
import { ApplicantUploadProvider } from "@/lib/applicant/uploads/provider";
import { ApplicantLiveBoot } from "@/components/applicant/ApplicantLiveBoot";
import type { LiveApplicantSeed } from "@/lib/applicant/service";
import { getSession } from "@/lib/server/auth/service";
import { adminClient } from "@/lib/server/auth/session";
import { applicationsEnabled } from "@/lib/server/applications/runtime";
import { connection } from "next/server";

// Real applicant: their OWN name/email/phone from the verified session. Never a sample person; if anything fails the
// store is simply empty (the proxy already sends signed-out people to sign in).
async function liveSeed(): Promise<LiveApplicantSeed> {
  await connection();
  const seed: LiveApplicantSeed = { personId: "", fullName: "", email: "", phone: "", applicationsOn: applicationsEnabled() };
  try {
    const { access } = await getSession("talent");
    if (!access) return seed;
    seed.personId = access.personId;
    const { data } = await adminClient("talent").from("auth_people").select("full_name,email,phone").eq("id", access.personId).maybeSingle();
    if (data) Object.assign(seed, { fullName: String(data.full_name ?? ""), email: String(data.email ?? ""), phone: String(data.phone ?? "") });
  } catch {
    /* empty live store */
  }
  return seed;
}

// Applicant dashboard only: Newsreader (serif display headings), matching
// the delivered wireframe (C:\Users\USER\Documents\beeliv-website\applicant\
// index.html), same next/font pattern as app/(public)/layout.tsx (which this
// route tree does NOT import from — this is its own scope). Karla (body) is
// already loaded globally as --font-sans in app/layout.tsx.
//
// Note: CLAUDE.md records a project-lead instruction that the (other four)
// role dashboards use Inter headings only. This dashboard is a deliberate,
// scoped exception: it was handed over as its own locked wireframe (task
// instructions: "Fonts: Karla + Newsreader... reuse, don't re-import") and
// sits functionally closer to the public recruitment flow (job listings,
// apply) than to the internal HR/ops dashboards. Flagged for visibility, not
// silently applied — if Beeliv wants Inter here instead, this is the one
// line to change.
export const metadata: Metadata = {
  title: { default: "Applicant dashboard", template: "%s | Beeliv Applicant" },
  robots: { index: false, follow: false },
};

// Phone browser bars take the same cream as the page (the one Applicant page colour).
export const viewport: Viewport = { themeColor: "#faf6ee", colorScheme: "only light" };

export default async function ApplicantLayout({ children }: LayoutProps<"/">) {
  const open = areaOpen("applicant");
  const demo = demoAttr();
  const uploads = open ? await applicantUploadConfig(demo["data-bv-demo"] === "on") : { mode: "unavailable" as const };
  const seed = open && demo["data-bv-demo"] !== "on" ? await liveSeed() : null;
  return (
    <div {...demo} className={`ap-app ap-screen-zoom applicant-shell ${newsreader.variable}`}>
      <ScreenScale />
      <ShareSheetHost />
      {/* Scroll reveals start hidden in the server HTML (motion.tsx Reveal/Unveil); without JS, show them. Same pattern as app/(public)/layout.tsx. */}
      <noscript>
        <style>{`.applicant-shell [data-ap-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      {open ? <ApplicantUploadProvider config={uploads}>{seed ? <ApplicantLiveBoot seed={seed}><AppShell liveVacancies={publicJobsEnabled()}>{children}</AppShell></ApplicantLiveBoot> : <AppShell liveVacancies={publicJobsEnabled()}>{children}</AppShell>}</ApplicantUploadProvider> : <AreaNotOpen siteUrl={publicSiteUrl()} />}
    </div>
  );
}
