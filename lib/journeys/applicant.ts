/**
 * Per-job journey for the APPLICANT pages (job page, application page) and the public
 * job page, in the mock. A job's questions, documents, test and "Recruitment process"
 * come from ITS OWN journey (lib/journeys/samples.ts); two jobs can look different.
 * In production the vacancy's journey copy comes from the backend with the job, and
 * the applicant sees only the steps relevant to them (contract section 4).
 * Pure functions, no "use client": usable from server and client components.
 */
import { screeningQuestionsFor, type ScreeningQuestion } from "@/lib/applicant/screening";
import { testFormIdFor } from "@/lib/applicant/job-tests";
import { sampleJourneyFor } from "./samples";
import { applicantTimeline, hasStep, type Journey } from "./types";

export interface JourneyJobRef {
  id?: string | null;
  role: string;
  department?: string | null;
}

export const journeyForJob = (job: JourneyJobRef): Journey => sampleJourneyFor(job.role, job.department);

/** The "Recruitment process" labels the applicant sees for this job. */
export const processForJob = (job: JourneyJobRef): string[] => applicantTimeline(journeyForJob(job));

/** Screening questions, or none when this job's journey has no screening step. */
export const questionsForJob = (job: JourneyJobRef): ScreeningQuestion[] => (hasStep(journeyForJob(job), "screening-questions") ? screeningQuestionsFor(job) : []);

/** The test this job carries, only when its journey has a test step. */
export function testFormIdForJob(job: JourneyJobRef): string | undefined {
  if (!hasStep(journeyForJob(job), "test-or-form")) return undefined;
  return testFormIdFor(job.id) ?? "form-training-test";
}

/** Whether the journey asks for documents at application / after selection. */
export const asksDocuments = (job: JourneyJobRef) => {
  const j = journeyForJob(job);
  return { atApplication: hasStep(j, "documents-at-application"), afterSelection: hasStep(j, "documents-after-selection") };
};
