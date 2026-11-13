"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { BriefcaseBusiness, Bookmark, Check, ChevronLeft, Share, ShieldCheck } from "@/components/applicant/icons";
import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { useApplicantStore } from "@/lib/applicant/service";
import { useSavedJobs } from "@/lib/applicant/saved";
import { screeningQuestionsFor } from "@/lib/applicant/screening";
import { experienceLabel, formatLongDate, salaryLabel } from "@/lib/public-site/job-details";
import { BackHeader } from "@/components/shared/mobile/BackHeader";
import { StickyActionBar } from "@/components/shared/mobile/StickyActionBar";
import { JobStickySummary } from "@/components/shared/jobs/JobStickySummary";
import { JobCover } from "./primitives";
import { shareJob, toggleSaveWithToast } from "./jobs/SaveJobButton";
import { LIST_SEARCH_KEY } from "./jobs/filters";
import { JobDetailSections } from "./jobs/JobDetailSections";
import { AxFacts } from "./ax";

const noopSubscribe = () => () => {};
function readListSearch(): string {
  try {
    return window.sessionStorage.getItem(LIST_SEARCH_KEY) ?? "";
  } catch {
    return ""; // sessionStorage unavailable - plain list link.
  }
}

/**
 * Job detail, calm version (sample redesign).
 *  Phone: back-arrow bar (share + save on the right), one photo, title, a short facts list in one
 *  hairline container, plain sections, and a sticky full-width Apply pill.
 *  Desktop: the same content in a wide column, with the facts + Apply button in a sticky side column.
 * Content, apply/draft/closed logic and the screening list are unchanged (requirements §2.15 order).
 */
export function JobBody({ job }: { job: Job }) {
  const store = useApplicantStore();
  const saved = useSavedJobs().includes(job.id);
  const submitted = store.applications.find((a) => a.vacancyId === job.id && a.lifecycle !== "draft");
  const draft = store.applications.find((a) => a.vacancyId === job.id && a.lifecycle === "draft");
  const closed = Boolean(job.closed);
  const questions = useMemo(() => screeningQuestionsFor(job), [job]);
  const shownStatus: Job["status"] = closed && job.status === "Published" ? "Closed" : job.status;

  // "All jobs" returns to the list exactly as it was left (search, filters, Saved tab).
  const listSearch = useSyncExternalStore(noopSubscribe, readListSearch, () => "");
  const backHref = `/applicant/jobs${listSearch}`;

  const applyHref = `/applicant/apply?job=${job.id}`;
  const ctaLabel = submitted ? "You applied · View progress" : closed ? "Applications closed" : draft ? "Continue application" : "Apply now";
  const ctaHref = submitted ? `/applicant/applications/${submitted.id}` : closed ? undefined : applyHref;
  const ctaIcon = submitted ? <Check className="size-5" strokeWidth={2} aria-hidden="true" /> : closed ? undefined : <BriefcaseBusiness className="size-5" strokeWidth={2} aria-hidden="true" />;

  // §2.9 job-posting facts. The first five are the ones a phone shows; the rest only on larger screens.
  const key: [string, string][] = [
    ["Salary", salaryLabel(job.salary)],
    ["Type", `${job.employmentType} · ${job.shift} shift`],
    ["Applications close", job.deadline ? formatLongDate(job.deadline) : "Closed"],
    ["Experience", experienceLabel(job.experience)],
    ["Starts", formatLongDate(job.expectedResumption) || "To be confirmed"],
  ];
  const more: [string, string][] = [
    ["Department", job.department],
    ["Openings", String(job.openings)],
    ["Job ref", job.jobRef],
  ];

  const iconBtn = "inline-flex size-11 items-center justify-center rounded-full text-(--ap-ink) active:bg-black/5";
  const statusChip =
    shownStatus === "Closing soon" ? (
      <span className="ax-chip ax-chip-gold">Closing soon</span>
    ) : shownStatus === "Filled" ? (
      <span className="ax-chip">Position filled</span>
    ) : shownStatus === "Closed" ? (
      <span className="ax-chip">Closed to new applicants</span>
    ) : job.match === "Strong match" ? (
      <span className="ax-chip ax-chip-olive">Strong match</span>
    ) : null;

  return (
    <div className="ax-root">
      {/* Phone top bar */}
      <BackHeader
        className="-mx-[18px] -mt-1.5 max-[380px]:-mx-3.5"
        title="Job details"
        href={backHref}
        backLabel="Back to all jobs"
        right={
          <>
            <button type="button" onClick={() => void shareJob(job.role, job.company)} aria-label={`Share ${job.role}`} className={iconBtn}>
              <Share className="size-5" strokeWidth={1.7} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => toggleSaveWithToast(job.id)} aria-pressed={saved} aria-label={saved ? `Remove ${job.role} from saved jobs` : `Save ${job.role}`} className={`${iconBtn} ${saved ? "text-(--ap-violet)" : ""}`}>
              <Bookmark key={saved ? "on" : "off"} className={`size-5 ${saved ? "ap-bump" : ""}`} strokeWidth={1.7} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          </>
        }
      />

      {/* Desktop back link */}
      <Link href={backHref} className="ax-link mt-1 mb-3 hidden min-h-9 items-center gap-1 no-underline min-[768px]:inline-flex">
        <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden="true" />
        All jobs
      </Link>

      {/* Narrow desktop (768 to 999px): a slim card with the key details and the CTAs appears once the facts scroll away. */}
      <JobStickySummary observeId="jd-facts-anchor" topClass="top-[104px]" title={job.role} details={[job.company, ...key.slice(0, 2).map(([, v]) => v)]}>
        {ctaHref ? (
          <Link href={ctaHref} className="ap-btn ap-btn-p ap-btn-hero h-11 text-white!">
            {ctaIcon}
            {ctaLabel}
          </Link>
        ) : (
          <button type="button" disabled className="ap-btn ap-btn-p h-11 px-5 text-[15px]">
            {ctaLabel}
          </button>
        )}
        <button type="button" onClick={() => toggleSaveWithToast(job.id)} aria-pressed={saved} aria-label={saved ? `Remove ${job.role} from saved jobs` : `Save ${job.role}`} className="ap-btn ap-btn-s size-11 shrink-0 p-0">
          <Bookmark className="size-[18px]" strokeWidth={1.7} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void shareJob(job.role, job.company)} aria-label={`Share ${job.role}`} className="ap-btn ap-btn-s size-11 shrink-0 p-0">
          <Share className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </JobStickySummary>

      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 pt-4 min-[768px]:pt-0 min-[1000px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <JobCover image={job.image} department={job.department} className="h-[168px] w-full rounded-[14px] border border-(--ap-line) min-[768px]:h-[240px]" />
          <div className="mt-4">
            <h1 className="ap-serif m-0 text-[27px] leading-[1.1] min-[768px]:text-[34px]">{job.role}</h1>
            <p className="mt-1.5 text-[15px] leading-snug text-(--ap-muted)">
              {job.company} · {job.location}, Nigeria
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13.5px] text-(--ap-muted)">
              <span>{job.postedLabel}</span>
              {statusChip}
            </p>
          </div>

          {/* Phone and tablet: facts directly under the title, in one container */}
          <div id="jd-facts-anchor">
            <AxFacts rows={key} className="mt-5 min-[1000px]:hidden" />
          </div>

          <div className="mt-7">
            <JobDetailSections job={job} questions={questions} />
          </div>

          <p className="mt-7 flex items-start gap-2 text-[14px] leading-snug text-(--ap-muted)">
            <ShieldCheck className="mt-px size-4 shrink-0 text-(--ap-ink-2)" strokeWidth={1.7} aria-hidden="true" />
            You apply once. Your profile, CV and ID are reused, so you only add what this role needs.
          </p>
        </div>

        {/* Desktop: sticky side column */}
        <aside className="hidden min-[1000px]:sticky min-[1000px]:top-[104px] min-[1000px]:block">
          <AxFacts rows={[...key, ...more]} />
          <div className="mt-4 flex flex-col gap-2.5">
            {ctaHref ? (
              <Link href={ctaHref} className="ap-btn ap-btn-p ap-btn-hero w-full text-white!">
                {ctaIcon}
                {ctaLabel}
              </Link>
            ) : (
              <button type="button" disabled className="ap-btn ap-btn-p h-12 w-full text-[15px]">
                {ctaLabel}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => toggleSaveWithToast(job.id)} aria-pressed={saved} className="ap-btn ap-btn-s">
                <Bookmark className="size-[17px]" strokeWidth={1.7} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
                {saved ? "Saved" : "Save"}
              </button>
              <button type="button" onClick={() => void shareJob(job.role, job.company)} className="ap-btn ap-btn-s">
                <Share className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
                Share
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Tablet: apply button inline under the content (the phone bar is phone-only) */}
      <div className="mt-7 hidden min-[768px]:block min-[1000px]:hidden">
        {ctaHref ? (
          <Link href={ctaHref} className="ap-btn ap-btn-p ap-btn-hero w-full max-w-[360px] text-white!">
            {ctaIcon}
            {ctaLabel}
          </Link>
        ) : (
          <button type="button" disabled className="ap-btn ap-btn-p h-12 w-full max-w-[360px] text-[15px]">
            {ctaLabel}
          </button>
        )}
      </div>

      {/* Phone: sticky Apply pill */}
      <StickyActionBar label={ctaLabel} icon={ctaIcon} href={ctaHref} disabled={!ctaHref} />
    </div>
  );
}
