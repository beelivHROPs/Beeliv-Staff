import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicantDetailView } from "@/components/admin/applicants/ApplicantDetailView";

export const metadata: Metadata = { title: "Applicant" };

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The record is keyed by its internal id, never by a BLV-* reference.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading applicant" />}>
      <ApplicantDetailView id={id} />
    </Suspense>
  );
}
