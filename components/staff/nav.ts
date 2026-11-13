/**
 * Staff navigation (brief section 4). Data-driven like components/applicant/nav.ts.
 * Notifications live in the top utility area, not the sidebar.
 */
import type { LucideIcon } from "@/components/applicant/icons";
import { Briefcase, Calendar, CircleHelp, Clock3, DoorOpen, FileCheck2, Files, House, Settings, UserRound } from "@/components/applicant/icons";
import { BookOpen, ClipboardList } from "./icons";

export type StaffNavItem = {
  href: string;
  label: string;
  /** Short label for the phone bottom nav. */
  short?: string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
  /** Rendered under a divider in the sidebar and listed after the main items in More. */
  secondary?: boolean;
};

export const STAFF_NAV: StaffNavItem[] = [
  { href: "/staff", label: "Home", icon: House, mobilePrimary: true },
  { href: "/staff/assignment", label: "My Assignment", icon: Briefcase },
  { href: "/staff/schedule", label: "Schedule", icon: Calendar, mobilePrimary: true },
  { href: "/staff/attendance", label: "Attendance", icon: Clock3, mobilePrimary: true },
  { href: "/staff/leave", label: "Leave", icon: DoorOpen, mobilePrimary: true },
  { href: "/staff/documents", label: "Documents", icon: Files },
  { href: "/staff/sops-training", label: "SOPs & Training", icon: BookOpen },
  { href: "/staff/forms", label: "Forms", icon: FileCheck2 },
  { href: "/staff/records", label: "Warnings & Records", icon: ClipboardList },
  { href: "/staff/profile", label: "Profile", icon: UserRound },
  { href: "/staff/help", label: "Help & support", icon: CircleHelp, secondary: true },
];

/** Extra "More" destinations that are not in the sidebar list. */
export const STAFF_SETTINGS: StaffNavItem = { href: "/staff/settings", label: "Account / Settings", icon: Settings };
export const STAFF_NOTIFICATIONS_HREF = "/staff/notifications";

export const MORE_ROUTES = ["/staff/assignment", "/staff/documents", "/staff/sops-training", "/staff/forms", "/staff/records", "/staff/application-history", "/staff/profile", "/staff/settings", "/staff/help", "/staff/notifications"];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(`${href}/`);
}
