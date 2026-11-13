"use client";

/**
 * Client global search provider (PROTOTYPE, mock data). Searches only what the Client app
 * already shows for the signed-in client organisation and the outlet scope currently selected
 * in the outlet switcher: its people, candidates, requests, shifts, attendance, documents,
 * pay periods, outlets, notifications and help. Names, roles, statuses and dates only.
 * Real version: a scoped server search (docs/contracts/frontend-backend-needs-2026-10-17.md, row 15).
 */
import { useMemo } from "react";
import { useStableFn } from "@/components/shared/search/useLatest";
import { Check, LogOut, Moon, Plus, Settings, Sun } from "@/components/applicant/icons";
import { setClientDark, useClientDark } from "@/lib/client/theme";
import { setSoundPrefs, useSoundPrefs } from "@/lib/admin/sound";
import { NEW_REQUEST_HREF } from "@/lib/client/links";
import type { SearchAction } from "@/components/shared/search/types";
import { BriefcaseBusiness, Bell, Calendar, MessageSquareText, CircleHelp, Clock3, Eye, Layers, LayoutDashboard, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "@/components/applicant/icons";
import { ClipboardList, Store } from "@/components/staff/icons";
import { BarChart3, Wallet } from "@/components/client/icons";
import { browseLinks, pageEntries, type PageDef } from "@/components/shared/search/pages";
import { FAQ } from "@/components/client/support/SupportBody";
import type { SearchEntry, SearchGroupDef, SearchProvider } from "@/components/shared/search/types";
import { addDays, dayMonth, todayISO } from "@/lib/client/format";
import { DEPARTMENT_LABEL } from "@/lib/client/labels";
import { attendanceHref, complianceHref, requestHref, SCHEDULES_HREF, staffHref } from "@/lib/client/links";
import { useOutletScope } from "@/lib/client/outlet";
import * as service from "@/lib/client/service";
import type { OutletScope } from "@/lib/client/types";
import { CLIENT_NOTIFICATIONS_HREF } from "@/components/client/nav";
import { usePilotMenu } from "@/lib/pilot/context";
import { isPilotHiddenRoute } from "@/lib/pilot/menu";

const human = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

/**
 * Every screen of the Client app: each menu item, the screens reached from a menu (compare, the analytics
 * families, notifications) and each settings section, with the words people type for them. The pilot menu
 * hides later-stage ones in load() (isPilotHiddenRoute), so a result never leads to a "not part of the pilot" page.
 */
const A = "/client/analytics";
const PAGES: PageDef[] = [
  { href: "/client", label: "Overview", icon: LayoutDashboard, keys: ["home", "dashboard", "start", "summary", "today"], popular: true },
  { href: "/client/workforce", label: "My Workforce", icon: UsersRound, keys: ["staff", "team", "people", "employees", "headcount"], popular: true },
  { href: "/client/requests", label: "Workforce Requests", icon: ClipboardList, keys: ["requests", "request staff", "hire", "need staff", "new request"], popular: true },
  { href: "/client/attendance", label: "Attendance", icon: Clock3, keys: ["check in", "present", "late", "absent", "clock", "time"], popular: true },
  { href: "/client/schedules", label: "Schedules", icon: Calendar, keys: ["schedule", "shifts", "roster", "rota", "calendar", "coverage"], popular: true },
  { href: A, label: "Analytics", icon: BarChart3, keys: ["reports", "report", "insights", "stats", "statistics", "charts", "kpi", "metrics", "numbers"], popular: true },
  { href: "/client/notifications", label: "Notifications", icon: Bell, keys: ["alerts", "bell", "updates", "unread"], popular: true },
  { href: "/client/support", label: "Support", icon: CircleHelp, keys: ["help", "contact", "faq", "question", "message beeliv"], popular: true },
  { href: "/client/recruitment", label: "Recruitment / Candidates", icon: BriefcaseBusiness, keys: ["candidates", "recruitment", "hiring", "shortlist", "interview"] },
  { href: "/client/compliance", label: "Documents & Compliance", icon: ShieldCheck, keys: ["documents", "compliance", "certificates", "expiring", "docs"] },
  { href: "/client/payroll", label: "Payroll", icon: Wallet, keys: ["pay", "pay periods", "pay date", "salary", "wages"] },
  { href: `${A}/compare`, label: "Compare outlets", icon: Layers, keys: ["compare", "comparison", "outlets", "benchmark", "analytics"], sub: "Side by side" },
  { href: `${A}?family=workforce`, label: "Workforce analytics", icon: BarChart3, keys: ["reports", "staff numbers", "headcount"], sub: "Charts and records" },
  { href: `${A}?family=attendance`, label: "Attendance analytics", icon: BarChart3, keys: ["reports", "lateness", "absence", "trend"], sub: "Charts and records" },
  { href: `${A}?family=scheduling`, label: "Scheduling analytics", icon: BarChart3, keys: ["reports", "coverage", "shifts"], sub: "Charts and records" },
  { href: `${A}?family=recruitment`, label: "Recruitment analytics", icon: BarChart3, keys: ["reports", "hiring", "candidates"], sub: "Charts and records" },
  { href: `${A}?family=compliance`, label: "Compliance analytics", icon: BarChart3, keys: ["reports", "documents", "expiring"], sub: "Charts and records" },
  { href: `${A}?family=payroll`, label: "Payroll analytics", icon: BarChart3, keys: ["reports", "pay periods"], sub: "Charts and records" },
  { href: "/client/settings", label: "Account / Settings", icon: Settings, keys: ["settings", "account", "profile", "preferences", "photo", "my details"] },
  { href: "/client/settings#s-profile", label: "Account & profile", icon: UserRound, keys: ["profile", "name", "phone", "job title"], sub: "Jump to this section" },
  { href: "/client/settings#s-security", label: "Security", icon: LockKeyhole, keys: ["password", "sign in", "two factor"], sub: "Jump to this section" },
  { href: "/client/settings#s-notif", label: "Notification settings", icon: Bell, keys: ["alerts", "email", "notifications"], sub: "Jump to this section" },
  { href: "/client/settings#s-workspace", label: "Workspace", icon: Store, keys: ["default outlet", "date range", "preferences"], sub: "Jump to this section" },
  { href: "/client/settings#s-appearance", label: "Appearance", icon: Eye, keys: ["dark mode", "light mode", "theme", "night", "display", "sounds"], sub: "Jump to this section" },
  { href: "/client/settings#s-access", label: "Access & organisation", icon: UsersRound, keys: ["organisation", "company", "users", "outlets"], sub: "Jump to this section" },
  { href: "/client/settings#s-privacy", label: "Privacy & agreements", icon: ShieldCheck, keys: ["terms", "privacy", "agreement", "policy", "data"], sub: "Jump to this section" },
];

const GROUPS: SearchGroupDef[] = [
  { key: "pages", label: "Pages", singular: "Page", icon: Layers, aliases: ["screens", "go to", "open", "menu"] },
  { key: "people", label: "My workforce", singular: "Staff member", icon: UsersRound, aliases: ["people", "staff", "team", "workforce"] },
  { key: "candidates", label: "Candidates", singular: "Candidate", icon: BriefcaseBusiness, aliases: ["people", "recruitment"] },
  { key: "requests", label: "Workforce requests", singular: "Request", icon: ClipboardList, aliases: ["requests", "request"] },
  { key: "shifts", label: "Schedules", singular: "Shift", icon: Calendar, aliases: ["shifts", "schedule", "roster"] },
  { key: "attendance", label: "Attendance", singular: "Attendance", icon: Clock3 },
  { key: "documents", label: "Documents and compliance", singular: "Document", icon: ShieldCheck, aliases: ["documents", "compliance", "docs"] },
  { key: "payroll", label: "Payroll", singular: "Payroll", icon: Wallet },
  { key: "outlets", label: "Outlets", singular: "Outlet", icon: Store, aliases: ["outlet"] },
  { key: "notifications", label: "Notifications", singular: "Notification", icon: Bell },
  { key: "help", label: "Help", singular: "Help", icon: CircleHelp, aliases: ["support", "faq"] },
];

/** Search groups that only exist for a later-stage screen; hidden with it while the pilot menu is on (lib/pilot/menu.ts). */
const GROUP_ROUTE: Record<string, string> = {
  candidates: "/client/recruitment",
  shifts: "/client/schedules",
  attendance: "/client/attendance",
  documents: "/client/compliance",
  payroll: "/client/payroll",
};

interface ClientActionContext {
  dark: boolean;
  soundsOn: boolean;
  signOut: () => void;
  /** Pilot menu on: later-stage screens are not searchable. Server-decided (lib/pilot/server.ts). */
  pilot?: boolean;
}

/** Quick actions: real buttons and pages the Client app already has, plus safe local switches. Nothing destructive. */
function clientActions(ctx: ClientActionContext): SearchAction[] {
  return [
    { id: "request-staff", title: "Request staff", category: "Requests", icon: Plus, href: NEW_REQUEST_HREF, keywords: ["new request", "hire", "need staff", "add", "more staff", "workforce"], quick: true },
    { id: "contact-beeliv", title: "Message Beeliv support", category: "Support", icon: MessageSquareText, href: "/client/support", keywords: ["help", "contact", "question", "email", "call"], quick: true },
    { id: "read-all", title: "Mark all notifications as read", category: "Notifications", icon: Check, keywords: ["read", "clear", "unread", "bell", "alerts"], quick: true, run: () => service.markAllNotificationsRead() },
    { id: "dark", title: ctx.dark ? "Switch to light mode" : "Switch to dark mode", category: "View", icon: ctx.dark ? Sun : Moon, keywords: ["dark", "light", "theme", "night", "appearance"], quick: true, run: () => setClientDark(!ctx.dark) },
    { id: "sounds", title: ctx.soundsOn ? "Turn sounds off" : "Turn sounds on", category: "View", icon: Bell, keywords: ["sound", "mute", "quiet", "audio", "chime"], run: () => setSoundPrefs({ on: !ctx.soundsOn }) },
    { id: "settings", title: "Open settings and profile", category: "Account", icon: Settings, href: "/client/settings", keywords: ["account", "profile", "password", "preferences", "photo"] },
    { id: "sign-out", title: "Sign out", category: "Account", icon: LogOut, keywords: ["log out", "logout", "leave", "exit"], run: ctx.signOut },
  ];
}

export function buildClientSearchProvider(scope: OutletScope | null, ctx: ClientActionContext): SearchProvider {
  return {
    appId: "client",
    label: "Search Client",
    placeholder: "Search staff, shifts, requests, candidates...",
    searchPath: "/client/search",
    hint: "Try: a staff name, a shift, a request or a document.",
    shortcuts: browseLinks(PAGES.filter((p) => !(ctx.pilot && isPilotHiddenRoute(p.href)))),
    actions: clientActions(ctx),
    groups: ctx.pilot ? GROUPS.filter((g) => !(GROUP_ROUTE[g.key] && isPilotHiddenRoute(GROUP_ROUTE[g.key]))) : GROUPS,
    load: async () => {
      if (scope === null) throw new Error("scope not ready");
      const today = todayISO();
      const session = await service.getSession().catch(() => null);
      const outletName = (id: string) => session?.outlets.find((o) => o.id === id)?.name;
      const tasks: Promise<SearchEntry[]>[] = [
        Promise.resolve(pageEntries(PAGES)),
        service.getWorkforce(scope).then((rows) =>
          rows.map((m) => ({ id: m.id, group: "people", title: m.name, subtitle: join(m.role, DEPARTMENT_LABEL[m.departmentId], outletName(m.outletId)), href: staffHref(m.id), icon: UsersRound, keys: [m.staffId], person: true })),
        ),
        service.getCandidates(scope).then((rows) =>
          rows.map((c) => ({ id: c.id, group: "candidates", title: c.name, subtitle: join(c.position, outletName(c.outletId)), href: `/client/recruitment/${c.id}`, icon: BriefcaseBusiness, keys: c.skills, status: c.feedback ? human(c.feedback) : "Awaiting feedback", person: true })),
        ),
        service.getWorkforceRequests(scope).then((rows) =>
          rows.map((r) => ({ id: r.id, group: "requests", title: `${r.role} (${r.count})`, subtitle: join(outletName(r.outletId), `Needed by ${dayMonth(r.resumptionDate)}`), href: requestHref(r.id), icon: ClipboardList, keys: [r.publicId, DEPARTMENT_LABEL[r.departmentId]], status: human(r.status) })),
        ),
        service.getSchedule(scope, { from: addDays(today, -7), to: addDays(today, 21) }).then((v) =>
          v.shifts.map((s) => ({
            id: s.id,
            group: "shifts",
            title: `${s.label} shift - ${s.outletName}`,
            subtitle: join(dayMonth(s.date), `${s.assigned} of ${s.required} on shift`),
            href: SCHEDULES_HREF,
            icon: Calendar,
            keys: s.staff.map((p) => p.name),
          })),
        ),
        service.getAttendanceRecords(scope, { from: addDays(today, -7), to: today }).then((rows) =>
          rows.map((a) => ({ id: a.id, group: "attendance", title: a.staffName, subtitle: join(dayMonth(a.date), a.role, outletName(a.outletId)), href: attendanceHref({ date: a.date }), icon: Clock3, keys: [a.staffId], status: human(a.status), person: true })),
        ),
        service.getDocuments(scope).then((rows) =>
          // Operational documents only (never identity or banking): document name, person, state.
          rows.map((d) => ({ id: d.id, group: "documents", title: `${d.document} - ${d.staffName}`, subtitle: d.expiresOn ? `Expires ${dayMonth(d.expiresOn)}` : undefined, href: complianceHref(), icon: ShieldCheck, status: human(d.state) })),
        ),
        // Pay periods and status only: no amounts exist in this app.
        service.getPayrollVisibility(scope).then((p) => [...p.upcoming, ...p.history].map((x) => ({ id: x.id, group: "payroll", title: `${x.label} - ${x.outletName}`, subtitle: `Pay date ${dayMonth(x.scheduledDate)}`, href: "/client/payroll", icon: Wallet, status: human(x.status) }))),
        Promise.resolve((session?.outlets ?? []).filter((o) => scope === "all" || o.id === scope).map((o) => ({ id: o.id, group: "outlets", title: o.name, subtitle: o.location, href: "/client/settings", icon: Store }))),
        service.getNotifications(scope).then((rows) => rows.map((n) => ({ id: n.id, group: "notifications", title: n.title, subtitle: n.message, href: n.href || CLIENT_NOTIFICATIONS_HREF, icon: Bell, status: n.read ? undefined : "Unread" }))),
        Promise.resolve(FAQ.map((f, i) => ({ id: `faq-${i}`, group: "help", title: f.q, subtitle: "Support", href: "/client/support", icon: CircleHelp }))),
      ];
      const settled = await Promise.allSettled(tasks);
      const ok = settled.filter((r): r is PromiseFulfilledResult<SearchEntry[]> => r.status === "fulfilled");
      if (ok.length === 0) throw new Error("search unavailable");
      return ok.flatMap((r) => r.value).filter((entry) => !(ctx.pilot && isPilotHiddenRoute(entry.href)));
    },
  };
}

export function useClientSearchProvider(signOut: () => void): SearchProvider {
  const scope = useOutletScope();
  const dark = useClientDark();
  const soundsOn = useSoundPrefs().on;
  const stableSignOut = useStableFn(signOut);
  const pilot = usePilotMenu();
  return useMemo(() => buildClientSearchProvider(scope, { dark, soundsOn, signOut: stableSignOut, pilot }), [scope, dark, soundsOn, stableSignOut, pilot]);
}
