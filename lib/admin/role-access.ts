"use client";

/**
 * Admin role access (PROTOTYPE of server rules).
 *
 * One place that says which Admin role may open which route and which actions
 * each role may use. It exists so the screens can HIDE (never grey out) what a
 * role may not do, and so Codex can enforce exactly the same table on the server.
 * Nothing here is access control: the real boundary is the server grant + RLS
 * (docs/contracts/auth-permissions.md). Delete with the prototype identity
 * switch (lib/admin/ops/identity.ts) when real auth returns the role.
 *
 * Roles (prototype identities map onto them):
 *   hr_officer  - assigned HR: works within assigned clients, cannot set the company up
 *   hr_manager  - HR Manager: all clients, owns setup (lists, access, vacancies)
 *   operations  - head of the company: everything, plus the Operations screens
 */
import { useSyncExternalStore } from "react";
import { getAdminIdentity, subscribeAdminIdentity, type AdminIdentityId } from "./ops/identity";

export type AdminAccessRole = "hr_officer" | "hr_manager" | "operations";

export const roleForIdentity = (id: AdminIdentityId): AdminAccessRole => (id === "ops" ? "operations" : id === "hr-manager" ? "hr_manager" : "hr_officer");

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

const OPS_ONLY: AdminAccessRole[] = ["operations"];
const MANAGER_UP: AdminAccessRole[] = ["hr_manager", "operations"];

/**
 * Route rules. A rule matches a path that equals the prefix or is below it; the
 * LONGEST matching rule wins. A path with no rule is open to every HR role
 * (hr_officer, hr_manager, operations). `match` rules use a regular expression
 * for paths with an id in the middle (vacancies/[id]/edit).
 */
interface RouteRule {
  prefix?: string;
  match?: RegExp;
  roles: AdminAccessRole[];
  /** Proposal, needs Beeliv confirmation unless noted. */
  note?: string;
}

export const ADMIN_ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin/ops", roles: OPS_ONLY, note: "Operations screens: Operations only (rbac.md section 5)." },
  { prefix: "/admin/team-access", roles: MANAGER_UP, note: "Roles / access / invitations. Proposal, needs Beeliv confirmation." },
  { prefix: "/admin/lists", roles: MANAGER_UP, note: "Lists & Rules. Proposal, needs Beeliv confirmation." },
  { prefix: "/admin/recruitment/vacancies/new", roles: MANAGER_UP, note: "Create vacancy. Proposal, needs Beeliv confirmation." },
  { match: /^\/admin\/recruitment\/vacancies\/[^/]+\/edit(\/|$)/, roles: MANAGER_UP, note: "Edit vacancy. Proposal, needs Beeliv confirmation." },
  { prefix: "/admin/recruitment/tests/new", roles: MANAGER_UP, note: "Create a test / form. Proposal, needs Beeliv confirmation." },
  { prefix: "/admin/announcements/new", roles: MANAGER_UP, note: "Create an announcement. Proposal, needs Beeliv confirmation." },
  { match: /^\/admin\/announcements\/[^/]+\/edit(\/|$)/, roles: MANAGER_UP, note: "Edit an announcement. Proposal, needs Beeliv confirmation." },
  { prefix: "/admin/sops-training/new", roles: MANAGER_UP, note: "Create SOP / training. Proposal, needs Beeliv confirmation." },
  { match: /^\/admin\/sops-training\/[^/]+\/edit(\/|$)/, roles: MANAGER_UP, note: "Edit SOP / training. Proposal, needs Beeliv confirmation." },
];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

function ruleFor(pathname: string): RouteRule | null {
  let best: RouteRule | null = null;
  let bestLen = -1;
  for (const r of ADMIN_ROUTE_RULES) {
    if (r.match) {
      if (r.match.test(pathname) && 1000 > bestLen) {
        best = r;
        bestLen = 1000; // an explicit pattern beats any prefix
      }
    } else if (r.prefix && under(pathname, r.prefix) && r.prefix.length > bestLen) {
      best = r;
      bestLen = r.prefix.length;
    }
  }
  return best;
}

export function canOpenRoute(role: AdminAccessRole, pathname: string): boolean {
  const rule = ruleFor(pathname);
  return !rule || rule.roles.includes(role);
}

/** True when some role is blocked from this path (used to avoid flashing it before the identity is known). */
export const isRestrictedRoute = (pathname: string): boolean => ruleFor(pathname) !== null;

/** Settings sections that only the manager and Operations see (the officer sees personal settings only). Proposal, needs Beeliv confirmation. */
export const MANAGER_SETTINGS_SECTIONS = ["s-branding", "s-access"] as const;
export const canSeeSettingsSection = (role: AdminAccessRole, sectionId: string): boolean => role !== "hr_officer" || !(MANAGER_SETTINGS_SECTIONS as readonly string[]).includes(sectionId);

/* ------------------------------------------------------------------ */
/* Capabilities (actions)                                              */
/* ------------------------------------------------------------------ */

/**
 * What each role may DO. Absent from the officer list = hidden for the officer.
 * Everything below is a proposal needing Beeliv confirmation unless a comment
 * says it is confirmed in rbac.md. The officer keeps: shortlist, request info,
 * hold, reject-at-screening, first document verification, interview scheduling /
 * scoring within scope, warnings within scope, reports (these have no entry here
 * because they are not restricted).
 */
export type AdminCapability =
  | "vacancy.create" // New vacancy buttons, quick-add entry, create-from-client / create-from-request. Proposal, needs Beeliv confirmation.
  | "vacancy.manage" // Edit, submit, publish, pause, close, mark filled, cancel. Proposal, needs Beeliv confirmation.
  | "lists.manage" // Lists & Rules. Proposal, needs Beeliv confirmation.
  | "tests.manage" // Create / edit / publish tests and forms (viewing results stays). Proposal, needs Beeliv confirmation.
  | "doctypes.manage" // Required-document-type setup. Proposal, needs Beeliv confirmation.
  | "clients.create" // Create clients / outlets. Proposal, needs Beeliv confirmation.
  | "staff.create" // Add a minimal Staff record (org-records). Operations and HR Manager; officers wait on org-records-design open question 8. Proposal, needs Beeliv confirmation.
  | "invitations.manage" // Team & Access, invite client / staff / internal. Proposal, needs Beeliv confirmation.
  | "announcements.manage" // Create / edit / publish announcements. Proposal, needs Beeliv confirmation.
  | "content.manage" // Create / edit SOPs and training. Proposal, needs Beeliv confirmation.
  | "leave.decide" // Approve / reject leave (rbac.md leaves it TBD; officer sees leave read-only). Proposal, needs Beeliv confirmation.
  | "attendance.edit" // Correct attendance (rbac.md leaves it TBD; officer sees attendance read-only). Proposal, needs Beeliv confirmation.
  | "journeyTemplates.manage" // Create / edit / duplicate / archive job templates (Lists & Rules). Operations and HR Manager; the assigned HR officer cannot. Proposal, needs Beeliv confirmation.
  | "journey.edit" // Edit a job's own journey (vacancy form). Operations and HR Manager; the assigned HR officer cannot (project lead 2026-10-18). Admin only: the Applicant app never edits a journey.
  | "interviews.score" // Fill in an interview scorecard. Held by every role here; WHICH roles may score a given interview is that stage's own "who may score" setting (lib/journeys). Proposal, needs Beeliv confirmation.
  | "inbox.triage" // Inbox "Needs a home" (unmatched inbound email). Operations, or a delegated triage owner later (needs Beeliv confirmation); no HR role holds it today.
  | "agreements.publish"; // Draft, preview, publish agreements and policies and read old versions. Head of Operations ONLY (project lead 2026-10-14); HR roles read published text only.

export const OFFICER_DENIED: AdminCapability[] = ["vacancy.create", "vacancy.manage", "lists.manage", "tests.manage", "doctypes.manage", "clients.create", "staff.create", "invitations.manage", "announcements.manage", "content.manage", "leave.decide", "attendance.edit", "journeyTemplates.manage", "journey.edit"];

/** Capabilities only the Head of Operations holds (not the HR Manager either). */
export const OPERATIONS_ONLY_CAPS: AdminCapability[] = ["agreements.publish", "inbox.triage"];

export const roleCan = (role: AdminAccessRole, cap: AdminCapability): boolean => (OPERATIONS_ONLY_CAPS.includes(cap) ? role === "operations" : role !== "hr_officer" || !OFFICER_DENIED.includes(cap));

/** Non-hook form for mock adapters (reads the current prototype identity). */
export const canDo = (cap: AdminCapability): boolean => roleCan(roleForIdentity(getAdminIdentity()), cap);

const NO_ID = () => null;
/** The current access role, or null before the identity is known (server / hydration). */
export function useAccessRole(): AdminAccessRole | null {
  const id = useSyncExternalStore(subscribeAdminIdentity, getAdminIdentity, NO_ID as () => AdminIdentityId | null);
  return id ? roleForIdentity(id) : null;
}

/** Hook form for screens: hidden until the identity is known and the role may do it. */
export function useCan(cap: AdminCapability): boolean {
  const role = useAccessRole();
  return role !== null && roleCan(role, cap);
}
