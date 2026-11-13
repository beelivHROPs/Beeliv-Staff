"use client";

import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { PhoneHome } from "./home/PhoneHome";

/**
 * Applicant Home at every width (project lead, 2026-10-24): the approved phone structure (one shared hero with search,
 * one "Your next step" card, "Roles for you"), widened for desktop with a quiet right rail. The old desktop Home
 * (dark banners, stat blocks, big serif greeting) was retired; its source is in the project history.
 */
export function OverviewBody({ jobs }: { jobs: Job[] }) {
  return <PhoneHome jobs={jobs} />;
}
