import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalsList } from "@/components/admin/ops/ApprovalsList";

export const metadata: Metadata = { title: "Approvals" };

export default function ApprovalsPage() {
  // useSearchParams (tab and filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading approvals" />}>
      <ApprovalsList />
    </Suspense>
  );
}
