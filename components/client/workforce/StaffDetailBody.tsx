"use client";

import Link from "next/link";
import { ArrowUpLeft, CircleHelp, FileText, ShieldCheck } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useWorkforceMemberDetail } from "@/lib/client/hooks";
import { dayMonth, formatClock, formatClockRange, formatPercent, fullDate, parseDate, todayISO, weekday } from "@/lib/client/format";
import { DEPARTMENT_LABEL, SHIFTS } from "@/lib/client/labels";
import { workforceHref } from "@/lib/client/links";
import type { ComplianceItem, ComplianceState } from "@/lib/client/types";
import { StickyActionBar } from "@/components/shared/mobile/StickyActionBar";
import { PersonPhoto } from "../PersonPhoto";
import { AttendanceChip, StatusChip, type ChipTone } from "../StatusChip";
import { AnalyticsPanel } from "../charts";
import { ClientDocumentActions } from "../compliance/DocumentActions";

const COMPLIANCE_LABEL: Record<ComplianceState, string> = { complete: "Complete", outstanding: "Outstanding", "update-required": "Update required", expiring: "Expiring soon" };
const COMPLIANCE_TONE: Record<ComplianceState, ChipTone> = { complete: "ok", outstanding: "bad", "update-required": "warn", expiring: "warn" };

const BACK = (
  <div className="pt-3 pb-1 max-[767px]:hidden">
    <Link href="/client/workforce" className="ap-hit inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
      <ArrowUpLeft className="size-4" aria-hidden="true" /> Back to My Workforce
    </Link>
  </div>
);

const SK = "ap-shimmer rounded-2xl";

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading staff member">
      {BACK}
      <h1 className="sr-only">Staff member</h1>
      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        <div className={`${SK} h-[120px]`} />
        <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1101px]:grid-cols-2">
          <div className={`${SK} h-[280px]`} />
          <div className={`${SK} h-[280px]`} />
          <div className={`${SK} h-[260px]`} />
          <div className={`${SK} h-[260px]`} />
        </div>
      </div>
    </div>
  );
}

/** The same skeleton the route's loading.tsx shows. */
export { DetailSkeleton as StaffDetailSkeleton };

/** Compliance overall = the first state that is not complete (display summary of backend-authored states, no new rule). */
function overall(docs: ComplianceItem[]): ComplianceState | null {
  if (docs.length === 0) return null;
  return (["outstanding", "update-required", "expiring"] as const).find((s) => docs.some((d) => d.state === s)) ?? "complete";
}

/**
 * One staff member (brief section 17): current assignment, attendance summary,
 * upcoming schedule, compliance status with the authorised operational
 * documents, and assignment history. WorkforceMemberDetail has no NIN, bank,
 * identity-document or private-HR fields, so none can be rendered.
 */
export function StaffDetailBody({ id }: { id: string }) {
  const { data, status, retry } = useWorkforceMemberDetail(id);

  if (status === "loading") return <DetailSkeleton />;
  if (status === "error" || status === "restricted") {
    return (
      <div>
        {BACK}
        <h1 className="sr-only">Staff member</h1>
        <div className="mx-auto max-w-[860px] pt-4">
          <ErrorPanel title="We couldn't load this staff member" retry={retry} />
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {BACK}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <h1 className="sr-only">Staff member not found</h1>
          <EmptyState icon={CircleHelp} title="Staff member not found" description="This person isn't in your outlet scope, or is no longer assigned to your outlets." action={<Link href={workforceHref()} className="ap-btn ap-btn-s ap-btn-sm mt-1.5">Back to My Workforce</Link>} />
        </div>
      </div>
    );
  }

  const { member: m, attendance: a } = data;
  const today = todayISO();
  const facts: [string, string][] = [
    ["Client", data.clientName],
    ["Outlet", data.outletName],
    ["Role", m.role],
    ["Department", DEPARTMENT_LABEL[m.departmentId]],
    ["Start date", fullDate(m.startDate)],
    ["Usual shift", `${SHIFTS[m.shift].label} (${formatClockRange(SHIFTS[m.shift].start, SHIFTS[m.shift].end)})`],
  ];
  const overallState = overall(data.documents);
  const tiles: { label: string; value: number; tone: string }[] = [
    { label: "Present", value: a.present, tone: "text-(--ap-ok)" },
    { label: "Late", value: a.late, tone: "text-(--ap-warn)" },
    { label: "Absent", value: a.absent, tone: "text-(--ap-rose)" },
    { label: "On leave", value: a.onLeave, tone: "text-(--ap-info)" },
  ];

  return (
    <div>
      {BACK}
      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        <header className="ap-card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-[20px] p-5 min-[640px]:flex min-[640px]:flex-wrap min-[640px]:gap-4 min-[768px]:p-6 [&>*:nth-child(n+3)]:col-span-2 [&>*:nth-child(n+3)]:justify-self-start min-[640px]:[&>*:nth-child(n+3)]:col-auto">
          <PersonPhoto name={m.name} photoUrl={m.photoUrl} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[30px]">{m.name}</h1>
            <p className="mt-1 text-[15px] text-(--ap-muted)">
              {m.role} &middot; {DEPARTMENT_LABEL[m.departmentId]} &middot; {data.outletName}
            </p>
            <p className="mt-0.5 text-[13px] text-(--ap-muted) tabular-nums">{m.staffId}</p>
          </div>
          <StatusChip tone={m.assignmentStatus === "active" ? "ok" : "mute"}>{m.assignmentStatus === "active" ? "Active" : "Ended"}</StatusChip>
          {/* Contact goes through Beeliv: staff phone numbers are not on the Client-visible list (Master Spec 24.5 / 29.3). */}
          <Link href="/client/support?reason=Staff%20concern" className="ap-btn ap-btn-s ap-btn-sm max-[767px]:hidden">
            Contact Beeliv about {m.name.split(" ")[0]}
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1101px]:grid-cols-2">
          <AnalyticsPanel title="Current assignment">
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 min-[520px]:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">{k}</dt>
                  <dd className="m-0 mt-0.5 text-[15px] text-(--ap-ink)">{v}</dd>
                </div>
              ))}
              <div className="min-w-0">
                <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Assignment status</dt>
                <dd className="m-0 mt-1">
                  <StatusChip tone={m.assignmentStatus === "active" ? "ok" : "mute"}>{m.assignmentStatus === "active" ? "Active" : "Ended"}</StatusChip>
                </dd>
              </div>
            </dl>
          </AnalyticsPanel>

          <AnalyticsPanel title="Attendance summary" subtitle={`Last 30 days, ${dayMonth(a.from)} - ${dayMonth(a.to)}`}>
            {a.scheduled === 0 ? (
              <p className="rounded-xl bg-(--ap-tint-soft) px-4 py-6 text-center text-[14px] text-(--ap-muted)">No attendance recorded for this period yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {tiles.map((t) => (
                    <div key={t.label} className="rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-2 py-2.5 text-center">
                      <b className={`block text-[22px] leading-none tabular-nums ${t.tone}`}>{t.value}</b>
                      <span className="mt-1 block text-[12px] text-(--ap-muted)">{t.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[13px] text-(--ap-muted)">
                  {formatPercent(a.attendanceRate)} present across {a.scheduled} scheduled days.
                </p>
                <h3 className="mt-3.5 mb-1 text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Most recent days</h3>
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.recentAttendance.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2 first:border-t-0">
                      <span className="w-[92px] shrink-0 text-[14px] text-(--ap-ink-2)">
                        {r.date === today ? "Today" : `${weekday(r.date)} ${dayMonth(r.date)}`}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-(--ap-muted)">{r.clockIn ? `In ${formatClock(r.clockIn)}` : "No clock-in"}</span>
                      <AttendanceChip status={r.status} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="Upcoming schedule" subtitle="The next 7 days">
            {data.upcomingSchedule.length === 0 ? (
              <p className="rounded-xl bg-(--ap-tint-soft) px-4 py-6 text-center text-[14px] text-(--ap-muted)">No upcoming shifts are scheduled.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {data.upcomingSchedule.map((s) => (
                  <li key={s.date} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2.5 first:border-t-0">
                    <span className="w-[92px] shrink-0 text-[14px] text-(--ap-ink-2)">{s.date === today ? "Today" : `${weekday(s.date)} ${dayMonth(s.date)}`}</span>
                    <b className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--ap-ink)">{SHIFTS[s.shift].label}<span className="max-[767px]:hidden"> shift</span></b>
                    <span className="shrink-0 text-[13px] text-(--ap-muted)">{formatClockRange(s.start, s.end).replace(/ - /g, " – ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="Compliance and documents" subtitle="Approved operational documents only">
            {data.documents.length === 0 ? (
              <p className="rounded-xl bg-(--ap-tint-soft) px-4 py-6 text-center text-[14px] text-(--ap-muted)">No operational documents are shared with you for this person.</p>
            ) : (
              <>
                {overallState ? (
                  <p className="mb-2 flex items-center gap-2 text-[14px] text-(--ap-ink-2)">
                    <ShieldCheck className="size-4 text-(--ap-violet)" aria-hidden="true" /> Compliance status <StatusChip tone={COMPLIANCE_TONE[overallState]}>{COMPLIANCE_LABEL[overallState]}</StatusChip>
                  </p>
                ) : null}
                <ul className="m-0 flex list-none flex-col p-0">
                  {data.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2.5 first:border-t-0 max-[767px]:flex-wrap">
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
                        <FileText className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <b className="block truncate text-[14.5px] font-semibold text-(--ap-ink)">{d.document}</b>
                        {d.expiresOn ? <span className="block text-[13px] text-(--ap-muted)">Expires {dayMonth(d.expiresOn)}</span> : null}
                        {d.state !== "outstanding" ? <ClientDocumentActions ownerId={d.memberId} ownerName={d.staffName} documentType={d.document} className="mt-1.5" /> : null}
                      </span>
                      <span className="max-[767px]:ml-12 max-[767px]:w-full"><StatusChip tone={COMPLIANCE_TONE[d.state]}>{COMPLIANCE_LABEL[d.state]}</StatusChip></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="Assignment history" className="min-[1101px]:col-span-2">
            <ul className="m-0 flex list-none flex-col p-0">
              {data.history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--ap-line-2) py-2.5 first:border-t-0">
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[14.5px] font-semibold text-(--ap-ink)">
                      {h.role} &middot; {h.outletName}
                    </b>
                    <span className="block text-[13px] text-(--ap-muted)">{DEPARTMENT_LABEL[h.departmentId]}</span>
                  </span>
                  <span className="text-[13px] text-(--ap-ink-2)">
                    {dayMonth(h.from)} {parseDate(h.from).getFullYear()} – {h.to ? dayMonth(h.to) : "Present"}
                  </span>
                  {h.to === null ? <StatusChip tone="ok">Current</StatusChip> : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-(--ap-muted)">Earlier assignments will appear here once Beeliv confirms what history is shared with you.</p>
          </AnalyticsPanel>
        </div>
      </div>
      {/* Phones: the one action lives in the sticky bar (the tab bar steps aside on this page). */}
      <span data-bv-detail="" hidden />
      <StickyActionBar label={`Contact Beeliv about ${m.name.split(" ")[0]}`} href="/client/support?reason=Staff%20concern" />
    </div>
  );
}
