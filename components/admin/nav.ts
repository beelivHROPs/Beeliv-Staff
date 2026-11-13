/**
 * Admin navigation: six everyday items plus one "Administration" group
 * (project lead, docs/ADMIN-USER-FLOW.md). Data-driven like components/client/nav.ts.
 * Notifications live in the top utility bar, not the sidebar. "Team & Access" is
 * shown "as permitted" (spec 13.4): who sees it needs Beeliv confirmation.
 *
 * Hub items own whole route families through `also`, so the hub stays highlighted
 * while any of its older routes is open (every old route keeps working).
 */
import type { LucideIcon } from "@/components/applicant/icons";
import { Briefcase, Calendar, Clock3, FileCheck2, LayoutDashboard, Mail, ScrollText, Settings, ShieldCheck, UsersRound } from "@/components/applicant/icons";
import { Activity, BarChart3, ShieldAlert, Store } from "@/components/client/icons";
import { BookOpen, Megaphone } from "@/components/staff/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  /** Short label for the phone bottom nav. */
  short?: string;
  icon: LucideIcon;
  /** Key into NavCounts for the sidebar badge. */
  countKey?: "inbox" | "documentation";
  /** Other route prefixes that belong to this item (it stays highlighted on them). */
  also?: string[];
  /** Plain sub-heading shown above this item inside the Administration group (starts a new section). */
  section?: string;
};

export type AdminNavGroup = {
  /** Group heading in the sidebar; omitted for single top-level items. */
  label?: string;
  /** Plain, always-open heading (no collapse button). Used by the Operations sidebar. HR groups leave it off. */
  quiet?: boolean;
  items: AdminNavItem[];
};

export const HR_NAV: AdminNavGroup[] = [
  { items: [{ href: "/admin", label: "Home", icon: LayoutDashboard }] },
  { items: [{ href: "/admin/inbox", label: "Inbox / Requests", short: "Inbox", icon: Mail, countKey: "inbox" }] },
  {
    items: [
      {
        href: "/admin/people",
        label: "People",
        icon: UsersRound,
        also: ["/admin/staff", "/admin/recruitment/applicants", "/admin/recruitment/talent-pool"],
      },
    ],
  },
  { items: [{ href: "/admin/jobs", label: "Jobs", icon: Briefcase, countKey: "documentation", also: ["/admin/recruitment"] }] },
  { items: [{ href: "/admin/clients", label: "Clients", icon: Store }] },
  { items: [{ href: "/admin/calendar", label: "Calendar", icon: Calendar }] },
  {
    label: "Administration",
    items: [
      { href: "/admin/workforce/attendance", label: "Attendance", icon: Clock3, section: "Workforce" },
      { href: "/admin/workforce/leave", label: "Leave", icon: Activity },
      { href: "/admin/workforce/scheduling", label: "Scheduling", icon: Calendar },
      { href: "/admin/workforce/warnings", label: "Warnings", icon: ShieldAlert },
      { href: "/admin/sops-training", label: "SOPs & Training", icon: BookOpen, section: "Content" },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, section: "Insights" },
      { href: "/admin/team-access", label: "Team & Access", icon: ShieldCheck, section: "Setup" },
      { href: "/admin/lists", label: "Lists & Rules", icon: Settings },
    ],
  },
];

export const HR_NAV_ITEMS: AdminNavItem[] = HR_NAV.flatMap((g) => g.items);

/** HR_NAV without the given destinations (hidden, never greyed). Prototype of the server role rules in lib/admin/role-access.ts. */
const withoutHrefs = (groups: AdminNavGroup[], hrefs: string[]): AdminNavGroup[] =>
  groups.map((g) => ({ ...g, items: g.items.filter((i) => !hrefs.includes(i.href)) })).filter((g) => g.items.length > 0);

/** Announcements is not on either HR menu in this prototype (project lead's list, 2026-10-13); its route stays open to HR. */
const NOT_ON_HR_MENUS = ["/admin/announcements"];
/** Assigned HR officer: everyday HR work within assigned clients. No Team & Access, no Lists & Rules (proposal, needs Beeliv confirmation). */
export const HR_OFFICER_NAV: AdminNavGroup[] = withoutHrefs(HR_NAV, [...NOT_ON_HR_MENUS, "/admin/team-access", "/admin/lists"]);
/** HR Manager: the officer menu plus Team & Access and Lists & Rules. */
export const HR_MANAGER_NAV: AdminNavGroup[] = withoutHrefs(HR_NAV, NOT_ON_HR_MENUS);

export type AdminNavRole = "hr_officer" | "hr_manager" | "operations";
export const navGroupsFor = (role: AdminNavRole): AdminNavGroup[] => (role === "operations" ? OPS_NAV : role === "hr_manager" ? HR_MANAGER_NAV : HR_OFFICER_NAV);
/** Items of the Administration dropdown (phone Admin sheet) for a role. Operations keeps the full HR list it always had. */
export const administrationItemsFor = (role: AdminNavRole): AdminNavItem[] =>
  (role === "hr_officer" ? HR_OFFICER_NAV : role === "hr_manager" ? HR_MANAGER_NAV : HR_NAV).filter((g) => g.label === "Administration").flatMap((g) => g.items);

/**
 * Operations navigation (prototype: only the screens built so far). Operations decides
 * selections and offers; HR never does (rbac.md section 5). More Operations screens are
 * added here as they are built. Which identity is shown is the dev switch in lib/admin/ops/identity.ts.
 */
export const OPS_NAV: AdminNavGroup[] = [
  {
    label: "Business",
    quiet: true,
    items: [
      { href: "/admin/ops", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/ops/approvals", label: "Approvals", icon: FileCheck2 },
      { href: "/admin/ops/clients", label: "Clients & Outlets", icon: Store },
    ],
  },
  {
    label: "Workforce",
    quiet: true,
    items: [
      { href: "/admin/ops/assignments", label: "Clients & HR", icon: UsersRound },
      { href: "/admin/ops/staff", label: "Staff Assignments", icon: Briefcase },
    ],
  },
  {
    label: "Control",
    quiet: true,
    items: [
      { href: "/admin/ops/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/ops/activity", label: "Activity", icon: Activity },
      { href: "/admin/ops/setup", label: "Setup", icon: Settings },
    ],
  },
  {
    // Operations is the head of Beeliv (project lead, 2026-10-13): it can open every HR screen. HR home is the way in; the Overview item brings you back.
    label: "HR",
    quiet: true,
    items: [{ href: "/admin", label: "HR workspace", icon: ShieldCheck }],
  },
];
export const OPS_NAV_ITEMS: AdminNavItem[] = OPS_NAV.flatMap((g) => g.items);

/**
 * Operations inside the HR workspace (project lead, 2026-10-17): when the Head of Operations opens an HR screen the
 * sidebar becomes the full HR menu (no scoping, Operations powers on every screen), with one way back to Operations at
 * the top. Prototype only: the real access rules are server-side.
 */
export const OPS_IN_HR_NAV: AdminNavGroup[] = [{ items: [{ href: "/admin/ops", label: "Operations", icon: LayoutDashboard }] }, ...HR_NAV];
/** True when the Head of Operations is on an HR screen (anything outside the Operations area). */
export const isOpsInHrWorkspace = (role: AdminNavRole, pathname: string): boolean => role === "operations" && !pathname.startsWith("/admin/ops");
const ALL_NAV_ITEMS: AdminNavItem[] = [...HR_NAV_ITEMS, ...OPS_NAV_ITEMS];

/** Items in the Administration group (the phone "Admin" sheet and the sidebar dropdown). */
export const ADMINISTRATION_ITEMS: AdminNavItem[] = HR_NAV.filter((g) => g.label === "Administration").flatMap((g) => g.items);

/** Destinations outside the sidebar list (top bar). */
export const ADMIN_NOTIFICATIONS: AdminNavItem = { href: "/admin/notifications", label: "Notifications", icon: ScrollText };

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The one nav item that owns this path: the longest matching href / `also` prefix wins. */
export function activeNavItem(pathname: string): AdminNavItem | null {
  if (pathname === "/admin") return HR_NAV_ITEMS[0];
  let best: AdminNavItem | null = null;
  let bestLen = -1;
  for (const item of ALL_NAV_ITEMS) {
    if (item.href === "/admin") continue;
    for (const p of [item.href, ...(item.also ?? [])]) {
      if (under(pathname, p) && p.length > bestLen) {
        best = item;
        bestLen = p.length;
      }
    }
  }
  return best;
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === ADMIN_NOTIFICATIONS.href) return under(pathname, href);
  return activeNavItem(pathname)?.href === href;
}

/** Phone bottom nav, in order (the centre slot is the Quick add button). "Admin" opens from the top bar. */
export const MOBILE_PRIMARY_HREFS = ["/admin", "/admin/inbox", "/admin/jobs"] as const;

/** Role identity class (app/admin/admin.css). HR is built first; the Operations identity swaps this to `admin-role-ops`. */
export const ADMIN_ROLE_CLASS = "admin-role-hr";
