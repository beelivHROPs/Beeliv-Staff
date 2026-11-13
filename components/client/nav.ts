/**
 * Client navigation (brief section 5). Data-driven like components/staff/nav.ts.
 * Notifications live in the top utility area, not the sidebar. The phone
 * bottom nav shows Overview, Workforce, Attendance (raised centre),
 * Recruitment and More (brief section 32).
 */
import type { LucideIcon } from "@/components/applicant/icons";
import { Briefcase, Calendar, CircleHelp, Clock3, LayoutDashboard, Settings, ShieldCheck, UsersRound } from "@/components/applicant/icons";
import { BarChart3, ClipboardList, Wallet } from "./icons";

export type ClientNavItem = {
  href: string;
  label: string;
  /** Short label for the phone bottom nav. */
  short?: string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
};

export const CLIENT_NAV: ClientNavItem[] = [
  { href: "/client", label: "Overview", icon: LayoutDashboard, mobilePrimary: true },
  { href: "/client/workforce", label: "My Workforce", short: "Workforce", icon: UsersRound, mobilePrimary: true },
  { href: "/client/attendance", label: "Attendance", icon: Clock3, mobilePrimary: true },
  { href: "/client/schedules", label: "Schedules", icon: Calendar },
  { href: "/client/recruitment", label: "Recruitment / Candidates", short: "Recruitment", icon: Briefcase, mobilePrimary: true },
  { href: "/client/requests", label: "Workforce Requests", icon: ClipboardList },
  { href: "/client/compliance", label: "Documents & Compliance", icon: ShieldCheck },
  { href: "/client/payroll", label: "Payroll", icon: Wallet },
  { href: "/client/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/client/support", label: "Support", icon: CircleHelp },
];

/** Extra "More" destinations that are not in the sidebar list. */
export const CLIENT_SETTINGS: ClientNavItem = { href: "/client/settings", label: "Account / Settings", icon: Settings };
export const CLIENT_NOTIFICATIONS_HREF = "/client/notifications";

export const MORE_ROUTES = ["/client/schedules", "/client/requests", "/client/compliance", "/client/payroll", "/client/analytics", "/client/support", "/client/settings", "/client/notifications"];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/client") return pathname === "/client";
  return pathname === href || pathname.startsWith(`${href}/`);
}
