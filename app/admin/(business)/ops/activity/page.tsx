import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityView } from "@/components/admin/ops/ActivityView";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  // useSearchParams (search and filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading activity" />}>
      <ActivityView />
    </Suspense>
  );
}
