import type { Metadata } from "next";
import { TestDoneBody } from "@/components/applicant/tests/TestsBody";

export const metadata: Metadata = { title: "Test sent" };

export default async function ApplicantTestDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestDoneBody id={id} />;
}
