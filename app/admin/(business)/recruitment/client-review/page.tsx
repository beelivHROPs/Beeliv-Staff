import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientReviewList } from "@/components/admin/client-review/ClientReviewList";

export const metadata: Metadata = { title: "Client Review" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Client Review" />}>
      <ClientReviewList />
    </Suspense>
  );
}
