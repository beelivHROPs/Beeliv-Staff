"use client";

import { useState } from "react";
import { Clock3 } from "@/components/applicant/icons";
import { useAttendanceSummary } from "@/lib/client/hooks";
import { formatPercent, share, todayISO } from "@/lib/client/format";
import { analyticsFamilyHref, attendanceHref } from "@/lib/client/links";
import type { AttendanceStatus } from "@/lib/client/types";
import { AnalyticsLink } from "../AnalyticsLink";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartLegend, ChartSkeleton, DonutChart, STATUS_COLOR, STATUS_LABEL, type LegendItem } from "../charts";

const ORDER: AttendanceStatus[] = ["present", "late", "absent", "on-leave"];

/** Attendance today: one restrained ring, legend below (each row drills into the filtered records). */
export function AttendanceTodayCard({ className = "" }: { className?: string }) {
  const today = todayISO();
  const { data, status, retry } = useAttendanceSummary(today);
  const [hover, setHover] = useState<string | null>(null);

  const values: Record<AttendanceStatus, number> = data ? { present: data.present, late: data.late, absent: data.absent, "on-leave": data.onLeave } : { present: 0, late: 0, absent: 0, "on-leave": 0 };
  const items: LegendItem[] = ORDER.map((s) => ({
    key: s,
    label: STATUS_LABEL[s],
    value: values[s],
    percent: data ? formatPercent(share(values[s], data.scheduled)) : "",
    color: STATUS_COLOR[s],
    href: attendanceHref({ status: s, date: "today" }),
  }));

  return (
    <AnalyticsPanel title="Attendance today" href={attendanceHref({ date: "today" })} hrefLabel="View details" className={className}>
      {status === "loading" ? <ChartSkeleton height={290} label="Loading attendance today" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={290} /> : null}
      {status === "empty" ? <ChartEmptyState icon={Clock3} title="No attendance records today" description="Attendance appears here once your staff are scheduled and clock in." height={260} /> : null}
      {status === "ready" && data ? (
        <div className="flex flex-col items-center gap-4">
          <DonutChart
            segments={items.map((i) => ({ key: i.key, label: i.label, value: Number(i.value), color: i.color, href: i.href }))}
            centerValue={formatPercent(data.attendanceRate)}
            centerLabel="Present"
            ariaLabel={`Attendance today: ${data.present} of ${data.scheduled} scheduled present, ${data.late} late, ${data.absent} absent, ${data.onLeave} on leave.`}
            activeKey={hover}
            onActiveChange={setHover}
          />
          <ChartLegend items={items} ariaLabel="Attendance today by status" activeKey={hover} onHover={setHover} className="w-full" />
          <AnalyticsLink href={analyticsFamilyHref("attendance", { range: "7d" })} label="View analytics" className="w-full" />
        </div>
      ) : null}
    </AnalyticsPanel>
  );
}
