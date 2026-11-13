import type { Metadata } from "next";
import { AttendanceBody } from "@/components/staff/attendance/AttendanceBody";

export const metadata: Metadata = { title: "Attendance" };

export default function Page() {
  return <AttendanceBody />;
}
