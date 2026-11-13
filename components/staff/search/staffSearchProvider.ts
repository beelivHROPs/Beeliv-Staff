"use client";

/**
 * Staff global search provider (PROTOTYPE, mock data). Only the signed-in person's own
 * items: their shifts, attendance, leave, documents, SOPs and training, forms, warnings and
 * records, announcements, notifications, assignment and the help articles. The Staff
 * services are already "my own" by construction. Real version: a scoped server search
 * (docs/contracts/frontend-backend-needs-2026-10-17.md, row 15).
 */
import { useMemo } from "react";
import { useStableFn } from "@/components/shared/search/useLatest";
import { Check, DoorOpen as LeaveIcon, LogOut, Moon, Settings, Sun, Upload, UserRound } from "@/components/applicant/icons";
import { setStaffDark, useStaffDark } from "@/lib/staff/theme";
import type { SearchAction } from "@/components/shared/search/types";
import { Bell, BriefcaseBusiness, Calendar, CircleHelp, Clock3, DoorOpen, Eye, FileCheck2, Files, House, Layers, LockKeyhole } from "@/components/applicant/icons";
import { BookOpen, ClipboardList, Megaphone } from "@/components/staff/icons";
import { browseLinks, pageEntries, type PageDef } from "@/components/shared/search/pages";
import type { SearchEntry, SearchGroupDef, SearchProvider } from "@/components/shared/search/types";
import { FAQS } from "@/components/staff/help/HelpBody";
import { listPublishedFor } from "@/lib/forms/participant-store";
import { addDays, dayMonth, formatClockRange, todayISO } from "@/lib/staff/format";
import * as service from "@/lib/staff/service";
import { usePilotMenu } from "@/lib/pilot/context";
import { isPilotHiddenRoute } from "@/lib/pilot/menu";

const human = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

/**
 * Every screen of the Staff Hub: each menu item, the screens reached from a menu (attendance history,
 * application history, notifications) and each settings section, with the words people type for them.
 * The pilot menu hides later-stage ones in load() (isPilotHiddenRoute).
 */
const PAGES: PageDef[] = [
  { href: "/staff", label: "Home", icon: House, keys: ["dashboard", "overview", "start", "today", "announcements"], popular: true },
  { href: "/staff/assignment", label: "My Assignment", icon: BriefcaseBusiness, keys: ["assignment", "job", "placement", "outlet", "client", "role"], popular: true },
  { href: "/staff/schedule", label: "Schedule", icon: Calendar, keys: ["shifts", "roster", "rota", "calendar", "timetable", "my shifts"], popular: true },
  { href: "/staff/attendance", label: "Attendance", icon: Clock3, keys: ["check in", "clock in", "present", "late", "time"], popular: true },
  { href: "/staff/leave", label: "Leave", icon: DoorOpen, keys: ["time off", "holiday", "sick", "day off", "vacation", "request leave"], popular: true },
  { href: "/staff/documents", label: "Documents", icon: Files, keys: ["files", "certificates", "upload", "docs"], popular: true },
  { href: "/staff/notifications", label: "Notifications", icon: Bell, keys: ["alerts", "bell", "updates", "unread"], popular: true },
  { href: "/staff/sops-training", label: "SOPs & Training", icon: BookOpen, keys: ["sop", "sops", "procedures", "training", "courses", "learning"] },
  { href: "/staff/forms", label: "Forms", icon: FileCheck2, keys: ["tests", "appraisals", "questionnaires", "surveys"] },
  { href: "/staff/records", label: "Warnings & Records", icon: ClipboardList, keys: ["warnings", "records", "discipline", "queries"] },
  { href: "/staff/attendance/history", label: "Attendance history", icon: Clock3, keys: ["past attendance", "records", "history"], sub: "Attendance" },
  { href: "/staff/application-history", label: "Application history", icon: Layers, keys: ["applications", "applied", "past applications", "applicant"] },
  { href: "/staff/profile", label: "Profile", icon: UserRound, keys: ["my details", "photo", "phone", "contact", "edit profile", "staff id"] },
  { href: "/staff/help", label: "Help & support", icon: CircleHelp, keys: ["help", "support", "faq", "contact", "question"] },
  { href: "/staff/settings", label: "Account / Settings", icon: Settings, keys: ["settings", "account", "preferences", "password"] },
  { href: "/staff/settings#s-notif", label: "Notification settings", icon: Bell, keys: ["alerts", "email", "notifications"], sub: "Jump to this section" },
  { href: "/staff/settings#s-display", label: "Display", icon: Eye, keys: ["dark mode", "light mode", "theme", "night", "appearance", "text size"], sub: "Jump to this section" },
  { href: "/staff/settings#s-acct", label: "Account & security", icon: LockKeyhole, keys: ["password", "sign in", "security"], sub: "Jump to this section" },
];

const GROUPS: SearchGroupDef[] = [
  { key: "pages", label: "Pages", singular: "Page", icon: Layers, aliases: ["screens", "go to", "open", "menu"] },
  { key: "shifts", label: "Schedule", singular: "Shift", icon: Calendar, aliases: ["shifts", "roster", "shift"] },
  { key: "attendance", label: "Attendance", singular: "Attendance", icon: Clock3 },
  { key: "leave", label: "Leave", singular: "Leave", icon: DoorOpen },
  { key: "content", label: "SOPs and training", singular: "SOP or training", icon: BookOpen, aliases: ["sops", "training", "sop", "learning"] },
  { key: "forms", label: "Forms", singular: "Form", icon: FileCheck2, aliases: ["tests", "appraisals"] },
  { key: "documents", label: "Documents", singular: "Document", icon: Files, aliases: ["docs"] },
  { key: "records", label: "Warnings and records", singular: "Record", icon: ClipboardList, aliases: ["warnings", "records"] },
  { key: "assignment", label: "My assignment", singular: "Assignment", icon: BriefcaseBusiness, aliases: ["assignment", "job"] },
  { key: "announcements", label: "Announcements", singular: "Announcement", icon: Megaphone },
  { key: "notifications", label: "Notifications", singular: "Notification", icon: Bell },
  { key: "help", label: "Help", singular: "Help", icon: CircleHelp, aliases: ["support", "faq"] },
];

/** Search groups that only exist for a later-stage screen; hidden with it while the pilot menu is on (lib/pilot/menu.ts). */
const GROUP_ROUTE: Record<string, string> = {
  shifts: "/staff/schedule",
  attendance: "/staff/attendance",
  leave: "/staff/leave",
  content: "/staff/sops-training",
  forms: "/staff/forms",
  records: "/staff/records",
};

interface StaffActionContext {
  dark: boolean;
  signOut: () => void;
  /** Pilot menu on: later-stage screens are not searchable and have no quick actions. Server-decided (lib/pilot/server.ts). */
  pilot?: boolean;
}

/** Quick actions: pages and buttons the Staff Hub already has, plus safe local switches. Nothing destructive. */
function staffActions(ctx: StaffActionContext): SearchAction[] {
  const all: SearchAction[] = [
    { id: "request-leave", title: "Request leave", category: "Leave", icon: LeaveIcon, href: "/staff/leave", keywords: ["time off", "holiday", "day off", "vacation", "sick", "new", "apply"], quick: true },
    { id: "upload-document", title: "Upload a document", category: "Documents", icon: Upload, href: "/staff/documents", keywords: ["file", "certificate", "add", "send", "replace", "scan"], quick: true },
    { id: "edit-profile", title: "Update my profile", category: "Account", icon: UserRound, href: "/staff/profile", keywords: ["edit", "phone", "photo", "details", "name", "contact"], quick: true },
    { id: "read-all", title: "Mark all notifications as read", category: "Notifications", icon: Check, keywords: ["read", "clear", "unread", "bell", "alerts"], quick: true, run: async () => { const list = await service.getNotifications(); await Promise.all(list.filter((n) => !n.read).map((n) => service.markNotificationRead(n.id))); } },
    { id: "dark", title: ctx.dark ? "Switch to light mode" : "Switch to dark mode", category: "View", icon: ctx.dark ? Sun : Moon, keywords: ["dark", "light", "theme", "night", "appearance"], quick: true, run: () => setStaffDark(!ctx.dark) },
    { id: "settings", title: "Open settings", category: "Account", icon: Settings, href: "/staff/settings", keywords: ["account", "notifications", "password", "preferences"] },
    { id: "sign-out", title: "Sign out", category: "Account", icon: LogOut, keywords: ["log out", "logout", "leave", "exit"], run: ctx.signOut },
  ];
  return ctx.pilot ? all.filter((a) => !(a.href && isPilotHiddenRoute(a.href))) : all;
}

export const buildStaffSearchProvider = (ctx: StaffActionContext): SearchProvider => ({
  appId: "staff",
  label: "Search Staff Hub",
  placeholder: "Search schedules, SOPs, documents...",
  searchPath: "/staff/search",
  hint: "Try: a shift, a leave request, an SOP or a document.",
  shortcuts: browseLinks(PAGES.filter((p) => !(ctx.pilot && isPilotHiddenRoute(p.href)))),
  actions: staffActions(ctx),
  groups: ctx.pilot ? GROUPS.filter((g) => !(GROUP_ROUTE[g.key] && isPilotHiddenRoute(GROUP_ROUTE[g.key]))) : GROUPS,
  load: async () => {
    const today = todayISO();
    const tasks: Promise<SearchEntry[]>[] = [
      Promise.resolve(pageEntries(PAGES)),
      service.getSchedule({ from: addDays(today, -14), to: addDays(today, 30) }).then((rows) =>
        rows.map((s) => ({ id: s.id, group: "shifts", title: `${s.role} at ${s.outlet}`, subtitle: join(dayMonth(s.date), formatClockRange(s.startTime, s.endTime)), href: `/staff/schedule/${s.id}`, icon: Calendar, keys: [s.client, s.section, s.location], status: s.status === "scheduled" ? undefined : human(s.status) })),
      ),
      service.getAttendanceHistory().then((rows) => rows.map((a) => ({ id: a.id, group: "attendance", title: `Attendance on ${dayMonth(a.date)}`, subtitle: a.checkedInAt ? "Checked in" : undefined, href: `/staff/attendance/${a.id}`, icon: Clock3, status: human(a.status) }))),
      service.getLeaveRequests().then((rows) => rows.map((l) => ({ id: l.id, group: "leave", title: /leave/i.test(l.type) ? l.type : `${l.type} leave`, subtitle: `${dayMonth(l.startDate)} to ${dayMonth(l.endDate)}`, href: "/staff/leave", icon: DoorOpen, status: human(l.status) }))),
      Promise.all([service.getSOPs(), service.getTraining()]).then(([sops, training]) => [
        ...sops.map((a): SearchEntry => ({ id: a.id, group: "content", title: a.sop.title, subtitle: join("SOP", a.sop.category), href: `/staff/sops-training/${a.id}`, icon: BookOpen, keys: [a.sop.description], status: human(a.status) })),
        ...training.map((a): SearchEntry => ({ id: a.id, group: "content", title: a.training.title, subtitle: join("Training", a.training.category), href: `/staff/sops-training/${a.id}`, icon: BookOpen, status: human(a.status) })),
      ]),
      Promise.resolve(listPublishedFor("staff")).then((forms) => forms.map((f) => ({ id: f.id, group: "forms", title: f.title, subtitle: join(f.kind === "appraisal" ? "Appraisal" : "Form", f.clientName), href: `/staff/forms/${f.id}`, icon: FileCheck2 }))),
      // Document names and states only; never file contents or identity / bank values.
      service.getStaffDocuments().then((rows) => rows.map((d) => ({ id: d.id, group: "documents", title: d.name, subtitle: d.dueDate ? `Due ${dayMonth(d.dueDate)}` : undefined, href: "/staff/documents", icon: Files, status: human(d.status) }))),
      service.getStaffRecords().then((rows) => rows.map((r) => ({ id: r.id, group: "records", title: r.type, subtitle: dayMonth(r.date), href: "/staff/records", icon: ClipboardList, status: human(r.status) }))),
      service.getAnnouncements().then((rows) => rows.map((a) => ({ id: a.id, group: "announcements", title: a.title, subtitle: a.source === "beeliv" ? "From Beeliv" : "From your outlet", href: "/staff", icon: Megaphone, keys: [a.body] }))),
      service.getNotifications().then((rows) => rows.map((n) => ({ id: n.id, group: "notifications", title: n.title, subtitle: n.message, href: n.destination.href, icon: Bell, status: n.read ? undefined : "Unread" }))),
      service.getCurrentAssignment().then((a) => (a ? [{ id: a.id, group: "assignment", title: `${a.role} at ${a.outlet.name}`, subtitle: join(a.client.name, a.outlet.location), href: "/staff/assignment", icon: BriefcaseBusiness, keys: [a.department, ...a.tags], status: human(a.status) }] : [])),
      Promise.resolve(FAQS.map((f, i) => ({ id: `faq-${i}`, group: "help", title: f.q, subtitle: "Help and support", href: "/staff/help", icon: CircleHelp, keys: f.keywords.split(" ") }))),
    ];
    const settled = await Promise.allSettled(tasks);
    const ok = settled.filter((r): r is PromiseFulfilledResult<SearchEntry[]> => r.status === "fulfilled");
    if (ok.length === 0) throw new Error("search unavailable");
    return ok.flatMap((r) => r.value).filter((entry) => !(ctx.pilot && isPilotHiddenRoute(entry.href)));
  },
});

export function useStaffSearchProvider(signOut: () => void): SearchProvider {
  const dark = useStaffDark();
  const stableSignOut = useStableFn(signOut);
  const pilot = usePilotMenu();
  return useMemo(() => buildStaffSearchProvider({ dark, signOut: stableSignOut, pilot }), [dark, stableSignOut, pilot]);
}
