import type { Metadata } from "next";
import { Suspense } from "react";
import { AssignmentsView } from "@/components/admin/staff/AssignmentsView";

export const metadata: Metadata = { title: "Assignments" };

export default function Page() {
  // Filters live in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Assignments" />}>
      <AssignmentsView />
    </Suspense>
  );
}
