"use client";

import type { ReactNode } from "react";
import { useAttendanceSummary, useComplianceSummary, usePayrollVisibility, useRecruitmentSummary, useScheduleCoverage, useWorkforce } from "@/lib/client/hooks";
import { formatPercent, todayISO } from "@/lib/client/format";
import type { AnalyticsFamily } from "@/lib/client/links";
import type { Loadable } from "@/lib/client/types";
import { Briefcase, CalendarCheck, Clock3, FileText, ShieldCheck, UsersRound } from "@/components/applicant/icons";
import { HeroCard, IconDisc } from "@/components/shared/premium";
import { Chip, ChipRow } from "../phone";

type Glance = { key: AnalyticsFamily; label: string; value: ReactNode; sub: string; tone?: string };

const cell = (l: Loadable<unknown>, ready: () => { value: ReactNode; sub: string; tone?: string }) => {
  if (l.status === "loading") return { value: "...", sub: "Loading" };
  if (l.status === "error") return { value: "-", sub: "Couldn't load" };
  if (l.status === "restricted") return { value: "-", sub: "Restricted" };
  return ready();
};

/**
 * The hub's "At a glance" row: the key figure of each family, drawn from the
 * same hooks the operational pages and the family reports use, so the numbers
 * reconcile. Each card switches the family below.
 */
export function AtAGlance({ family, onPick }: { family: AnalyticsFamily; onPick: (f: AnalyticsFamily) => void }) {
  const today = todayISO();
  const workforce = useWorkforce();
  const attendance = useAttendanceSummary(today);
  const coverage = useScheduleCoverage(today);
  const recruitment = useRecruitmentSummary();
  const compliance = useComplianceSummary();
  const payroll = usePayrollVisibility();

  const open = (coverage.data ?? []).reduce((n, s) => n + Math.max(0, s.required - s.assigned), 0);
  const items: Glance[] = [
    { key: "workforce", label: "Workforce", ...cell(workforce, () => ({ value: workforce.data?.length ?? 0, sub: "Staff assigned" })) },
    { key: "attendance", label: "Attendance", ...cell(attendance, () => ({ value: attendance.data ? formatPercent(attendance.data.attendanceRate) : "-", sub: "Present today" })) },
    { key: "scheduling", label: "Scheduling", ...cell(coverage, () => ({ value: open, sub: open === 1 ? "Open position today" : "Open positions today", tone: open > 0 ? "text-(--ap-warn)" : "text-(--ap-ok)" })) },
    { key: "recruitment", label: "Recruitment", ...cell(recruitment, () => ({ value: recruitment.data?.awaitingFeedback ?? 0, sub: "Awaiting your feedback" })) },
    { key: "compliance", label: "Compliance", ...cell(compliance, () => ({ value: `${compliance.data?.percentComplete ?? 0}%`, sub: "Documents complete", tone: "text-(--ap-ok)" })) },
    { key: "payroll", label: "Payroll", ...cell(payroll, () => ({ value: payroll.data?.upcoming.length ?? 0, sub: "Upcoming pay periods" })) },
  ];

  return (
    <section aria-label="At a glance" className="flex flex-col gap-2.5">
      <h2 className="sr-only">At a glance</h2>
      <ChipRow label="Report type" className="min-[768px]:hidden">
        {items.map((g) => (
          <Chip key={g.key} on={g.key === family} onClick={() => onPick(g.key)}>
            {g.label}
          </Chip>
        ))}
      </ChipRow>
      {(() => {
        const cur = items.find((g) => g.key === family) ?? items[0];
        const ICON: Record<AnalyticsFamily, typeof Clock3> = { workforce: UsersRound, attendance: Clock3, scheduling: CalendarCheck, recruitment: Briefcase, compliance: ShieldCheck, payroll: FileText };
        const others = (["attendance", "compliance", "recruitment", "scheduling", "workforce", "payroll"] as AnalyticsFamily[]).filter((k) => k !== family).slice(0, 3);
        return (
          <div className="flex flex-col gap-3 min-[768px]:hidden">
            <HeroCard eyebrow={cur.label} ariaLabel={`${cur.label} key figure`}>
              <b className="block text-[52px] leading-none font-bold tabular-nums">{cur.value}</b>
              <span className="mt-1.5 block text-[14px] text-white/90">{cur.sub}</span>
            </HeroCard>
            <div className="grid grid-cols-3 gap-2.5">
              {others.map((k) => {
                const g = items.find((x) => x.key === k)!;
                return (
                  <button key={k} type="button" onClick={() => onPick(k)} aria-label={`${g.label}: ${g.value}, ${g.sub}. Open report`} className="flex min-h-[116px] min-w-0 flex-col justify-between gap-2 rounded-[20px] border border-(--ap-line) bg-(--ap-surface) p-3 text-left">
                    <IconDisc icon={ICON[k]} size={34} />
                    <span className="block min-w-0">
                      <b className="block text-[22px] leading-none font-bold text-(--ap-ink) tabular-nums">{g.value}</b>
                      <span className="mt-1 block truncate text-[12.5px] font-semibold text-(--ap-ink-2)">{g.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div className="grid grid-cols-2 gap-2 max-[767px]:hidden min-[768px]:grid-cols-3 min-[1241px]:grid-cols-6">
        {items.map((g) => {
          const on = g.key === family;
          return (
            <button key={g.key} type="button" aria-pressed={on} onClick={() => onPick(g.key)} className={`relative min-w-0 overflow-hidden rounded-xl border bg-(--ap-surface,#fff) px-3 py-2.5 text-left transition-colors hover:border-(--ap-violet) ${on ? "border-(--ap-violet)" : "border-(--ap-line)"}`}>
              <span className="block truncate text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{g.label}</span>
              <b className={`mt-1 block text-[22px] leading-none font-bold tracking-tight tabular-nums ${g.tone ?? "text-(--ap-ink)"}`}>{g.value}</b>
              <span className="mt-1 block text-[13px] leading-tight text-(--ap-muted)">{g.sub}</span>
              {on ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-(--ap-violet)" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
