"use client";

/**
 * DESKTOP/TABLET (>=768px) Operations Home: the OLD layout restored 2026-10-27 from git HEAD;
 * OpsHome renders it beside the phone Home and switches with CSS only.
 * Operations Overview: an executive business briefing (docs/contracts/ops-overview.md).
 * Reading order: hero line ("N decisions waiting", one "Review now" button), ONE thin
 * strip of six numbers (each opens its filtered records), Pending Decisions beside
 * Workforce Health, the Client and Outlet table beside the Recruitment Snapshot, then
 * Recent Activity beside the HR workload. COUNTS ONLY (no money). Hairline containers,
 * no icon circles, no nested cards. Phone (<768px) is one column with 56px rows inside
 * single containers. States: loading, empty, error, restricted.
 */
import Link from "next/link";
import { ChevronRight, FileCheck2 } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { Flat, FlatEmpty, rowLine } from "@/components/admin/overview/Flat";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { greeting } from "@/lib/admin/format";
import { useActivity } from "@/lib/admin/ops/activity-hooks";
import type { ActivityAction, ActivityEvent } from "@/lib/admin/ops/activity-types";
import type { OpsClientRow, OpsCompany } from "@/lib/admin/ops/home-types";
import { useApprovals, useOpsCompany, useOpsSummary } from "@/lib/admin/ops/hooks";
import { OPS_USER } from "@/lib/admin/ops/identity";
import type { ApprovalRow, OpsSummary } from "@/lib/admin/ops/types";
import { approvalsListHref, APPROVALS_HREF } from "./meta";
import { OpsOnly, Restricted } from "./parts";

const ASSIGNMENTS_HREF = "/admin/ops/assignments";
const UNASSIGNED_HREF = `${ASSIGNMENTS_HREF}?show=unassigned`;
const ACTIVITY_HREF = "/admin/ops/activity";
/** Built by another agent (Clients & Outlets, Staff Assignments); only linked to here. */
const CLIENTS_HREF = "/admin/ops/clients";
const STAFF_HREF = "/admin/ops/staff";
const CLIENT_ROWS_SHOWN = 8;
/** A request waiting this many days or more is flagged "waiting too long". Needs Beeliv confirmation (contract section 7). */
const OVERDUE_DAYS = 5;

const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

interface Need {
  key: string;
  count: number;
  label: string;
  href: string;
  /** Counts toward "N decisions waiting". Sent back is with HR, so it is shown but not counted. */
  decision: boolean;
  tone?: "urgent";
}

function buildNeeds(s: OpsSummary, company: OpsCompany, waiting: ApprovalRow[]): Need[] {
  const overdue = waiting.filter((r) => ageDays(r.submittedAt) >= OVERDUE_DAYS).length;
  const all: Need[] = [
    { key: "sel", count: s.waitingSelections, label: s.waitingSelections === 1 ? "Selection to approve" : "Selections to approve", href: approvalsListHref({ tab: "waiting", type: "selection" }), decision: true },
    { key: "off", count: s.waitingOffers, label: s.waitingOffers === 1 ? "Offer to approve" : "Offers to approve", href: approvalsListHref({ tab: "waiting", type: "offer" }), decision: true },
    { key: "hr", count: company.clientsWithoutHr, label: company.clientsWithoutHr === 1 ? "Client without an HR officer" : "Clients without an HR officer", href: UNASSIGNED_HREF, decision: true, tone: "urgent" },
    { key: "late", count: overdue, label: `Waiting ${OVERDUE_DAYS} days or more`, href: approvalsListHref({ tab: "waiting" }), decision: false, tone: "urgent" },
    { key: "back", count: s.sentBack, label: "Sent back, HR is fixing", href: approvalsListHref({ tab: "sent-back" }), decision: false },
  ];
  return all.filter((n) => n.count > 0);
}

export function OpsHomeDesktop() {
  return (
    <OpsOnly what="Operations Overview" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const summary = useOpsSummary();
  const company = useOpsCompany();
  const waitingList = useApprovals({ search: "", tab: "waiting", kind: "", clientId: "" });
  const activity = useActivity({ search: "", action: "", actorId: "", entityType: "", range: "" });

  const all = [summary, company, waitingList, activity];

  // Sounds are played by OpsHome (the phone copy mounted beside this one), so they are not repeated here.
  const failed = all.some((l) => l.status === "error");

  if (all.some((l) => l.status === "restricted")) return <Restricted what="Operations Overview" />;
  if (failed) {
    return (
      <ErrorPanel
        title="We could not load the Overview"
        retry={() => {
          all.forEach((l) => l.status === "error" && l.retry());
        }}
      />
    );
  }
  if (all.some((l) => l.status === "loading")) return <Skeleton />;

  const s = summary.data;
  const c = company.data;
  const waiting = waitingList.data?.rows ?? [];
  const events = activity.data?.rows.slice(0, 5) ?? [];
  if (!s || !c) return <Skeleton />;

  const nothingAtAll = s.waitingSelections + s.waitingOffers + s.sentBack + s.approved === 0 && c.hrWorkload.length === 0 && c.clients.length === 0 && c.recruitment.openVacancies === 0;
  if (nothingAtAll) {
    return (
      <div className="ops-calm">
        <h1 className="ap-serif text-[26px] leading-[1.1] min-[768px]:text-[32px]">
          {greeting()}, {OPS_USER.firstName}.
        </h1>
        <div className="mt-5 rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-6">
          <EmptyState icon={FileCheck2} title="Nothing to show yet" description="When clients, jobs or HR submissions exist, your business briefing shows here." />
        </div>
      </div>
    );
  }

  const needs = buildNeeds(s, c, waiting);
  const decisions = needs.filter((n) => n.decision).reduce((n, x) => n + x.count, 0);
  const first = needs.find((n) => n.decision) ?? null;
  const awaiting = s.waitingSelections + s.waitingOffers;
  return (
    <div className="ops-calm flex flex-col gap-6 pb-24">
      <Greeting decisions={decisions} first={first} className="max-[767px]:hidden" />
      <PhoneHeader decisions={decisions} first={first} />
      <Strip c={c} pending={awaiting} />
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-12">
        <NeedsPanel needs={needs} className="min-[1100px]:col-span-7" />
        <HealthPanel c={c} className="min-[1100px]:col-span-5" />
      </div>
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-12">
        <ClientTable rows={c.clients} className="min-[1100px]:col-span-8" />
        <RecruitmentPanel c={c} awaiting={awaiting} className="min-[1100px]:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-12">
        <RecentActivity events={events} className="min-[1100px]:col-span-7" />
        <Workload c={c} className="min-[1100px]:col-span-5" />
      </div>
    </div>
  );
}

/* ---------- hero (desktop): the one tinted block ---------- */

function Greeting({ decisions, first, className = "" }: { decisions: number; first: Need | null; className?: string }) {
  return (
    <section className={`rounded-[10px] border border-(--ap-line) bg-(--ap-tint) p-6 ${className}`}>
      <p className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[.14em] text-(--ap-muted) uppercase">
        <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-(--ap-gold)" />
        {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="ap-serif mt-3 text-[32px] leading-[1.1]">
        {greeting()}, {OPS_USER.firstName}.
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-[15px] leading-[1.5] text-(--ap-ink-2)">
          {decisions > 0 ? (
            <>
              <b className="font-semibold text-(--ap-ink)">{plural(decisions, "decision")} waiting.</b> Start with the oldest.
            </>
          ) : (
            "No decisions are waiting right now."
          )}
        </p>
        {first ? (
          <Link href={first.href} className="ap-btn ap-btn-p h-10 rounded-full px-5 text-[14px] text-white!">
            Review now
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function PhoneHeader({ decisions, first }: { decisions: number; first: Need | null }) {
  return (
    <header className="min-[768px]:hidden">
      <p className="text-[11.5px] font-semibold tracking-[.12em] text-(--ap-muted) uppercase">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="ap-serif mt-1 text-[26px] leading-[1.15]">
        {greeting()}, {OPS_USER.firstName}.
      </h1>
      <p className="mt-1 text-[14px] text-(--ap-ink-2)">{decisions > 0 ? <b className="font-semibold text-(--ap-ink)">{plural(decisions, "decision")} waiting</b> : "No decisions waiting"}</p>
      {first ? (
        <Link href={first.href} className="ap-btn ap-btn-p mt-3 h-11 w-full rounded-full text-[14px] text-white!">
          Review now
        </Link>
      ) : null}
    </header>
  );
}

/* ---------- shared list row: count + label + chevron, whole row opens the list ---------- */

function NeedRow({ n, i }: { n: Need; i: number }) {
  return (
    <li className={rowLine(i)}>
      <Link href={n.href} className="flex min-h-14 items-center gap-3 hover:bg-(--ap-tint-soft) active:bg-(--ap-tint-soft) max-[767px]:px-4 min-[768px]:min-h-12 min-[768px]:px-1">
        <b className={`w-7 shrink-0 text-[17px] leading-none font-semibold tabular-nums ${n.count === 0 ? "text-(--ap-faint)" : "text-(--ap-ink)"}`}>{n.count}</b>
        <span className="min-w-0 flex-1 text-[14.5px] text-(--ap-ink)">
          {n.label}
          {n.tone === "urgent" && n.count > 0 ? <span aria-hidden="true" className="ml-2 inline-block size-1.5 rounded-full bg-(--ap-rose) align-middle" /> : null}
        </span>
        <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
      </Link>
    </li>
  );
}

const ROWS_BOX = "m-0 flex list-none flex-col p-0 max-[767px]:overflow-hidden max-[767px]:rounded-[14px] max-[767px]:border max-[767px]:border-(--ap-line) max-[767px]:bg-(--ap-surface)";

function RowList({ rows }: { rows: Need[] }) {
  return (
    <ul className={ROWS_BOX}>
      {rows.map((n, i) => (
        <NeedRow key={n.key} n={n} i={i} />
      ))}
    </ul>
  );
}

/* ---------- pending decisions ---------- */

function NeedsPanel({ needs, className = "" }: { needs: Need[]; className?: string }) {
  return (
    <Flat title="Pending decisions" href={APPROVALS_HREF} hrefLabel="All approvals" className={className}>
      {needs.length === 0 ? <FlatEmpty title="You are all caught up" description="Nothing is waiting for your decision." /> : <RowList rows={needs} />}
    </Flat>
  );
}

/* ---------- the one strip: six numbers ---------- */

interface StripItem {
  key: string;
  label: string;
  value: number;
  href: string;
  alert?: boolean;
}

/** The six numbers. Values are mock stand-ins or derived mocks (ops-overview.md section 2). */
function stripItems(c: OpsCompany, pending: number): StripItem[] {
  return [
    { key: "clients", label: "Active clients", value: c.activeClients, href: CLIENTS_HREF },
    { key: "outlets", label: "Active outlets", value: c.activeOutlets, href: `${CLIENTS_HREF}?view=outlets` },
    { key: "staff", label: "Deployed staff", value: c.deployedStaff, href: STAFF_HREF },
    { key: "approvals", label: "Pending approvals", value: pending, href: APPROVALS_HREF },
    { key: "requests", label: "Open workforce requests", value: c.openWorkforceRequests, href: "/admin/clients/requests?tab=new" },
    { key: "exceptions", label: "Operational exceptions", value: c.operationalExceptions, href: `${STAFF_HREF}?show=exceptions`, alert: true },
  ];
}

function Strip({ c, pending }: { c: OpsCompany; pending: number }) {
  const items = stripItems(c, pending);
  return (
    <section aria-label="Business at a glance" className="overflow-hidden rounded-[10px] border border-(--ap-line) bg-(--ap-surface) max-[767px]:rounded-[14px]">
      <div className="grid grid-cols-2 min-[768px]:grid-cols-3 min-[1100px]:grid-cols-6">
        {items.map((t, i) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex min-h-[72px] flex-col justify-between gap-1.5 px-4 py-3 hover:bg-(--ap-tint-soft) active:bg-(--ap-tint-soft) ${i % 2 === 1 ? "max-[767px]:border-l max-[767px]:border-(--ap-line-2)" : ""} ${i >= 2 ? "max-[767px]:border-t max-[767px]:border-(--ap-line-2)" : ""} ${i % 3 !== 0 ? "min-[768px]:max-[1099px]:border-l min-[768px]:max-[1099px]:border-(--ap-line-2)" : ""} ${i >= 3 ? "min-[768px]:max-[1099px]:border-t min-[768px]:max-[1099px]:border-(--ap-line-2)" : ""} ${i > 0 ? "min-[1100px]:border-l min-[1100px]:border-(--ap-line-2)" : ""}`}
          >
            <span className="text-[12.5px] leading-tight text-(--ap-muted)">{t.label}</span>
            <b className={`text-[24px] leading-none font-semibold tabular-nums ${t.alert && t.value > 0 ? "text-(--ap-rose)" : "text-(--ap-ink)"}`}>{t.value}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- workforce health ---------- */

function HealthPanel({ c, className = "" }: { c: OpsCompany; className?: string }) {
  const w = c.workforce;
  const rows: Need[] = [
    { key: "att", count: w.attendanceExceptions, label: w.attendanceExceptions === 1 ? "Attendance exception" : "Attendance exceptions", href: "/admin/workforce/attendance?show=exceptions", decision: false, tone: "urgent" },
    { key: "una", count: w.unassignedStaff, label: w.unassignedStaff === 1 ? "Staff member not assigned to an outlet" : "Staff not assigned to an outlet", href: `${STAFF_HREF}?show=unassigned`, decision: false, tone: "urgent" },
    { key: "gap", count: w.coverageGaps, label: w.coverageGaps === 1 ? "Outlet short-staffed" : "Outlets short-staffed", href: `${STAFF_HREF}?show=gaps`, decision: false, tone: "urgent" },
  ];
  return (
    <Flat title="Workforce health" href={STAFF_HREF} hrefLabel="Staff" className={className}>
      <RowList rows={rows} />
    </Flat>
  );
}

/* ---------- recruitment snapshot: counts only ---------- */

function RecruitmentPanel({ c, awaiting, className = "" }: { c: OpsCompany; awaiting: number; className?: string }) {
  const r = c.recruitment;
  const rows: Need[] = [
    { key: "open", count: r.openVacancies, label: r.openVacancies === 1 ? "Open vacancy" : "Open vacancies", href: "/admin/jobs", decision: false },
    { key: "prog", count: r.candidatesInProgress, label: r.candidatesInProgress === 1 ? "Candidate in progress" : "Candidates in progress", href: "/admin/recruitment/applicants", decision: false },
    { key: "aw", count: awaiting, label: "Awaiting your approval", href: approvalsListHref({ tab: "waiting" }), decision: false },
    { key: "pl", count: r.placementsThisMonth, label: r.placementsThisMonth === 1 ? "Placement this month" : "Placements this month", href: "/admin/ops/reports", decision: false },
  ];
  return (
    <Flat title="Recruitment snapshot" href="/admin/ops/reports" hrefLabel="Reports" className={className}>
      <RowList rows={rows} />
    </Flat>
  );
}

/* ---------- client and outlet overview ---------- */

const CLIENT_COLS = "grid-cols-[minmax(0,1.6fr)_64px_64px_minmax(0,1.2fr)_80px_80px_20px]";
const clientHref = (id: string) => `${CLIENTS_HREF}/${id}`;

function HrCell({ hr }: { hr: string | null }) {
  return hr ? <span className="text-(--ap-ink-2)">{hr}</span> : <span className="font-semibold text-(--ap-rose)">No HR assigned</span>;
}

function ClientTable({ rows, className = "" }: { rows: OpsClientRow[]; className?: string }) {
  const shown = rows.slice(0, CLIENT_ROWS_SHOWN);
  return (
    <Flat title="Clients and outlets" href={CLIENTS_HREF} hrefLabel={rows.length > CLIENT_ROWS_SHOWN ? `See all ${rows.length}` : "See all"} className={className}>
      {rows.length === 0 ? (
        <FlatEmpty title="No clients yet" description="Clients appear here once they are added." />
      ) : (
        <>
          <div role="table" aria-label="Clients and outlets" className="max-[767px]:hidden">
            <div role="row" className={`grid ${CLIENT_COLS} gap-x-3 border-b border-(--ap-line-2) pb-1.5 text-[11.5px] font-semibold tracking-wide text-(--ap-muted) uppercase`}>
              <span role="columnheader">Client</span>
              <span role="columnheader" className="text-right">Outlets</span>
              <span role="columnheader" className="text-right">Staff</span>
              <span role="columnheader">HR</span>
              <span role="columnheader" className="text-right">Vacancies</span>
              <span role="columnheader" className="text-right">Requests</span>
              <span role="columnheader" className="sr-only">Open</span>
            </div>
            {shown.map((r, i) => (
              <Link key={r.id} role="row" href={clientHref(r.id)} className={`grid min-h-12 ${CLIENT_COLS} items-center gap-x-3 py-1.5 text-[13.5px] hover:bg-(--ap-tint-soft) ${rowLine(i)}`}>
                <b role="cell" className="min-w-0 font-semibold break-words text-(--ap-ink)">{r.name}</b>
                <span role="cell" className="text-right tabular-nums">{r.outlets}</span>
                <span role="cell" className="text-right tabular-nums">{r.deployedStaff}</span>
                <span role="cell" className="min-w-0 break-words">
                  <HrCell hr={r.hr} />
                </span>
                <span role="cell" className="text-right tabular-nums">{r.openVacancies}</span>
                <span role="cell" className="text-right tabular-nums">{r.requestsWaiting}</span>
                <ChevronRight className="size-4 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <ul className={`${ROWS_BOX} min-[768px]:hidden`}>
            {shown.map((r, i) => (
              <li key={r.id} className={rowLine(i)}>
                <Link href={clientHref(r.id)} className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-(--ap-tint-soft)">
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[14px] font-semibold break-words text-(--ap-ink)">{r.name}</b>
                    <span className="mt-0.5 block text-[13px] break-words text-(--ap-muted)">
                      {plural(r.outlets, "outlet")} · {r.deployedStaff} staff · {r.openVacancies} open · {r.requestsWaiting} waiting
                    </span>
                    <span className="mt-0.5 block text-[13px]">
                      <HrCell hr={r.hr} />
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Flat>
  );
}

/* ---------- recent activity ---------- */

const VERB: Record<ActivityAction, string> = { approved: "approved", "sent-back": "sent back", rejected: "rejected", invited: "invited", assigned: "assigned", published: "published", verified: "verified", revealed: "revealed", viewed: "viewed" };

function whenText(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function RecentActivity({ events, className = "" }: { events: ActivityEvent[]; className?: string }) {
  return (
    <Flat title="Recent activity" href={ACTIVITY_HREF} hrefLabel="See all" className={className}>
      {events.length === 0 ? (
        <FlatEmpty title="No activity yet" description="Approvals, invitations and assignments are recorded here as they happen." />
      ) : (
        <ul className={ROWS_BOX}>
          {events.map((e, i) => (
            <li key={e.id} className={rowLine(i)}>
              <Link href={ACTIVITY_HREF} className="flex min-h-14 items-center gap-3 py-2 hover:bg-(--ap-tint-soft) max-[767px]:px-4 min-[768px]:px-1">
                <span className="min-w-0 flex-1 text-[14px] leading-tight break-words text-(--ap-ink)">
                  <b className="font-semibold">{e.actorName}</b> {VERB[e.action]} <span className="text-(--ap-ink-2)">{e.entityLabel}</span>
                </span>
                <span className="shrink-0 text-[12.5px] text-(--ap-muted)">{whenText(e.at)}</span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

/* ---------- HR workload ---------- */

function Workload({ c, className = "" }: { c: OpsCompany; className?: string }) {
  return (
    <Flat title="HR workload" href={ASSIGNMENTS_HREF} hrefLabel="Clients & HR" className={className}>
      {c.hrWorkload.length === 0 ? (
        <FlatEmpty title="No HR officers yet" description="Invite HR from Setup, then assign clients to them." />
      ) : (
        <>
          <div role="table" aria-label="HR workload" className="max-[767px]:hidden">
            <div role="row" className="grid grid-cols-[minmax(0,1fr)_72px_72px_20px] gap-x-3 border-b border-(--ap-line-2) pb-1.5 text-[11.5px] font-semibold tracking-wide text-(--ap-muted) uppercase">
              <span role="columnheader">HR officer</span>
              <span role="columnheader" className="text-right">Open</span>
              <span role="columnheader" className="text-right">Pending</span>
              <span role="columnheader" className="sr-only">Open</span>
            </div>
            {c.hrWorkload.map((h, i) => (
              <Link key={h.id} role="row" href={`${ASSIGNMENTS_HREF}?hr=${h.id}`} className={`grid min-h-12 grid-cols-[minmax(0,1fr)_72px_72px_20px] items-center gap-x-3 hover:bg-(--ap-tint-soft) ${rowLine(i)}`}>
                <span role="cell" className="min-w-0 text-[13.5px] font-semibold break-words text-(--ap-ink)">
                  {h.name}
                  <span className="ml-2 text-[12.5px] font-normal text-(--ap-muted)">{plural(h.clients, "client")}</span>
                </span>
                <b role="cell" className="text-right text-[14px] font-semibold text-(--ap-ink) tabular-nums">{h.openVacancies}</b>
                <b role="cell" className="text-right text-[14px] font-semibold text-(--ap-ink) tabular-nums">{h.pendingItems}</b>
                <ChevronRight className="size-4 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <ul className={`${ROWS_BOX} min-[768px]:hidden`}>
            {c.hrWorkload.map((h, i) => (
              <li key={h.id} className={rowLine(i)}>
                <Link href={`${ASSIGNMENTS_HREF}?hr=${h.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-(--ap-tint-soft)">
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[14px] font-semibold text-(--ap-ink)">{h.name}</b>
                    <span className="mt-0.5 block text-[13px] text-(--ap-muted)">
                      {h.openVacancies} open · {h.pendingItems} pending
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Flat>
  );
}

function Skeleton() {
  const sk = "ap-shimmer rounded-[10px]";
  return (
    <div role="status" aria-busy="true" aria-label="Loading Overview" className="ops-calm flex flex-col gap-4">
      <div className={`${sk} h-[150px]`} />
      <div className={`${sk} h-[84px]`} />
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-12">
        <div className={`${sk} h-[220px] min-[1100px]:col-span-7`} />
        <div className={`${sk} h-[220px] min-[1100px]:col-span-5`} />
      </div>
      <div className={`${sk} h-[260px]`} />
    </div>
  );
}
