"use client";

import { Suspense } from "react";
import { SearchResultsPage } from "@/components/shared/search/SearchResultsPage";
import { useStaffSearchProvider } from "@/components/staff/search/staffSearchProvider";

/** "See all results" page for the Staff app (same engine and provider as the top-bar search). */
/** The results page never shows actions, so sign-out is not needed here. */
const NOOP = () => {};

export function StaffSearchPage() {
  const provider = useStaffSearchProvider(NOOP);
  return (
    <Suspense fallback={null}>
      <SearchResultsPage provider={provider} />
    </Suspense>
  );
}
