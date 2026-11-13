"use client";

/**
 * The live part of /jobs below the hero. It is the SAME search / filters / list as the Applicant "Find Jobs"
 * page (components/shared/jobs/JobsExplorer), with the public card (PublicJobCard) and the public job-alert
 * pieces: the existing "Get job alerts" card, and on phones the same one-line bar pointing at the same
 * sign-up link (no alert is created here - signed-out visitors have no email on file).
 * Saved jobs are the guest bookmarks (lib/jobs/guest-saved.ts). The hero, "Why Beeliv" and the candidate
 * CTA stay in JobsShell (server).
 */
import Link from "next/link";
import { Bell, ChevronRight } from "@/components/applicant/icons";
import { JobsExplorer, type AlertSlots } from "@/components/shared/jobs/JobsExplorer";
import type { JobFilters } from "@/components/applicant/jobs/filters";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { useGuestSavedJobs } from "@/lib/jobs/guest-saved";
import { JOBS_ALERT_CARD } from "@/lib/public-site/jobs-content";
import { PublicJobCard } from "./PublicJobCard";

const ALERT: AlertSlots = {
  strip: () => (
    <div className="flex items-center gap-3 rounded-2xl bg-(--ap-tint) px-4 py-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--ap-violet) text-white">
        <Bell className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-[15px] text-(--ap-ink)">Get new roles first</span>
      <Link href={JOBS_ALERT_CARD.cta.href} className="inline-flex shrink-0 items-center gap-0.5 text-[15px] font-bold text-(--ap-violet) underline underline-offset-2">
        Create profile
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  ),
  card: ({ className }) => (
    <section aria-label="Job alerts" className={`flex flex-col gap-2.5 rounded-[18px] bg-(--deep-plum) p-[22px] text-white ${className}`}>
      <Bell className="size-5 text-(--antique-gold)" strokeWidth={1.7} aria-hidden="true" />
      <b className="text-lg">{JOBS_ALERT_CARD.title}</b>
      <p className="text-[15px] leading-[1.5] text-white/80">{JOBS_ALERT_CARD.body}</p>
      <Link href={JOBS_ALERT_CARD.cta.href} className="ps-btn ps-bw !h-[46px]">
        {JOBS_ALERT_CARD.cta.label}
      </Link>
    </section>
  ),
};

export function PublicJobsExplorer({ jobs, initialFilters, initialSaved }: { jobs: ApplicantJob[]; initialFilters: JobFilters; initialSaved: boolean }) {
  const savedIds = useGuestSavedJobs();
  return (
    <section className="mx-auto max-w-[calc(1440*var(--u))] px-[18px] pt-3 pb-16 max-[380px]:px-3.5 wf-d:px-[calc(96*var(--u))] wf-d:pb-[calc(110*var(--u))]">
      <JobsExplorer
        className="jc-public"
        jobs={jobs}
        initialFilters={initialFilters}
        initialSaved={initialSaved}
        savedIds={savedIds}
        renderCard={(job) => <PublicJobCard job={job} />}
        alert={ALERT}
      />
    </section>
  );
}
