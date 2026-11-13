import type { Metadata } from "next";
import { InterviewDetailView } from "@/components/admin/interviews/InterviewDetailView";

export const metadata: Metadata = { title: "Interview" };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed by the internal interview id, never by a BLV-* reference.
  return <InterviewDetailView id={id} />;
}
