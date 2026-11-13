import type { CandidateFeedback } from "@/lib/client/types";

/** Candidate list filters (the ?status= values). Kept in a plain module so server pages can read it. */
export type CandidateFilter = "all" | "awaiting-feedback" | CandidateFeedback;
export const CANDIDATE_FILTERS: CandidateFilter[] = ["all", "awaiting-feedback", "interested", "interview-requested", "not-suitable"];
