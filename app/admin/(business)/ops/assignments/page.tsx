import type { Metadata } from "next";
import { Suspense } from "react";
import { AssignmentsList } from "@/components/admin/ops/assign/AssignmentsList";

export const metadata: Metadata = { title: "Clients & HR" };

export default function AssignmentsPage() {
  // useSearchParams (filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading clients and HR" />}>
      <AssignmentsList />
    </Suspense>
  );
}
