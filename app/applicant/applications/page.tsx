import type { Metadata } from "next";
import { ApplicationsBody } from "@/components/applicant/ApplicationsBody";

export const metadata: Metadata = { title: "My Applications" };

export default function ApplicantApplicationsPage() {
  return <ApplicationsBody />;
}
