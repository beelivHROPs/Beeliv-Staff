import type { Metadata } from "next";
import { Suspense } from "react";
import { AttendanceList } from "@/components/admin/workforce/AttendanceList";

export const metadata: Metadata = { title: "Attendance" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Attendance" />}>
      <AttendanceList />
    </Suspense>
  );
}
