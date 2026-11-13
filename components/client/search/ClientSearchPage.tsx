"use client";

import { Suspense } from "react";
import { SearchResultsPage } from "@/components/shared/search/SearchResultsPage";
import { useClientSearchProvider } from "@/components/client/search/clientSearchProvider";

/** "See all results" page for the Client app (same engine and provider as the top-bar search). */
/** The results page never shows actions, so sign-out is not needed here. */
const NOOP = () => {};

export function ClientSearchPage() {
  const provider = useClientSearchProvider(NOOP);
  return (
    <Suspense fallback={null}>
      <SearchResultsPage provider={provider} />
    </Suspense>
  );
}
