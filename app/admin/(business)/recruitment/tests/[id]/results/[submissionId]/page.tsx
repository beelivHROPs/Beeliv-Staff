import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmissionDetailView } from "@/components/admin/tests/SubmissionDetailView";

export const metadata: Metadata = { title: "Submission" };

export default async function Page({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <SubmissionDetailView formId={id} submissionId={submissionId} />
    </Suspense>
  );
}
