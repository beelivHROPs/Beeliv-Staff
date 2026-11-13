"use client";

import { Suspense } from "react";
import { SearchResultsPage } from "@/components/shared/search/SearchResultsPage";
import { useApplicantSearchProvider } from "@/components/applicant/search/applicantSearchProvider";

/** "See all results" page for the Applicant app (same engine and provider as the top-bar search). */
/** The results page never shows actions, so sign-out is not needed here. */
const NOOP = () => {};

export function ApplicantSearchPage() {
  const provider = useApplicantSearchProvider(NOOP);
  return (
    <Suspense fallback={null}>
      <SearchResultsPage provider={provider} />
    </Suspense>
  );
}
