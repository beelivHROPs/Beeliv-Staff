/** Truthful display projection of the already-validated public vacancies DTO. */
import type { PublishedVacancy } from "../server/public-jobs/repository";
import type { JobCardData } from "./card";
import { daysBetween, postedLabel, shortDate, todayIso } from "./status";

export type LiveJobDisplay = JobCardData & {
  slug: string;
  reference: string;
  publicHref: string;
  applicantHref: string;
  postedAt: string;
  closesOn: string;
  closedAt: string | null;
  closed: boolean;
  daysAgo: number;
  daysSinceEnd: number;
  expectedResumption: string;
  about: string;
  responsibilities: string[];
  essential: string[];
  preferred: string[];
  experience: PublishedVacancy["experience"];
  skills: string[];
  salary: PublishedVacancy["salary"];
  benefits: PublishedVacancy["benefits"];
  conditions: PublishedVacancy["conditions"];
  requiredDocuments: PublishedVacancy["requiredDocuments"];
  recruitmentProcess: string[];
};

function money(value: number): string { return `₦${value.toLocaleString("en-NG")}`; }
function payLabel(salary: PublishedVacancy["salary"]): string | null {
  if (!salary || salary.min === null && salary.max === null) return null;
  const range = salary.min !== null && salary.max !== null
    ? `${money(salary.min)} – ${money(salary.max)}`
    : salary.min !== null ? `From ${money(salary.min)}` : `Up to ${money(salary.max!)}`;
  const period = salary.frequency === "Monthly" ? "month" : salary.frequency === "Weekly" ? "week" : salary.frequency === "Daily" ? "day" : null;
  if (!period) throw new Error("Invalid public salary frequency.");
  return `${range} / ${period}`;
}
function daysSince(day: string, today: string): number {
  const elapsed = daysBetween(day, today);
  if (!Number.isSafeInteger(elapsed) || elapsed < 0) throw new Error("Invalid public job date.");
  return elapsed;
}

/** Uses the server's availability and as-of clock; never reopens a closed job locally. */
export function toLiveJobDisplay(job: PublishedVacancy, asOf: string): LiveJobDisplay {
  const clock = new Date(asOf);
  const published = new Date(job.postedAt);
  if (!Number.isFinite(clock.getTime()) || !Number.isFinite(published.getTime())) throw new Error("Invalid public job timestamp.");
  const state = job.availability;
  if (state !== "open" && state !== "closing-soon" && state !== "closed") throw new Error("Invalid public job availability.");
  const today = todayIso(clock);
  const daysAgo = daysSince(todayIso(published), today);
  const closed = state === "closed";
  const endDay = job.closedAt ? [todayIso(new Date(job.closedAt)), job.closesOn].sort()[0] : job.closesOn;
  const daysSinceEnd = closed ? daysSince(endDay, today) : 0;
  const closes = closed ? daysSinceEnd === 0 ? "Closed today" : daysSinceEnd === 1 ? "Closed yesterday" : `Closed ${daysSinceEnd} days ago` : `Closes ${shortDate(job.closesOn)}`;
  return {
    id: job.id, slug: job.slug, reference: job.reference,
    publicHref: `/jobs/${job.id}`, applicantHref: `/applicant/jobs/${job.id}`,
    role: job.title, company: job.companyName, location: job.location,
    employmentType: job.employmentType, department: job.department, openings: job.openings,
    image: null, pay: payLabel(job.salary), postedLabel: postedLabel(daysAgo), closes,
    state, closed, daysAgo, daysSinceEnd,
    postedAt: job.postedAt, closesOn: job.closesOn, closedAt: job.closedAt,
    expectedResumption: job.expectedResumption, about: job.about,
    responsibilities: [...job.responsibilities], essential: [...job.essential], preferred: [...job.preferred],
    experience: { ...job.experience }, skills: [...job.skills], salary: job.salary ? { ...job.salary } : null,
    benefits: job.benefits.map(benefit => ({ ...benefit })), conditions: { ...job.conditions },
    requiredDocuments: { atApplication: [...job.requiredDocuments.atApplication], afterSelection: [...job.requiredDocuments.afterSelection] },
    recruitmentProcess: [...job.recruitmentProcess],
  };
}
