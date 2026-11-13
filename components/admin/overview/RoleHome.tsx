"use client";

/**
 * Admin Home, PHONE layout only (<768px), one layout for every role. Matches
 * docs/design-references/admin-midground-2026-10-26.html (first phone):
 *   calendar button, hero number, two colour-blocked cards, two small cards (thin plum bar),
 *   optional documents row, "Up next" list (coloured initial circles, status pills), ONE primary action.
 * Which facts show is decided per role by home-recipes.ts; this file only builds the facts from the
 * mock hooks the desktop Home already uses and draws them. A fact with no data (or whose screen the
 * pilot menu hides) is dropped, never faked. No charts or trend lines on Home.
 */
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthLive } from "@/lib/ui/auth-live";
import { Calendar, ChevronRight, UserRound } from "@/components/applicant/icons";
import { applicantHref, METRIC_HREF, OPEN_JOBS_HREF, PEOPLE_APPLICANTS } from "@/lib/admin/links";
import { timeOfDay } from "@/lib/admin/format";
import type { HrOverview } from "@/lib/admin/types";
import { useAssessments } from "@/lib/admin/assessments/hooks";
import { useShortlisting } from "@/lib/admin/shortlisting/hooks";
import { useVacancies } from "@/lib/admin/vacancies/hooks";
import { useOffers } from "@/lib/admin/offers/hooks";
import { useLeave, useAttendance } from "@/lib/admin/workforce/hooks";
import { useClientRequests } from "@/lib/admin/client-requests/hooks";
import { useApprovals, useOpsCompany, useOpsSummary } from "@/lib/admin/ops/hooks";
import { useAdminIdentity } from "@/lib/admin/ops/identity";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { usePilotHidden } from "@/lib/pilot/context";
import { HOME_RECIPES, homeRoleFor, PRIMARY_LABEL, type HomeRecipe, type HomeRole, type UpNextKind } from "./home-recipes";
import type { Need } from "./NeedsToday";
import "./calm.css";

const CARD = "overflow-hidden rounded-[24px] bg-(--ap-surface) shadow-[0_8px_24px_rgba(60,30,80,.07)]";
const H2 = "text-[17px] leading-tight font-bold text-(--ap-ink)";
const ROW_LINE = "border-t border-[#efeaf3] first:border-t-0";
const LINK_SM = "-my-3 -mr-2 inline-flex min-h-11 items-center px-2 text-[13px] font-bold text-[#8b2252]";
const PLUM = "#8b2252";

export interface Fact {
  key: string;
  label: string;
  value: number;
  note: string;
  href: string;
  /** Hero only: week-on-week line. */
  trend?: { text: string; up: boolean } | null;
  /** Hero only: history per range (running totals, oldest first). Drives the 1W/1M/1Y control, the line and the % line. */
  series?: Record<"1W" | "1M" | "1Y", number[]>;
  /** Small cards: share of `whole` shown as % and a thin bar. */
  part?: number;
  whole?: number;
}

interface UpRow {
  id: string;
  href: string;
  name: string;
  line: string;
  time?: string;
  pill: string;
  tone: "ok" | "wait" | "bad";
}

type Facts = Record<string, Fact | null>;
type Rows = Partial<Record<UpNextKind, UpRow[]>>;
interface Model {
  facts: Facts;
  rows: Rows;
  ready: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/* Models (facts from the mock hooks)                                  */
/* ------------------------------------------------------------------ */

function useHrModel({ ov, needs }: { ov: HrOverview; needs: Need[] }): Model {
  const need = (k: string) => needs.find((n) => n.key === k) ?? null;
  const assess = useAssessments({ search: "", tab: "all", typeId: "", vacancyId: "", sort: "newest", page: 1, pageSize: 1 }).data;
  const screen = useShortlisting({ search: "", tab: "to-screen", vacancyId: "", experience: "", location: "", skill: "", documents: "", sort: "newest", page: 1, pageSize: 3 }).data;
  const pending = useVacancies({ search: "", tab: "pending", status: "", department: "", clientId: "", recruiterId: "", sort: "newest", page: 1, pageSize: 3 }).data;
  const offers = useOffers({ search: "", tab: "all", clientId: "", vacancyId: "" }).data;
  const leave = useLeave({ search: "", tab: "pending", clientId: "", outletId: "", type: "", pageSize: 3 }).data;

  const total = ov.metrics.applications;
  const delta = ov.trends.applications?.delta ?? 0;
  const before = total - delta;
  const pct = delta !== 0 && before > 0 ? Math.round((delta / before) * 100) : null;
  const jobsAll = Math.max(ov.vacancies.length, ov.metrics.openVacancies);
  const nextAt = ov.interviewsToday[0]?.at;
  const needsTotal = needs.reduce((n, x) => n + x.count, 0);
  const toPublish = pending?.tabCounts.pending ?? 0;
  const leaveCount = leave?.tabCounts.pending ?? 0;
  const placedWeek = ov.trends.approvedPlaced?.delta ?? 0;
  const urgent = ov.attention.filter((a) => a.tone === "urgent");
  const assessPending = assess ? assess.tabCounts.scheduled + assess.tabCounts["awaiting-result"] : null;
  const withOps = offers?.tabCounts["pending-approval"] ?? 0;
  const firstScreen = screen?.rows[0] ?? null;
  const factFromNeed = (k: string, label: string, note: string): Fact | null => {
    const n = need(k);
    return n ? { key: k, label, value: n.count, note, href: n.href } : null;
  };

  const facts: Facts = {
    applicants: { key: "applicants", label: "Applicants", value: total, note: "", href: PEOPLE_APPLICANTS, series: ov.trends.applications?.series, trend: delta !== 0 ? { up: delta > 0, text: `${pct !== null ? `${delta > 0 ? "+" : ""}${pct}%` : `${delta > 0 ? "+" : ""}${delta}`} from last week` } : null },
    needs: { key: "needs", label: "Needs you today", value: needsTotal, note: needs.length ? needs.slice(0, 2).map((n) => n.label.toLowerCase()).join(", ") : "Nothing is waiting", href: needs[0]?.href ?? PEOPLE_APPLICANTS },
    decisions: toPublish + leaveCount > 0 ? { key: "decisions", label: "Waiting for your decision", value: toPublish + leaveCount, note: [toPublish ? plural(toPublish, "job") + " to publish" : "", leaveCount ? plural(leaveCount, "leave request") : ""].filter(Boolean).join(", "), href: toPublish ? "/admin/jobs?tab=pending" : "/admin/workforce/leave?tab=pending" } : null,
    interviews: { key: "interviews", label: "Interviews today", value: ov.interviewsToday.length, note: nextAt ? `Next at ${timeOfDay(nextAt)}` : "Open calendar", href: "/admin/calendar" },
    shortlisted: { key: "shortlisted", label: "Shortlisted", value: ov.metrics.shortlisted, note: "Ready for interview", href: METRIC_HREF.shortlisted },
    offers: factFromNeed("offers", "Offers waiting", "Drafts and approvals"),
    offersWithOps: { key: "offersWithOps", label: "Offers with Operations", value: withOps, note: "Waiting for approval", href: "/admin/recruitment/offers?tab=pending-approval" },
    jobsToPublish: { key: "jobsToPublish", label: "Jobs to publish", value: toPublish, note: "Sent by HR", href: "/admin/jobs?tab=pending" },
    leave: { key: "leave", label: "Leave requests", value: leaveCount, note: "Waiting", href: "/admin/workforce/leave?tab=pending", part: leaveCount, whole: leave ? leave.tabCounts.pending + leave.tabCounts.approved + leave.tabCounts.declined + leave.tabCounts.cancelled : 0 },
    openJobs: { key: "openJobs", label: "Open jobs", value: ov.metrics.openVacancies, note: `of ${jobsAll} jobs`, href: OPEN_JOBS_HREF, part: ov.metrics.openVacancies, whole: jobsAll },
    assessments: assessPending === null ? null : { key: "assessments", label: "Assessments", value: assessPending, note: "Pending", href: "/admin/recruitment/assessments", part: assessPending, whole: assess?.tabCounts.all },
    placedWeek: placedWeek > 0 ? { key: "placedWeek", label: "Placed this week", value: placedWeek, note: "Approved hires", href: METRIC_HREF.approvedPlaced } : null,
    attention: urgent.length ? { key: "attention", label: "Needs attention", value: urgent.length, note: "Urgent items", href: urgent[0].href } : null,
    docs: factFromNeed("docs", "Documents to check", ""),
    apps: factFromNeed("apps", "Applications to review", ""),
    nextApplicant: firstScreen ? { key: "nextApplicant", label: "Next applicant", value: 1, note: firstScreen.name, href: applicantHref(firstScreen.id) } : null,
  };

  const docsNeed = need("docs");
  const rows: Rows = {
    docs: docsNeed ? [{ id: "d-docs", href: docsNeed.href, name: "Documents to check", line: `${plural(docsNeed.count, "document")} waiting for review`, pill: "Review", tone: "wait" as const }] : [],
    interviews: ov.upcomingInterviews.slice(0, 3).map((i) => ({ id: `i-${i.id}`, href: applicantHref(i.applicantId), name: i.applicantName, line: `Interview · ${i.vacancy}`, time: timeOfDay(i.at), pill: "Pending", tone: "wait" as const })),
    toScreen: (screen?.rows ?? []).map((r) => ({ id: `s-${r.id}`, href: applicantHref(r.id), name: r.name, line: `Applied · ${r.vacancy}`, pill: "To screen", tone: "wait" as const })),
    jobsToPublish: (pending?.rows ?? []).map((v) => ({ id: `v-${v.id}`, href: `/admin/recruitment/vacancies/${v.id}`, name: v.title, line: `Job · ${v.client.name}`, pill: "To publish", tone: "wait" as const })),
    leave: (leave?.rows ?? []).map((l) => ({ id: `l-${l.id}`, href: "/admin/workforce/leave?tab=pending", name: l.staff.name, line: `${l.type} · ${plural(l.days, "day")}`, pill: "Waiting", tone: "wait" as const })),
  };
  return { facts, rows, ready: true };
}

function useOpsModel(): Model {
  const summary = useOpsSummary().data;
  const company = useOpsCompany().data;
  const waiting = useApprovals({ search: "", tab: "waiting", kind: "", clientId: "" }).data;
  const requests = useClientRequests({ search: "", tab: "new", clientId: "", limit: 3 }).data;
  const iso = todayIso();
  const att = useAttendance({ search: "", tab: "all", from: iso, to: iso, clientId: "", outletId: "", pageSize: 1 }).data;

  const ready = !!summary && !!company;
  const approvals = summary ? summary.waitingSelections + summary.waitingOffers : 0;
  const reqCount = requests?.tabCounts.new ?? 0;
  const facts: Facts = ready
    ? {
        staffOnShift: att && att.today.scheduled > 0 ? { key: "staffOnShift", label: "Staff on shift today", value: att.today.checkedIn, note: `of ${att.today.scheduled} scheduled`, href: "/admin/workforce/attendance" } : null,
        deployedStaff: { key: "deployedStaff", label: "Deployed staff", value: company.deployedStaff, note: `across ${plural(company.activeOutlets, "outlet")}`, href: "/admin/ops/staff" },
        requests: { key: "requests", label: "Client requests", value: reqCount, note: "New, waiting for a reply", href: "/admin/clients/requests?tab=new" },
        approvals: { key: "approvals", label: "Approvals waiting", value: approvals, note: `${summary.waitingSelections} selections, ${summary.waitingOffers} offers`, href: "/admin/ops/approvals" },
        clientsNoHr: { key: "clientsNoHr", label: "Clients without HR", value: company.clientsWithoutHr, note: "Need an officer", href: "/admin/ops/assignments?show=unassigned" },
        attExceptions: { key: "attExceptions", label: "Attendance exceptions", value: company.workforce.attendanceExceptions, note: "Today", href: "/admin/workforce/attendance?show=exceptions" },
        unassignedStaff: { key: "unassignedStaff", label: "Staff not assigned", value: company.workforce.unassignedStaff, note: "To an outlet", href: "/admin/ops/staff?show=unassigned" },
      }
    : {};
  const rows: Rows = {
    approvals: (waiting?.rows ?? []).slice(0, 3).map((r) => {
      const d = ageDays(r.submittedAt);
      return { id: `a-${r.id}`, href: `/admin/ops/approvals/${r.id}`, name: r.applicant.name, line: `${r.kind === "offer" ? "Offer" : "Selection"} · ${r.vacancy}`, time: d < 1 ? "Today" : `${d}d`, pill: d >= 5 ? "Overdue" : "Waiting", tone: d >= 5 ? ("bad" as const) : ("wait" as const) };
    }),
    requests: (requests?.rows ?? []).map((q) => ({ id: `q-${q.id}`, href: `/admin/clients/requests/${q.id}`, name: q.client, line: `${q.role} · ${q.headcount} needed`, pill: "New", tone: "wait" as const })),
  };
  return { facts, rows, ready };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const FACE_COLOURS = ["#c0678d", "#8a7ab5", "#5fa58a", "#d08a5b", "#6f8fc0"];
function Face({ name }: { name: string }) {
  const words = name.split(/\s+/).filter(Boolean);
  const text = ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (
    <span aria-hidden="true" className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: FACE_COLOURS[h % FACE_COLOURS.length] }}>
      {text}
    </span>
  );
}

const PILL: Record<UpRow["tone"], string> = { ok: "bg-[#e3f6ea] text-[#17803d]", wait: "bg-[#fdf0d8] text-[#9a5a06]", bad: "bg-[#fde8ea] text-[#b4232c]" };

/** Colour-blocked card. Dark text on a mid-tone gradient reads in light and dark mode. */
function BlockCard({ f, rose }: { f: Fact; rose: boolean }) {
  const bg = rose ? "linear-gradient(135deg, #f0a9c9, #c24a86)" : "linear-gradient(135deg, #cdbff7, #9886ea)";
  const shadow = rose ? "0 12px 24px rgba(194,74,134,.3)" : "0 12px 24px rgba(152,134,234,.3)";
  return (
    <Link href={f.href} aria-label={`${f.value} ${f.label}. ${f.note}`} className="block min-w-0 active:opacity-90">
      <div style={{ background: bg, color: rose ? "#3a0f26" : "#251552", boxShadow: shadow }} className="flex h-full min-h-[116px] flex-col rounded-[24px] px-4 py-3.5">
        <p className="flex items-center justify-between gap-1 text-[13.5px] font-bold">
          <span className="min-w-0 leading-[1.2] [overflow-wrap:anywhere]">{f.label}</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </p>
        <b className="mt-auto pt-3 text-[36px] leading-none font-extrabold tabular-nums">{f.value}</b>
        <span className="mt-1.5 block text-[12.5px] leading-[1.25] font-bold opacity-85 [overflow-wrap:anywhere]">{f.note}</span>
      </div>
    </Link>
  );
}

/** Small white card: label, muted line, big number, optional percentage and thin plum bar (real counts only). */
function MiniStat({ f }: { f: Fact }) {
  const pct = f.whole && f.whole > 0 ? Math.min(100, Math.round(((f.part ?? 0) / f.whole) * 100)) : null;
  return (
    <Link href={f.href} aria-label={`${f.value} ${f.label}. ${f.note}`} className="block min-w-0 active:opacity-90">
      <div className={`${CARD} h-full p-4`}>
        <p className="text-[13.5px] leading-[1.25] font-bold text-(--ap-ink) [overflow-wrap:anywhere]">{f.label}</p>
        <p className="mt-0.5 text-[12px] leading-[1.25] text-[#7b7487] [overflow-wrap:anywhere]">{f.note}</p>
        <p className="mt-3 flex items-end justify-between gap-2">
          <b className="text-[28px] leading-none font-extrabold text-(--ap-ink) tabular-nums">{f.value}</b>
          {pct !== null ? (
            <span className="text-[12px] font-extrabold tabular-nums" style={{ color: PLUM }}>
              {pct}%
            </span>
          ) : null}
        </p>
        {pct !== null ? (
          <span aria-hidden="true" className="mt-2.5 block h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-[#f0e3ea]">
            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8b2252, #c24a86)" }} />
          </span>
        ) : null}
      </div>
    </Link>
  );
}

const RANGES = ["1W", "1M", "1Y"] as const;
const RANGE_WORD = { "1W": "week", "1M": "month", "1Y": "year" } as const;

/** Thin 1.5px line with a soft plum fill fading out. No axes, grid, legend or labels (spec: about 150x56). */
function Spark({ points }: { points: number[] }) {
  const W = 150;
  const H = 56;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [2 + (i * (W - 4)) / (points.length - 1), 4 + (H - 12) * (1 - (v - min) / span)] as const);
  let d = `M${xy[0][0]} ${xy[0][1]}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    const mx = (x0 + x1) / 2;
    d += `C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  const last = xy[xy.length - 1];
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" style={{ color: PLUM }}>
      <defs>
        <linearGradient id="rh-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PLUM} stopOpacity=".2" />
          <stop offset="1" stopColor={PLUM} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${last[0]} ${H}L${xy[0][0]} ${H}Z`} fill="url(#rh-spark)" stroke="none" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Deterministic mock history ending at `value` (same input, same line). Prototype only. */
function mockSeries(key: string, value: number, range: (typeof RANGES)[number]): number[] {
  const n = range === "1W" ? 7 : range === "1M" ? 10 : 12;
  let seed = 0;
  for (const ch of `${key}${range}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const wobble = ((seed >>> 8) % 100) / 100 - 0.5;
    const base = Math.max(1, value) * (0.55 + 0.45 * (i / (n - 1)));
    out.push(Math.max(0, base + wobble * Math.max(1, value) * 0.25));
  }
  out[n - 1] = Math.max(0, value);
  return out;
}

/** First card: icon tile + label, optional 1W/1M/1Y control, big number with the % line, optional line. Chart and control only when a real (mock) series exists. */
function Hero({ f }: { f: Fact }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1W");
  // Prototype data: roles whose lead number has no history yet get a small, clearly-mock line so the Home looks the same for every role (the % line is only shown for real series).
  const pts = f.series?.[range] ?? mockSeries(f.key, f.value, range);
  const first = f.series ? pts[0] : 0;
  const pct = f.series && first ? Math.round(((pts[pts.length - 1] - first) / first) * 100) : null;
  const trend = pct !== null ? { up: pct >= 0, text: `${pct >= 0 ? "+" : ""}${pct}% from last ${RANGE_WORD[range]}` } : f.trend;
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[12px] bg-[#f9e5ef]" style={{ color: PLUM }}>
          <UserRound className="size-[19px]" />
        </span>
        <span className="min-w-0 flex-1 text-[14px] leading-[1.25] font-semibold text-[#7b7487] [overflow-wrap:anywhere]">{f.label}</span>
        {pts ? (
          <div role="group" aria-label="Time range" className="inline-flex shrink-0 rounded-full bg-[#f3eaf1] p-[3px]">
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={`min-h-8 rounded-full px-[11px] text-[12px] font-extrabold ${range === r ? "bg-[#8b2252] text-white" : "text-(--ap-muted)"}`}>
                {r}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <Link href={f.href} aria-label={`${f.value} ${f.label}`} className="block min-w-0 active:opacity-90">
          <b className="mt-3 block text-[38px] leading-none font-extrabold text-(--ap-ink) tabular-nums">{f.value}</b>
          {trend ? (
            <p className={`mt-2 text-[12.5px] font-extrabold ${trend.up ? "text-[#17803d]" : "text-[#b4232c]"}`}>
              {trend.up ? "▲" : "▼"} {trend.text}
            </p>
          ) : f.note ? (
            <p className="mt-2 text-[13px] text-(--ap-muted)">{f.note}</p>
          ) : null}
        </Link>
        {pts && pts.length > 1 ? <Spark points={pts} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The one layout                                                      */
/* ------------------------------------------------------------------ */

function PhoneView({ recipe, model }: { recipe: HomeRecipe; model: Model }) {
  const hidden = usePilotHidden();
  const { facts, rows } = model;
  const get = (k: string): Fact | null => {
    const f = facts[k];
    return f && !hidden(f.href) ? f : null;
  };
  const hero = recipe.hero.map(get).find((f) => !!f) ?? null;
  const blocks = recipe.blocks.map(get).filter((f): f is Fact => !!f && f.value > 0).slice(0, 2);
  const minis = recipe.minis.map(get).filter((f): f is Fact => !!f).slice(0, 2);
  const primaryKey = recipe.primary.find((k) => (get(k)?.value ?? 0) > 0);
  const primary = primaryKey ? { label: PRIMARY_LABEL[primaryKey] ?? "Open", href: get(primaryKey)!.href } : null;
  const upNext: UpRow[] = [];
  for (const kind of recipe.upNext) for (const r of rows[kind] ?? []) if (upNext.length < 3 && !hidden(r.href)) upNext.push(r);

  if (!model.ready) return <div role="status" aria-busy="true" aria-label="Loading Home" className="ap-shimmer h-[300px] rounded-[24px] min-[768px]:hidden" />;

  return (
    <div className="calm-home flex flex-col gap-3.5 min-[768px]:hidden">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[14px] text-(--ap-muted)">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <Link href="/admin/calendar" aria-label="Open calendar" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-surface) text-(--ap-ink) shadow-[0_4px_12px_rgba(60,30,80,.08)] active:scale-95">
          <Calendar className="size-[21px]" aria-hidden="true" />
        </Link>
      </div>

      {hero ? <Hero f={hero} /> : null}

      {blocks.length > 0 ? (
        <section aria-label="Today" className={`grid min-w-0 gap-3 ${blocks.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {blocks.map((f, i) => (
            <BlockCard key={f.key} f={f} rose={i === 0} />
          ))}
        </section>
      ) : null}

      {minis.length > 0 ? (
        <section aria-label="Quick numbers" className={`grid min-w-0 gap-3 ${minis.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {minis.map((f) => (
            <MiniStat key={f.key} f={f} />
          ))}
        </section>
      ) : null}

      {primary ? (
        <Link href={primary.href} className="flex h-14 items-center justify-center rounded-full text-[15px] font-extrabold text-white active:opacity-90" style={{ background: "linear-gradient(90deg, #8b2252, #c24a86)", boxShadow: "0 12px 24px rgba(139,34,82,.32)" }}>
          {primary.label}
        </Link>
      ) : null}

      {upNext.length > 0 ? (
        <section aria-labelledby="ph-needs" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h2 id="ph-needs" className={H2}>
              {recipe.upNextTitle} <span className="text-[13px] font-bold text-(--ap-muted)">({upNext.length})</span>
            </h2>
            <Link href={recipe.upNextHref} className={LINK_SM}>
              See all
            </Link>
          </div>
          <ul className={`${CARD} m-0 list-none px-3.5 py-1`}>
            {upNext.map((r) => (
              <li key={r.id} className={ROW_LINE}>
                <Link href={r.href} className="flex min-h-[68px] items-center gap-3 py-2.5 active:opacity-80">
                  <Face name={r.name} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[15px] leading-[1.25] font-bold text-(--ap-ink) [overflow-wrap:anywhere]">{r.name}</b>
                    <span className="mt-0.5 block text-[13px] leading-[1.3] text-[#7b7487] [overflow-wrap:anywhere]">{r.line}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {r.time ? <span className="text-[12px] font-semibold text-[#7b7487] tabular-nums">{r.time}</span> : null}
                    <span className={`rounded-full px-[9px] py-[3px] text-[11.5px] font-extrabold ${PILL[r.tone]}`}>{r.pill}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HrPhone({ ov, needs, role }: { ov: HrOverview; needs: Need[]; role: HomeRole }) {
  const model = useHrModel({ ov, needs });
  return <PhoneView recipe={HOME_RECIPES[role]} model={model} />;
}

function OpsPhone() {
  const model = useOpsModel();
  return <PhoneView recipe={HOME_RECIPES.operations} model={model} />;
}

/** Dev preview of the Recruiter recipe (no prototype identity exists for it): /admin?home=recruiter. */
function usePreviewRole(): HomeRole | null {
  const sp = useSearchParams();
  const live = useAuthLive();
  return !live && SHOW_PROTOTYPE_CONTROLS && sp.get("home") === "recruiter" ? "recruiter" : null;
}

/** The role's phone Home. HR roles pass the Overview they already loaded; Operations loads its own numbers. */
export function RoleHomePhone({ ov, needs, hrLevel }: { ov?: HrOverview; needs?: Need[]; hrLevel?: Parameters<typeof homeRoleFor>[1] }) {
  const identity = useAdminIdentity();
  const preview = usePreviewRole();
  const role = preview ?? homeRoleFor(identity, hrLevel);
  if (role === "operations" || !ov || !needs) return <OpsPhone />;
  return <HrPhone ov={ov} needs={needs} role={role} />;
}
