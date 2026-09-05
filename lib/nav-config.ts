// Navigation structure per role, per docs/architecture/ui-ux-framework.md §7.
// Labels and routes are structural only — no permission beyond what
// docs/architecture/rbac.md already documents is implied by any link here.

export type Role = "applicant" | "staff" | "hr" | "client" | "ops";

export interface NavItem {
  label: string;
  href: string;
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
        { label: "Overview", href: "/applicant/dashboard" },
        { label: "My Application", href: "/applicant/application" },
        { label: "Documents", href: "/applicant/documentation" },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Profile", href: "/applicant/profile" },
        { label: "Notifications", href: "/applicant/notifications" },
        { label: "Help & Support", href: "/applicant/help" },
      ],
    },
  ],
  // Other roles keep their original flat nav for now — not redesigned yet,
  // per the "Applicant Portal first, review before other roles" sequencing.
  staff: [
    {
      items: [
        { label: "Dashboard", href: "/staff/dashboard" },
        { label: "My Documentation", href: "/staff/documentation" },
        { label: "My Schedule", href: "/staff/schedule" },
        // Self-service attendance access is unconfirmed for this role
        // (rbac.md "Still open" #3) — reserved per project-lead direction,
        // see app/staff/attendance/page.tsx's own comment.
        { label: "My Attendance", href: "/staff/attendance" },
        { label: "SOPs & Training", href: "/staff/sops" },
        { label: "Notifications", href: "/staff/notifications" },
      ],
    },
  ],
  hr: [
    {
      items: [
        { label: "Dashboard", href: "/hr/dashboard" },
        { label: "Staff", href: "/hr/staff" },
        { label: "Attendance", href: "/hr/attendance" },
        { label: "Leave", href: "/hr/leave" },
        { label: "Warnings", href: "/hr/warnings" },
        { label: "Schedules", href: "/hr/schedules" },
        { label: "Reports", href: "/hr/reports" },
      ],
    },
  ],
  client: [
    {
      items: [
        { label: "Dashboard", href: "/client/dashboard" },
        { label: "Staff", href: "/client/staff" },
        { label: "Documentation Status", href: "/client/documentation-status" },
        { label: "Attendance", href: "/client/attendance" },
        { label: "Schedules", href: "/client/schedules" },
        { label: "Payroll Schedule", href: "/client/payroll-schedule" },
      ],
    },
  ],
  ops: [
    {
      items: [
        { label: "Dashboard", href: "/ops/dashboard" },
        { label: "Staff", href: "/ops/staff" },
        { label: "Client Organizations", href: "/ops/organizations" },
        { label: "Recruitment Pipeline", href: "/ops/recruitment-pipeline" },
        { label: "SOP Library", href: "/ops/sops" },
        { label: "Attendance", href: "/ops/attendance" },
        { label: "Leave", href: "/ops/leave" },
        { label: "Warnings", href: "/ops/warnings" },
        { label: "Schedules", href: "/ops/schedules" },
        { label: "Reports", href: "/ops/reports" },
      ],
    },
  ],
};
