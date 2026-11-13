import type { Metadata } from "next";
import { ScheduleBody } from "@/components/staff/schedule/ScheduleBody";

export const metadata: Metadata = { title: "Schedule" };

export default function Page() {
  return <ScheduleBody />;
}
