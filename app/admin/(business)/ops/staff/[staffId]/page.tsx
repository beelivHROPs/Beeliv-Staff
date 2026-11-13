import type { Metadata } from "next";
import { StaffAssignmentDetail } from "@/components/admin/ops/workforce/StaffAssignmentDetail";

export const metadata: Metadata = { title: "Staff member" };

export default async function OpsStaffMemberPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  return <StaffAssignmentDetail id={staffId} />;
}
