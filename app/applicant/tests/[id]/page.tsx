import type { Metadata } from "next";
import { TestIntroBody } from "@/components/applicant/tests/TestsBody";

export const metadata: Metadata = { title: "Test" };

export default async function ApplicantTestIntroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestIntroBody id={id} />;
}
