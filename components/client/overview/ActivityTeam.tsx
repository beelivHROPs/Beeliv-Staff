"use client";

import Link from "next/link";
import { ChevronRight, FileText, UsersRound } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { Reveal } from "@/components/applicant/motion";
import { IconTile, type TileTone } from "@/components/applicant/SectionCard";
import { useRecentActivity } from "@/lib/client/hooks";
import { timeAgo } from "@/lib/client/format";
import type { ActivityItem, BeelivTeam } from "@/lib/client/types";
import { ClientAvatar } from "../ClientAvatar";
import { usePilotHidden } from "@/lib/pilot/context";
import { Activity as ActivityIcon, ClipboardList } from "../icons";
import { AnalyticsPanel, ChartEmptyState, ChartErrorState, ChartSkeleton } from "../charts";

const KIND: Record<ActivityItem["kind"], { icon: LucideIcon; tone: TileTone }> = {
  candidates: { icon: UsersRound, tone: "v" },
  request: { icon: ClipboardList, tone: "v" },
  compliance: { icon: FileText, tone: "a" },
  schedule: { icon: UsersRound, tone: "v" },
};

/** Recent operational updates: only things that really happened in the records (never padded with invented activity). */
export function ActivityCard({ className = "" }: { className?: string }) {
  const { data, status, retry } = useRecentActivity();
  const hidden = usePilotHidden();
  return (
    <AnalyticsPanel title="Recent activity" className={className}>
      {status === "loading" ? <ChartSkeleton height={220} label="Loading recent activity" /> : null}
      {status === "error" ? <ChartErrorState retry={retry} height={220} /> : null}
      {status === "empty" ? <ChartEmptyState icon={ActivityIcon} title="No recent updates" description="Updates about candidates, requests and documents will appear here." height={190} /> : null}
      {status === "ready" ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {(data ?? []).filter((a) => !hidden(a.href)).map((a) => {
            const k = KIND[a.kind];
            return (
              <li key={a.id} className="border-t border-(--ap-line-2) first:border-t-0">
                <Link href={a.href} className="flex items-start gap-3 py-2.5">
                  <IconTile icon={k.icon} tone={k.tone} className="size-9 rounded-xl" iconClassName="size-[17px]" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[14px] text-(--ap-ink)">{a.title}</b>
                    <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{a.detail}</span>
                    <span className="mt-0.5 block text-[12px] text-(--ap-faint)">{timeAgo(a.at)}</span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </AnalyticsPanel>
  );
}

/**
 * Your Beeliv team: a person, not a promo. The champagne-soft ground is the
 * one warm accent on the page. Phone / email appear only once Beeliv approves
 * contact channels (TBD); until then "Contact Beeliv" opens Support.
 */
export function TeamCard({ team, className = "" }: { team: BeelivTeam; className?: string }) {
  return (
    <Reveal as="section" aria-label="Your Beeliv team" className={`flex flex-wrap items-center gap-4 rounded-[18px] border border-(--ap-line) bg-(--client-champagne-soft) p-4.5 min-[768px]:p-5 ${className}`}>
      <ClientAvatar name={team.name} size={48} />
      <div className="min-w-0 flex-1 leading-tight">
        <span className="text-[11px] font-bold tracking-[.16em] text-(--ap-muted) uppercase">Your Beeliv team</span>
        <b className="mt-1 block text-[17px] text-(--ap-ink)">{team.name}</b>
        <span className="text-[14px] text-(--ap-muted)">{team.role} &middot; your main contact at Beeliv</span>
      </div>
      <Link href="/client/support" className="ap-btn ap-btn-s max-[480px]:w-full">
        Contact Beeliv
      </Link>
    </Reveal>
  );
}
