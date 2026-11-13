"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3 } from "@/components/applicant/icons";
import { useAttendanceRecords } from "@/lib/client/hooks";
import { formatClock, todayISO } from "@/lib/client/format";
import { attendanceHref, SCHEDULES_HREF } from "@/lib/client/links";
import type { AttendanceRecord } from "@/lib/client/types";
import { DEPARTMENT_LABEL, SHIFTS } from "@/lib/client/labels";
import { PersonPhoto } from "../PersonPhoto";
import { AttendanceChip } from "../StatusChip";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartSkeleton } from "../charts";

type Tab = "on-shift" | "absent" | "on-leave";
const TABS: { key: Tab; label: string }[] = [
  { key: "on-shift", label: "On shift" },
  { key: "absent", label: "Absent" },
  { key: "on-leave", label: "On leave" },
];
const ROWS = 6;

const inTab = (r: AttendanceRecord, t: Tab) => (t === "on-shift" ? r.clockIn !== null : t === "absent" ? r.status === "absent" : r.status === "on-leave");

/**
 * "Today's workforce": who is on today, by tab (On shift / Absent / On leave).
 * A table on desktop, a card list on phones (never a squeezed table). Rows are
 * the SAME attendance records the tiles and donut count. The tab labels are
 * display groupings of recorded status, not new rules: "On shift" = has a
 * recorded clock-in.
 */
export function WorkforceToday({ className = "" }: { className?: string }) {
  const today = todayISO();
  const { data, status, retry } = useAttendanceRecords(today, today);
  const [tab, setTab] = useState<Tab>("on-shift");
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, (data ?? []).filter((r) => inTab(r, t.key)).length])) as Record<Tab, number>, [data]);
  const rows = useMemo(() => (data ?? []).filter((r) => inTab(r, tab)).slice(0, ROWS), [data, tab]);

  return (
    <AnalyticsPanel title="Today's workforce" href={attendanceHref({ date: "today", status: tab === "on-shift" ? "checked-in" : tab })} hrefLabel="View all" className={className}>
      {status === "loading" ? <ChartSkeleton height={300} label="Loading today's workforce" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={300} /> : null}
      {status === "empty" ? <ChartEmptyState icon={Clock3} title="No attendance recorded today" description="When your staff are scheduled and clock in, they'll appear here. Nothing is estimated in the meantime." height={260} /> : null}
      {status === "ready" ? (
        <>
          <div role="group" aria-label="Filter today's workforce" className="mb-3 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold ${tab === t.key ? "bg-(--ap-violet) text-white" : "bg-(--ap-tint) text-(--ap-violet) hover:bg-(--ap-tint-2)"}`}
              >
                {t.label}
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] ${tab === t.key ? "bg-white/20" : "bg-(--ap-surface)"}`}>{counts[t.key]}</span>
              </button>
            ))}
            <Link href={SCHEDULES_HREF} className="ml-auto hidden text-[13px] font-bold text-(--ap-violet) min-[768px]:inline">
              View schedule
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl bg-(--ap-tint-soft) px-4 py-6 text-center text-[14px] text-(--ap-muted)">
              {tab === "absent" ? "No one is recorded absent today." : tab === "on-leave" ? "No one is on leave today." : "No one has clocked in yet."}
            </p>
          ) : (
            <>
              {/* Desktop / tablet: table */}
              <div className="max-[767px]:hidden">
                <table className="w-full border-collapse text-left text-[14px]">
                  <caption className="sr-only">Staff on the selected list today</caption>
                  <thead>
                    <tr className="text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
                      <th scope="col" className="pb-2 font-bold">Name</th>
                      <th scope="col" className="pb-2 font-bold">Role</th>
                      <th scope="col" className="pb-2 font-bold max-[1100px]:hidden">Department</th>
                      <th scope="col" className="pb-2 font-bold">Shift</th>
                      <th scope="col" className="pb-2 text-right font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-(--ap-line-2)">
                        <td className="py-2.5 pr-3">
                          <span className="flex items-center gap-2.5">
                            <PersonPhoto name={r.staffName} size={30} />
                            <b className="font-semibold text-(--ap-ink)">{r.staffName}</b>
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-(--ap-ink-2)">{r.role}</td>
                        <td className="py-2.5 pr-3 text-(--ap-ink-2) max-[1100px]:hidden">{DEPARTMENT_LABEL[r.departmentId]}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2)">
                          {SHIFTS[r.shift].label}
                          {r.clockIn ? <span className="block text-[12px] text-(--ap-muted)">In {formatClock(r.clockIn)}</span> : null}
                        </td>
                        <td className="py-2.5 text-right">
                          <AttendanceChip status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phone: card list */}
              <ul className="m-0 flex list-none flex-col p-0 min-[768px]:hidden">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-t border-(--ap-line-2) py-2.5 first:border-t-0">
                    <PersonPhoto name={r.staffName} size={38} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block truncate text-[15px]">{r.staffName}</b>
                      <span className="block truncate text-[13px] text-(--ap-muted)">
                        {r.role} &middot; {SHIFTS[r.shift].label}
                      </span>
                    </span>
                    <AttendanceChip status={r.status} />
                  </li>
                ))}
              </ul>
              {counts[tab] > ROWS ? <p className="mt-2 text-[13px] text-(--ap-muted)">Showing {ROWS} of {counts[tab]}.</p> : null}
            </>
          )}
        </>
      ) : null}
    </AnalyticsPanel>
  );
}
