"use client";

import { useState } from "react";
import { UsersRound } from "@/components/applicant/icons";
import { useWorkforceDistribution } from "@/lib/client/hooks";
import { formatPercent, share } from "@/lib/client/format";
import { analyticsFamilyHref, workforceHref } from "@/lib/client/links";
import { AnalyticsLink } from "../AnalyticsLink";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartLegend, ChartSkeleton, DonutChart, DEPARTMENT_COLOR } from "../charts";

/** Staff distribution by department: ring + legend with count and share. Each department drills into My Workforce. */
export function DistributionCard({ className = "" }: { className?: string }) {
  const { data, status, retry } = useWorkforceDistribution();
  const [hover, setHover] = useState<string | null>(null);
  const total = (data ?? []).reduce((n, d) => n + d.count, 0);
  const items = (data ?? []).map((d) => ({
    key: d.departmentId,
    label: d.label,
    value: d.count,
    percent: formatPercent(share(d.count, total)),
    color: DEPARTMENT_COLOR[d.departmentId],
    href: workforceHref({ department: d.departmentId }),
  }));

  return (
    <AnalyticsPanel title="Staff distribution" subtitle="Active staff by department" href={workforceHref()} hrefLabel="View workforce" className={className}>
      {status === "loading" ? <ChartSkeleton height={300} label="Loading staff distribution" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={300} /> : null}
      {status === "empty" ? <ChartEmptyState icon={UsersRound} title="No staff assigned yet" description="Once Beeliv assigns staff to your outlet, their departments appear here." height={260} /> : null}
      {status === "ready" ? (
        <div className="flex flex-col items-center gap-4">
          <DonutChart
            segments={items.map((i) => ({ key: i.key, label: i.label, value: i.value, color: i.color, href: i.href }))}
            centerValue={String(total)}
            centerLabel="Total staff"
            ariaLabel={`Staff distribution: ${items.map((i) => `${i.label} ${i.value}`).join(", ")}. ${total} in total.`}
            activeKey={hover}
            onActiveChange={setHover}
          />
          <ChartLegend items={items} ariaLabel="Staff by department" activeKey={hover} onHover={setHover} className="w-full" />
          <AnalyticsLink href={analyticsFamilyHref("workforce")} label="View analytics" className="w-full" />
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}
