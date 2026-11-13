"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, MapPin, Sparkles } from "@/components/applicant/icons";
import { cardState, type JobCardData } from "@/lib/jobs/card";
import { STATE_CHIP, daysBetween, todayIso } from "@/lib/jobs/status";
import { JobThumb } from "../primitives";
import { NotchCard } from "@/components/shared/premium/NotchCard";
import { SaveJobButton } from "./SaveJobButton";

/** Wireframe matchTag(): Sparkles + "Strong match" (violet/gold gradient) or "Good match" (neutral). */
export function MatchTag({ match }: { match: JobCardData["match"] }) {
  if (!match) return null;
  const strong = match === "Strong match";
  return (
    <span
      className={`mt-1 inline-flex h-6 items-center gap-[5px] rounded-full px-[9px] text-[13px] leading-none font-semibold whitespace-nowrap ${
        strong ? "bg-[linear-gradient(90deg,#F4E9FA,#FEF3C7)] text-(--ap-violet)" : "bg-(--ap-line-2) text-(--ap-ink-2)"
      }`}
    >
      <Sparkles className="size-[13px] text-(--ap-gold)" strokeWidth={1.6} aria-hidden="true" />
      {match}
    </span>
  );
}

/** Wireframe .pchip row: (status) · type · department · (shift) · pay (green). */
export function JobChips({
  job,
  withShift = false,
  withStatus = false,
  className = "",
}: {
  job: JobCardData;
  withShift?: boolean;
  /** Cards only: a "Closing soon" / "Closed" chip (§2.13). The job page shows its own status chip. */
  withStatus?: boolean;
  className?: string;
}) {
  const st = cardState(job);
  const chip = "inline-flex h-[30px] items-center rounded-full px-3 text-[13px] font-semibold whitespace-nowrap max-[767px]:h-7";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {withStatus ? (
        <span className={`${chip} ${st === "open" ? "bg-(--ap-ok-bg) text-(--ap-ok)" : st === "closing-soon" ? "bg-(--ap-warn-bg) text-(--ap-warn)" : "bg-(--ap-line-2) text-(--ap-muted)"}`}>
          {STATE_CHIP[st]}
        </span>
      ) : null}
      <span className={`${chip} bg-[rgba(91,8,123,.06)] text-(--ap-ink-2)`}>{job.employmentType}</span>
      <span className={`${chip} bg-[rgba(91,8,123,.06)] text-(--ap-ink-2)`}>{job.department}</span>
      {withShift ? <span className={`${chip} bg-[rgba(91,8,123,.06)] text-(--ap-ink-2)`}>{job.shift} shift</span> : null}
      {job.pay ? <span className={`${chip} bg-(--ap-ok-bg) text-(--ap-ok)`}>{job.pay}</span> : null}
    </div>
  );
}

export type JobCardState = { applied: boolean; draft: boolean };

/**
 * The ONE job card: used in the Applicant app and, through a thin wrapper (components/public/jobs/PublicJobCard),
 * on the public site (list, Home featured, related roles). Signed-out visitors pass `state={null}`: no applied
 * or draft state, no match tag. The Applicant app passes its own detail link and bookmark; the public wrapper
 * passes the public job page and a browser-only bookmark.
 */
export function JobCard({
  job,
  state,
  detailHref,
  saveSlot,
  showMatch = true,
}: {
  job: JobCardData;
  state: JobCardState | null;
  /** The job page this card opens. Default: the Applicant app's job page. */
  detailHref?: string;
  /** The bookmark control. Default: the Applicant app's saved-jobs bookmark. */
  saveSlot?: ReactNode;
  showMatch?: boolean;
}) {
  const detail = detailHref ?? `/applicant/jobs/${job.id}`;
  const draft = Boolean(state?.draft && !state.applied);
  const primaryHref = draft ? `/applicant/apply?job=${job.id}` : detail;

  const bookmark = saveSlot ?? <SaveJobButton jobId={job.id} role={job.role} className="-mt-1 -mr-1 max-[1100px]:-mt-2 max-[1100px]:-mr-2" />;
  const { badge, badgeLabel } = notchBadge(job);
  return (
    <JobShell badge={badge} badgeLabel={badgeLabel}>
      <div className="@container"><div className="grid grid-cols-[116px_minmax(0,1fr)] gap-x-5 @max-[420px]:grid-cols-[84px_minmax(0,1fr)] @max-[420px]:gap-x-3.5 @max-[330px]:grid-cols-[68px_minmax(0,1fr)]">
        <Link
          href={detail}
          tabIndex={-1}
          aria-hidden="true"
          className="flex size-[116px] overflow-hidden rounded-[14px] bg-[#F6EEF9] @max-[420px]:size-[84px] @max-[420px]:rounded-xl @max-[330px]:size-[68px] [&>span]:size-full! [&>span]:rounded-[inherit]! [&>span>svg]:size-[42%]!"
        >
          <JobThumb image={job.image} department={job.department} size={116} radius={14} />
        </Link>
        <div className="flex min-w-0 flex-col gap-[5px]">
          <div className="flex items-start justify-between gap-2.5 pr-[60px]">
            <Link
              href={detail}
              className="text-[19px] leading-[1.25] font-bold text-(--ap-ink) hover:text-(--ap-violet) max-[767px]:text-[17px]"
            >
              {job.role}
            </Link>
          </div>
          <div className={`text-[14px] leading-[1.5] text-(--ap-muted) pr-[60px]`}>{job.company}</div>
          {showMatch && job.match ? (
            <div>
              <MatchTag match={job.match} />
            </div>
          ) : null}
          <div className="flex items-center gap-1.5 text-[14px] leading-[1.5] text-(--ap-muted)">
            <MapPin className="size-[17px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
            {job.location}, Nigeria
          </div>
          <JobChips job={job} withStatus className="mt-2 @max-[420px]:hidden" />
        </div>
        {/* <=767px the chips span the full card width (the wireframe's own `.jc-chips{grid-column:1/-1}` intent),
            instead of wrapping one-per-line in the narrow text column. */}
        <JobChips job={job} withStatus className="col-span-full mt-3 @min-[421px]:hidden" />
      </div>
      </div>

      {/* Locked job-card template: when it was posted and when it closes are always visible. */}
      <p className="mt-3 text-[13px] text-(--ap-muted)">
        {job.postedLabel}
        {job.postedLabel && job.closes ? " · " : ""}
        {job.closes}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2.5 border-t border-(--ap-line) pt-3.5">
        {state?.applied ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ap-ok)">
            <Check className="size-[15px]" strokeWidth={1.6} aria-hidden="true" />
            Applied
          </span>
        ) : state?.draft ? (
          <span className="inline-flex h-7 items-center rounded-full bg-[#F8F3FA] px-[11px] text-[13px] font-semibold whitespace-nowrap text-(--ap-violet)">
            Draft saved
          </span>
        ) : (
          bookmark
        )}
        <Link
          href={primaryHref}
          className="border-b-[1.5px] border-current pb-0.5 text-base font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)"
        >
          {draft ? "Continue application →" : "View Role →"}
        </Link>
      </div>
    </JobShell>
  );
}

/** The notch card shell (the one job card look, in the Applicant app and on the public site). */
function JobShell({ badge, badgeLabel, children }: { badge: ReactNode; badgeLabel: string; children: ReactNode }) {
  return (
    <NotchCard as="article" tone="plain" wrap={false} badge={badge} badgeLabel={badgeLabel} bodyClassName="p-5 max-[767px]:p-3.5">
      {children}
    </NotchCard>
  );
}

const badgeText = (top: ReactNode, bottom: string) => (
  <span className="tabular-nums">
    <span className="block text-[18px] leading-none">{top}</span>
    <span className="block text-[11px] leading-none font-semibold">{bottom}</span>
  </span>
);

/** What the notch says: Closed (ended), "Nd left" within the 5-day closing-soon window, otherwise the openings count. */
function notchBadge(job: JobCardData): { badge: ReactNode; badgeLabel: string } {
  const st = cardState(job);
  if (st === "closed" || st === "filled") return { badge: <span className="text-[12px] font-bold">Closed</span>, badgeLabel: "Closed" };
  if (st === "closing-soon") {
    const t = Date.parse(`${job.closes.replace(/^Closes\s+/i, "")} UTC`);
    if (!Number.isNaN(t)) {
      const d = daysBetween(todayIso(), new Date(t).toISOString().slice(0, 10));
      if (d >= 0) return { badge: badgeText(d, d === 1 ? "day left" : "d left"), badgeLabel: d === 0 ? "Closes today" : `Closes in ${d} ${d === 1 ? "day" : "days"}` };
    }
    return { badge: <span className="text-[12px] font-bold">Soon</span>, badgeLabel: "Closing soon" };
  }
  return { badge: badgeText(job.openings, "open"), badgeLabel: job.openings > 1 ? `${job.openings} openings` : "1 opening" };
}
