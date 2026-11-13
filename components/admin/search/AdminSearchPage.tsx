"use client";

import { Suspense } from "react";
import { SearchResultsPage } from "@/components/shared/search/SearchResultsPage";
import { useAdminSearchProvider } from "@/components/admin/search/adminSearchProvider";

/** "See all results" page for the Admin app (same engine and provider as the top-bar search). */
/** The results page never shows actions, so sign-out is not needed here. */
const NOOP = () => {};

export function AdminSearchPage() {
  const provider = useAdminSearchProvider(NOOP);
  return (
    <Suspense fallback={null}>
      <SearchResultsPage provider={provider} />
    </Suspense>
  );
}
