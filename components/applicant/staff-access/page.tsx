import type { Metadata } from "next";
import { StaffAccessBody } from "@/components/applicant/StaffAccessBody";

export const metadata: Metadata = { title: "Staff Hub" };

export default function ApplicantStaffAccessPage() {
  return <StaffAccessBody />;
}
