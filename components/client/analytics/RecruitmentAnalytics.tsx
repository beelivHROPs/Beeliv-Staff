"use client";

import Link from "next/link";
import { useMemo } from "react";
import { plural } from "@/lib/client/format";
import { useRecruitmentSummary, useWorkforceRequests } from "@/lib/client/hooks";
import { DEPARTMENT_LABEL } from "@/lib/client/labels";
import { recruitmentHref, requestHref } from "@/lib/client/links";
import type { PositionState, RecruitmentPosition } from "@/lib/client/types";
import { AnalyticsPanel, MetricSummary } from "../charts";
import { TRACK } from "../charts/colors";
import { StatusChip, type ChipTone } from "../StatusChip";
import { ClientEmpty } from "../states";
import { RecordsTable, type Column } from "./RecordsTable";
import { NoMatch, AnalyticsState, type AnalyticsFilters } from "./shared";

export const POSITION_STATE: Record<PositionState, { label: string; tone: ChipTone }> = {
  "candidates-ready": { label: "Candidates ready", tone: "plum" },
  screening: { label: "In screening", tone: "info" },
  "in-progress": { label: "In progress", tone: "mute" },
};

/**
 * Recruitment report: the client-relevant view of hiring, not Beeliv's internal
 * pipeline. Each open position shows candidates Beeliv has submitted for your
 * review against the openings you asked for; screening is a count only, no
 * names. Department and role come from the workforce request behind each position.
 */
export function RecruitmentAnalytics({ f, clear }: { f: AnalyticsFilters; clear: () => void }) {
  const rec = useRecruitmentSummary();
  const reqs = useWorkforceRequests();
  const status = rec.status !== "ready" ? rec.status : reqs.status === "empty" ? "ready" : reqs.status;
  const retry = () => {
    rec.retry();
    reqs.retry();
  };

  const positions = useMemo(() => {
    const byId = new Map((reqs.data ?? []).map((r) => [r.id, r]));
    return (rec.data?.positions ?? []).filter((p) => {
      const r = p.requestId ? byId.get(p.requestId) : undefined;
      return (!f.department || r?.departmentId === f.department) && (!f.role || r?.role === f.role) && (!f.status || p.state === f.status);
    });
  }, [rec.data, reqs.data, f.department, f.role, f.status]);
  const deptOf = (p: RecruitmentPosition) => {
    const r = (reqs.data ?? []).find((x) => x.id === p.requestId);
    return r ? DEPARTMENT_LABEL[r.departmentId] : "-";
  };

  const openings = positions.reduce((n, p) => n + p.openings, 0);
  const ready = positions.reduce((n, p) => n + p.candidatesReady, 0);
  const screening = positions.reduce((n, p) => n + p.candidatesScreening, 0);

  const columns: Column<RecruitmentPosition>[] = [
    { key: "role", header: "Role", primary: true, cell: (p) => p.title },
    { key: "outlet", header: "Outlet", cell: (p) => p.outletName },
    { key: "dept", header: "Department", cell: deptOf },
    { key: "openings", header: "Openings", align: "right", cell: (p) => p.openings },
    { key: "ready", header: "Ready", align: "right", cell: (p) => p.candidatesReady },
    { key: "screening", header: "Screening", align: "right", cell: (p) => p.candidatesScreening },
    { key: "state", header: "Status", cell: (p) => <StatusChip tone={POSITION_STATE[p.state].tone}>{POSITION_STATE[p.state].label}</StatusChip> },
  ];

  return (
    <AnalyticsState status={status} retry={retry} what="the recruitment report" height={300} empty={<ClientEmpty kind="recruitment" inline height={260} />}>
      {positions.length === 0 ? (
        <NoMatch onClear={clear} />
      ) : (
        <>
          <MetricSummary
            ariaLabel="Recruitment summary"
            items={[
              { key: "open", label: "Open positions", value: openings, sub: plural(positions.length, "role"), href: recruitmentHref() },
              { key: "ready", label: "Candidates ready", value: ready, sub: "awaiting your feedback", tone: "plum", href: recruitmentHref({ status: "awaiting-feedback" }) },
              { key: "screen", label: "In screening", value: screening, sub: "with Beeliv" },
              { key: "roles", label: "Roles being recruited", value: positions.length },
            ]}
          />
          <AnalyticsPanel title="Candidates against openings" subtitle="Ready for your review, by role" href={recruitmentHref()} hrefLabel="Open Recruitment">
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {positions.map((p) => {
                const pct = p.openings > 0 ? Math.min(100, Math.round((p.candidatesReady / p.openings) * 100)) : 0;
                const chip = POSITION_STATE[p.state];
                return (
                  <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 leading-tight">
                        <b className="block text-[15px] text-(--ap-ink)">{p.title}</b>
                        <span className="block text-[13px] text-(--ap-muted)">
                          {p.outletName} · {plural(p.openings, "opening")}
                        </span>
                      </span>
                      <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                    </div>
                    <span className="block h-2 overflow-hidden rounded-full" style={{ background: TRACK }} role="progressbar" aria-label={`${p.title}: ${p.candidatesReady} candidates ready for ${plural(p.openings, "opening")}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                      <span className="block h-full rounded-full bg-(--ap-violet)" style={{ width: `${pct}%` }} />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-(--ap-ink-2)">
                      <span>
                        {plural(p.candidatesReady, "candidate")} ready · {p.candidatesScreening} in screening
                      </span>
                      {p.requestId ? (
                        <Link href={requestHref(p.requestId)} className="ap-hit font-bold text-(--ap-violet)">
                          View request
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </AnalyticsPanel>
          <AnalyticsPanel title="Recruitment records" subtitle="Open positions for your outlets">
            <RecordsTable rows={positions} columns={columns} rowKey={(p) => p.id} rowHref={(p) => (p.requestId ? requestHref(p.requestId) : undefined)} caption="Recruitment" />
          </AnalyticsPanel>
        </>
      )}
    </AnalyticsState>
  );
}
