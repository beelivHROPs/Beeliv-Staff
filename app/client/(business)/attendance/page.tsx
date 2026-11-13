import type { Metadata } from "next";
import { Suspense } from "react";
import { AttendanceBody } from "@/components/client/attendance/AttendanceBody";
import { AttendanceSkeleton } from "@/components/client/attendance/AttendanceStates";

export const metadata: Metadata = { title: "Attendance" };

export default function ClientAttendancePage() {
  // useSearchParams (?status, ?date, ?department ... from the Overview) needs a Suspense boundary.
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <AttendanceBody />
    </Suspense>
  );
}
