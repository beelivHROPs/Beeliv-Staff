/**
 * PILOT MENU (project lead, 2026-10-19): while the pilot runs, screens that belong to later stages are left out of menus,
 * phone navigation, "go to" lists, global search, quick actions and Home cards. NOTHING is deleted and every route still
 * opens by its address (it then shows the small "not part of the pilot yet" notice). This is presentation only: the
 * server's permissions are the real boundary, a hidden menu entry is not access control.
 *
 * This is the ONE list. Menus, search and Home all read it (through lib/pilot/context.tsx on screens). The on/off
 * decision itself is made on the server: BEELIV_PILOT_MENU, see lib/env/resolve.ts and lib/pilot/server.ts.
 * Pure module: no imports, safe in server and client code and in node tests.
 */
export type PilotApp = "admin" | "client" | "staff";

/** Route prefixes hidden during the pilot (a prefix also covers every route under it). Source: docs/MVP-FOCUS-REVIEW.md. */
export const PILOT_HIDDEN: Record<PilotApp, readonly string[]> = {
  // Attendance, Leave, Scheduling, Warnings (all under /workforce), SOPs & Training, Announcements.
  admin: ["/admin/workforce", "/admin/sops-training", "/admin/announcements"],
  // Attendance, Schedules, Documents & Compliance, Payroll, Analytics (and Compare), plus the QUESTIONABLE Recruitment / Candidates.
  client: ["/client/attendance", "/client/schedules", "/client/compliance", "/client/payroll", "/client/analytics", "/client/recruitment"],
  // Schedule, Attendance, Leave, SOPs & Training, Forms (QUESTIONABLE), Warnings & Records.
  staff: ["/staff/schedule", "/staff/attendance", "/staff/leave", "/staff/sops-training", "/staff/forms", "/staff/records"],
};

const ALL_HIDDEN: readonly string[] = [...PILOT_HIDDEN.admin, ...PILOT_HIDDEN.client, ...PILOT_HIDDEN.staff];

const pathOf = (hrefOrPath: string): string => hrefOrPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
const under = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);

/** True when this route (a path or an href, query and hash are ignored) belongs to a later stage. Pure; the caller applies the flag. */
export function isPilotHiddenRoute(hrefOrPath: string): boolean {
  const path = pathOf(hrefOrPath);
  return ALL_HIDDEN.some((p) => under(path, p));
}

/** Drops hidden destinations when the pilot menu is on. Anything else is returned untouched (same array when off). */
export function pilotFilter<T extends { href: string }>(items: readonly T[], on: boolean): T[] {
  return on ? items.filter((i) => !isPilotHiddenRoute(i.href)) : [...items];
}

/** Same, for grouped menus; groups left empty disappear. */
export function pilotFilterGroups<G extends { items: { href: string }[] }>(groups: readonly G[], on: boolean): G[] {
  if (!on) return [...groups];
  return groups.map((g) => ({ ...g, items: pilotFilter(g.items, true) })).filter((g) => g.items.length > 0);
}

/** Phone bottom navigation while the pilot menu is on (the originals lean on Attendance / Schedule / Leave / Recruitment). */
export const PILOT_MOBILE_PRIMARY = {
  client: ["/client", "/client/workforce", "/client/requests"],
  staff: ["/staff", "/staff/assignment", "/staff/documents"],
} as const;
