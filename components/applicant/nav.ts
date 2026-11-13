/**
 * Applicant dashboard navigation config. Route list matches the wireframe's
 * NAV array 1:1 (C:\Users\USER\Documents\beeliv-website\applicant\index.html
 * ~line 1462), mapped onto real Next.js URLs per the task's suggested route
 * list rather than the wireframe's flat internal route names.
 */
import type { LucideIcon } from "@/components/applicant/icons";
import {
  LayoutDashboard,
  Search,
  BriefcaseBusiness,
  CalendarCheck2,
  Files,
  UserRound,
  Bell,
  Settings,
  CircleHelp,
} from "@/components/applicant/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar-only routes fold under "More" on the mobile bottom nav. */
  mobilePrimary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/applicant", label: "Overview", icon: LayoutDashboard, mobilePrimary: true },
  { href: "/applicant/jobs", label: "Find Jobs", icon: Search, mobilePrimary: true },
  { href: "/applicant/applications", label: "My Applications", icon: BriefcaseBusiness, mobilePrimary: true },
  { href: "/applicant/interviews", label: "Interviews & Assessments", icon: CalendarCheck2 },
  { href: "/applicant/documents", label: "Documents", icon: Files },
  { href: "/applicant/profile", label: "Profile", icon: UserRound },
  { href: "/applicant/notifications", label: "Notifications", icon: Bell, mobilePrimary: true },
  { href: "/applicant/settings", label: "Settings", icon: Settings },
  { href: "/applicant/help", label: "Help & support", icon: CircleHelp },
];

/** Routes that fold under the mobile bottom nav's "More" sheet. */
export const MORE_ROUTES = ["/applicant/interviews", "/applicant/documents", "/applicant/profile", "/applicant/settings", "/applicant/help"];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/applicant") return pathname === "/applicant";
  return pathname === href || pathname.startsWith(`${href}/`);
}
