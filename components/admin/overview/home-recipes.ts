/**
 * Admin PHONE Home "recipes": per role, WHICH facts the one Home layout shows.
 * The layout (PhoneHome.tsx) is identical for every role: a hero number, two colour-blocked
 * cards, two small cards, an optional documents row, an "Up next" list and ONE primary action.
 * A recipe only picks content, by fact key. Each list is a priority order: the first facts
 * that EXIST for this role (data present, screen not hidden by the pilot menu) are used, so a
 * card whose data does not exist is dropped, never faked.
 *
 * Roles are the ones the app already has: Recruiter / HR Officer / HR Manager (HrLevel in
 * lib/admin/types.ts) and the Head of Operations (lib/admin/ops/identity.ts). Access itself is
 * lib/admin/role-access.ts and the server; a recipe is presentation only. Recruiter has no
 * prototype identity or separate access role ("scoped like HR Officer", team-access mock), so
 * it is only used when the signed-in HrLevel is Recruiter (or the dev preview ?home=recruiter).
 */
import type { AdminIdentityId } from "@/lib/admin/ops/identity";
import type { HrLevel } from "@/lib/admin/types";

export type HomeRole = "recruiter" | "hr_officer" | "hr_manager" | "operations";

export type UpNextKind = "docs" | "interviews" | "toScreen" | "jobsToPublish" | "leave" | "approvals" | "requests";

export interface HomeRecipe {
  /** Hero number (first existing fact wins). */
  hero: string[];
  /** The TWO colour-blocked cards: first one is rose, second lavender. */
  blocks: string[];
  /** The TWO small white cards. */
  minis: string[];
  /** "Up next" sources, in order, filled up to 3 rows. */
  upNext: UpNextKind[];
  upNextTitle: string;
  upNextHref: string;
  /** The ONE primary action: the first fact in this list with something waiting. */
  primary: string[];
  /** Phone More-sheet items (by href prefix) this role does not see, on top of role-access / nav rules. */
  moreHide: string[];
}

export const PRIMARY_LABEL: Record<string, string> = {
  nextApplicant: "Review next applicant",
  docs: "Check documents",
  interviews: "See today's interviews",
  apps: "Review applications",
  offers: "Open offers",
  leave: "Open leave requests",
  jobsToPublish: "Open jobs to publish",
  requests: "Open client requests",
  approvals: "Review approvals",
  clientsNoHr: "Assign an HR officer",
};

export const HOME_RECIPES: Record<HomeRole, HomeRecipe> = {
  // Works the applicant pipeline. No payroll, workforce, warnings or client-side screens.
  recruiter: {
    hero: ["applicants"],
    blocks: ["interviews", "shortlisted"],
    minis: ["openJobs", "assessments"],
    upNext: ["interviews", "toScreen"],
    upNextTitle: "Up next",
    upNextHref: "/admin/calendar",
    primary: ["nextApplicant", "interviews"],
    moreHide: ["/admin/workforce", "/admin/team-access", "/admin/lists"],
  },
  // The everyday Home (assigned clients).
  hr_officer: {
    // Approved Home (docs/design-references/admin-midground-2026-10-26.html): the Applicants card with the 1W/1M/1Y control and the thin trend line leads.
    hero: ["applicants", "needs"],
    blocks: ["interviews", "offers"],
    minis: ["leave", "openJobs"],
    upNext: ["docs", "interviews"],
    upNextTitle: "Up next",
    upNextHref: "/admin/calendar",
    primary: ["docs", "interviews", "apps", "offers", "leave"],
    moreHide: [],
  },
  // Decides what an HR Manager decides (publish jobs, leave); Operations approves selections and offers, never HR.
  hr_manager: {
    hero: ["decisions", "needs"],
    blocks: ["jobsToPublish", "offersWithOps", "interviews"],
    minis: ["placedWeek", "attention", "openJobs"],
    upNext: ["jobsToPublish", "leave"],
    upNextTitle: "Waiting for you",
    upNextHref: "/admin/jobs",
    primary: ["jobsToPublish", "leave", "docs"],
    moreHide: [],
  },
  // Runs the business: workforce, client requests, approvals. No recruitment screens on Home.
  operations: {
    hero: ["staffOnShift", "deployedStaff"],
    blocks: ["requests", "approvals", "clientsNoHr"],
    minis: ["attExceptions", "unassignedStaff", "clientsNoHr"],
    upNext: ["approvals", "requests"],
    upNextTitle: "Up next",
    upNextHref: "/admin/ops/approvals",
    primary: ["requests", "approvals", "clientsNoHr"],
    moreHide: [],
  },
};

/** Which recipe a signed-in person gets. Operations and the HR Manager come from the identity; HrLevel separates Recruiter from Officer. */
export function homeRoleFor(identity: AdminIdentityId | null, hrLevel: HrLevel | null | undefined): HomeRole {
  if (identity === "ops") return "operations";
  if (identity === "hr-manager" || hrLevel === "HR Manager") return "hr_manager";
  if (hrLevel === "Recruiter") return "recruiter";
  return "hr_officer";
}
