import type { Metadata } from "next";
import { Suspense } from "react";
import { AttendanceDetail } from "@/components/admin/workforce/AttendanceDetail";

export const metadata: Metadata = { title: "Attendance record" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Attendance record" />}>
      <AttendanceDetail id={id} />
    </Suspense>
  );
}
