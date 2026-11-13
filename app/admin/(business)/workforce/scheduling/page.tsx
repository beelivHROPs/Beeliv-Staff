import type { Metadata } from "next";
import { Suspense } from "react";
import { SchedulingView } from "@/components/admin/workforce/SchedulingView";

export const metadata: Metadata = { title: "Scheduling" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Scheduling" />}>
      <SchedulingView />
    </Suspense>
  );
}
