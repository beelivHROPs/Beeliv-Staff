"use client";

import { useMemo } from "react";
import { dayMonth, monthYear, periodLabel } from "@/lib/client/format";
import { usePayrollVisibility } from "@/lib/client/hooks";
import type { PayrollEntry } from "@/lib/client/types";
import { AnalyticsPanel, MetricSummary } from "../charts";
import { StatusChip } from "../StatusChip";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { NoMatch, AnalyticsState, type AnalyticsFilters } from "./shared";

/**
 * Payroll visibility (brief section 23, "where authorized"): the schedule and
 * its history as a list - no charts of money, because no amounts, totals or
 * salary analytics are shown to Clients until Beeliv confirms what they may
 * see. If the account isn't authorised, the backend answers "restricted" and
 * the family shows the restricted state.
 */
export function PayrollAnalytics({ f, clear }: { f: AnalyticsFilters; clear: () => void }) {
  const { data, status, retry } = usePayrollVisibility();
  const rows = useMemo(() => {
    const all = [...(data?.upcoming ?? []), ...(data?.history ?? [])];
    return all.filter((p) => !f.status || p.status === f.status).sort((a, b) => (a.periodStart < b.periodStart ? 1 : a.periodStart > b.periodStart ? -1 : a.outletName.localeCompare(b.outletName)));
  }, [data, f.status]);

  const upcoming = rows.filter((p) => p.status === "upcoming");
  const next = [...upcoming].sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1))[0];
  const columns: Column<PayrollEntry>[] = [
    { key: "label", header: "Period", primary: true, cell: (p) => p.label },
    { key: "outlet", header: "Outlet", cell: (p) => p.outletName },
    { key: "range", header: "Pay period", cell: (p) => periodLabel(p.periodStart, p.periodEnd) },
    { key: "date", header: "Scheduled", cell: (p) => dayMonth(p.scheduledDate) },
    { key: "staff", header: "Workforce", align: "right", cell: (p) => p.workforceIncluded },
    { key: "status", header: "Status", cell: (p) => <StatusChip tone={p.status === "upcoming" ? "ok" : "mute"}>{p.status === "upcoming" ? "Upcoming" : "Completed"}</StatusChip> },
  ];

  return (
    <AnalyticsState status={status} retry={retry} what="the payroll schedule" height={300} empty={<ClientEmpty kind="payroll" inline height={260} />}>
      {rows.length === 0 ? (
        <NoMatch onClear={clear} />
      ) : (
        <>
          <MetricSummary
            ariaLabel="Payroll schedule summary"
            items={[
              { key: "next", label: "Next scheduled", value: next ? dayMonth(next.scheduledDate) : "-", sub: next ? monthYear(next.periodStart) : "Nothing scheduled", tone: "plum" },
              { key: "up", label: "Upcoming periods", value: upcoming.length },
              { key: "done", label: "Completed periods", value: rows.length - upcoming.length },
              { key: "wf", label: "Workforce in next", value: next ? next.workforceIncluded : "-", sub: next?.outletName },
            ]}
          />
          <AnalyticsPanel title="Payroll schedule and history" subtitle="Pay periods, most recent first" href="/client/payroll" hrefLabel="Open Payroll">
            <RecordsTable rows={rows} columns={columns} rowKey={(p) => p.id} caption="Payroll schedule" />
            <p className="mt-3 text-[12px] text-(--ap-muted)">Schedule visibility only. Payment amounts and salary figures aren&apos;t shown until Beeliv confirms them.</p>
          </AnalyticsPanel>
        </>
      )}
    </AnalyticsState>
  );
}
