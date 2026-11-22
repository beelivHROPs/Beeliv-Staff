/**
 * REAL published vacancies (lib/server/public-jobs) in the shape the APPROVED Applicant job screens already use
 * (JobsBody, JobBody, PhoneHome, ApplyBody), so real users see the approved design with real data only.
 * Nothing is enriched from sample journeys, screening sets, tests, shifts, matches or images: anything the vacancy
 * does not say is left empty and the approved screens skip empty sections.
 * Pure, no "use client": used from server pages.
 */
import type { ApplicantJob, Shift } from "./jobs";
import type { ListingStatus, SalaryFrequency, BenefitKind } from "@/lib/public-site/job-details";
import { payChipLabel } from "@/lib/public-site/job-details";
import type { PublishedVacancy } from "@/lib/server/public-jobs/repository";

const DAY = 86_400_000;
const FREQ: Record<string, SalaryFrequency> = { monthly: "Monthly", weekly: "Weekly", daily: "Daily" };
const BENEFIT_KINDS: BenefitKind[] = ["Feeding", "Transport", "Accommodation", "Medical", "Leave", "Service charge", "Staff welfare", "Other"];

/** Only when the vacancy's own shift text names one; otherwise empty (the screens then hide the shift chip). */
function shiftFrom(text: string): Shift | "" {
  const t = text.toLowerCase();
  if (/rotat/.test(t)) return "Rotating";
  if (/night/.test(t)) return "Night";
  if (/evening/.test(t)) return "Evening";
  if (/\bday\b|morning/.test(t)) return "Day";
  return "";
}

export function applicantJobFromLive(v: PublishedVacancy, now = new Date()): ApplicantJob {
  const posted = Date.parse(v.postedAt);
  const daysAgo = Number.isFinite(posted) ? Math.max(0, Math.floor((now.getTime() - posted) / DAY)) : 0;
  const closed = v.availability === "closed";
  const ended = v.closedAt ? Date.parse(v.closedAt) : Date.parse(`${v.closesOn}T23:59:59+01:00`);
  const daysSinceEnd = closed && Number.isFinite(ended) ? Math.max(0, Math.floor((now.getTime() - ended) / DAY)) : 0;
  const status: ListingStatus = closed ? "Closed" : v.availability === "closing-soon" ? "Closing soon" : "Published";
  const salary = v.salary
    ? { min: v.salary.min, max: v.salary.max, frequency: FREQ[v.salary.frequency.toLowerCase()] ?? "Monthly", negotiable: v.salary.negotiable }
    : { min: null, max: null, frequency: "Monthly" as SalaryFrequency };
  const closesFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(
    new Date(`${v.closesOn}T12:00:00Z`),
  );
  const job = {
    id: v.id,
    role: v.title,
    company: v.companyName,
    location: v.location,
    employmentType: v.employmentType,
    department: v.department,
    image: null,
    shift: shiftFrom(v.conditions.shiftSystem),
    match: null,
    jobRef: v.reference,
    openings: v.openings,
    deadline: v.closesOn,
    expectedResumption: v.expectedResumption,
    status,
    about: v.about,
    responsibilities: v.responsibilities,
    essential: v.essential,
    preferred: v.preferred,
    experience: { minYears: v.experience.minYears, ...(v.experience.maxYears !== undefined ? { maxYears: v.experience.maxYears } : {}), summary: v.experience.summary, flags: [] },
    skills: v.skills,
    salary,
    benefits: v.benefits.filter((b) => (BENEFIT_KINDS as string[]).includes(b.kind)).map((b) => ({ kind: b.kind as BenefitKind, detail: b.detail })),
    conditions: { ...v.conditions, resumptionTime: "", closingTime: "" },
    interviewMethod: "",
    requiredDocuments: v.requiredDocuments,
    pay: payChipLabel(salary),
    daysAgo,
    closes: closed ? (daysSinceEnd <= 0 ? "Closed today" : `Closed ${daysSinceEnd === 1 ? "yesterday" : `${daysSinceEnd} days ago`}`) : `Closes ${closesFmt}`,
    state: closed ? "closed" : v.availability === "closing-soon" ? "closing-soon" : "open",
    closed,
    daysSinceEnd,
    postedLabel: daysAgo <= 0 ? "Posted today" : daysAgo === 1 ? "Posted yesterday" : `Posted ${daysAgo} days ago`,
    href: `/applicant/jobs/${v.slug || v.id}`,
    testFormId: undefined,
    liveVacancy: true,
  };
  return job as unknown as ApplicantJob; // shift may be "" (no shift stated); the screens hide an empty shift
}
