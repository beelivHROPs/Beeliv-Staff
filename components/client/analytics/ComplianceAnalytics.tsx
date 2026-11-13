"use client";

import { useMemo, useState } from "react";
import { useIsPhone } from "@/components/applicant/motion";
import { dayMonth } from "@/lib/client/format";
import { useDocuments, useWorkforce } from "@/lib/client/hooks";
import { DEPARTMENT_LABEL } from "@/lib/client/labels";
import { complianceHref } from "@/lib/client/links";
import type { ComplianceItem, ComplianceState } from "@/lib/client/types";
import { AnalyticsPanel, ChartLegend, DonutChart, MetricSummary, type LegendItem } from "../charts";
import { StatusChip, type ChipTone } from "../StatusChip";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { NoMatch, AnalyticsState, type AnalyticsFilters } from "./shared";

export const COMPLIANCE_STATE: Record<ComplianceState, { label: string; tone: ChipTone; color: string }> = {
  complete: { label: "Complete", tone: "ok", color: "var(--ap-ok)" },
  outstanding: { label: "Outstanding", tone: "bad", color: "var(--ap-rose)" },
  expiring: { label: "Expiring soon", tone: "warn", color: "var(--ap-warn)" },
  "update-required": { label: "Update required", tone: "info", color: "var(--ap-info)" },
};
const ORDER: ComplianceState[] = ["complete", "outstanding", "expiring", "update-required"];

/**
 * Compliance report: completion as a ring with a legend that drills into the
 * filtered records, then the records. Operational documents only - identity
 * and banking documents are never listed to Clients. Department and role come
 * from each document's staff member. The percentage is rounded DOWN so it
 * never overstates. The status filter narrows the records table only.
 */
export function ComplianceAnalytics({ f, clear }: { f: AnalyticsFilters; clear: () => void }) {
  const phone = useIsPhone();
  const docs = useDocuments();
  const staff = useWorkforce();
  const [hover, setHover] = useState<string | null>(null);
  const status = docs.status === "ready" || docs.status === "empty" ? (staff.status === "ready" || staff.status === "empty" ? docs.status : staff.status) : docs.status;
  const retry = () => {
    docs.retry();
    staff.retry();
  };

  const base = useMemo(() => {
    const byId = new Map((staff.data ?? []).map((m) => [m.id, m]));
    return (docs.data ?? []).filter((d) => {
      const m = byId.get(d.memberId);
      return (!f.department || m?.departmentId === f.department) && (!f.role || m?.role === f.role);
    });
  }, [docs.data, staff.data, f.department, f.role]);
  const count = (s: ComplianceState) => base.filter((d) => d.state === s).length;
  const complete = count("complete");
  const pct = base.length ? Math.floor((complete / base.length) * 100) : 0;
  const attention = base.length - complete;
  const legend: LegendItem[] = ORDER.map((s) => ({ key: s, label: COMPLIANCE_STATE[s].label, value: count(s), color: COMPLIANCE_STATE[s].color, href: complianceHref({ status: s === "complete" ? undefined : s }) }));

  const rows = useMemo(() => {
    const list = f.status ? base.filter((d) => d.state === f.status) : [...base];
    // Attention first, then by staff name.
    return list.sort((a, b) => Number(a.state === "complete") - Number(b.state === "complete") || a.staffName.localeCompare(b.staffName));
  }, [base, f.status]);
  const deptOf = (d: ComplianceItem) => {
    const m = (staff.data ?? []).find((x) => x.id === d.memberId);
    return m ? DEPARTMENT_LABEL[m.departmentId] : "-";
  };
  const columns: Column<ComplianceItem>[] = [
    { key: "staff", header: "Staff", primary: true, cell: (d) => d.staffName },
    { key: "doc", header: "Document", cell: (d) => d.document },
    { key: "dept", header: "Department", cell: deptOf },
    { key: "state", header: "Status", cell: (d) => <StatusChip tone={COMPLIANCE_STATE[d.state].tone}>{COMPLIANCE_STATE[d.state].label}</StatusChip> },
    { key: "exp", header: "Expires", cell: (d) => (d.expiresOn ? dayMonth(d.expiresOn) : "-") },
  ];

  return (
    <AnalyticsState status={status} retry={retry} what="the compliance report" height={320} empty={<ClientEmpty kind="compliance" inline height={260} />}>
      {base.length === 0 ? (
        <NoMatch onClear={clear} />
      ) : (
        <>
          <MetricSummary
            ariaLabel="Compliance summary"
            items={[
              { key: "pct", label: "Compliant", value: `${pct}%`, sub: `${complete} of ${base.length} documents`, tone: "plum" },
              { key: "out", label: "Outstanding", value: count("outstanding"), tone: count("outstanding") ? "bad" : undefined, href: complianceHref({ status: "outstanding" }) },
              { key: "exp", label: "Expiring soon", value: count("expiring"), tone: count("expiring") ? "warn" : undefined, href: complianceHref({ status: "expiring" }) },
              { key: "upd", label: "Update required", value: count("update-required"), tone: count("update-required") ? "info" : undefined, href: complianceHref({ status: "update-required" }) },
            ]}
          />
          <AnalyticsPanel title="Completion" subtitle="Operational documents by status" href={complianceHref()} hrefLabel="Open Compliance">
            <div className="flex flex-col items-center gap-5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:gap-8">
              <DonutChart
                size={phone ? 150 : 168}
                segments={legend.map((i) => ({ key: i.key, label: i.label, value: Number(i.value), color: i.color, href: i.href }))}
                centerValue={`${pct}%`}
                centerLabel="Compliant"
                ariaLabel={`Compliance ${pct}%: ${complete} of ${base.length} complete, ${count("outstanding")} outstanding, ${count("expiring")} expiring soon, ${count("update-required")} update required.`}
                activeKey={hover}
                onActiveChange={setHover}
              />
              <div className="w-full min-w-0 flex-1">
                <ChartLegend items={legend} ariaLabel="Compliance by status" activeKey={hover} onHover={setHover} />
                <p className="mt-3 border-t border-(--ap-line-2) pt-2.5 text-[13px] text-(--ap-muted)">
                  {attention === 0 ? "No compliance issues. Every operational document is complete." : "Identity and banking documents stay restricted to Beeliv."}
                </p>
              </div>
            </div>
          </AnalyticsPanel>
          <AnalyticsPanel title="Compliance records" subtitle={f.status ? `Filtered to ${COMPLIANCE_STATE[f.status as ComplianceState].label}` : "Needing attention first"} href={complianceHref()} hrefLabel="Open in Compliance">
            {rows.length === 0 ? <NoMatch onClear={clear} height={150} /> : <RecordsTable rows={rows} columns={columns} rowKey={(d) => d.id} caption="Compliance" />}
          </AnalyticsPanel>
        </>
      )}
    </AnalyticsState>
  );
}
