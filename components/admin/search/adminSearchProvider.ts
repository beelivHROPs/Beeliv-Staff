"use client";

/**
 * Admin global search provider (PROTOTYPE, mock data).
 *
 * Everything searchable comes from the Admin slice services, which already filter by the
 * signed-in identity's client / outlet scope (lib/admin/scope.ts): an assigned HR officer
 * only finds items for assigned clients, HR Manager and Operations find everything. On top of
 * that each source is only included when the role may open that source's page
 * (canOpenRoute), so a result never leads to a "not available to your account" panel.
 *
 * Never searchable or shown: NIN, bank values, scores, internal notes, free-text reasons or
 * any other sensitive field. Subtitles use names, references, roles, clients, short labels,
 * statuses and dates only.
 *
 * Real version: a scoped server search (docs/contracts/frontend-backend-needs-2026-10-17.md, row 15).
 */
import { useMemo } from "react";
import { useStableFn } from "@/components/shared/search/useLatest";
import { Bell, LogOut, Moon, Paintbrush, Plus, Sun } from "@/components/applicant/icons";
import { setAdminDark, useAdminDark } from "@/lib/admin/theme";
import { setSoundPrefs, useSoundPrefs } from "@/lib/admin/sound";
import { NEW_VACANCY_HREF } from "@/lib/admin/links";
import { HR_NAV_ITEMS, OPS_NAV_ITEMS } from "@/components/admin/nav";
import { canSeeSettingsSection, roleCan } from "@/lib/admin/role-access";
import type { SearchAction } from "@/components/shared/search/types";
import { browseLinks, type PageDef } from "@/components/shared/search/pages";
import { BriefcaseBusiness, Calendar, CalendarCheck2, Clock3, FileCheck2, Files, Layers, Mail, MessageSquareText, ScrollText, Settings, ShieldCheck, Users, UsersRound } from "@/components/applicant/icons";
import { Activity, BarChart3, Building, Store } from "@/components/client/icons";
import { BookOpen, ClipboardList, Megaphone, ShieldAlert } from "@/components/staff/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import type { SearchEntry, SearchGroupDef, SearchProvider } from "@/components/shared/search/types";
import { dayLabel, timeOfDay } from "@/lib/admin/format";
import { applicantHref, inboxItemHref } from "@/lib/admin/links";
import { canOpenRoute, useAccessRole, type AdminAccessRole } from "@/lib/admin/role-access";
import { clientIdInScope } from "@/lib/admin/scope";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import * as applicants from "@/lib/admin/applicants/service";
import * as vacancies from "@/lib/admin/vacancies/service";
import * as interviews from "@/lib/admin/interviews/service";
import * as clients from "@/lib/admin/clients/service";
import * as staff from "@/lib/admin/staff/service";
import * as documentation from "@/lib/admin/documentation/service";
import * as workforce from "@/lib/admin/workforce/service";
import * as content from "@/lib/admin/sops-training/service";
import * as inbox from "@/lib/admin/inbox/service";
import * as requests from "@/lib/admin/client-requests/service";
import * as reports from "@/lib/admin/reports/service";
import * as ops from "@/lib/admin/ops/service";
import * as team from "@/lib/admin/team-access/service";
import * as offers from "@/lib/admin/offers/service";
import * as pool from "@/lib/admin/talent-pool/service";
import * as calendar from "@/lib/admin/calendar/service";
import * as announcements from "@/lib/admin/announcements/service";
import * as assessments from "@/lib/admin/assessments/service";
import * as tests from "@/lib/admin/tests/service";
import * as templates from "@/lib/admin/journey-templates/service";
import * as agreements from "@/lib/admin/agreements/service";
import * as lists from "@/lib/admin/lists/service";
import { docLabel, getLists } from "@/lib/admin/lists/store";
import * as activity from "@/lib/admin/ops/activity-service";
import { usePilotMenu } from "@/lib/pilot/context";
import { isPilotHiddenRoute } from "@/lib/pilot/menu";

const BIG = 1000;
const human = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");
const when = (iso: string | null) => (iso ? `${dayLabel(iso)}, ${timeOfDay(iso)}` : "Not scheduled yet");
const dateOnly = (iso: string) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "");
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shiftDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const mondayOf = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return isoDay(x);
};

/** Most relevant types first. */
export const ADMIN_SEARCH_GROUPS: SearchGroupDef[] = [
  { key: "pages", label: "Pages", singular: "Page", icon: Layers, aliases: ["screens", "go to", "open", "menu"] },
  { key: "applicants", label: "Applicants", singular: "Applicant", icon: Users, aliases: ["people", "candidates", "applicant"] },
  { key: "staff", label: "Staff", singular: "Staff member", icon: UsersRound, aliases: ["people", "employees", "workers"] },
  { key: "pool", label: "Talent pool", singular: "Talent pool", icon: Layers, aliases: ["people", "pool"] },
  { key: "vacancies", label: "Jobs", singular: "Job", icon: BriefcaseBusiness, aliases: ["vacancies", "vacancy", "roles", "positions"] },
  { key: "interviews", label: "Interviews", singular: "Interview", icon: CalendarCheck2 },
  { key: "assessments", label: "Assessments", singular: "Assessment", icon: ClipboardList },
  { key: "offers", label: "Offers", singular: "Offer", icon: FileCheck2 },
  { key: "documents", label: "Documents", singular: "Document", icon: Files, aliases: ["docs"] },
  { key: "clients", label: "Clients and outlets", singular: "Client", icon: Store, aliases: ["outlets", "client"] },
  { key: "requests", label: "Client requests", singular: "Request", icon: MessageSquareText },
  { key: "leave", label: "Leave", singular: "Leave", icon: Activity },
  { key: "attendance", label: "Attendance", singular: "Attendance", icon: Clock3 },
  { key: "shifts", label: "Shifts", singular: "Shift", icon: Calendar, aliases: ["roster", "scheduling", "schedule"] },
  { key: "warnings", label: "Warnings", singular: "Warning", icon: ShieldAlert },
  { key: "content", label: "SOPs and training", singular: "SOP or training", icon: BookOpen, aliases: ["sops", "training", "sop"] },
  { key: "forms", label: "Tests and forms", singular: "Form", icon: ClipboardList, aliases: ["tests", "forms", "appraisals"] },
  { key: "announcements", label: "Announcements", singular: "Announcement", icon: Megaphone },
  { key: "calendar", label: "Calendar", singular: "Event", icon: Calendar, aliases: ["events", "deadlines"] },
  { key: "inbox", label: "Inbox", singular: "Message", icon: Mail, aliases: ["messages", "cases"] },
  { key: "approvals", label: "Approvals", singular: "Approval", icon: ShieldCheck },
  { key: "reports", label: "Reports", singular: "Report", icon: BarChart3 },
  { key: "policies", label: "Agreements and policies", singular: "Policy", icon: ScrollText, aliases: ["agreements", "policy"] },
  { key: "templates", label: "Job templates", singular: "Template", icon: Layers, aliases: ["templates"] },
  { key: "lists", label: "Lists and rules", singular: "Setup", icon: Settings, aliases: ["setup", "departments", "rules"] },
  { key: "team", label: "Team and access", singular: "Account", icon: ShieldCheck, aliases: ["team", "access", "invitations", "users"] },
  { key: "activity", label: "Activity log", singular: "Activity", icon: Activity, aliases: ["activity", "audit"] },
];

/** Search groups that only exist for a later-stage screen; hidden with it while the pilot menu is on (lib/pilot/menu.ts). */
const GROUP_ROUTE: Record<string, string> = {
  leave: "/admin/workforce/leave",
  attendance: "/admin/workforce/attendance",
  shifts: "/admin/workforce/scheduling",
  warnings: "/admin/workforce/warnings",
  content: "/admin/sops-training",
  announcements: "/admin/announcements",
};

type Source = { route: string; run: () => Promise<SearchEntry[]> };

/** Extra words that find a page (synonyms people actually type). The page's own label always matches. */
const PAGE_KEYS: Record<string, string[]> = {
  "/admin": ["home", "dashboard", "overview", "start"],
  "/admin/reports": ["analytics", "insights", "stats", "statistics", "charts", "kpi", "numbers", "metrics", "dashboard"],
  "/admin/ops/reports": ["analytics", "insights", "stats", "statistics", "charts", "kpi", "metrics"],
  "/admin/calendar": ["schedule", "agenda", "diary", "events", "dates"],
  "/admin/inbox": ["messages", "requests", "cases", "mail"],
  "/admin/people": ["directory", "staff", "applicants", "everyone"],
  "/admin/jobs": ["vacancies", "roles", "positions", "openings", "hiring"],
  "/admin/clients": ["customers", "outlets", "companies"],
  "/admin/workforce/attendance": ["check in", "clock", "time", "lateness", "present"],
  "/admin/workforce/leave": ["time off", "holiday", "absence", "vacation"],
  "/admin/workforce/scheduling": ["roster", "rota", "shifts", "schedule"],
  "/admin/workforce/warnings": ["discipline", "queries", "misconduct"],
  "/admin/sops-training": ["procedures", "training", "courses", "learning", "sop"],
  "/admin/announcements": ["news", "notices", "updates"],
  "/admin/team-access": ["users", "roles", "permissions", "invitations", "accounts"],
  "/admin/lists": ["setup", "rules", "departments", "settings", "configuration"],
  "/admin/settings": ["account", "profile", "password", "preferences", "appearance", "dark mode", "security"],
  "/admin/notifications": ["alerts", "bell", "updates"],
  "/admin/ops/approvals": ["approve", "decisions", "sign off"],
  "/admin/ops/activity": ["audit", "log", "history", "who did what"],
  "/admin/ops/setup": ["agreements", "policies", "terms", "configuration"],
  "/admin/ops/staff": ["assignments", "placements", "deployment"],
  "/admin/ops/clients": ["outlets", "customers", "accounts"],
  "/admin/ops/assignments": ["hr officers", "clients and hr"],
};

/** Screens that are not on a menu but people look for them. [href, label, icon, extra keys] */
const EXTRA_PAGES: [string, string, LucideIcon, string[]][] = [
  ["/admin/notifications", "Notifications", Bell, []],
  ["/admin/settings", "Settings and profile", Settings, []],
  ["/admin/recruitment/applicants", "Applicants", Users, ["candidates", "pipeline", "recruitment"]],
  ["/admin/recruitment/vacancies", "Vacancies", BriefcaseBusiness, ["jobs", "openings"]],
  ["/admin/recruitment/interviews", "Interviews", CalendarCheck2, ["schedule interview", "meetings"]],
  ["/admin/recruitment/assessments", "Assessments", ClipboardList, ["tests results", "scores"]],
  ["/admin/recruitment/tests", "Tests and forms", ClipboardList, ["quiz", "forms", "appraisal"]],
  ["/admin/recruitment/offers", "Offers", FileCheck2, ["offer letters", "hire"]],
  ["/admin/recruitment/documentation", "Documentation review", Files, ["documents", "cv", "id", "check documents"]],
  ["/admin/recruitment/shortlisting", "Shortlisting", Layers, ["shortlist", "select candidates"]],
  ["/admin/recruitment/client-review", "Client review", Store, ["client feedback", "client decision"]],
  ["/admin/recruitment/talent-pool", "Talent pool", Layers, ["saved candidates", "pool"]],
  ["/admin/clients/requests", "Client requests", MessageSquareText, ["requests", "client needs"]],
  ["/admin/team-access/invitations", "Invitations", Mail, ["invite", "pending invites"]],
  ["/admin/policies", "Agreements and policies", ScrollText, ["terms", "privacy", "policy"]],
  ["/admin/lists/job-templates", "Job templates", Layers, ["template", "journey", "steps"]],
  ["/admin/staff/directory", "Staff directory", UsersRound, ["employees", "staff list"]],
  ["/admin/staff/assignments", "Staff assignments", BriefcaseBusiness, ["placements"]],
  ["/admin/staff/documents", "Staff documents", Files, ["contracts", "ids"]],
];

function sources(): Source[] {
  const e = (group: string, id: string, title: string, subtitle: string | undefined, href: string, icon: LucideIcon, opts: { keys?: (string | undefined | null)[]; status?: string; person?: boolean } = {}): SearchEntry => ({
    id,
    group,
    title,
    subtitle,
    href,
    icon,
    keys: opts.keys?.filter((k): k is string => !!k),
    status: opts.status,
    person: opts.person,
  });
  const today = new Date();

  return [
    {
      // Every screen in the app, so a name like "analytics" or "calendar" finds its page. Each is only listed when the role may open it (load() filters by canOpenRoute).
      route: "/admin",
      run: async () => {
        const seen = new Set<string>();
        const out: SearchEntry[] = [];
        const add = (href: string, label: string, icon: LucideIcon, keys: string[] = [], sub = "Open this page") => {
          if (seen.has(href)) return;
          seen.add(href);
          out.push({ id: `page-${href}`, group: "pages", title: label, subtitle: sub, href, icon, keys: [...keys, ...(PAGE_KEYS[href] ?? [])] });
        };
        for (const item of HR_NAV_ITEMS) add(item.href, item.label, item.icon);
        for (const item of OPS_NAV_ITEMS) add(item.href, item.label, item.icon, [], "Operations workspace");
        for (const [href, label, icon, keys] of EXTRA_PAGES) add(href, label, icon, keys);
        return out;
      },
    },
    {
      route: "/admin/recruitment/applicants",
      run: async () => {
        const page = await applicants.listApplicants({ search: "", tab: "all", stage: "", vacancyId: "", clientId: "", recruiterId: "", sort: "name", page: 1, pageSize: BIG });
        return page.rows
          .filter((r) => clientIdInScope(r.clientId))
          .map((r) => e("applicants", r.id, r.name, join(r.vacancy, r.client, APPLICATION_STAGES[r.stage]), applicantHref(r.id), Users, { keys: [r.reference, r.applicationRef, r.outlet], status: r.status === "active" ? undefined : human(r.status), person: true }));
      },
    },
    {
      route: "/admin/staff/directory",
      run: async () => {
        const page = await staff.listStaff({ search: "", clientId: "", outletId: "", department: "", role: "", status: "", sort: "name", page: 1, pageSize: BIG });
        return page.rows
          .filter((r) => clientIdInScope(r.clientId))
          .map((r) => e("staff", r.id, r.name, join(r.role, r.client, r.outlet), `/admin/staff/directory/${r.id}`, UsersRound, { keys: [r.reference, r.department], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/recruitment/talent-pool",
      run: async () => {
        const page = await pool.listPool({ search: "", tab: "all", skill: "", department: "", location: "", lastContact: "", sort: "name", page: 1, pageSize: BIG });
        return page.rows.map((r) => e("pool", r.id, r.name, join(r.department, r.location, r.appliedFor[0]), applicantHref(r.applicantId), Layers, { keys: [...r.skills, ...r.appliedFor], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/recruitment/vacancies",
      run: async () => {
        const page = await vacancies.listVacancies({ search: "", tab: "all", status: "", department: "", clientId: "", recruiterId: "", sort: "newest", page: 1, pageSize: BIG });
        return page.rows
          .filter((r) => clientIdInScope(r.client.id))
          .map((r) => e("vacancies", r.id, r.title, join(r.client.name, r.location, r.employmentType), `/admin/recruitment/vacancies/${r.id}`, BriefcaseBusiness, { keys: [r.reference, r.department, r.recruiter?.name, r.outlet?.name], status: human(r.status) }));
      },
    },
    {
      route: "/admin/recruitment/interviews",
      run: async () => {
        const page = await interviews.listInterviews({ search: "", tab: "all", stageId: "", vacancyId: "", interviewerId: "", range: null, sort: "soonest", page: 1, pageSize: BIG });
        return page.rows.map((r) => e("interviews", r.id, r.candidateName, join(r.stageName, r.vacancy, r.status === "cancelled" ? undefined : when(r.at)), `/admin/recruitment/interviews/${r.id}`, CalendarCheck2, { keys: [r.client, r.interviewer?.name], status: human(r.status) }));
      },
    },
    {
      route: "/admin/recruitment/assessments",
      run: async () => {
        const page = await assessments.listAssessments({ search: "", tab: "all", typeId: "", vacancyId: "", sort: "newest", page: 1, pageSize: BIG });
        // Candidate, type and status only: never a score or recommendation.
        return page.rows.map((r) => e("assessments", r.id, r.candidateName, join(r.typeName, r.vacancy), `/admin/recruitment/assessments/${r.id}`, ClipboardList, { status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/recruitment/offers",
      run: async () => {
        const page = await offers.listOffers({ search: "", tab: "all", clientId: "", vacancyId: "" });
        return page.rows.filter((r) => clientIdInScope(r.clientId)).map((r) => e("offers", r.id, r.applicant.name, join(r.role, r.client, r.outlet), `/admin/recruitment/offers/${r.id}`, FileCheck2, { keys: [r.reference, r.vacancy], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/recruitment/documentation",
      run: async () => {
        const tabs = ["needs-review", "missing", "resubmission", "verified"] as const;
        const pages = await Promise.all(tabs.map((tab) => documentation.listDocuments({ search: "", tab, docType: "", vacancy: "", reviewer: "", sort: "newest", page: 1, pageSize: BIG })));
        const seen = new Set<string>();
        const out: SearchEntry[] = [];
        for (const row of pages.flatMap((p) => p.rows)) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          // Document type and person only: never a document's contents.
          out.push(e("documents", row.id, `${row.docType} - ${row.owner.name}`, row.context, `/admin/recruitment/documentation/${row.id}`, Files, { keys: [row.reference], status: human(row.status) }));
        }
        return out;
      },
    },
    {
      route: "/admin/clients",
      run: async () => {
        const page = await clients.listClients({ search: "", status: "", sort: "name", limit: BIG });
        const out: SearchEntry[] = [];
        for (const c of page.rows) {
          out.push(e("clients", c.id, c.name, join("Client", `${c.outletsCount} outlet${c.outletsCount === 1 ? "" : "s"}`), `/admin/clients/${c.id}`, Store, { keys: [c.reference, ...c.hrNames], status: human(c.status) }));
          const detail = await clients.getClient(c.id);
          for (const o of detail?.outlets ?? []) out.push(e("clients", `${c.id}-${o.id}`, o.name, join("Outlet", c.name, o.city), `/admin/clients/${c.id}/outlets/${o.id}`, Building, { keys: [o.reference, o.address], status: human(o.status) }));
        }
        return out;
      },
    },
    {
      route: "/admin/clients/requests",
      run: async () => {
        const tabs = ["new", "in-progress", "fulfilled", "closed"] as const;
        const pages = await Promise.all(tabs.map((tab) => requests.listRequests({ search: "", tab, clientId: "", limit: BIG })));
        const seen = new Set<string>();
        const out: SearchEntry[] = [];
        for (const r of pages.flatMap((p) => p.rows)) {
          if (seen.has(r.id) || !clientIdInScope(r.clientId)) continue;
          seen.add(r.id);
          out.push(e("requests", r.id, `${r.role} for ${r.client}`, join(`${r.headcount} needed`, r.outlet), `/admin/clients/requests/${r.id}`, MessageSquareText, { keys: [r.reference, r.department], status: human(r.status) }));
        }
        return out;
      },
    },
    {
      route: "/admin/workforce/leave",
      run: async () => {
        const tabs = ["pending", "approved", "declined", "cancelled"] as const;
        const pages = await Promise.all(tabs.map((tab) => workforce.listLeave({ search: "", tab, clientId: "", outletId: "", type: "", pageSize: BIG })));
        // Type, dates and status only: never the reason.
        return pages
          .flatMap((p) => p.rows)
          .filter((r) => clientIdInScope(r.clientId))
          .map((r) => e("leave", r.id, `${r.staff.name} - ${r.type}`, join(`${dateOnly(r.startDate)} to ${dateOnly(r.endDate)}`, r.client), "/admin/workforce/leave", Activity, { keys: [r.outlet], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/workforce/attendance",
      run: async () => {
        const page = await workforce.listAttendance({ search: "", tab: "all", from: isoDay(shiftDays(-14)), to: isoDay(today), clientId: "", outletId: "", pageSize: BIG });
        return page.rows
          .filter((r) => clientIdInScope(r.clientId))
          .map((r) => e("attendance", r.id, r.staff.name, join(dateOnly(r.date), r.shiftLabel, r.outlet), `/admin/workforce/attendance/${r.id}`, Clock3, { keys: [r.role, r.client], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/workforce/scheduling",
      run: async () => {
        const monday = mondayOf(today);
        const first = await workforce.getSchedule({ outletId: "", weekStart: monday });
        const out: SearchEntry[] = [];
        for (const o of first.facets.outlets.filter((x) => clientIdInScope(x.clientId)).slice(0, 8)) {
          const page = await workforce.getSchedule({ outletId: o.id, weekStart: monday });
          for (const s of page.roster?.shifts ?? []) out.push(e("shifts", s.id, `${s.staff.name} - ${s.role}`, join(page.roster?.outlet, dateOnly(s.date), `${s.start} to ${s.end}`), "/admin/workforce/scheduling", Calendar, { keys: [s.section], status: s.state === "published" ? undefined : human(s.state), person: true }));
        }
        return out;
      },
    },
    {
      route: "/admin/workforce/warnings",
      run: async () => {
        const page = await workforce.listWarnings({ search: "", tab: "all", clientId: "", outletId: "", type: "", pageSize: BIG });
        return page.rows
          .filter((r) => clientIdInScope(r.clientId))
          .map((r) => e("warnings", r.id, `${r.staff.name} - ${r.type}`, join(r.client, dateOnly(r.effectiveDate)), `/admin/workforce/warnings/${r.id}`, ShieldAlert, { keys: [r.reference], status: human(r.status), person: true }));
      },
    },
    {
      route: "/admin/sops-training",
      run: async () => {
        const kinds = ["sop", "training"] as const;
        const pages = await Promise.all(kinds.map((kind) => content.listContent({ kind, search: "", status: "", category: "", limit: BIG })));
        return pages.flatMap((p) => p.rows).map((r) => e("content", r.id, r.title, join(r.kind === "sop" ? "SOP" : "Training", r.category, r.version), `/admin/sops-training/${r.id}`, BookOpen, { status: human(r.status) }));
      },
    },
    {
      route: "/admin/recruitment/tests",
      run: async () => {
        const page = await tests.listForms({ search: "", tab: "all", status: "", sort: "title", pageSize: BIG });
        return page.rows.map((r) => e("forms", r.id, r.title, join(r.kind === "appraisal" ? "Appraisal" : "Test", r.clientName, `${r.questionCount} questions`), `/admin/recruitment/tests/${r.id}`, ClipboardList, { status: human(r.status) }));
      },
    },
    {
      route: "/admin/announcements",
      run: async () => {
        const page = await announcements.listAnnouncements({ search: "", status: "", limit: BIG });
        return page.rows.map((r) => e("announcements", r.id, r.title, join(r.audienceLabel, r.publishAt ? dateOnly(r.publishAt) : undefined), `/admin/announcements/${r.id}`, Megaphone, { keys: [r.excerpt], status: human(r.status) }));
      },
    },
    {
      route: "/admin/calendar",
      run: async () => {
        const data = await calendar.getCalendar({ from: shiftDays(-30).toISOString(), to: shiftDays(60).toISOString() });
        // Interviews, leave and shifts already have their own types above; the calendar adds deadlines and the rest.
        const skip = new Set(["interview", "leave", "shift"]);
        const label = (id: string) => data.types.find((t) => t.id === id)?.label ?? "Event";
        return data.events
          .filter((ev) => !skip.has(ev.typeId) && (!ev.client || clientIdInScope(ev.client.id)))
          .map((ev) => e("calendar", ev.id, ev.title, join(label(ev.typeId), ev.allDay ? dateOnly(ev.start) : when(ev.start)), ev.href || "/admin/calendar", Calendar, { keys: [ev.subtitle, ...(ev.people ?? []).map((p) => p.name)], status: ev.status ?? undefined }));
      },
    },
    {
      route: "/admin/inbox",
      run: async () => {
        const list = await inbox.getList();
        return list.cases.map((c) => e("inbox", c.id, c.subject, join(c.sender.name, c.sender.organisation), inboxItemHref(c.id), Mail, { keys: [c.reference, c.category], status: human(c.status) }));
      },
    },
    {
      route: "/admin/ops/approvals",
      run: async () => {
        const tabs = ["waiting", "approved", "sent-back"] as const;
        const pages = await Promise.all(tabs.map((tab) => ops.listApprovals({ search: "", tab, kind: "", clientId: "" })));
        const seen = new Set<string>();
        const out: SearchEntry[] = [];
        for (const r of pages.flatMap((p) => p.rows)) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          out.push(e("approvals", r.id, r.applicant.name, join(r.kind === "offer" ? "Offer approval" : "Selection approval", r.vacancy), `/admin/ops/approvals/${r.id}`, ShieldCheck, { keys: [r.reference, r.client], status: human(r.status), person: true }));
        }
        return out;
      },
    },
    {
      route: "/admin/reports",
      run: async () => {
        const list = await reports.listReports();
        return list.filter((r) => r.availability === "available" && r.report).map((r) => e("reports", r.id, r.title, r.description, `/admin/reports/${r.report}`, BarChart3));
      },
    },
    {
      route: "/admin/policies",
      run: async () => {
        const list = await agreements.listPublishedAgreements();
        return list.filter((p) => p.summary.currentVersion).map((p) => e("policies", p.summary.id, p.summary.title, join(p.summary.currentVersion, p.summary.code), "/admin/policies", ScrollText, { keys: [p.summary.code] }));
      },
    },
    {
      route: "/admin/lists/job-templates",
      run: async () => {
        const list = await templates.listTemplates();
        // The template name only: the internal description is a note for Beeliv staff.
        return list.map((t) => e("templates", t.id, t.name, t.sample ? "Job template · Example" : "Job template", `/admin/lists/job-templates/${t.id}`, Layers, { status: t.archived ? "Archived" : undefined }));
      },
    },
    {
      route: "/admin/lists",
      run: async () => {
        await lists.loadLists();
        const d = getLists();
        const item = (kind: string, id: string, name: string) => e("lists", `${kind}-${id}`, name, kind, "/admin/lists", Settings);
        return [
          ...d.departments.filter((x) => x.active).map((x) => item("Department", x.id, x.name)),
          ...d.roles.filter((x) => x.active).map((x) => item("Role", x.id, x.name)),
          ...d.interviewStages.filter((x) => x.active).map((x) => item("Interview stage", x.id, x.name)),
          ...d.requiredDocuments.filter((x) => x.active).map((x) => item("Document type", x.id, docLabel(x.docTypeKey))),
          ...d.leaveTypes.filter((x) => x.active).map((x) => item("Leave type", x.id, x.name)),
          ...d.warningTypes.filter((x) => x.active).map((x) => item("Warning type", x.id, x.name)),
          ...d.scoringCriteria.filter((x) => x.active).map((x) => item("Scoring criterion", x.id, x.name)),
        ];
      },
    },
    {
      route: "/admin/team-access",
      run: async () => {
        const q = { search: "", status: "" as const, facet: "" };
        const [internal, clientUsers, invites] = await Promise.all([team.listInternal(q), team.listClientUsers(q), team.listInvitations({ search: "", status: "", kind: "" })]);
        return [
          ...[...internal.rows, ...clientUsers.rows].map((r) => e("team", r.id, r.name, join(r.roleLabel, r.scopeLabel), "/admin/team-access", ShieldCheck, { keys: [r.reference, r.email, r.jobTitle], status: human(r.status), person: true })),
          ...invites.rows.map((r) => e("team", `inv-${r.id}`, r.name, join("Invitation", r.roleLabel), "/admin/team-access/invitations", Mail, { keys: [r.reference, r.email], status: human(r.status), person: true })),
        ];
      },
    },
    {
      route: "/admin/ops/activity",
      run: async () => {
        const page = await activity.listActivity({ search: "", action: "", actorId: "", entityType: "", range: "30d" });
        // The record label and who did what: never a decision reason or note.
        return page.rows.map((r) => e("activity", r.id, r.entityLabel, join(r.actorName, human(r.action), dayLabel(r.at)), r.entityHref || "/admin/ops/activity", Activity, { keys: [r.reference] }));
      },
    },
  ];
}

interface AdminActionContext {
  dark: boolean;
  soundsOn: boolean;
  signOut: () => void;
  /** Pilot menu on: later-stage screens are not searchable and have no quick actions. Server-decided (lib/pilot/server.ts). */
  pilot?: boolean;
}

/**
 * Quick actions. Only shortcuts to flows that already exist as real buttons or pages, or a safe
 * local switch. Role-gated with the same helpers as the screens (roleCan, canOpenRoute): what a
 * role cannot do is not listed. Nothing destructive. The server still re-checks on execution.
 */
function adminActions(role: AdminAccessRole, ctx: AdminActionContext): SearchAction[] {
  const go = (id: string, title: string, category: string, icon: LucideIcon, href: string, keywords: string[], quick = false): SearchAction | null => (canOpenRoute(role, href.split(/[?#]/)[0]) && !(ctx.pilot && isPilotHiddenRoute(href)) ? { id, title, category, icon, href, keywords, quick } : null);
  const list: (SearchAction | null)[] = [
    go("schedule-interview", "Schedule an interview", "Recruitment", CalendarCheck2, "/admin/recruitment/interviews?schedule=1", ["book", "interview", "set up", "new", "add", "meeting"], true),
    roleCan(role, "vacancy.create") ? go("new-vacancy", "Create a new job", "Recruitment", Plus, NEW_VACANCY_HREF, ["vacancy", "new", "post", "add", "hire", "opening"], true) : null,
    roleCan(role, "invitations.manage") ? go("invite-staff", "Invite a staff member", "People", Plus, "/admin/staff/directory?invite=1", ["add", "new", "employee", "onboard", "invite"], true) : null,
    roleCan(role, "invitations.manage") ? go("invite-client", "Invite a client contact", "People", Plus, "/admin/clients?invite=1", ["add", "new", "client", "customer", "invite"], true) : null,
    go("open-scheduling", "Add or change a shift", "Workforce", Calendar, "/admin/workforce/scheduling", ["roster", "rota", "shift", "schedule", "add", "new"], true),
    roleCan(role, "journeyTemplates.manage") ? go("new-template", "Create a job template", "Recruitment", Plus, "/admin/lists/job-templates/new", ["new", "add", "template", "steps", "journey"]) : null,
    roleCan(role, "announcements.manage") ? go("new-announcement", "Write an announcement", "Content", Plus, "/admin/announcements/new", ["new", "add", "news", "notice", "post"]) : null,
    roleCan(role, "content.manage") ? go("new-sop", "Add an SOP or training", "Content", Plus, "/admin/sops-training/new", ["new", "add", "procedure", "course", "learning"]) : null,
    roleCan(role, "tests.manage") ? go("new-test", "Create a test or form", "Recruitment", Plus, "/admin/recruitment/tests/new", ["new", "add", "quiz", "appraisal", "assessment"]) : null,
    role === "operations" ? go("agreements", "Open agreements and policies", "Workspace", ScrollText, "/admin/ops/setup/agreements", ["terms", "privacy", "policy", "publish"]) : null,
    role === "operations" ? go("ops-home", "Switch to the Operations workspace", "Workspace", ShieldCheck, "/admin/ops", ["operations", "approvals", "switch"]) : null,
    role === "operations" ? go("hr-home", "Switch to the HR workspace", "Workspace", UsersRound, "/admin", ["hr", "recruitment", "switch"]) : null,
    canSeeSettingsSection(role, "s-branding") ? go("banner", "Change the banner picture", "Account", Paintbrush, "/admin/settings#s-branding", ["cover", "branding", "photo", "image", "add"]) : null,
    go("settings", "Open settings and profile", "Account", Settings, "/admin/settings", ["account", "profile", "password", "preferences", "photo"]),
    { id: "dark", title: ctx.dark ? "Switch to light mode" : "Switch to dark mode", category: "View", icon: ctx.dark ? Sun : Moon, keywords: ["dark", "light", "theme", "night", "appearance"], quick: true, run: () => setAdminDark(!ctx.dark) },
    { id: "sounds", title: ctx.soundsOn ? "Turn sounds off" : "Turn sounds on", category: "View", icon: Bell, keywords: ["sound", "mute", "quiet", "audio", "chime"], run: () => setSoundPrefs({ on: !ctx.soundsOn }) },
    { id: "sign-out", title: "Sign out", category: "Account", icon: LogOut, keywords: ["log out", "logout", "leave", "exit"], run: ctx.signOut },
  ];
  return list.filter((a): a is SearchAction => !!a);
}

/** "Browse pages" chips on the empty search: the most used screens this role may open (pilot menu respected). */
const POPULAR_PAGES = ["/admin", "/admin/jobs", "/admin/people", "/admin/clients", "/admin/inbox", "/admin/calendar", "/admin/reports", "/admin/ops/approvals", "/admin/notifications"];
function adminBrowse(role: AdminAccessRole, pilot?: boolean) {
  const items = [...HR_NAV_ITEMS, ...OPS_NAV_ITEMS];
  const defs: PageDef[] = [];
  for (const href of POPULAR_PAGES) {
    const item = items.find((i) => i.href === href);
    if (item && canOpenRoute(role, href) && !(pilot && isPilotHiddenRoute(href))) defs.push({ href, label: item.label, icon: item.icon, popular: true });
    else if (href === "/admin/notifications" && canOpenRoute(role, href)) defs.push({ href, label: "Notifications", icon: Bell, popular: true });
  }
  return browseLinks(defs);
}

export function buildAdminSearchProvider(role: AdminAccessRole, ctx: AdminActionContext): SearchProvider {
  return {
    appId: "admin",
    label: "Search Admin",
    placeholder: "Search people, jobs, clients...",
    searchPath: "/admin/search",
    hint: "Try: an applicant name, a job title, a document or a reference.",
    shortcuts: adminBrowse(role, ctx.pilot),
    actions: adminActions(role, ctx),
    groups: ctx.pilot ? ADMIN_SEARCH_GROUPS.filter((g) => !(GROUP_ROUTE[g.key] && isPilotHiddenRoute(GROUP_ROUTE[g.key]))) : ADMIN_SEARCH_GROUPS,
    load: async () => {
      const active = sources().filter((s) => canOpenRoute(role, s.route) && !(ctx.pilot && isPilotHiddenRoute(s.route)));
      const settled = await Promise.allSettled(active.map((s) => s.run()));
      const ok = settled.filter((r): r is PromiseFulfilledResult<SearchEntry[]> => r.status === "fulfilled");
      if (ok.length === 0 && settled.length > 0) throw new Error("search unavailable");
      // Also drop single results (calendar events, activity rows) whose own page is a later-stage screen.
      // Each page is also checked on its own: a role never sees a page it cannot open.
      return ok
        .flatMap((r) => r.value)
        .filter((entry) => !(ctx.pilot && isPilotHiddenRoute(entry.href)))
        .filter((entry) => entry.group !== "pages" || canOpenRoute(role, entry.href.split(/[?#]/)[0]));
    },
  };
}

export function useAdminSearchProvider(signOut: () => void): SearchProvider {
  const role = useAccessRole() ?? "hr_officer";
  const dark = useAdminDark();
  const soundsOn = useSoundPrefs().on;
  const stableSignOut = useStableFn(signOut);
  const pilot = usePilotMenu();
  return useMemo(() => buildAdminSearchProvider(role, { dark, soundsOn, signOut: stableSignOut, pilot }), [role, dark, soundsOn, stableSignOut, pilot]);
}
