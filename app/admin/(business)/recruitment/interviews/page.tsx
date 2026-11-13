import type { Metadata } from "next";
import { Suspense } from "react";
import { InterviewsList } from "@/components/admin/interviews/InterviewsList";

export const metadata: Metadata = { title: "Interviews" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading interviews" />}>
      <InterviewsList />
    </Suspense>
  );
}
