"use client";

import { Bell, Check, ChevronRight } from "@/components/applicant/icons";
import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { useApplicantStore } from "@/lib/applicant/service";
import { useSavedJobs } from "@/lib/applicant/saved";
import { JobAlertCard } from "./jobs/JobAlertCard";
import { JobAlertSheet } from "./jobs/JobAlertSheet";
import { useJobAlert } from "./jobs/alert-store";
import { JobCard } from "./jobs/JobCard";
import { JobsExplorer, type AlertSlots } from "@/components/shared/jobs/JobsExplorer";
import type { JobFilters } from "./jobs/filters";

/** Wireframe jobsPage(): .jhero, then the shared search + filters + list (components/shared/jobs/JobsExplorer). */
export function JobsBody({ jobs, initialFilters, initialSaved }: { jobs: Job[]; initialFilters: JobFilters; initialSaved: boolean }) {
  const store = useApplicantStore();
  const savedIds = useSavedJobs();
  const alert = useJobAlert();

  const stateFor = (job: Job) => ({
    applied: store.applications.some((a) => a.vacancyId === job.id && a.lifecycle !== "draft"),
    draft: store.applications.some((a) => a.vacancyId === job.id && a.lifecycle === "draft"),
  });

  const alertSlots: AlertSlots = {
    strip: (open) => (
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${alert.on ? "bg-(--ap-ok-bg)" : "bg-(--ap-tint)"}`}>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${alert.on ? "bg-(--ap-ok)" : "bg-(--ap-violet)"}`}>
          {alert.on ? <Check className="size-4" strokeWidth={2.6} aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1 text-[15px] text-(--ap-ink)">{alert.on ? "Job alert created" : "Get new roles first"}</span>
        <button type="button" onClick={open} className="ap-btn ap-btn-q shrink-0 gap-0.5 text-[15px] text-(--ap-violet)">
          {alert.on ? "Manage" : "Create alert"}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    ),
    card: ({ className, ...c }) => <JobAlertCard criteria={c.criteria} matchCount={c.matchCount} newThisWeek={c.newThisWeek} className={className} />,
    sheet: ({ open, onOpenChange, container, ...c }) => (
      <JobAlertSheet open={open} onOpenChange={onOpenChange} container={container}>
        <JobAlertCard criteria={c.criteria} matchCount={c.matchCount} newThisWeek={c.newThisWeek} />
      </JobAlertSheet>
    ),
  };

  return (
    <div>
      {/* .jhero */}
      <section className="relative pt-1.5 pb-[18px] max-[767px]:sr-only min-[1101px]:min-h-[190px]">
        {/* Header art: desktop only (project lead). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/applicant/jobs-header.webp" alt="" aria-hidden="true" className="pointer-events-none absolute top-0 right-0 hidden h-[190px] w-[560px] object-cover object-[right_center] min-[1101px]:block" />
        <div className="ap-eb">Hospitality jobs</div>
        <h1 className="ap-serif mt-2 text-[44px] max-[767px]:mt-0 max-[767px]:text-[28px] min-[768px]:max-[1100px]:text-[44px]">
          Find your next <span className="text-(--ap-violet)">opportunity.</span>
        </h1>
      </section>

      <JobsExplorer
        jobs={jobs}
        initialFilters={initialFilters}
        initialSaved={initialSaved}
        savedIds={savedIds}
        renderCard={(job) => <JobCard job={job} state={stateFor(job)} />}
        alert={alertSlots}
      />
    </div>
  );
}
