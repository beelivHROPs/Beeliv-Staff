import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsHub } from "@/components/admin/hubs/JobsHub";

export const metadata: Metadata = { title: "Jobs" };

export default function Page() {
  // The vacancy list keeps its filters in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading jobs" />}>
      <JobsHub />
    </Suspense>
  );
}
