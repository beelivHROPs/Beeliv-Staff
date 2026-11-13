import type { Metadata } from "next";
import { TestsListBody } from "@/components/applicant/tests/TestsBody";

export const metadata: Metadata = { title: "Tests" };

export default function ApplicantTestsPage() {
  return <TestsListBody />;
}
