import { redirect } from "next/navigation";

/**
 * Beeliv-Staff root ("talent.beeliv.co/") — this app serves Applicants and
 * Assigned Staff together (an applicant who is hired transitions into a
 * staff account, per the project's recruitment workflow), with no
 * public/unauthenticated content of its own. The actual public application
 * flow (browsing positions, creating an account) stays on beeliv.co
 * (Beeliv-Client) — this app only covers the authenticated dashboards.
 *
 * Real users only ever arrive here already knowing their role, via the
 * shared login on beeliv.co redirecting them straight to
 * "/applicant/dashboard" or "/staff/dashboard" once real Supabase Auth + a
 * `profiles` table exist (Stage 2 — see the main repo's
 * docs/STAGE-1-MASTER-PLAN.md §15).
 *
 * Structural-only placeholder for the bare root itself: redirects to
 * "/applicant/dashboard" as a reasonable default, not a real role-detection
 * decision — there is no auth here yet to detect a role from.
 */
export default function TalentRootPage() {
  redirect("/applicant/dashboard");
}
