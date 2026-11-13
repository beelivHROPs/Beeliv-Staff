import type { Metadata } from "next";
import { AssessmentDetailView } from "@/components/admin/assessments/AssessmentDetailView";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentDetailView id={id} />;
}
