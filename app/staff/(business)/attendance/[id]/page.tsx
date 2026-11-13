import type { Metadata } from "next";
import { AttendanceDetailBody } from "@/components/staff/attendance/AttendanceDetailBody";

export const metadata: Metadata = { title: "Attendance record" };

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  return <AttendanceDetailBody recordId={id} />;
}
