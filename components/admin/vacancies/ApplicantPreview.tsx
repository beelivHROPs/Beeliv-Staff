"use client";

/**
 * Read-only "How applicants see this": renders the Applicant app's own
 * JobCard (same layout) from this vacancy. The wrapper is inert, so nothing in
 * it can be clicked, saved or navigated. Internal-only salary and benefits are
 * not passed through (see toApplicantJob).
 */
import { JobCard } from "@/components/applicant/jobs/JobCard";
import type { VacancyDetail } from "@/lib/admin/vacancies/types";
import { COMPETITIVE_PAY, STATUS_LABEL, toApplicantJob } from "./meta";
import { Section } from "./parts";

export function ApplicantPreview({ v }: { v: VacancyDetail }) {
  const visible = v.status === "published" || v.status === "closing-soon" || v.status === "closed" || v.status === "filled";
  return (
    <Section title="How applicants see this">
      <p className="mb-3 max-w-[70ch] text-[14px] leading-snug text-(--ap-muted)">
        {visible ? "This is the card applicants see in Find Jobs." : `Not visible to applicants while ${STATUS_LABEL[v.status]}. This is how the card will look once it is published.`}
        {v.salary.visibility === "internal" ? ` Salary is internal only, so the public text is "${COMPETITIVE_PAY}".` : ""}
      </p>
      <div className="max-w-[760px]" inert aria-hidden="true">
        <JobCard job={toApplicantJob(v)} state={{ applied: false, draft: false }} />
      </div>
    </Section>
  );
}
