import type { Metadata } from "next";
import { TestTakeBody } from "@/components/applicant/tests/TestsBody";

export const metadata: Metadata = { title: "Taking a test" };

export default async function ApplicantTestTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestTakeBody id={id} />;
}
