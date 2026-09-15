// Navigation structure per role, per docs/architecture/ui-ux-framework.md §7.
// Labels and routes are structural only — no permission beyond what
// docs/architecture/rbac.md already documents is implied by any link here.

// Icon keys, not component references — this file is imported by Server
// Component layouts (app/*/layout.tsx) and handed straight to AppShell (a
// Client Component). A Lucide icon component is a function, and React
// can't serialize a function across the Server -> Client boundary as a
// plain prop ("Functions cannot be passed directly to Client Components" —
// this broke every dashboard's nav, and hung /staff/dashboard outright,
// the first time icons were added here as direct component references).
// AppShell resolves these keys to the actual components itself, entirely
// client-side, so nothing but a string ever crosses the boundary.
export type NavIconName =
  | "layout-dashboard"
  | "file-text"
  | "folder-open"
  | "user"
  | "bell"
  | "help-circle"
  | "calendar"
  | "calendar-days"
  | "clock"
  | "book-open"
  | "users"
  | "alert-triangle"
  | "file-bar-chart"
  | "file-check"
  | "wallet"
  | "building-2"
  | "user-plus";

export type Role = "applicant" | "staff" | "hr" | "client" | "ops";

export interface NavItem {
  label: string;
  href: string;
  /** Small leading icon for the sidebar/drawer nav — project-lead reference:
   *  a wireframe whose nav paired every item with an icon instead of
   *  plain text. Every item across every role gets one, for consistency. */
  icon: NavIconName;
}

// A group of nav items under an optional heading (e.g. "Main" / "Account").
// `label` is omitted for roles that haven't been redesigned into grouped
// navigation yet — AppShell renders those as a single flat list, unchanged.
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const ROLE_LABELS: Record<Role, string> = {
  applicant: "Applicant",
  staff: "Assigned Staff",
  hr: "Assigned HR",
  client: "Client",
  ops: "Head of Operations",
};

export const NAV_ITEMS: Record<Role, NavGroup[]> = {
  // Grouped per the approved Applicant Portal design (Main / Account).
  applicant: [
    {
      label: "Main",
      items: [
        { label: "Overview", href: "/applicant/dashboard", icon: "layout-dashboard" },
        { label: "My Application", href: "/applicant/application", icon: "file-text" },
        { label: "Documents", href: "/applicant/documentation", icon: "folder-open" },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Profile", href: "/applicant/profile", icon: "user" },
        { label: "Notifications", href: "/applicant/notifications", icon: "bell" },
        { label: "Help & Support", href: "/applicant/help", icon: "help-circle" },
      ],
    },
  ],
  // Other roles keep their original flat nav for now — not redesigned yet,
  // per the "Applicant Portal first, review before other roles" sequencing.
  staff: [
    {
      items: [
        { label: "Dashboard", href: "/staff/dashboard", icon: "layout-dashboard" },
        { label: "My Documentation", href: "/staff/documentation", icon: "file-text" },
        { label: "My Schedule", href: "/staff/schedule", icon: "calendar" },
        // Self-service attendance access is unconfirmed for this role
        // (rbac.md "Still open" #3) — reserved per project-lead direction,
        // see app/staff/attendance/page.tsx's own comment.
        { label: "My Attendance", href: "/staff/attendance", icon: "clock" },
        { label: "SOPs & Training", href: "/staff/sops", icon: "book-open" },
        { label: "Notifications", href: "/staff/notifications", icon: "bell" },
        { label: "Profile", href: "/staff/profile", icon: "user" },
      ],
    },
  ],
  hr: [
    {
      items: [
        { label: "Dashboard", href: "/hr/dashboard", icon: "layout-dashboard" },
        { label: "Staff", href: "/hr/staff", icon: "users" },
        { label: "Attendance", href: "/hr/attendance", icon: "clock" },
        { label: "Leave", href: "/hr/leave", icon: "calendar-days" },
        { label: "Warnings", href: "/hr/warnings", icon: "alert-triangle" },
        { label: "Schedules", href: "/hr/schedules", icon: "calendar" },
        { label: "Reports", href: "/hr/reports", icon: "file-bar-chart" },
        { label: "Profile", href: "/hr/profile", icon: "user" },
      ],
    },
  ],
  client: [
    {
      items: [
        { label: "Dashboard", href: "/client/dashboard", icon: "layout-dashboard" },
        { label: "Staff", href: "/client/staff", icon: "users" },
        { label: "Documentation Status", href: "/client/documentation-status", icon: "file-check" },
        { label: "Attendance", href: "/client/attendance", icon: "clock" },
        { label: "Schedules", href: "/client/schedules", icon: "calendar" },
        { label: "Payroll Schedule", href: "/client/payroll-schedule", icon: "wallet" },
        { label: "Profile", href: "/client/profile", icon: "user" },
      ],
    },
  ],
  ops: [
    {
      items: [
        { label: "Dashboard", href: "/ops/dashboard", icon: "layout-dashboard" },
        { label: "Staff", href: "/ops/staff", icon: "users" },
        { label: "Client Organizations", href: "/ops/organizations", icon: "building-2" },
        { label: "Recruitment Pipeline", href: "/ops/recruitment-pipeline", icon: "user-plus" },
        { label: "SOP Library", href: "/ops/sops", icon: "book-open" },
        { label: "Attendance", href: "/ops/attendance", icon: "clock" },
        { label: "Leave", href: "/ops/leave", icon: "calendar-days" },
        { label: "Warnings", href: "/ops/warnings", icon: "alert-triangle" },
        { label: "Schedules", href: "/ops/schedules", icon: "calendar" },
        { label: "Reports", href: "/ops/reports", icon: "file-bar-chart" },
        { label: "Profile", href: "/ops/profile", icon: "user" },
      ],
    },
  ],
};
