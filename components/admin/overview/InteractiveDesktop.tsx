"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ChartLegend, DonutChart, StackedBarChart, STATUS_LABEL } from "@/components/client/charts";
import type { StackedBarPoint } from "@/components/client/charts";
import { dayLabel, timeOfDay } from "@/lib/admin/format";
import type { HrOverview } from "@/lib/admin/types";
import { ATTENDANCE_COLORS, DEPT_COLORS } from "./meta";
import { Flat, FlatEmpty } from "./Flat";

/* ---------- Attendance overview (stacked bars, This week selector) ---------- */

export function AttendancePanel({ periods, className = "" }: { periods: HrOverview["attendance"]; className?: string }) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const days = period?.days ?? [];
  const total = days.reduce((n, d) => n + d.present + d.late + d.absent + d.onLeave, 0);

  const points: StackedBarPoint[] = days.map((d) => ({
    id: d.id,
    label: d.label,
    sub: d.sub,
    title: d.title,
    segments: [
      { key: "present", label: STATUS_LABEL.present, value: d.present, color: ATTENDANCE_COLORS.present },
      { key: "late", label: STATUS_LABEL.late, value: d.late, color: ATTENDANCE_COLORS.late },
      { key: "absent", label: STATUS_LABEL.absent, value: d.absent, color: ATTENDANCE_COLORS.absent },
      { key: "on-leave", label: STATUS_LABEL["on-leave"], value: d.onLeave, color: ATTENDANCE_COLORS.onLeave },
    ],
  }));

  const keyItems = [
    { key: "present", label: STATUS_LABEL.present, color: ATTENDANCE_COLORS.present },
    { key: "late", label: STATUS_LABEL.late, color: ATTENDANCE_COLORS.late },
    { key: "absent", label: STATUS_LABEL.absent, color: ATTENDANCE_COLORS.absent },
    { key: "on-leave", label: STATUS_LABEL["on-leave"], color: ATTENDANCE_COLORS.onLeave },
  ];

  return (
    <Flat title="Attendance overview" href="/admin/workforce/attendance" hrefLabel="Open" className={className}>
      {!period || total === 0 ? (
        <FlatEmpty title="No attendance for this period" description="Present, late, absent and on-leave counts show here once attendance is recorded." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <ul aria-label="Attendance key" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
              {keyItems.map((k) => (
                <li key={k.key} className="flex items-center gap-1.5 text-[13px] text-(--ap-ink-2)">
                  <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: k.color }} />
                  {k.label}
                </li>
              ))}
            </ul>
            {periods.length > 1 ? (
              <div className="w-[132px] shrink-0">
                <SelectMenu variant="compact" label="Attendance period" value={period.id} onChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} className="w-full justify-between" />
              </div>
            ) : null}
          </div>
          <StackedBarChart points={points} height={230} summary={`Attendance by day, ${period.label.toLowerCase()}. Present, late, absent and on leave.`} />
        </div>
      )}
    </Flat>
  );
}

/* ---------- Applicants by department (donut + legend) ---------- */

export function DepartmentPanel({ items, className = "" }: { items: HrOverview["applicantsByDepartment"]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = items.reduce((n, d) => n + d.count, 0);
  return (
    <Flat title="Applicants by department" className={className}>
      {total === 0 ? (
        <FlatEmpty title="No applicants yet" description="Applicants are grouped by the department they applied to." />
      ) : (
        <div className="@container"><div className="flex flex-col items-center gap-4 @min-[400px]:flex-row">
          <DonutChart
            size={148}
            thickness={16}
            centerValue={String(total)}
            centerLabel="applicants"
            ariaLabel={`${total} applicants: ${items.map((d) => `${d.label} ${d.count}`).join(", ")}`}
            segments={items.map((d, i) => ({ key: d.id, label: d.label, value: d.count, color: DEPT_COLORS[i % DEPT_COLORS.length] }))}
            activeKey={active}
            onActiveChange={setActive}
          />
          <ChartLegend
            className="w-full min-w-0 flex-1"
            ariaLabel="Applicants by department"
            activeKey={active}
            onHover={setActive}
            items={items.map((d, i) => ({ key: d.id, label: d.label, value: d.count, percent: `${Math.round((d.count / total) * 100)}%`, color: DEPT_COLORS[i % DEPT_COLORS.length] }))}
          />
        </div></div>
      )}
    </Flat>
  );
}

/* ---------- Upcoming tasks (checkbox list, count badge). Ticks are local to this screen in the prototype. ---------- */

export function TasksPanel({ tasks, className = "" }: { tasks: HrOverview["tasks"]; className?: string }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(tasks.map((t) => [t.id, t.done])));
  const open = tasks.filter((t) => !done[t.id]).length;
  const badge =
    tasks.length > 0 ? (
      <span aria-label={`${open} open`} className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-(--ap-tint) px-1.5 text-[13px] font-bold text-(--ap-violet) tabular-nums">
        {open}
      </span>
    ) : null;
  return (
    <Flat title="Upcoming tasks" action={badge} className={className}>
      {tasks.length === 0 ? (
        <FlatEmpty title="No tasks" description="Tasks assigned to you show here with their due time." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {tasks.map((t, i) => {
            const on = !!done[t.id];
            const body = (
              <>
                <span className={`block text-[14px] leading-snug ${on ? "text-(--ap-muted) line-through" : "font-semibold text-(--ap-ink)"}`}>{t.title}</span>
                {t.dueAt ? (
                  <span className="block text-[13px] text-(--ap-muted)">
                    {dayLabel(t.dueAt)}, {timeOfDay(t.dueAt)}
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={t.id} className={`flex items-start gap-3 min-h-12 py-2 ${i > 0 ? "border-t border-(--ap-line-2)" : ""}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Mark done: ${t.title}`}
                  onClick={() => setDone((d) => ({ ...d, [t.id]: !on }))}
                  className="ap-hit -m-1.5 flex size-11 shrink-0 items-center justify-center min-[768px]:size-9"
                >
                  <span className={`flex size-5 items-center justify-center rounded-md border-[1.5px] transition-colors ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-faint) bg-(--ap-surface)"}`} aria-hidden="true">
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                </button>
                {t.href ? (
                  <Link href={t.href} className="min-w-0 flex-1">
                    {body}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1">{body}</span>
                )}
                {t.href ? <ChevronRight className="mt-1 size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Flat>
  );
}
