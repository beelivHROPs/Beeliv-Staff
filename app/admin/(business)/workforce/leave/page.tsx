import type { Metadata } from "next";
import { Suspense } from "react";
import { LeaveQueue } from "@/components/admin/workforce/LeaveQueue";

export const metadata: Metadata = { title: "Leave" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Leave" />}>
      <LeaveQueue />
    </Suspense>
  );
}
