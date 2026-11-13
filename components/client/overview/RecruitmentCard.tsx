"use client";

import Link from "next/link";
import { Briefcase, ChevronRight, Plus } from "@/components/applicant/icons";
import { useRecruitmentSummary } from "@/lib/client/hooks";
import { plural } from "@/lib/client/format";
import { NEW_REQUEST_HREF, recruitmentHref, requestHref } from "@/lib/client/links";
import type { RecruitmentPosition } from "@/lib/client/types";
import { StatusChip, type ChipTone } from "../StatusChip";
import { usePilotHidden } from "@/lib/pilot/context";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartSkeleton } from "../charts";

const MAX = 3;

function stateChip(p: RecruitmentPosition): { tone: ChipTone; label: string } {
  if (p.state === "candidates-ready") return { tone: "plum", label: `${plural(p.candidatesReady, "candidate")} ready for review` };
  if (p.state === "screening") return { tone: "info", label: `${p.candidatesScreening} in screening` };
  return { tone: "mute", label: "Recruitment in progress" };
}

/**
 * "Recruitment & staffing needs" (brief section 15): the client-relevant view
 * of hiring for THEIR outlet. It is NOT Beeliv's pipeline - no applications /
 * interview / approval stages. Only candidates Beeliv HR deliberately
 * submitted are actionable; screening is a count with no names. The last tile
 * opens the Workforce Request flow (it never publishes a vacancy).
 */
export function RecruitmentCard({ showOutlet, className = "" }: { showOutlet: boolean; className?: string }) {
  const { data, status, retry } = useRecruitmentSummary();
  // Pilot menu: Recruitment / Candidates is hidden, so each position opens its request instead.
  const recruitmentHidden = usePilotHidden()(recruitmentHref());
  const ranked = [...(data?.positions ?? [])].sort((a, b) => (a.state === "candidates-ready" ? 0 : 1) - (b.state === "candidates-ready" ? 0 : 1));
  const shown = ranked.slice(0, MAX);

  return (
    <AnalyticsPanel
      title="Recruitment & staffing needs"
      href={recruitmentHref()}
      hrefLabel="View recruitment"
      right={
        data && data.openPositions > 0 ? (
          <Link href={requestHref()} className="inline-flex h-7 items-center rounded-full bg-(--ap-tint) px-3 text-[12px] font-bold text-(--ap-violet) hover:bg-(--ap-tint-2)">
            {plural(data.openPositions, "open position")}
          </Link>
        ) : null
      }
      className={className}
    >
      {status === "loading" ? <ChartSkeleton height={190} label="Loading recruitment" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={190} /> : null}
      {status === "empty" ? (
        <ChartEmptyState
          icon={Briefcase}
          title="No recruitment activity"
          description="When you ask Beeliv for staff, the progress of each request shows up here."
          height={170}
          action={
            <Link href={NEW_REQUEST_HREF} className="ap-btn ap-btn-p ap-btn-sm mt-1 text-white!">
              <Plus className="size-4" aria-hidden="true" /> Request staff
            </Link>
          }
        />
      ) : null}
      {status === "ready" ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[520px]:grid-cols-2">
          {shown.map((p) => {
            const chip = stateChip(p);
            return (
              <li key={p.id}>
                <Link href={recruitmentHidden ? requestHref(p.requestId ?? undefined) : p.state === "candidates-ready" ? recruitmentHref({ status: "awaiting-feedback" }) : p.requestId ? requestHref(p.requestId) : recruitmentHref()} className="flex h-full min-h-[104px] flex-col justify-between gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-3.5 hover:border-(--ap-tint-2)">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 leading-tight">
                      <b className="block text-[15px] text-(--ap-ink)">{p.title}</b>
                      <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">
                        {showOutlet ? `${p.outletName} · ` : ""}
                        {plural(p.openings, "opening")}
                      </span>
                    </span>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                  </span>
                  <span>
                    <StatusChip tone={chip.tone}>{chip.label}</StatusChip>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href={NEW_REQUEST_HREF} className="flex h-full min-h-[104px] flex-col items-start justify-center gap-1.5 rounded-xl border border-dashed border-(--ap-tint-2) p-3.5 hover:bg-(--ap-tint-soft)">
              <span className="flex size-9 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
                <Plus className="size-[18px]" aria-hidden="true" />
              </span>
              <b className="text-[15px] text-(--ap-ink)">Request staff</b>
              <span className="text-[13px] leading-snug text-(--ap-muted)">Tell Beeliv what you need. We&apos;ll handle the hiring.</span>
            </Link>
          </li>
        </ul>
      ) : null}
    </AnalyticsPanel>
  );
}
