import type { Metadata } from "next";
import { Suspense } from "react";
import { PeopleHub } from "@/components/admin/hubs/PeopleHub";

export const metadata: Metadata = { title: "People" };

export default function Page() {
  // The lists keep their filters in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading people" />}>
      <PeopleHub />
    </Suspense>
  );
}
