import type { Metadata } from "next";
import { InterviewsBody } from "@/components/applicant/InterviewsBody";

export const metadata: Metadata = { title: "Interviews" };

export default function ApplicantInterviewsPage() {
  return <InterviewsBody />;
}
