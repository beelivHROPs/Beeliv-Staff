"use client";

import Link from "next/link";
import { Calendar, ShieldCheck } from "@/components/applicant/icons";
import { usePayrollVisibility, useComplianceSummary } from "@/lib/client/hooks";
import { dayMonth, periodLabel, plural } from "@/lib/client/format";
import { analyticsFamilyHref, complianceHref } from "@/lib/client/links";
import type { ComplianceState } from "@/lib/client/types";
import { AnalyticsLink } from "../AnalyticsLink";
import { StatusChip } from "../StatusChip";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartRestrictedState, ChartSkeleton, type LegendItem } from "../charts";

const STATE: { key: ComplianceState; label: string; color: string }[] = [
  { key: "complete", label: "Complete", color: "var(--ap-ok)" },
  { key: "outstanding", label: "Outstanding", color: "var(--ap-rose)" },
  { key: "expiring", label: "Expiring soon", color: "var(--ap-warn)" },
  { key: "update-required", label: "Update required", color: "var(--ap-info)" },
];

/**
 * Documents & compliance (brief section 21): operational compliance only -
 * approved operational documents such as food-safety certificates. Identity
 * and banking documents are never listed to Clients; a quiet line says so.
 * The percentage is rounded DOWN by the backend fixture so it never overstates.
 */
export function ComplianceCard({ className = "" }: { className?: string }) {
  const { data, status, retry } = useComplianceSummary();
  const counts: Record<ComplianceState, number> = data ? { complete: data.complete, outstanding: data.outstanding, expiring: data.expiringSoon, "update-required": data.updateRequired } : { complete: 0, outstanding: 0, expiring: 0, "update-required": 0 };
  const items: LegendItem[] = STATE.map((s) => ({ key: s.key, label: s.label, value: counts[s.key], color: s.color, href: complianceHref({ status: s.key === "complete" ? undefined : s.key }) }));

  return (
    <AnalyticsPanel title="Documents & compliance" href={complianceHref()} hrefLabel="View details" className={className}>
      {status === "loading" ? <ChartSkeleton height={260} label="Loading compliance" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={260} /> : null}
      {status === "restricted" ? <ChartRestrictedState what="Compliance information" height={220} /> : null}
      {status === "empty" ? <ChartEmptyState icon={ShieldCheck} title="No compliance records yet" description="Once staff are assigned, their operational documents are tracked here." height={220} /> : null}
      {status === "ready" && data ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <b className="text-[26px] leading-none font-bold tracking-tight text-(--ap-ok) tabular-nums">{data.percentComplete}%</b>
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-(--ap-ink-2)">
              {data.attention.length === 0 ? <b className="text-(--ap-ok)">All documents complete</b> : <b className="text-(--ap-ink)">{plural(data.attention.length, "document")} need attention</b>}
            </p>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {items.map((i) => (
              <li key={i.key}>
                <Link href={i.href ?? complianceHref()} className="flex items-center justify-between gap-2 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3 py-2.5 hover:border-(--ap-tint-2)">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-(--ap-ink-2)">{i.label}</span>
                  <b className="text-[17px] tabular-nums" style={{ color: i.color }}>{i.value}</b>
                </Link>
              </li>
            ))}
          </ul>
          <AnalyticsLink href={analyticsFamilyHref("compliance")} label="View analytics" className="w-full" />
          <p className="border-t border-(--ap-line-2) pt-2.5 text-[12px] text-(--ap-muted)">Identity and banking documents stay restricted to Beeliv.</p>
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}

/**
 * Next payroll (brief section 22): SCHEDULE VISIBILITY ONLY. No amounts, no
 * "pay now", no transfer - what Client sees of salary is still pending
 * Beeliv's decision, so nothing about money is shown or implied.
 */
export function PayrollCard({ className = "" }: { className?: string }) {
  const { data, status, retry } = usePayrollVisibility();
  const next = data?.upcoming ?? [];
  const single = next.length === 1 ? next[0] : null;

  return (
    <AnalyticsPanel title="Next payroll" href="/client/payroll" hrefLabel="View schedule" className={className}>
      {status === "loading" ? <ChartSkeleton height={230} label="Loading payroll schedule" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={230} /> : null}
      {status === "restricted" ? <ChartRestrictedState what="The payroll schedule" height={200} /> : null}
      {status === "empty" ? <ChartEmptyState icon={Calendar} title="No payroll schedule yet" description="When Beeliv schedules a pay period for your outlet, it shows here." height={200} /> : null}
      {status === "ready" && single ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
              <Calendar className="size-5" aria-hidden="true" />
            </span>
            <b className="text-[19px] text-(--ap-ink)">{single.label}</b>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
            <dt className="text-(--ap-muted)">Pay period</dt>
            <dd className="m-0 text-right font-semibold text-(--ap-ink)">{periodLabel(single.periodStart, single.periodEnd)}</dd>
            <dt className="text-(--ap-muted)">Scheduled date</dt>
            <dd className="m-0 text-right font-semibold text-(--ap-ink)">{dayMonth(single.scheduledDate)}</dd>
            <dt className="text-(--ap-muted)">Workforce included</dt>
            <dd className="m-0 text-right font-semibold text-(--ap-ink)">{single.workforceIncluded} staff</dd>
          </dl>
          <span>
            <StatusChip tone="ok">Upcoming</StatusChip>
          </span>
        </div>
      ) : null}
      {status === "ready" && !single ? (
        <div className="flex flex-col gap-2.5">
          <b className="text-[15px] text-(--ap-ink)">{next[0]?.label}</b>
          <ul className="m-0 flex list-none flex-col p-0">
            {next.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-t border-(--ap-line-2) py-2 text-[14px] first:border-t-0">
                <span className="min-w-0 leading-tight">
                  <b className="block truncate">{p.outletName}</b>
                  <span className="text-[13px] text-(--ap-muted)">{p.workforceIncluded} staff</span>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <span className="block text-[12px] text-(--ap-muted)">Scheduled</span>
                  <b>{dayMonth(p.scheduledDate)}</b>
                </span>
              </li>
            ))}
          </ul>
          <span>
            <StatusChip tone="ok">Upcoming</StatusChip>
          </span>
        </div>
      ) : null}
      {status === "ready" ? (
        <p className="mt-3 border-t border-(--ap-line-2) pt-2.5 text-[12px] text-(--ap-muted)">
          Schedule only. Payment amounts aren&apos;t shown here. <Link href="/client/payroll" className="font-bold text-(--ap-violet)">Payroll</Link>
        </p>
      ) : null}
    </AnalyticsPanel>
  );
}
