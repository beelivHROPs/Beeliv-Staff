import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffDocumentsView } from "@/components/admin/staff/StaffDocumentsView";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  // Filters live in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Documents" />}>
      <StaffDocumentsView />
    </Suspense>
  );
}
