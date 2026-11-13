import type { Metadata } from "next";
import { AttendanceHistoryBody } from "@/components/staff/attendance/AttendanceHistoryBody";

export const metadata: Metadata = { title: "Attendance history" };

export default function Page() {
  return <AttendanceHistoryBody />;
}
