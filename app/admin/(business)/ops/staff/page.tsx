import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffAssignmentsList } from "@/components/admin/ops/workforce/StaffAssignmentsList";

export const metadata: Metadata = { title: "Staff Assignments" };

export default function OpsStaffPage() {
  // useSearchParams (filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading staff assignments" />}>
      <StaffAssignmentsList />
    </Suspense>
  );
}
