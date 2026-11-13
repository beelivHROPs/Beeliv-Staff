import type { Metadata } from "next";
import { Suspense } from "react";
import { ScheduleBody } from "@/components/client/schedules/ScheduleBody";
import { ScheduleSkeleton } from "@/components/client/schedules/ScheduleStates";

export const metadata: Metadata = { title: "Schedules" };

export default function ClientSchedulesPage() {
  // useSearchParams (?date, ?view, ?outlet) needs a Suspense boundary.
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleBody />
    </Suspense>
  );
}
