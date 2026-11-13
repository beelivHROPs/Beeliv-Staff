"use client";

/**
 * Applicant global search provider (PROTOTYPE, mock data). Open jobs (title, company,
 * location), the signed-in person's own applications, interviews, tests and forms,
 * documents and notifications, and the help articles. Document names and states only,
 * never file contents or identity / bank values. Real version: a scoped server search
 * (docs/contracts/frontend-backend-needs-2026-10-17.md, row 15).
 */
import { createContext, useContext, useMemo } from "react";
import { useStableFn } from "@/components/shared/search/useLatest";
import { Check, LogOut, Settings, Upload, UserRound } from "@/components/applicant/icons";
import type { SearchAction } from "@/components/shared/search/types";
import { Bell, Bookmark, BriefcaseBusiness, CalendarCheck2, CircleHelp, Eye, Files, Layers, LayoutDashboard, LockKeyhole, MessageSquareText, Search, ShieldCheck, Users } from "@/components/applicant/icons";
import { ClipboardList } from "@/components/staff/icons";
import { browseLinks, pageEntries, type PageDef } from "@/components/shared/search/pages";
import { getSavedJobIds } from "@/lib/applicant/saved";
import type { SearchEntry, SearchGroupDef, SearchProvider } from "@/components/shared/search/types";
import { FAQS } from "@/components/applicant/HelpBody";
import { listPublishedFor } from "@/lib/forms/participant-store";
import { getApplicantJobs } from "@/lib/applicant/jobs";
import { getProfile, listApplications, listDocuments, listInterviews, listNotifications, markAllNotificationsRead } from "@/lib/applicant/service";

const human = (s: string) => {
  const t = s.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

/**
 * Every screen of the Applicant app: each menu item, the screens reached from one (saved jobs, job alerts,
 * tests, edit profile) and each settings section, with the words people type for them. "Staff Hub" is added
 * only for a person who has been granted staff access (see load()), so a result never leads to a page they cannot open.
 */
const PAGES: PageDef[] = [
  { href: "/applicant", label: "Overview", icon: LayoutDashboard, keys: ["home", "dashboard", "start", "summary"], popular: true },
  { href: "/applicant/jobs", label: "Find Jobs", icon: Search, keys: ["jobs", "vacancies", "roles", "positions", "browse", "work", "openings"], popular: true },
  { href: "/applicant/applications", label: "My Applications", icon: BriefcaseBusiness, keys: ["applications", "applied", "status", "track", "offers"], popular: true },
  { href: "/applicant/interviews", label: "Interviews & Assessments", icon: CalendarCheck2, keys: ["interviews", "assessments", "meetings", "schedule", "calendar"], popular: true },
  { href: "/applicant/documents", label: "Documents", icon: Files, keys: ["docs", "cv", "resume", "certificates", "upload", "files"], popular: true },
  { href: "/applicant/profile", label: "Profile", icon: UserRound, keys: ["my details", "skills", "experience", "photo", "cv"], popular: true },
  { href: "/applicant/notifications", label: "Notifications", icon: Bell, keys: ["alerts", "bell", "updates", "unread"], popular: true },
  { href: "/applicant/jobs?saved=1", label: "Saved jobs", icon: Bookmark, keys: ["saved", "bookmarks", "favourites", "shortlist", "jobs"], sub: "Find Jobs" },
  { href: "/applicant/jobs", label: "Job alerts", icon: Bell, keys: ["alert", "new jobs", "email alerts", "notify me"], sub: "Find Jobs" },
  { href: "/applicant/tests", label: "Tests and forms", icon: ClipboardList, keys: ["tests", "forms", "assessments", "quiz", "appraisal"] },
  { href: "/applicant/profile/edit", label: "Edit profile", icon: UserRound, keys: ["update", "details", "skills", "experience", "photo", "change", "profile"], sub: "Profile" },
  { href: "/applicant/settings", label: "Settings", icon: Settings, keys: ["account", "preferences", "password", "privacy"] },
  { href: "/applicant/settings#s-acct", label: "Account & security", icon: LockKeyhole, keys: ["password", "sign in", "two factor", "security", "email"], sub: "Jump to this section" },
  { href: "/applicant/settings#s-notif", label: "Notification settings", icon: Bell, keys: ["alerts", "email", "notifications"], sub: "Jump to this section" },
  { href: "/applicant/settings#s-privacy", label: "Privacy & consent", icon: ShieldCheck, keys: ["privacy", "consent", "data", "visibility"], sub: "Jump to this section" },
  { href: "/applicant/settings#s-comms", label: "Communication", icon: MessageSquareText, keys: ["contact", "marketing", "emails", "messages"], sub: "Jump to this section" },
  { href: "/applicant/settings#s-access", label: "Accessibility & display", icon: Eye, keys: ["large text", "motion", "display", "appearance", "dark mode"], sub: "Jump to this section" },
  { href: "/applicant/settings#s-manage", label: "Account management", icon: UserRound, keys: ["delete account", "close account", "download my data"], sub: "Jump to this section" },
  { href: "/applicant/help", label: "Help & support", icon: CircleHelp, keys: ["help", "support", "faq", "contact", "question"] },
];
const STAFF_PAGE: PageDef = { href: "/applicant/staff-access", label: "Staff Hub", icon: BriefcaseBusiness, keys: ["staff access", "staff", "hub", "employee", "set up staff"], sub: "Staff access" };

const GROUPS: SearchGroupDef[] = [
  { key: "pages", label: "Pages", singular: "Page", icon: Layers, aliases: ["screens", "go to", "open", "menu"] },
  { key: "jobs", label: "Jobs", singular: "Job", icon: BriefcaseBusiness, aliases: ["vacancies", "roles", "positions"] },
  { key: "applications", label: "My applications", singular: "Application", icon: Users, aliases: ["applications", "applied"] },
  { key: "interviews", label: "Interviews", singular: "Interview", icon: CalendarCheck2 },
  { key: "tests", label: "Tests and forms", singular: "Test", icon: ClipboardList, aliases: ["tests", "forms", "assessments"] },
  { key: "documents", label: "My documents", singular: "Document", icon: Files, aliases: ["documents", "docs"] },
  { key: "notifications", label: "Notifications", singular: "Notification", icon: Bell },
  { key: "help", label: "Help", singular: "Help", icon: CircleHelp, aliases: ["support", "faq"] },
];

/** Quick actions: pages and buttons the Applicant app already has. Nothing destructive. */
function applicantActions(logout: () => void): SearchAction[] {
  return [
    { id: "search-jobs", title: "Search jobs", category: "Jobs", icon: Search, href: "/applicant/jobs", keywords: ["find", "vacancies", "apply", "work", "browse", "roles"], quick: true },
    { id: "upload-document", title: "Upload a document", category: "Documents", icon: Upload, href: "/applicant/documents", keywords: ["cv", "resume", "file", "certificate", "id", "add", "send"], quick: true },
    { id: "edit-profile", title: "Edit my profile", category: "Account", icon: UserRound, href: "/applicant/profile/edit", keywords: ["update", "details", "skills", "experience", "photo", "change"], quick: true },
    { id: "read-all", title: "Mark all notifications as read", category: "Notifications", icon: Check, keywords: ["read", "clear", "unread", "bell", "alerts"], quick: true, run: () => markAllNotificationsRead() },
    { id: "settings", title: "Open settings", category: "Account", icon: Settings, href: "/applicant/settings", keywords: ["account", "notifications", "password", "preferences", "alerts"] },
    { id: "sign-out", title: "Log out", category: "Account", icon: LogOut, keywords: ["sign out", "signout", "logout", "leave", "exit"], run: logout },
  ];
}

export const LiveVacanciesContext=createContext(false);
export const buildApplicantSearchProvider = (logout: () => void,live=false): SearchProvider => live?{
  appId:'applicant',label:'Search vacancies',placeholder:'Search jobs...',searchPath:'/applicant/jobs',hint:'Search current vacancies by title or location.',shortcuts:[],
  groups:GROUPS.filter(group=>group.key==='jobs'||group.key==='pages'),actions:applicantActions(logout).filter(action=>action.id==='search-jobs'),
  fallback:q=>({title:`Search jobs for "${q}"`,href:`/applicant/jobs?q=${encodeURIComponent(q)}`,icon:Search}),load:async()=>pageEntries(PAGES),
}:({
  appId: "applicant",
  label: "Search jobs and your account",
  placeholder: "Search jobs, applications, documents...",
  searchPath: "/applicant/search",
  hint: "Try: a job title, a company, a place or one of your documents.",
  shortcuts: browseLinks(PAGES),
  actions: applicantActions(logout),
  groups: GROUPS,
  // Keeps the box's earlier behaviour: Enter on a typed query can still run the job search.
  fallback: (q) => ({ title: `Search all jobs for "${q}"`, href: `/applicant/jobs?q=${encodeURIComponent(q)}`, icon: Search }),
  load: async () => {
    const tasks: Promise<SearchEntry[]>[] = [
      // Pages first; the Staff Hub page only for a person whose staff access has been granted.
      getProfile().then((p) => pageEntries(p.staffEntitlement.granted ? [...PAGES, STAFF_PAGE] : PAGES), () => pageEntries(PAGES)),
      getApplicantJobs().then((jobs) => {
        const savedIds = getSavedJobIds();
        return jobs.map((j) => ({ id: j.id, group: "jobs", title: j.role, subtitle: join(j.company, j.location, j.employmentType), href: `/applicant/jobs/${j.id}`, icon: BriefcaseBusiness, keys: [j.department, savedIds.includes(j.id) ? "saved" : undefined].filter((k): k is string => !!k), status: j.closed ? "Closed" : savedIds.includes(j.id) ? "Saved" : undefined }));
      }),
      listApplications().then((rows) => rows.map((a) => ({ id: a.id, group: "applications", title: a.role, subtitle: join(a.company, a.location), href: `/applicant/applications/${a.id}`, icon: Users, status: a.lifecycle === "draft" ? "Draft" : human(a.lifecycle) }))),
      listInterviews().then((rows) => rows.map((i) => ({ id: i.id, group: "interviews", title: i.title, subtitle: i.applicationLabel, href: "/applicant/interviews", icon: CalendarCheck2, status: human(i.status) }))),
      Promise.resolve(listPublishedFor("applicants")).then((forms) => forms.map((f) => ({ id: f.id, group: "tests", title: f.title, subtitle: join(f.kind === "appraisal" ? "Appraisal" : "Test", f.clientName), href: `/applicant/tests/${f.id}`, icon: ClipboardList }))),
      listDocuments().then((rows) => rows.map((d) => ({ id: d.id, group: "documents", title: d.name, subtitle: d.category === "pre-employment" ? "Pre-employment" : "Application", href: "/applicant/documents", icon: Files, status: human(d.status) }))),
      listNotifications().then((rows) => rows.map((n) => ({ id: n.id, group: "notifications", title: n.title, subtitle: n.detail, href: n.link?.href ?? "/applicant/notifications", icon: Bell, status: n.unread ? "Unread" : undefined }))),
      Promise.resolve(FAQS.map((f, i) => ({ id: `faq-${i}`, group: "help", title: f.q, subtitle: "Help and support", href: "/applicant/help", icon: CircleHelp, keys: f.keywords.split(" ") }))),
    ];
    const settled = await Promise.allSettled(tasks);
    const ok = settled.filter((r): r is PromiseFulfilledResult<SearchEntry[]> => r.status === "fulfilled");
    if (ok.length === 0) throw new Error("search unavailable");
    return ok.flatMap((r) => r.value);
  },
});

export function useApplicantSearchProvider(logout: () => void): SearchProvider {
  const stableLogout = useStableFn(logout);
  const live=useContext(LiveVacanciesContext);
  return useMemo(() => buildApplicantSearchProvider(stableLogout,live), [stableLogout,live]);
}
