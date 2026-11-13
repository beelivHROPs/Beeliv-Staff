import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarPage } from "@/components/admin/calendar";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading calendar" />}>
      <CalendarPage />
    </Suspense>
  );
}
