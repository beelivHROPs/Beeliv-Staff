import type { Metadata } from "next";
import { LeaveBody } from "@/components/staff/leave/LeaveBody";

export const metadata: Metadata = { title: "Leave" };

export default function StaffLeavePage() {
  return <LeaveBody />;
}
